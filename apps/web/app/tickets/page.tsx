'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function TicketsPage() {
  // auth
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<any>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // UI
  const [pushSending, setPushSending] = useState(false)
  const [result, setResult] = useState<any>(null)

  // cargar sesión + tenant al montar
  useEffect(() => {
    ;(async () => {
      setAuthLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('tenant_id').eq('id', user.id).single()
        setTenantId(profile?.tenant_id || null)
      }
      setAuthLoading(false)
    })()
  }, [])

  const login = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { alert(error.message); return }
    setUser(data.user)
    const { data: profile } = await supabase
      .from('profiles').select('tenant_id').eq('id', data.user.id).single()
    setTenantId(profile?.tenant_id || null)
    setEmail(''); setPassword('')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setTenantId(null)
  }

  const sendPushTest = async () => {
    if (!tenantId) { alert('Falta tenant_id (logueate)'); return }
    setPushSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          title: '🔔 Prueba desde la web',
          body: 'Hola! Esto es una notificación de prueba.',
          data: { source: 'web', ts: Date.now() }
        })
      })
      const json = await res.json()
      setResult(json)
      alert('Respuesta de /api/push en consola')
      console.log('Push /api/push →', json)
    } catch (e: any) {
      alert('Error enviando push: ' + String(e?.message || e))
    } finally {
      setPushSending(false)
    }
  }

  return (
    <main style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <h1>Tickets</h1>

      {/* Auth box */}
      <section style={{ padding:12, border:'1px solid #eee', borderRadius:8, margin:'12px 0' }}>
        {authLoading ? (
          <p>Cargando sesión…</p>
        ) : user ? (
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <span>Logueado como <b>{user.email}</b></span>
            <span>· Tenant: <b>{tenantId || '—'}</b></span>
            <button onClick={logout}>Salir</button>
          </div>
        ) : (
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <input
              placeholder="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }}
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ padding:8, border:'1px solid #ddd', borderRadius:6 }}
            />
            <button onClick={login}>Entrar</button>
          </div>
        )}
      </section>

      {/* Push test */}
      <section style={{ margin:'12px 0', display:'flex', gap:8 }}>
        <button onClick={sendPushTest} disabled={!user || !tenantId || pushSending}>
          {pushSending ? 'Enviando…' : 'Push test'}
        </button>
        {!user && <span style={{ opacity:0.7 }}>→ Logueate arriba para habilitar</span>}
      </section>

      {/* Resultado crudo (debug) */}
      {result && (
        <pre style={{ background:'#f8f8f8', padding:12, borderRadius:8, overflow:'auto' }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}

      <p style={{ opacity:0.7, marginTop:16 }}>
        Tip: asegurate de haber abierto la app en el celular y de que tu token esté en
        <code> push_subscriptions</code>.
      </p>
    </main>
  )
}
