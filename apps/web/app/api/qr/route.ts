export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

type Asset = {
  id: string;
  tag: string | null;
  model: string | null;
  location: string | null;
  tenant_id: string;
};

// ==== Medidas y layout ====
// mm -> pt
const MM_TO_PT = 72 / 25.4;
const mm = (v: number) => v * MM_TO_PT;

// A4 landscape
const A4_W_PT = 841.8897637795277; // 297 mm
const A4_H_PT = 595.2755905511812; // 210 mm

// Etiqueta 100 x 60 mm
const MARGIN = mm(10);     // márgenes externos
const GUTTER = mm(5);      // separación entre etiquetas
const LABEL_W = mm(100);
const LABEL_H = mm(60);
const PADDING = mm(5);     // padding interno de cada etiqueta

// Tipografías / tamaños
const SIZE_TITLE = 14;
const SIZE_META = 11;
const SIZE_URL  = 9;
const LINE_GAP  = mm(2.5);

// ==== Helpers de texto ====
function wrapLines(opts: {
  font: any;
  text: string;
  size: number;
  maxWidth: number;
  maxLines: number;
}) {
  const { font, text, size, maxWidth, maxLines } = opts;
  const words = (text || '').toString().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  const w = (t: string) => font.widthOfTextAtSize(t, size);

  const pushWithEllipsis = (base: string) => {
    let s = base;
    while (s.length > 1 && w(s + '…') > maxWidth) s = s.slice(0, -1);
    lines.push(s + '…');
  };

  for (const word of words) {
    const test = cur ? cur + ' ' + word : word;
    if (w(test) <= maxWidth) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      else {
        // palabra sola que ya excede: cortar duro
        let cut = word;
        while (cut.length > 1 && w(cut + '…') > maxWidth) cut = cut.slice(0, -1);
        lines.push(cut + '…');
      }
      cur = '';
      if (lines.length >= maxLines) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
  } else if (lines.length === maxLines && w(lines[maxLines - 1]) > maxWidth) {
    // última línea ajustada con ellipsis si hace falta
    let last = lines[maxLines - 1];
    pushWithEllipsis(last);
    lines.length = maxLines; // asegura tope
  }
  return lines;
}

