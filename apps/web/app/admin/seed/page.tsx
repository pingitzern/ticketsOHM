'use client'
import { useState } from 'react'
export default function SeedPage(){
  const [log, setLog] = useState<string>('')
  const run = async () => {
    setLog('Ejecutando seed...')
    const res = await fetch('/api/admin/seed', { method:'POST' })
    const j = await res.json()
    setLog(JSON.stringify(j, null, 2))
  }
  return (
    <main>
      <h2>Admin / Seed</h2>
      <p>Crea tenant, tu profile, un asset y un ticket demo para el usuario autenticado.</p>
      <button onClick={run}>Crear tenant demo</button>
      <pre style={{ whiteSpace:'pre-wrap', marginTop:12 }}>{log}</pre>
    </main>
  )
}
