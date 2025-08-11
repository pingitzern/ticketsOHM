import { NextResponse } from 'next/server';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TENANT_ID } = process.env;

export async function GET() {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TENANT_ID) {
      return NextResponse.json({ message: 'Missing server env (SUPABASE_URL / SERVICE_ROLE / TENANT_ID)' }, { status: 500 });
    }

    const url = new URL(`${SUPABASE_URL}/rest/v1/v_kpi_sla_tenant`);
    url.searchParams.set('tenant_id', `eq.${TENANT_ID}`);
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
      return NextResponse.json({ message: 'Supabase error', error: err }, { status: res.status });
    }

    const rows = await res.json();
    const row = rows?.[0] ?? {
      open_tickets: 0,
      open_resp_risk_24_48: 0,
      open_resp_breached_48h: 0,
      open_resol_risk_5_7d: 0,
      open_resol_breached_7d: 0,
    };

    return NextResponse.json({ tenant_id: TENANT_ID, kpi: row });
  } catch (e: any) {
    return NextResponse.json({ message: 'Unexpected error', error: e?.message }, { status: 500 });
  }
}
