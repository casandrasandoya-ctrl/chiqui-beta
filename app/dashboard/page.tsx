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

const EC: Record<string, string> = { verde: '#4CCB7F', amarillo: '#F5C842', naranjo: '#F39B35', rojo: '#E25D5D' }
const EL: Record<string, string> = { verde: 'Todo bien', amarillo: 'Atención leve', naranjo: 'Síntoma notable', rojo: 'Alerta' }

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mascotas } = await supabase
    .from('mascotas').select('*').order('created_at', { ascending: true })

  if (!mascotas || !mascotas.length) redirect('/mascota/nueva')

  const m = mascotas[0]
  const hoy = new Date().toISOString().split('T')[0]

  const [{ data: regHoy }, { data: vacunas }, { data: antis }] = await Promise.all([
    supabase.from('registros_diarios').select('estado_dia').eq('mascota_id', m.id).eq('fecha', hoy).single(),
    supabase.from('vacunas').select('nombre,proxima_fecha').eq('mascota_id', m.id).gte('proxima_fecha', hoy).order('proxima_fecha').limit(2),
    supabase.from('antiparasitarios').select('nombre,proxima_fecha').eq('mascota_id', m.id).gte('proxima_fecha', hoy).order('proxima_fecha').limit(2),
  ])

  const color = regHoy?.estado_dia ? EC[regHoy.estado_dia] : '#8A8FA8'
  const today = new Date()
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

  return (
    <div className="min-h-screen pb-24 fade-in">
      <div className="px-5 pt-8 pb-4">
        <p className="text-xs text-[#8A8FA8] capitalize">{dias[today.getDay()]} {today.getDate()} de {meses[today.getMonth()]}</p>
        <h1 className="text-xl font-bold mt-0.5">Hola 👋</h1>
      </div>

      <div className="mx-4 mb-4 bg-[#1E2848] rounded-2xl border border-white/8 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-full bg-[#1B2340] border-2 flex items-center justify-center text-3xl flex-shrink-0" style={{ borderColor: color }}>
              🐶
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{m.nombre}</h2>
              <p className="text-xs text-[#8A8FA8] mt-0.5">
                {m.especie}{m.raza ? ` · ${m.raza}` : ''}{m.fecha_nacimiento ? ` · ${calcEdad(m.fecha_nacimiento)}` : ''}
              </p>
              {regHoy?.estado_dia ? (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: `${color}20`, color }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  {EL[regHoy.estado_dia]}
                </div>
              ) : (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-[#8A8FA8]">
                  Sin registro hoy
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 bg-[#1B2340] rounded-xl p-3 flex gap-2.5 border border-[#3DD6B5]/15">
            <span className="text-lg flex-shrink-0">🐶</span>
            <p className="text-xs text-[#F0EEE8] leading-relaxed">
              {!regHoy ? `"¿Cómo estuvo ${m.nombre} hoy? Registra sus señales del día."` : '"Ya tengo el registro de hoy. Gracias por observar."'}
            </p>
          </div>
        </div>
        {!regHoy && (
          <Link href="/registro" className="flex items-center justify-between px-4 py-3.5 bg-[#E3A84A] text-[#1A1200]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">✏️</div>
              <div>
                <p className="text-sm font-bold">Registrar hoy</p>
                <p className="text-xs opacity-60">¿Cómo estuvo {m.nombre}?</p>
              </div>
            </div>
            <span className="text-lg">›</span>
          </Link>
        )}
      </div>

      {((vacunas && vacunas.length > 0) || (antis && antis.length > 0)) && (
        <div className="mx-4 mb-4">
          <h3 className="text-xs font-bold text-[#8A8FA8] uppercase tracking-wider mb-2 px-1">Próximos</h3>
          <div className="bg-[#1E2848] rounded-2xl border border-white/8 overflow-hidden">
            {vacunas?.map((v, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <div className="w-8 h-8 rounded-lg bg-[#4CCB7F]/15 flex items-center justify-center text-base">💉</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{v.nombre}</p>
                  <p className="text-xs text-[#8A8FA8]">{fmtFecha(v.proxima_fecha)}</p>
                </div>
                <span className="text-xs font-bold text-[#4CCB7F]">{diasR(v.proxima_fecha)}</span>
              </div>
            ))}
            {antis?.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <div className="w-8 h-8 rounded-lg bg-[#F5C842]/15 flex items-center justify-center text-base">💊</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{a.nombre}</p>
                  <p className="text-xs text-[#8A8FA8]">{fmtFecha(a.proxima_fecha)}</p>
                </div>
                <span className="text-xs font-bold text-[#F5C842]">{diasR(a.proxima_fecha)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mx-4 mb-4">
        <h3 className="text-xs font-bold text-[#8A8FA8] uppercase tracking-wider mb-2 px-1">Accesos rápidos</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/calendario', icon: '📅', label: 'Calendario' },
            { href: '/prevencion', icon: '🛡️', label: 'Prevención' },
            { href: '/analisis', icon: '📊', label: 'Análisis' },
            { href: '/perfil', icon: '🐾', label: 'Perfil' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="bg-[#1E2848] border border-white/8 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
