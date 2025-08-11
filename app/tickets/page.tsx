'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

type TicketRow = { ticket_id?: string; status?: string; assignee_id?: string | null } & Record<string, any>;
const PAGE_SIZE = 20;

export default function TicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // valores iniciales desde la URL (?page=&status=&assignee=)
  const initialPage = Number(searchParams.get('page') ?? '0') || 0;
  const initialStatus = (searchParams.get('status') ?? '').trim();
  const initialAssignee = (searchParams.get('assignee') ?? '').trim();

  const supabase = useMemo(() => createClient(), []);
  const [page, setPage] = useState(initialPage);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [assigneeFilter, setAssigneeFilter] = useState(initialAssignee);

  const [rows, setRows] = useState<TicketRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DEBUG (podés borrar luego)
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '(sin URL)';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '(sin KEY)';
  const anonPreview = anon && anon !== '(sin KEY)' ? anon.slice(0, 8) + '…' : anon;

  const applyUrl = (nextPage: number, nextStatus: string, nextAssignee: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(nextPage));
    if (nextStatus) params.set('status', nextStatus); else params.delete('status');
    if (nextAssignee) params.set('assignee', nextAssignee); else params.delete('assignee');
    router.replace(`/tickets?${params.toString()}`);
  };

  const load = async (p: number, st: string, asg: string) => {
    setLoading(true);
    setError(null);

    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE; // pedimos 21 para detectar si hay more
    let q = supabase.from('v_ticket_last_event').select('*');

    if (st) q = q.eq('status', st);
    if (asg) q = q.eq('assignee_id', asg);

    const { data, error } = await q.range(from, to); // trae hasta 21
    if (error) {
      setError(error.message);
      setRows([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    const list = data ?? [];
    setHasMore(list.length > PAGE_SIZE);
    setRows(list.slice(0, PAGE_SIZE));
    setLoading(false);
  };

  // cargar al montar y cuando cambian page/status/assignee
  useEffect(() => {
    applyUrl(page, statusFilter, assigneeFilter);
    load(page, statusFilter, assigneeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, assigneeFilter]);

  // handlers
  const onApplyFilters = () => {
    setPage(0); // reset paginación cuando aplicás filtros
    // (statusFilter / assigneeFilter ya están en state; el effect hará load)
  };

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Tickets — v_ticket_last_event</h1>

      <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>
        <div><strong>URL:</strong> {supaUrl}</div>
        <div><strong>ANON (preview):</strong> {anonPreview}</div>
        <div><strong>Página:</strong> {page + 1}</div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gap: 8, alignItems: 'end', marginBottom: 12, maxWidth: 720 }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <label style={{ fontSize: 12 }}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value="">(todos)</option>
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="closed">closed</option>
          </select>
        </div>

        <div style={{ display: 'grid', gap: 4 }}>
          <label style={{ fontSize: 12 }}>assignee_id (exacto)</label>
          <input
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value.trim())}
            placeholder="uuid del asignado…"
            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ccc', minWidth: 260 }}
          />
        </div>

        <button
          onClick={onApplyFilters}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #333', height: 36 }}
        >
          Aplicar filtros
        </button>
      </div>

      {/* Controles de paginación */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || loading}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc' }}
        >
          ← Anterior
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore || loading}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc' }}
        >
          Siguiente →
        </button>
      </div>

      {loading && <div>Cargando…</div>}

      {error && (
        <div style={{ padding: 12, border: '1px solid #f99', background: '#fff5f5', borderRadius: 8 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div>No hay registros.</div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
          {rows.map((r, i) => {
            const id = r.ticket_id as string | undefined;
            return (
              <div key={`${id ?? 'row'}-${i}`} style={{ display: 'grid', gap: 8 }}>
                <div>
                  {id ? (
                    <a href={`/tickets/${id}`} style={{ textDecoration: 'underline' }}>
                      Abrir /tickets/{id}
                    </a>
                  ) : (
                    <span style={{ color: '#999' }}>(sin ticket_id)</span>
                  )}
                </div>
                <pre
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
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
