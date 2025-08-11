'use client';

import { useState } from 'react';

export default function ReportsPage() {
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const download = () => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      alert('Mes inválido. Usá YYYY-MM, ej: 2025-08');
      return;
    }
    window.location.href = `/api/reports/monthly?month=${month}`;
  };

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Reporte mensual (CSV)</h1>
      <p style={{ color: '#6b7280', marginTop: 6 }}>
        Generado desde <code>v_monthly_consolidated</code> filtrado por tu tenant.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>Mes</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </label>

        <button
          onClick={download}
          style={{
            padding: '0.7rem 1rem',
            borderRadius: 10,
            border: 0,
            background: '#2563eb',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 22
          }}
        >
          Descargar CSV
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
        Tip: el archivo se llama <code>reporte_YYYY-MM.csv</code>.
      </div>
    </main>
  );
}
