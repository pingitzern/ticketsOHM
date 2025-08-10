'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';

type TicketRow = Record<string, any>;

export default function TicketsPage() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('v_ticket_last_event')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) setError(error.message);
      else setRows(data ?? []);

      setLoading(false);
    };

    load();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Tickets — v_ticket_last_event</h1>

      {loading && <div>Cargando…</div>}

      {error && (
        <div style={{ padding: 12, border: '1px solid #f99', background: '#fff5f5', borderRadius: 8 }}>
          <strong>Error:</strong> {error}
          <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
            Revisá las RLS/policies de la vista para el ANON KEY.
          </div>
        </div>
      )}

      {!loading && !error && rows.length === 0 && <div>No hay registros.</div>}

      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
          {rows.map((r, i) => (
            <pre
              key={i}
              style={{
                margin: 0,
                padding: 12,
                background: '#f7fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                overflow: 'auto',
              }}
            >
{JSON.stringify(r, null, 2)}
            </pre>
          ))}
        </div>
      )}
    </main>
  );
}
