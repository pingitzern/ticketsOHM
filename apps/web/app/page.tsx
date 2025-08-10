'use client'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Asset = {
  id: string
  tag: string | null
  model: string | null
  location: string | null
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert('Login requerido'); setLoading(false); return }

      const { data: profile, error: eProf } = await supabase
        .from('profiles').select('tenant_id').eq('id', user.id).single()
      if (eProf || !profile) { alert('Sin perfil/tenant. Ejecutá el seed.'); setLoading(false); return }
      setTenantId(profile.tenant_id)

      const { data, error } = await supabase
        .from('assets')
        .select('id,tag,model,location')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
      if (error) alert(error.message)
      else setAssets((data || []) as Asset[])
      setLoading(false)
    }
    load()
  }, [])

  const downloadQR = (assetId?: string) => {
    const url = assetId
      ? `/api/qr?asset_id=${encodeURIComponent(assetId)}`
      : `/api/qr?all=1`
    window.open(url, '_blank')
  }

  return (
    <main>
      <h2>Assets</h2>
      <div style={{ margin: '12px 0', display:'flex', gap:8 }}>
        <button onClick={() => downloadQR(undefined)} disabled={!assets.length}>QR de todos (PDF)</button>
        <a href="/tickets" style={{ marginLeft: 'auto' }}>Ir a Tickets</a>
      </div>
      {loading && <p>Cargando…</p>}
      {!loading && !assets.length && <p>No hay assets aún.</p>}
      <ul>
        {assets.map(a => (
          <li key={a.id} style={{ padding:'8px 0', borderBottom:'1px solid #eee', display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ flex:1 }}>
              <strong>{a.tag || a.id.slice(0,8)}</strong>
              <div style={{ opacity:0.7 }}>
                {a.model || '—'} · {a.location || '—'}
              </div>
            </div>
            <button onClick={() => downloadQR(a.id)}>QR (PDF)</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
