export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type PushRow = {
  expo_token: string;
};

export async function POST(req: NextRequest) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: 'Faltan env vars' }), { status: 500 });
  }

  const { tenant_id, title, body, data } = await req.json();

  if (!tenant_id || !title || !body) {
    return new Response(JSON.stringify({ error: 'tenant_id, title y body requeridos' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: rows, error } = await supabase
    .from('push_subscriptions')
    .select('expo_token')
    .eq('tenant_id', tenant_id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const tokens = (rows as PushRow[]).map(r => r.expo_token).filter(Boolean);
  if (!tokens.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });

  // Expo push API
  const messages = tokens.map(to => ({ to, title, body, data: data || {} }));
  // Batches de hasta 100
  const chunks: typeof messages[] = [];
  for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));

  const results = [];
  for (const chunk of chunks) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
    results.push(await res.json());
  }

  return new Response(JSON.stringify({ ok: true, sent: tokens.length, results }), { status: 200 });
}
