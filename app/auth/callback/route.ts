import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Ruta que Google/Supabase llaman de vuelta despues de que la persona
// elige su cuenta de Google. Intercambia el "code" que viene en la URL
// por una sesion real -- sin esto, el login con Google no queda
// realmente conectado, aunque parezca que funciono.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // El registro con email pasa por la pantalla de completar perfil,
      // pero el login con Google entra directo — antes, la fila de
      // perfil_usuario nunca se creaba y el nombre quedaba en NULL
      // (usuarios sin nombre en rankings, cotutores, vista del
      // veterinario). Aquí garantizamos la fila:
      //   - Google entrega el nombre en user_metadata.full_name o .name.
      //   - Si existe, se guarda también en metadata.nombre (de donde
      //     lee el resto de la app) y en perfil_usuario.
      //   - upsert con ignoreDuplicates no pisa a un usuario que ya
      //     tenía nombre; solo crea la fila si falta.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const meta = (user.user_metadata || {}) as Record<string, unknown>
        const nombreGoogle = (meta.nombre || meta.full_name || meta.name || '') as string
        // Sembrar metadata.nombre si vino de Google y aún no existe.
        if (!meta.nombre && nombreGoogle) {
          await supabase.auth.updateUser({ data: { nombre: nombreGoogle } })
        }
        // Crear la fila de perfil solo si no existe (no sobrescribe).
        await supabase
          .from('perfil_usuario')
          .upsert(
            { id: user.id, nombre: nombreGoogle || null },
            { onConflict: 'id', ignoreDuplicates: true }
          )
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si algo fallo, volvemos al login con un aviso.
  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
