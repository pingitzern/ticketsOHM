// supabase/functions/ticket-push/index.ts
import 'jsr:@supabase/functions-js/edge-runtime';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const PUSH_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET')!;
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    if (req.headers.get('x-push-secret') !== PUSH_SECRET) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const body = await req.json();
    const required = ['qr_slug','user_legajo','user_name','user_phone','reason'];
    for (const f of required) {
      if (!body?.[f] || typeof body[f] !== 'string') {
        return new Response(JSON.stringify({ message: `Falta campo: ${f}` }), { status: 400 });
      }
    }

    // 1) Resolver device por qr_slug
    const { data: device, error: dErr } = await supabase
      .from('devices')
      .select('id, tenant_id, site_id, code, location_hint')
      .eq('qr_slug', body.qr_slug)
      .single();

    if (dErr || !device) {
      return new Response(JSON.stringify({ message: 'QR no válido' }), { status: 404 });
    }

    // 2) Crear ticket (ajustá columnas si tu tabla difiere)
    const meta = {
      user_legajo: body.user_legajo,
      user_name: body.user_name,
      user_phone: body.user_phone,
      reason: body.reason,
      qr_slug: body.qr_slug,
      device_code: device.code,
      location_hint: device.location_hint,
    };

    const { data: tk, error: tErr } = await supabase
      .from('tickets')
      .insert({
        tenant_id: device.tenant_id,
        source: 'qr',
        created_by: body.user_legajo,
        meta // si tu tabla no tiene "meta", sacá esta línea
      })
      .select('id, created_at')
      .single();

    if (tErr || !tk) {
      console.error(tErr);
      return new Response(JSON.stringify({ message: 'No se pudo crear el ticket' }), { status: 500 });
    }

    // 3) Evento "created" (CLAVE para el reporte mensual)
    const { error: eErr } = await supabase
      .from('ticket_events')
      .insert({
        ticket_id: tk.id,
        event_type: 'created',
        payload: meta
      });

    if (eErr) {
      console.error(eErr);
      // no corto: el ticket existe. devuelvo 207 para que lo veas en logs
      return new Response(JSON.stringify({ ticket_id: tk.id, message: 'Ticket creado sin evento created' }), { status: 207 });
    }

    return new Response(JSON.stringify({ ticket_id: tk.id }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Error inesperado' }), { status: 500 });
  }
});
