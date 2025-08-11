'use client';

import { useEffect, useState } from 'react';

type KPI = {
  open_tickets: number;
  open_resp_risk_24_48: number;
  open_resp_breached_48h: number;
  open_resol_risk_5_7d: number;
  open_resol_breached_7d: number;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ts, setTs] = useState<string>('');

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/kpi/tenant', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error');
      setKpi(data.kpi as KPI);
      setTs(new Date().toLocaleString());
    } catch (e: any) {
      setError(e?.message || 'Error inesperado');
      setKpi(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <main style={{ maxWidth: 1080, margin: '2rem auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Dashboard SLA</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={load}
            style={{ padding: '0.6rem 0.9rem', borderRadius: 10, border: 0, background: '#111827', color: '#fff', fontWeight: 600 }}
          >
            Actualizar
          </button>
        </div>
      </header>

      <p style={{ color: '#6b7280', marginTop: 4 }}>Última actualización: {ts || '—'}</p>

      {loading && <div style={{ marginTop: 24 }}>Cargando métricas…</div>}
      {error && (
        <div style={{ marginTop: 24, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 12, borderRadius: 8 }}>
          {error}
        </div>
      )}

      {kpi && !loading && !error && (
        <section
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          <Card title="Abiertos" value={kpi.open_tickets} hint="Tickets abiertos (sin cierre)" />
          <Card title="Riesgo resp. 24–48h" value={kpi.open_resp_risk_24_48} hint="Sin ACK entre 24 y 48 horas" />
          <Card title="Resp. vencida >48h" value={kpi.open_resp_breached_48h} hint="Sin ACK más de 48 horas" />
          <Card title="Riesgo resol. 5–7d" value={kpi.open_resol_risk_5_7d} hint="Sin cierre entre 5 y 7 días" />
          <Card title="Resolución vencida >7d" value={kpi.open_resol_breached_7d} hint="Sin cierre más de 7 días" />
        </section>
      )}
    </main>
  );
}

function Card({ title, value, hint }: { title: string; value: number; hint?: string }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fff' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}
