import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if(!service) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY requerido en el servidor' }, { status: 500 })

  const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${service}` } } })
  // Recupera el usuario actual via auth admin (requiere service key). En demo, pedimos el último usuario autenticado no es trivial;
  // alternativa: crear un usuario de prueba si no hay sesión. Simplificamos pidiendo email por query en producción.
  // Para demo: si no existe usuario, creamos uno fijo.
  const email = 'demo@local.test'
  const password = 'demo1234'

  // Ensure user exists
  // @ts-ignore - using admin endpoint via service role
  const { data: signUp, error: e1 } = await client.auth.admin.createUser({ email, password, email_confirm: true })
  // ignore if exists

  // Fetch user id
  // @ts-ignore
  const { data: users } = await client.auth.admin.listUsers()
  const user = users.users.find((u:any) => u.email === email)
  if(!user) return NextResponse.json({ error: 'No se encontró/creó el usuario demo' }, { status: 500 })

  // Call seed function
  const { error: e2 } = await client.rpc('seed_demo', { user_id: user.id })
  if(e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  return NextResponse.json({ ok: true, demoUser: { email, password } })
}
