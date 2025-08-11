import { NextResponse } from 'next/server';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUSH_WEBHOOK_SECRET } = process.env;

export async function POST(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PUSH_WEBHOOK_SECRET) {
      return NextResponse.json({ message: 'Server envs faltantes' }, { status: 500 });
    }

    // auth simple por header
    const secret = req.headers.get('x-push-secret');
    if (secret !== PUSH_WEBHOOK_SECRET) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const required = ['qr_slug', 'user_legajo', 'user_name', 'user_phone', 'reason'] as const;
    for (const f of required) {
      if (!body?.[f] || typeof body[f] !== 'string') {
        return NextResponse.json({ message: `Falta campo: ${f}` }, { status: 400 });
      }
    }

    // 1) Buscar device por qr_slug
    const devUrl = new URL(`${SUPABASE_URL}/rest/v1/devices`);
    devUrl.searchParams.set('select', 'id,tenant_id,site_id,code,location_hint');
    devUrl.searchParams.set('qr_slug', `eq.${body.qr_slug}`);
    devUrl.searchParams.set('limit', '1');

    const devRes = await fetch(devUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: 'no-store',
    });

    if (!devRes.ok) {
      const err = await devRes.text();
      return NextResponse.json({ message: 'Error buscando device', error: err }, { status: devRes.status });
    }

    const devRows = await devRes.json();
    const device = devRows?.[0];
    if (!device) {
      return NextResponse.json({ message: 'QR no válido (device no encontrado)' }, { status: 404 });
    }

    // 2) Crear ticket
    const ticketPayload = {
      tenant_id: device.tenant_id,
      source: 'qr',
      created_by: body.user_legajo,
      // si tu tabla tickets tiene otras columnas obligatorias, agregalas acá
    };

    const tkRes = await fetch(`${SUPABASE_URL}/rest/v1/tickets`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(ticketPayload),
    });

    if (!tkRes.ok) {
      const err = await tkRes.text();
      return NextResponse.json({ message: 'No se pudo crear el ticket', error: err }, { status: tkRes.status });
    }

    const tkRows = await tkRes.json();
    const ticket = tkRows?.[0];
    if (!ticket?.id) {
      return NextResponse.json({ message: 'Ticket creado sin ID' }, { status: 500 });
    }

    // 3) Insertar evento "created" (CLAVE para el reporte mensual)
    const eventPayload = {
      qr_slug: body.qr_slug,
      device_code: device.code,
      location_hint: device.location_hint,
      user_legajo: body.user_legajo,
      user_name: body.user_name,
      user_phone: body.user_phone,
      reason: body.reason,
    };

    const evRes = await fetch(`${SUPABASE_URL}/rest/v1/ticket_events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticket_id: ticket.id,
        event_type: 'created',
        payload: eventPayload,
      }),
    });

    if (!evRes.ok) {
      const err = await evRes.text();
      // devolvemos 207 si el ticket está pero falló el evento
      return NextResponse.json({ ticket_id: ticket.id, message: 'Ticket creado sin evento created', error: err }, { status: 207 });
    }

    return NextResponse.json({ ticket_id: ticket.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: 'Error inesperado', error: e?.message }, { status: 500 });
  }
}
