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
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si algo fallo, volvemos al login con un aviso.
  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
