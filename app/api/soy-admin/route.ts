import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// ============================================================
// ¿QUIEN ESTÁ CONECTADO ES LA ADMINISTRADORA?
// ============================================================
// El Perfil es un componente de cliente, así que no puede leer
// ADMIN_USER_ID: las variables de entorno sin el prefijo NEXT_PUBLIC
// solo existen en el servidor. Y hacerla pública sería peor — cualquiera
// sabría que /admin existe y de quién es la cuenta.
//
// Por eso la comprobación se hace acá, en el servidor, y hacia afuera
// solo sale un sí o un no. Nunca se devuelve el id ni nada que permita
// deducirlo.
//
// Esto NO es la protección del panel: /admin hace su propia
// verificación y devuelve 404 a quien no corresponda. Esta ruta solo
// decide si se dibuja un botón.

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminId = process.env.ADMIN_USER_ID
  return NextResponse.json({ admin: !!user && !!adminId && user.id === adminId })
}
