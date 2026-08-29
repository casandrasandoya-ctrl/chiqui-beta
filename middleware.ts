import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
export async function middleware(request: NextRequest) {
  // ARCHIVOS_ESTATICOS: el middleware NO debe correr sobre ellos.
  //
  // Se estaba ejecutando sobre /sw.js —el service worker— y se colgaba
  // 25 segundos, tumbando la carga de toda la app con un
  // MIDDLEWARE_INVOCATION_TIMEOUT.
  //
  // Ninguno de estos archivos necesita verificacion de sesion: son
  // estaticos y los sirve el CDN.
  const ruta = request.nextUrl.pathname
  if (
    ruta === '/sw.js' ||
    ruta === '/manifest.webmanifest' ||
    ruta === '/favicon.ico' ||
    ruta === '/robots.txt' ||
    ruta.startsWith('/icon-') ||
    ruta.startsWith('/chiqui/') ||
    /\.[a-z0-9]+$/i.test(ruta)
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const protectedPaths = ['/dashboard', '/mascota', '/calendario', '/prevencion', '/analisis', '/perfil']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  if (user && (request.nextUrl.pathname === '/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }
  return supabaseResponse
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|vet).*)'] }
