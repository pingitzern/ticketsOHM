// app/api/ticket-push/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { ticket_id, msg } = await req.json();

    if (!ticket_id || !msg) {
      return NextResponse.json({ error: 'ticket_id y msg son requeridos' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const pushSecret = process.env.PUSH_SECRET;

    if (!url || !anon || !pushSecret) {
      return NextResponse.json(
        { error: 'Faltan envs (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / PUSH_SECRET)' },
        { status: 500 }
      );
    }

    // Lo que espera la Edge: ticket_id + event_type (+ payload)
    const body = {
      ticket_id,
      event_type: 'comment',
      payload: { msg },
    };

    const resp = await fetch(`${url}/functions/v1/ticket-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        'x-push-secret': pushSecret,
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    if (!resp.ok) {
      return new NextResponse(text || 'Edge function error', { status: resp.status });
    }

    return new NextResponse(text, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
