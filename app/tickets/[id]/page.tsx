'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

type Row = Record<string, any>;
type EventRow = {
  id?: string;
  ticket_id?: string;
  type?: string;
  payload?: any;
  created_at?: string;
} & Record<string, any>;

export default function TicketDetail() {
  const params = useParams<{ id: string }>();
  const ticketId = params?.id;
  const supabase = useMemo(() => createClient(), []);
  const [ticket, setTicket] = useState<Row | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Cargar ticket + eventos
  useEffect(() => {
    if (!ticketId) return;
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: tData, error: tErr } = await supabase
        .from('v_ticket_last_event')
        .select('*')
        .eq('ticket_id', ticketId)
        .maybeSingle();

      if (tErr) setErr(tErr.message);
      setTicket(tData ?? null);

      const { data: evData, error: evErr } = await supabase
        .from('ticket_events')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (evErr) setErr((e) => e ?? evErr.message);
      setEvents(evData ?? []);

      setLoading(false);
    })();
  }, [ticketId, supabase]);

  // Realtime del ticket
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket_events:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_events',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload: any) => {
          setEvents((prev) => [payload.new ?? payload.record ?? payload, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, supabase]);

  // Enviar comentario → API route (server) → Edge Function
  const sendComment = async () => {
    setInfo(null);
    setErr(null);
    if (!msg.trim() || !ticketId) return;

    try {
      const resp = await fetch('/api/ticket-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, msg: msg.trim() }),
      });
      const text = await resp.text();
      if (!resp.ok) {
        setErr(text || `Error ${resp.status}`);
        return;
      }
      setInfo('Comentario enviado (via edge).');
      setMsg('');
    } catch (e: any) {
      setErr(e?.message || 'Network error');
    }
  };

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <a href="/tickets" style={{ textDecoration: 'underline' }}>← Volver</a>
      <h1 style={{ fontSize: 24, margin: '12px 0' }}>Ticket {ticketId}</h1>

      {loading && <div>Cargando…</div>}

      {err && (
        <div style={{ padding: 12, border: '1px solid #f99', background: '#fff5f5', borderRadius: 8 }}>
          <strong>Error:</strong> {err}
        </div>
      )}

      {ticket && (
        <pre
          style={{
            marginTop: 12,
            padding: 12,
            background: '#f7fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
{JSON.stringify(ticket, null, 2)}
        </pre>
      )}

      {/* Form comentario */}
      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Agregar comentario</h2>
        <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Escribí el comentario…"
            rows={3}
            style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
          />
          <button
            onClick={sendComment}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #333', width: 'fit-content' }}
          >
            Enviar comentario
          </button>
          {info && <div style={{ color: 'green' }}>{info}</div>}
        </div>
      </section>

      {/* Eventos */}
      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Eventos (Realtime)</h2>
        {events.length === 0 ? (
          <div>No hay eventos.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {events.map((e, i) => (
              <pre
                key={e.id ?? i}
                style={{
                  margin: 0,
                  padding: 12,
                  background: '#fafafa',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  overflow: 'auto',
                }}
              >
{JSON.stringify(e, null, 2)}
              </pre>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}