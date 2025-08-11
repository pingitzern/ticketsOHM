'use client';

import { useState } from 'react';

export default function ReportByQR({ params }: { params: { qrSlug: string } }) {
  const { qrSlug } = params;

  const [user_legajo, setLegajo] = useState('');
  const [user_name, setName] = useState('');
  const [user_phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMsg(null);

    try {
      // ⚠️ Por ahora fallará (404) porque /api/tickets/create aún no existe. Está bien.
      const res = await fetch('/api/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_slug: qrSlug,
          user_legajo,
          user_name,
          user_phone,
          reason
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'La API todavía no está creada');
      setMsg('✅ Ticket creado (API conectada)');
    } catch (err: any) {
      setMsg(`ℹ️ Form listo. Falta la API: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{maxWidth: 720, margin: '2rem auto', padding: '1rem'}}>
      <h1 style={{fontSize: '1.5rem', fontWeight: 600}}>Reportar incidencia</h1>
      <p style={{color: '#555'}}>Equipo (QR): <code>{qrSlug}</code></p>

      <form onSubmit={handleSubmit} style={{display: 'grid', gap: '0.75rem', marginTop: '1rem'}}>
        <label>
          <div>Legajo / Usuario</div>
          <input
            required
            value={user_legajo}
            onChange={e => setLegajo(e.target.value)}
            placeholder="A12345"
            style={{width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 8}}
          />
        </label>

        <label>
          <div>Nombre y apellido</div>
          <input
            required
            value={user_name}
            onChange={e => setName(e.target.value)}
            placeholder="Juan Pérez"
            style={{width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 8}}
          />
        </label>

        <label>
          <div>Celular de contacto</div>
          <input
            required
            value={user_phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+54 11 5555-5555"
            style={{width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 8}}
          />
        </label>

        <label>
          <div>Motivo del reclamo</div>
          <textarea
            required
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="No enfría / No calienta / Pérdida / etc."
            rows={3}
            style={{width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 8}}
          />
        </label>

        <button
          type="submit"
          disabled={sending}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 10,
            border: 0,
            background: sending ? '#9db9ff' : '#3b82f6',
            color: 'white',
            fontWeight: 600,
            cursor: sending ? 'not-allowed' : 'pointer'
          }}
        >
          {sending ? 'Enviando...' : 'Crear ticket'}
        </button>

        {msg && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            borderRadius: 8,
            background: '#f3f4f6'
          }}>
            {msg}
          </div>
        )}
      </form>
    </main>
  );
}
