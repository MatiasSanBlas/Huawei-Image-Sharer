// Keep-alive para Supabase.
//
// Hace una consulta ligera a la tabla `user_profiles` usando la service role key
// (bordea RLS, así que siempre funciona aunque la tabla esté vacía). El único fin
// es que Supabase detecte actividad en la base de datos y no pause el proyecto
// (el free tier pausa proyectos tras ~7 días de inactividad).
//
// Pensado para correr 1 vez al día vía GitHub Actions cron (.github/workflows/keepalive.yml),
// pero también se puede correr a mano con:  npm run keepalive

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '[keepalive] Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY',
  )
  process.exit(1)
}

const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/user_profiles?select=id&limit=1`

async function keepAlive() {
  const started = new Date().toISOString()
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[keepalive] ${started} -> FAIL ${res.status}: ${body}`)
    process.exit(1)
  }

  console.log(`[keepalive] ${started} -> OK (${res.status})`)
}

keepAlive().catch((err) => {
  console.error('[keepalive] Error inesperado:', err)
  process.exit(1)
})
