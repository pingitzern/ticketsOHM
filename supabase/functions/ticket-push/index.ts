// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type PushEvent = {
  ticket_id: string;
  event_type: string; // created|updated|status_changed|comment_added
  payload?: Record<string, any>;
};

Deno.serve(async (req) => {
  // Verificaci\u00f3n por secreto (cabecera o query)
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  const got = req.headers.get("x-push-secret") ?? new URL(req.url).searchParams.get("secret");
  if (!secret || got !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let body: PushEvent;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { ticket_id, event_type, payload } = body ?? {};
  if (!ticket_id || !event_type) {
    return new Response(JSON.stringify({ error: "ticket_id and event_type required" }), { status: 422 });
  }

  // Insertar el evento en la DB usando la Service Role Key
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resp = await fetch(`${url}/rest/v1/ticket_events`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify([{ ticket_id, event_type, payload: payload ?? {} }])
  });

  if (!resp.ok) {
    const text = await resp.text();
    return new Response(JSON.stringify({ error: "DB insert failed", detail: text }), { status: 500 });
  }

  // (Opcional) publicar a Realtime via PostgREST + pgbouncer no aplica; para broadcast usar supabase-js desde server o Trigger.
  const inserted = await resp.json();
  return new Response(JSON.stringify({ ok: true, event: inserted[0] }), { status: 200 });
});