export async function GET(req: NextRequest) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!SUPABASE_URL || !ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Faltan env vars de Supabase' }), { status: 500 });
  }

  // Server-side: en demo usamos service role; en prod filtrá por tenant del usuario.
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE || ANON_KEY, {
    auth: { persistSession: false },
  });

  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get('asset_id');
  const all = searchParams.get('all');

  let assets: Asset[] = [];
  if (assetId) {
    const { data, error } = await supabase
      .from('assets')
      .select('id,tag,model,location,tenant_id')
      .eq('id', assetId)
      .limit(1);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    assets = (data || []) as Asset[];
  } else if (all) {
    const { data, error } = await supabase
      .from('assets')
      .select('id,tag,model,location,tenant_id')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    assets = (data || []) as Asset[];
  } else {
    return new Response('Falta asset_id o all=1', { status: 400 });
  }

  // QR dinámico (evita issues de tipos)
  const QR = await import('qrcode');

  // PDF
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([A4_W_PT, A4_H_PT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Logo (si existe en /public/logo.png)
  const logoPath = path.resolve(process.cwd(), 'public', 'logo.png');
  let logoImage: any = null;
  if (fs.existsSync(logoPath)) {
    const bytes = fs.readFileSync(logoPath);
    // probamos PNG primero, si falla, intentamos JPG
    try { logoImage = await pdfDoc.embedPng(bytes); }
    catch { logoImage = await pdfDoc.embedJpg(bytes); }
  }

  // Grilla 2 x 3 (100x60 en A4 landscape con márgenes/gutter)
  const usableW = A4_W_PT - 2 * MARGIN;
  const usableH = A4_H_PT - 2 * MARGIN;
  const cols = Math.max(1, Math.floor((usableW + GUTTER) / (LABEL_W + GUTTER))); // esperado: 2
  const rows = Math.max(1, Math.floor((usableH + GUTTER) / (LABEL_H + GUTTER))); // esperado: 3
  const perPage = cols * rows;

  const drawOne = async (a: Asset, idx: number) => {
    const pageIndex = Math.floor(idx / perPage);
    const inPage = idx % perPage;
    const col = inPage % cols;
    const row = Math.floor(inPage / cols);

    while (pdfDoc.getPages().length <= pageIndex) {
      pdfDoc.addPage([A4_W_PT, A4_H_PT]);
    }
    page = pdfDoc.getPages()[pageIndex];

    const x = MARGIN + col * (LABEL_W + GUTTER);
    const y = A4_H_PT - MARGIN - (row + 1) * (LABEL_H + GUTTER) + GUTTER;

    // Marco
    page.drawRectangle({
      x, y, width: LABEL_W, height: LABEL_H,
      borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 1
    });

    // Área interna
    const innerX = x + PADDING;
    const innerYTop = y + LABEL_H - PADDING;
    const innerW = LABEL_W - PADDING * 2;
    const innerH = LABEL_H - PADDING * 2;

    // ----- QR a la izquierda -----
    const qrContent = `ts://a/${a.id}?t=${a.tenant_id}&v=1`;
    const dataUrl = await QR.toDataURL(qrContent, { margin: 1, scale: 6 });
    const base64 = dataUrl.split(',')[1]!;
    const pngBytes = Uint8Array.from(Buffer.from(base64, 'base64'));
    const pngImage = await pdfDoc.embedPng(pngBytes);

    const qrH = innerH * 0.78;                // 78% del alto interno
    const qrW = Math.min(qrH, innerW * 0.45); // y no más del 45% del ancho
    const qrX = innerX;
    const qrY = innerYTop - (innerH + qrH) / 2 + (innerH - qrH) / 2; // centrado vertical en el área

    page.drawImage(pngImage, { x: qrX, y: qrY, width: qrW, height: qrH });

    // ----- Logo arriba derecha -----
    if (logoImage) {
      const logoWmm = 18; // ~18 mm de ancho
      const logoW = mm(logoWmm);
      const logoH = (logoW / logoImage.width) * logoImage.height;
      const lx = innerX + innerW - logoW;
      const ly = innerYTop - logoH;
      page.drawImage(logoImage, { x: lx, y: ly, width: logoW, height: logoH });
    }

    // ----- Texto a la derecha del QR (centrado vertical) -----
    const textX = innerX + qrW + mm(6);
    const textW = innerX + innerW - textX;

    const titleLines = wrapLines({ font, text: a.tag || a.id.slice(0, 8), size: SIZE_TITLE, maxWidth: textW, maxLines: 1 });
    const modelLines = wrapLines({ font, text: a.model || '-', size: SIZE_META, maxWidth: textW, maxLines: 2 });
    const locLines   = wrapLines({ font, text: a.location || '-', size: SIZE_META, maxWidth: textW, maxLines: 2 });
    const urlLines   = wrapLines({ font, text: qrContent, size: SIZE_URL, maxWidth: textW, maxLines: 2 });

    const blockH =
      titleLines.length * (SIZE_TITLE + LINE_GAP) -
      LINE_GAP + // sin gap debajo de la última línea de cada bloque, lo compensamos sumando y restando
      modelLines.length * (SIZE_META + LINE_GAP) +
      locLines.length   * (SIZE_META + LINE_GAP) +
      urlLines.length   * (SIZE_URL  + LINE_GAP) -
      LINE_GAP;

    // Centro vertical del bloque de texto dentro del área interna
    let textY = innerYTop - (innerH - blockH) / 2;

    const drawLines = (lines: string[], size: number, color: any) => {
      for (const ln of lines) {
        page.drawText(ln, { x: textX, y: textY - size, size, font, color, maxWidth: textW });
        textY -= size + LINE_GAP;
      }
    };

    drawLines(titleLines, SIZE_TITLE, rgb(0, 0, 0));
    drawLines(modelLines, SIZE_META, rgb(0.25, 0.25, 0.25));
    drawLines(locLines,   SIZE_META, rgb(0.25, 0.25, 0.25));
    drawLines(urlLines,   SIZE_URL,  rgb(0.4, 0.4, 0.4));
  };

  for (let i = 0; i < assets.length; i++) {
    await drawOne(assets[i], i);
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="qr_labels_100x60.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}
