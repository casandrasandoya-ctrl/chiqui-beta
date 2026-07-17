import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Ruta que llama el service worker (public/sw.js) automaticamente
// cuando el navegador dispara "pushsubscriptionchange" -- es decir,
// cuando invalida o rota una suscripcion push por su cuenta, sin que
// la persona haga nada. El service worker se vuelve a suscribir solo
// y manda la nueva suscripcion aca, para reemplazar la vieja en la
// base de datos.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { oldEndpoint, newEndpoint, newKeys } = await request.json()

  if (!newEndpoint || !newKeys?.p256dh || !newKeys?.auth) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  // Si sabemos cual era el endpoint viejo, actualizamos esa misma fila
  // en vez de crear una nueva -- mantiene el historial más limpio.
  if (oldEndpoint) {
    await supabase
      .from('suscripciones_push')
      .update({ endpoint: newEndpoint, p256dh: newKeys.p256dh, auth: newKeys.auth })
      .eq('user_id', user.id)
      .eq('endpoint', oldEndpoint)
  }

  // Por si no había fila con ese endpoint viejo (o el navegador no nos
  // dio la suscripción anterior), nos aseguramos de todas formas de
  // que la nueva quede guardada.
  const { error } = await supabase.from('suscripciones_push').upsert({
    user_id: user.id,
    endpoint: newEndpoint,
    p256dh: newKeys.p256dh,
    auth: newKeys.auth,
  }, { onConflict: 'endpoint' })

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar la suscripción' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
