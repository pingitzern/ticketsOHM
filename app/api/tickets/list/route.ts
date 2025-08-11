import { NextResponse } from 'next/server';

// === CLAVES (DEV) ===
const SUPABASE_URL = 'https://kldavlcvwrmkqbifplxh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsZGF2bGN2d3Jta3FiaWZwbHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MDQzNDEsImV4cCI6MjA3MDI4MDM0MX0.4Ox35NnDh0xIs-h68OCT7NjUczxmFOOoNhDorBZakhs';
const TENANT_ID = 'b1f6c198-1454-4b0c-8204-2b4d04ff9db8';

// Campos a traer (ajustá si tu tabla difiere)
const SELECT = [
  'id',
  'tenant_id',
  'device_id',
  'source',
  'created_by',
  'created_at'
].join(',');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200);
    const since = searchParams.get('since'); // ISO opcional

    const url = new URL(`${SUPABASE_URL}/rest/v1/tickets`);
    url.searchParams.set('select', SELECT);
    url.searchParams.set('tenant_id', `eq.${TENANT_ID}`);
    url.searchParams.set('order', 'created_at.desc');
    url.searchParams.set('limit', String(limit));
    if (since) url.searchParams.set('created_at', `gte.${since}`);

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'count=estimated'
      },
      cache: 'no-store'
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ message: 'Supabase error', error: text }, { status: res.status });
    }

    const data = JSON.parse(text);
    return NextResponse.json({ items: data });
  } catch (e: any) {
    return NextResponse.json({ message: 'Unexpected error', error: e?.message }, { status: 500 });
  }
}
