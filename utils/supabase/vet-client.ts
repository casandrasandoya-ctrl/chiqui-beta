import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cliente especial SOLO para app/vet/page.tsx.
//
// Por que existe este archivo separado de utils/supabase/server.ts:
// el cliente normal de servidor comparte las cookies de sesion del
// navegador (necesario para el resto de la app, donde el usuario esta
// logueado). Pero /vet es una pagina de "solo token" -- el veterinario
// nunca tiene sesion. Si usaramos el cliente normal, dos problemas:
// 1) Si quien abre el link SI tiene sesion en otra pestana del mismo
//    navegador (ej. la propia Casandra probando), el cliente heredaria
//    esa sesion sin querer, dando una falsa sensacion de que "funciona".
// 2) Sin sesion, las politicas RLS (auth.uid() = user_id) bloquean todo,
//    y la pagina no puede mostrar nada al veterinario real.
//
// Este cliente usa la Service Role Key, que NUNCA se expone al navegador
// (vive solo en este archivo de servidor) y no depende de cookies. El
// control de seguridad real no se pierde: en vez de RLS, depende de que
// la funcion de base de datos "obtener_datos_veterinario" valide el
// token primero, y solo devuelva datos si el token es valido y esta
// activo. Este cliente solo se usa para llamar a esa funcion y para
// generar URLs firmadas de los PDFs de examenes que esa funcion ya
// confirmo que pertenecen a la mascota correcta.
export function createVetClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
