import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DashboardContenido from '@/components/DashboardContenido'

function calcEdad(f: string) {
  const h = new Date(), n = new Date(f)
  const m = (h.getFullYear() - n.getFullYear()) * 12 + (h.getMonth() - n.getMonth())
  return m < 12 ? `${m}m` : m % 12 > 0 ? `${Math.floor(m / 12)}a ${m % 12}m` : `${Math.floor(m / 12)}a`
}
function diasR(f: string) {
  const diff = Math.round((new Date(f + 'T00:00:00').getTime() - new Date().getTime()) / 86400000)
  return diff <= 0 ? 'Hoy' : diff === 1 ? 'Mañana' : diff < 30 ? `${diff}d` : diff < 365 ? `${Math.round(diff / 30)}m` : `${Math.round(diff / 365)}a`
}

// Colores de semáforo de salud: se mantienen igual, separados de la paleta
// de marca, porque tienen un significado clínico que no debe cambiar.
const EC: Record<string, string> = { verde: '#4CAF7D', amarillo: '#F5C842', naranjo: '#F07A30', rojo: '#E05252' }
const EL: Record<string, string> = { verde: 'Todo al día', amarillo: 'Atención leve', naranjo: 'Síntoma notable', rojo: 'Alerta' }

interface Props {
  searchParams: { mascota?: string }
}

export default async function Dashboard({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Traemos TODAS las mascotas del usuario (liviano: solo lo necesario
  // para el selector), para saber cuales existen y poder elegir cual
  // mostrar como activa.
  const { data: mascotas } = await supabase
    .from('mascotas')
    .select('id, nombre, especie, raza, foto_url')
    .order('created_at', { ascending: true })

  if (!mascotas || !mascotas.length) redirect('/mascota/nueva')

  // La mascota activa es la indicada por el parametro ?mascota=ID en la
  // URL (que el selector del lado del cliente controla), o si no viene
  // ninguna, la primera mascota como respaldo inicial. La logica de
  // "recordar la ultima elegida" vive en el cliente (localStorage), que
  // redirige agregando el parametro si hace falta -- ver DashboardContenido.
  const mascotaIdParam = searchParams?.mascota
  const mascotaActivaResumen = mascotas.find(m => m.id === mascotaIdParam) || mascotas[0]

  // Ahora si, traemos los datos completos SOLO de la mascota activa.
  const { data: mascota } = await supabase
    .from('mascotas')
    .select('*')
    .eq('id', mascotaActivaResumen.id)
    .single()

  if (!mascota) redirect('/mascota/nueva')

  const m = mascota
  const hoy = new Date().toISOString().split('T')[0]

  const [{ data: regHoy }, { data: vacunas }, { data: antis }, { data: obs }, { data: medsConControl }, { data: enfsConRevision }] = await Promise.all([
    supabase.from('registros_diarios').select('estado_dia').eq('mascota_id', m.id).eq('fecha', hoy).single(),
    supabase.from('vacunas').select('nombre,proxima_fecha').eq('mascota_id', m.id).gte('proxima_fecha', hoy).order('proxima_fecha').limit(2),
    supabase.from('antiparasitarios').select('nombre,proxima_fecha').eq('mascota_id', m.id).gte('proxima_fecha', hoy).order('proxima_fecha').limit(2),
    supabase.from('observaciones').select('titulo,fecha_inicio').eq('mascota_id', m.id).eq('estado', 'activa').limit(1),
    supabase.from('medicamentos').select('nombre,proximo_control').eq('mascota_id', m.id).gte('proximo_control', hoy).order('proximo_control').limit(2),
    supabase.from('enfermedades').select('diagnostico,proxima_revision').eq('mascota_id', m.id).gte('proxima_revision', hoy).order('proxima_revision').limit(2),
  ])

  const color = regHoy?.estado_dia ? EC[regHoy.estado_dia] : '#4CAF7D'
  const estadoLabel = regHoy?.estado_dia ? EL[regHoy.estado_dia] : 'Sin registro hoy'

  const proximaVacuna = vacunas?.[0]
  const proximoAnti = antis?.[0]
  const obsActiva = obs?.[0]
  const proximoMed = medsConControl?.[0]
  const proximaRevisionEnf = enfsConRevision?.[0]

  // Tarjetas de "Próximos" en formato grid 2x2. Se incluye solo si hay
  // datos reales -- si no hay ninguno, no se muestra la sección entera.
  const proximosItems = [
    proximaVacuna && {
      label: 'Vacunas', sub: proximaVacuna.nombre, dias: diasR(proximaVacuna.proxima_fecha), color: '#3B8C5E',
    },
    proximoAnti && {
      label: 'Antiparasitarios', sub: proximoAnti.nombre, dias: diasR(proximoAnti.proxima_fecha), color: '#CD7421',
    },
    proximoMed && {
      label: 'Medicamentos', sub: proximoMed.nombre, dias: diasR(proximoMed.proximo_control), color: '#4AABDB',
    },
    proximaRevisionEnf && {
      label: 'Enfermedades', sub: proximaRevisionEnf.diagnostico, dias: diasR(proximaRevisionEnf.proxima_revision), color: '#E05252',
    },
  ].filter(Boolean) as { label: string; sub: string; dias: string; color: string }[]

  const edad = m.fecha_nacimiento ? calcEdad(m.fecha_nacimiento) : null

  return (
    <DashboardContenido
      mascotas={mascotas}
      mascota={m}
      edad={edad}
      color={color}
      estadoLabel={estadoLabel}
      obsActiva={obsActiva}
      proximosItems={proximosItems}
      tieneRegistroHoy={!!regHoy}
    />
  )
}
