'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';

export default function Home() {
  const [status, setStatus] = useState<'ok' | 'error' | 'checking'>('checking');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      setStatus('error');
      setMessage('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local');
      return;
    }

    try {
      // Instanciamos el cliente (sin llamadas aún)
      createClient();
      setStatus('ok');
      setMessage('Entorno cargado y cliente de Supabase instanciado.');
    } catch (e: any) {
      setStatus('error');
      setMessage(e?.message ?? 'Error creando el cliente de Supabase');
    }
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>ticketsOHM — Frontend base</h1>
      <p style={{ marginBottom: 12 }}>
        Project ref: <code>kldavlcvwrmkqbifplxh</code>
      </p>

      <div
        style={{
          padding: 12,
          borderRadius: 8,
          border: '1px solid #ddd',
          background:
            status === 'ok' ? '#f0fff4' : status === 'error' ? '#fff5f5' : '#f7fafc',
        }}
      >
        <strong>Estado:</strong> {status.toUpperCase()}
        <div style={{ marginTop: 8 }}>{message}</div>
      </div>

      <p style={{ marginTop: 16, color: '#666' }}>
        Próximo paso: listar tickets desde <code>v_ticket_last_event</code>, comentar por RPC y suscribirse a Realtime.
      </p>
    </main>
  );
}
