import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import BottomNav from '@/components/BottomNav'

function calcEdad(f: string) {
  const h = new Date(), n = new Date(f)
  const m = (h.getFullYear() - n.getFullYear()) * 12 + (h.getMonth() - n.getMonth())
  return m < 12 ? `${m}m` : m % 12 > 0 ? `${Math.floor(m / 12)}a ${m % 12}m` : `${Math.floor(m / 12)}a`
}
function fmtFecha(f: string) {
  const ms = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const d = new Date(f + 'T00:00:00')
  return `${d.getDate()} ${ms[d.getMonth()]} ${d.getFullYear()}`
}
function diasR(f: string) {
  const diff = Math.round((new Date(f + 'T00:00:00').getTime() - new Date().getTime()) / 86400000)
  return diff <= 0 ? 'Hoy' : diff === 1 ? 'Mañana' : diff < 30 ? `${diff}d` : diff < 365 ? `${Math.round(diff / 30)}m` : `${Math.round(diff / 365)}a`
}

// Colores de semáforo de salud: se mantienen igual, separados de la paleta
// de marca, porque tienen un significado clínico que no debe cambiar.
const EC: Record<string, string> = { verde: '#4CAF7D', amarillo: '#F5C842', naranjo: '#F07A30', rojo: '#E05252' }
const EL: Record<string, string> = { verde: 'Todo al día', amarillo: 'Atención leve', naranjo: 'Síntoma notable', rojo: 'Alerta' }

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mascotas } = await supabase
    .from('mascotas').select('*').order('created_at', { ascending: true })

  if (!mascotas || !mascotas.length) redirect('/mascota/nueva')

  const m = mascotas[0]
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
  const today = new Date()
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

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

  return (
    <div className="min-h-screen pb-24 fade-in bg-[#F5EDE3] text-[#3D2B1F]">

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex flex-col">
          <span className="text-xs text-[#8A7560] tracking-wide capitalize">{dias[today.getDay()]}, {today.getDate()} {meses[today.getMonth()]} {today.getFullYear()}</span>
          <span className="font-heading text-xl font-extrabold text-[#3D2B1F]">Hola 👋</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#FFFCF8] border-2 border-[#FFBD59] flex items-center justify-center overflow-hidden">
          <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-9 h-9 object-contain" />
        </div>
      </div>

      {/* Saludo / banner superior */}
      <div className="mx-4 mb-3 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
        <span className="text-lg flex-shrink-0">🐶</span>
        <p className="text-xs font-semibold text-[#5C4A3A]">Hola, ¿cómo está tu compañero hoy?</p>
      </div>

      {/* HERO */}
      <div className="relative mx-4 mb-4 bg-[#8C572F] rounded-2xl p-5 overflow-hidden">
        <div className="flex items-start gap-3.5">
          <div className="relative w-16 h-16 rounded-full bg-[#FFBD59] border-2 border-[#FFFCF8]/40 flex items-center justify-center text-4xl flex-shrink-0">
            🐶
          </div>
          <div className="flex-1 pt-0.5">
            <div className="font-heading text-lg font-extrabold leading-none text-[#FFFCF8]">{m.nombre}</div>
            <div className="text-xs text-[#F0DEC8] mt-1 mb-2">
              {m.especie}{m.raza ? ` · ${m.raza}` : ''}{m.sexo ? ` · ${m.sexo}` : ''}{m.color ? ` · ${m.color}` : ''}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${color}26`, border: `1px solid ${color}4D`, color: '#FFFCF8' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              {estadoLabel}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-[#FFFCF8]/15">
          <div className="text-center">
            <div className="font-heading text-base font-extrabold text-[#FFFCF8]">{m.fecha_nacimiento ? calcEdad(m.fecha_nacimiento) : '—'}</div>
            <div className="text-[10px] text-[#D9B596] mt-0.5">Edad</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-base font-extrabold text-[#FFFCF8]">{m.peso_actual ? `${m.peso_actual} kg` : '—'}</div>
            <div className="text-[10px] text-[#D9B596] mt-0.5">Peso actual</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-base font-extrabold text-[#FFFCF8]">{m.castrado ? 'Castrado' : 'Entero'}</div>
            <div className="text-[10px] text-[#D9B596] mt-0.5">Estado</div>
          </div>
        </div>
      </div>

      {/* MENSAJE / ESTADO DEL DÍA */}
      <div className="mx-4 mb-3 bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
        <span className="text-lg flex-shrink-0">🐾</span>
        <p className="text-xs leading-relaxed font-semibold text-[#7A4A2F]">
          {!regHoy
            ? `¿Cómo estuvo ${m.nombre} hoy? Registra sus señales del día.`
            : 'Todo registrado el día de hoy. Gracias por observar.'}
        </p>
      </div>

      {/* ALERT BANNER - observación activa */}
      {obsActiva && (
        <div className="mx-4 mb-3 bg-[#EFE4DB] rounded-2xl px-3.5 py-2.5">
          <p className="text-xs leading-relaxed text-[#7A6555]">
            <strong className="text-[#5C4A3A]">En observación:</strong> {obsActiva.titulo}, desde {fmtFecha(obsActiva.fecha_inicio)}.
          </p>
        </div>
      )}

      {/* BOTÓN REGISTRAR HOY */}
      {!regHoy && (
        <Link href="/registro-diario" className="mx-4 mb-4 bg-[#FFBD59] rounded-2xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/30 flex items-center justify-center text-lg">✏️</div>
            <div className="text-left">
              <div className="font-heading text-[15px] font-extrabold text-[#5C3A12]">Registrar hoy</div>
              <div className="text-[11px] text-[#5C3A12]/70 mt-0.5">¿Cómo estuvo {m.nombre}?</div>
            </div>
          </div>
          <span className="text-xl text-[#5C3A12]/50">›</span>
        </Link>
      )}

      {/* PRÓXIMOS — grid 2x2 */}
      {proximosItems.length > 0 && (
        <>
          <div className="flex items-center justify-between px-5 pb-2.5">
            <span className="font-heading text-[13px] font-bold text-[#3D2B1F] uppercase tracking-wider">Próximos</span>
            <Link href="/prevencion" className="text-xs text-[#CD7421] font-semibold">Ver todo</Link>
          </div>
          <div className="mx-4 mb-4 grid grid-cols-2 gap-2.5">
            {proximosItems.map(item => (
              <div key={item.label} className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[12.5px] font-bold text-[#3D2B1F]">{item.label}</p>
                  <span className="text-[10.5px] font-bold" style={{ color: item.color }}>{item.dias}</span>
                </div>
                <p className="text-[11px] text-[#8A7560] leading-tight">{item.sub}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ACCESOS RÁPIDOS */}
      <div className="px-5 pb-2.5">
        <span className="font-heading text-[13px] font-bold text-[#3D2B1F] uppercase tracking-wider">Accesos rápidos</span>
      </div>
      <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
        {[
          { href: '/calendario', label: 'Calendario' },
          { href: '/analisis', label: 'Análisis' },
          { href: '/prevencion', label: 'Prevención' },
          { href: '/perfil', label: 'Perfil' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="bg-[#FFBD59] rounded-2xl p-4 flex items-center justify-center">
            <span className="text-sm font-bold text-[#5C3A12]">{item.label}</span>
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
