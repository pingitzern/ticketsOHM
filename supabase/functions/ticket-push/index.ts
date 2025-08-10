// supabase/functions/ticket-push/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type TicketEvent = {
  action: "created" | "updated";
  ticket_id: string;
  tenant_id: string;
  title: string;
  status?: string | null;
  priority?: string | null;
};

type PushRow = { expo_token: string };

serve(async (req) => {
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET") || "";
  const incomingSecret = req.headers.get("x-webhook-secret") || "";
  if (!secret || secret !== incomingSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  try {
    const payload = (await req.json()) as TicketEvent;
    const { tenant_id, title, action, ticket_id, status, priority } = payload;

    if (!tenant_id || !action || !ticket_id) {
      return new Response(JSON.stringify({ error: "bad payload" }), { status: 400 });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: rows, error } = await supabase
      .from("push_subscriptions")
      .select("expo_token")
      .eq("tenant_id", tenant_id);

    if (error) {
      console.error("DB error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const tokens = (rows as PushRow[]).map(r => r.expo_token).filter(Boolean);
    if (!tokens.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });

    const titleMsg = action === "created" ? "🧾 Nuevo ticket" : "🔔 Ticket actualizado";
    const bodyMsg = action === "created"
      ? (title || "Creado")
      : `${title || "Ticket"} — ${status || "status"} · ${priority || "prio"}`;

    const messages = tokens.map((to) => ({ to, title: titleMsg, body: bodyMsg, data: { ticket_id, action } }));
    const chunks: typeof messages[] = [];
    for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));

    const results = [];
    for (const chunk of chunks) {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      results.push(await res.json());
    }

    return new Response(JSON.stringify({ ok: true, sent: tokens.length, results }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
