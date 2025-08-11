import { NextResponse } from 'next/server';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TENANT_ID } = process.env;

function toCSV(rows: any[]): string {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(',')),
  ];
  return lines.join('\n');
}

export async function GET(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TENANT_ID) {
      return NextResponse.json(
        { message: 'Faltan env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / TENANT_ID)' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // esperado: YYYY-MM

    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json(
        { message: 'Parámetro inválido. Usá ?month=YYYY-MM (ej: 2025-08)' },
        { status: 400 }
      );
    }

    // Rango: [YYYY-MM-01, primer día del mes siguiente)
    const [yStr, mStr] = monthParam.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const start = `${yStr}-${mStr}-01`;
    const endMonth = m === 12 ? 1 : m + 1;
    const endYear = m === 12 ? y + 1 : y;
    const end = `${String(endYear).padStart(4, '0')}-${String(endMonth).padStart(2, '0')}-01`;

    // Consulta a la vista v_monthly_consolidated filtrando por tenant y mes
    const url = new URL(`${SUPABASE_URL}/rest/v1/v_monthly_consolidated`);
    url.searchParams.set('tenant_id', `eq.${TENANT_ID}`);
    url.searchParams.set('month', `gte.${start}`);
    url.searchParams.set('month', `lt.${end}`);
    url.searchParams.set('select', '*');

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ message: 'Error desde Supabase', error: err }, { status: res.status });
    }

    const rows = await res.json();

    // Orden opcional para prolijidad
    rows.sort((a: any, b: any) => {
      if (a.province !== b.province) return String(a.province).localeCompare(String(b.province));
      if (a.city !== b.city) return String(a.city).localeCompare(String(b.city));
      return String(a.site_name).localeCompare(String(b.site_name));
    });

    const csv = toCSV(rows);
    const filename = `reporte_${monthParam}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Error inesperado', error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
