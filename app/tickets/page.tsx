'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';

type TicketRow = Record<string, any>;

export default function TicketsPage() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // DEBUG (solo temporal)
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '(sin URL)';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '(sin KEY)';
  const anonPreview = anon && anon !== '(sin KEY)' ? anon.slice(0, 8) + '…' : anon;

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setError(null);

      // 1) Llamada con el SDK
      const q = supabase
        .from('v_ticket_last_event')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

      const { data, error } = await q;
      if (error) {
        setError(`SDK: ${error.message}`);
      } else {
        setRows(data ?? []);
      }

      // 2) Llamada REST cruda (para ver el status exacto)
      try {
        const resp = await fetch(
          `${supaUrl}/rest/v1/v_ticket_last_event?select=*&limit=1`,
          {
            headers: {
              apikey: anon,
              Authorization: `Bearer ${anon}`,
            },
          }
        );
        const text = await resp.text();
        console.log('REST status:', resp.status);
        console.log('REST body:', text);
        if (!resp.ok && !error) {
          setError(`REST ${resp.status}: ${text}`);
        }
      } catch (e: any) {
        console.error('REST error:', e?.message || e);
        if (!error) setError(`REST error: ${e?.message || e}`);
      }

      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Tickets — v_ticket_last_event</h1>

      <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>
        <div><strong>URL:</strong> {supaUrl}</div>
        <div><strong>ANON (preview):</strong> {anonPreview}</div>
      </div>

      {loading && <div>Cargando…</div>}

      {error && (
        <div style={{ padding: 12, border: '1px solid #f99', background: '#fff5f5', borderRadius: 8 }}>
          <strong>Error:</strong> {error}
          <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
            Si ves “Invalid API key”, suele ser URL/KEY rotada, mal pegada (espacios/saltos de línea) o del proyecto equivocado.
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
