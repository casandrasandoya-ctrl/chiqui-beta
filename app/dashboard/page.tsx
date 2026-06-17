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

  return (
    <div className="min-h-screen pb-24 fade-in">

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex flex-col">
          <span className="text-xs text-[#8A8FA8] tracking-wide capitalize">{dias[today.getDay()]}, {today.getDate()} {meses[today.getMonth()]} {today.getFullYear()}</span>
          <span className="font-heading text-xl font-extrabold">Hola 👋</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#232840] border-2 border-[#E8A84C] flex items-center justify-center text-lg">
          🐾
        </div>
      </div>

      {/* HERO */}
      <div className="relative mx-4 mb-4 bg-[#232840] rounded-2xl border border-white/[0.07] p-5 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #4CAF7D, #3DD6B5)' }} />

        <div className="flex items-start gap-3.5">
          <div className="relative w-16 h-16 rounded-full bg-[#1E2333] border-2 border-[#4CAF7D] flex items-center justify-center text-4xl flex-shrink-0">
            🐶
            <div className="bandana" style={{ background: '#4CAF7D' }} />
          </div>
          <div className="flex-1 pt-0.5">
            <div className="font-heading text-lg font-extrabold leading-none">{m.nombre}</div>
            <div className="text-xs text-[#8A8FA8] mt-1 mb-2">
              {m.especie}{m.raza ? ` mestizo` : ''}{m.sexo ? ` · ${m.sexo}` : ''}{m.color ? ` · ${m.color}` : ''}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${color}26`, border: `1px solid ${color}4D`, color }}>
              <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: color }} />
              {estadoLabel}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-white/[0.07]">
          <div className="text-center">
            <div className="font-heading text-base font-extrabold">{m.fecha_nacimiento ? calcEdad(m.fecha_nacimiento) : '—'}</div>
            <div className="text-[10px] text-[#8A8FA8] mt-0.5">Edad</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-base font-extrabold text-[#F07A30]">{m.peso_actual ? `${m.peso_actual} kg` : '—'}</div>
            <div className="text-[10px] text-[#8A8FA8] mt-0.5">Peso actual</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-base font-extrabold">{m.castrado ? 'Castrado' : 'Entero'}</div>
            <div className="text-[10px] text-[#8A8FA8] mt-0.5">Estado</div>
          </div>
        </div>

        <div className="mt-3.5 px-3 py-2.5 bg-[#1E2333] rounded-[10px] border-l-[3px] border-[#E8A84C] text-xs leading-relaxed">
          <span className="text-[#E8A84C] font-bold">Chiqui dice:</span>{' '}
          {!regHoy
            ? `"¿Cómo estuvo ${m.nombre} hoy? Registra sus señales del día."`
            : '"Ya tengo el registro de hoy. Gracias por observar."'}
        </div>
      </div>

      {/* ALERT BANNER - observación activa */}
      {obsActiva && (
        <div className="mx-4 mb-3 bg-[#F07A30]/10 border border-[#F07A30]/30 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2.5">
          <span className="text-lg flex-shrink-0">👁️</span>
          <p className="text-xs leading-relaxed">
            <strong className="text-[#F07A30]">En observación:</strong> {obsActiva.titulo}, desde {fmtFecha(obsActiva.fecha_inicio)}.
          </p>
        </div>
      )}

      {/* BOTÓN REGISTRAR HOY */}
      {!regHoy && (
        <Link href="/registro-diario" className="mx-4 mb-4 bg-[#E8A84C] rounded-2xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">✏️</div>
            <div className="text-left">
              <div className="font-heading text-[15px] font-extrabold text-[#1A1200]">Registrar hoy</div>
              <div className="text-[11px] text-[#1A1200]/60 mt-0.5">¿Cómo estuvo {m.nombre}?</div>
            </div>
          </div>
          <span className="text-xl text-[#1A1200]/50">›</span>
        </Link>
      )}

      {/* PRÓXIMOS */}
      {(proximaVacuna || proximoAnti || proximoMed || proximaRevisionEnf) && (
        <>
          <div className="flex items-center justify-between px-5 pb-2.5">
            <span className="font-heading text-[13px] font-bold text-[#8A8FA8] uppercase tracking-wider">Próximos</span>
            <Link href="/prevencion" className="text-xs text-[#E8A84C] font-semibold">Ver todo</Link>
          </div>
          <div className="mx-4 mb-4 bg-[#232840] rounded-2xl border border-white/[0.07] overflow-hidden">
            {proximaVacuna && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] last:border-b-0">
                <div className="w-9 h-9 rounded-lg bg-[#4CAF7D]/15 flex items-center justify-center text-base flex-shrink-0">💉</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{proximaVacuna.nombre}</p>
                  <p className="text-xs text-[#8A8FA8]">{fmtFecha(proximaVacuna.proxima_fecha)}</p>
                </div>
                <span className="font-heading text-xs font-bold text-[#4CAF7D]">{diasR(proximaVacuna.proxima_fecha)}</span>
              </div>
            )}
            {proximoAnti && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] last:border-b-0">
                <div className="w-9 h-9 rounded-lg bg-[#F5C842]/15 flex items-center justify-center text-base flex-shrink-0">💊</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{proximoAnti.nombre}</p>
                  <p className="text-xs text-[#8A8FA8]">{fmtFecha(proximoAnti.proxima_fecha)}</p>
                </div>
                <span className="font-heading text-xs font-bold text-[#F5C842]">{diasR(proximoAnti.proxima_fecha)}</span>
              </div>
            )}
            {proximoMed && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] last:border-b-0">
                <div className="w-9 h-9 rounded-lg bg-[#4AABDB]/15 flex items-center justify-center text-base flex-shrink-0">🩹</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{proximoMed.nombre}</p>
                  <p className="text-xs text-[#8A8FA8]">Control: {fmtFecha(proximoMed.proximo_control)}</p>
                </div>
                <span className="font-heading text-xs font-bold text-[#4AABDB]">{diasR(proximoMed.proximo_control)}</span>
              </div>
            )}
            {proximaRevisionEnf && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] last:border-b-0">
                <div className="w-9 h-9 rounded-lg bg-[#E05252]/15 flex items-center justify-center text-base flex-shrink-0">🏥</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{proximaRevisionEnf.diagnostico}</p>
                  <p className="text-xs text-[#8A8FA8]">Revisión: {fmtFecha(proximaRevisionEnf.proxima_revision)}</p>
                </div>
                <span className="font-heading text-xs font-bold text-[#E05252]">{diasR(proximaRevisionEnf.proxima_revision)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ACCESOS RÁPIDOS */}
      <div className="px-5 pb-2.5">
        <span className="font-heading text-[13px] font-bold text-[#8A8FA8] uppercase tracking-wider">Accesos rápidos</span>
      </div>
      <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
        {[
          { href: '/calendario', icon: '📅', label: 'Calendario' },
          { href: '/analisis', icon: '📊', label: 'Análisis' },
          { href: '/prevencion', icon: '🛡️', label: 'Prevención' },
          { href: '/perfil', icon: '🐾', label: 'Perfil' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="bg-[#232840] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E8A84C]/15 flex items-center justify-center text-lg flex-shrink-0">
              {item.icon}
            </div>
            <span className="text-sm font-semibold">{item.label}</span>
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
