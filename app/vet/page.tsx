import { createClient } from '@/utils/supabase/server'

interface Props {
  searchParams: { token?: string }
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function fmt(f: string) { const d = new Date(f + 'T00:00:00'); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}` }
const EC: Record<string,string> = { verde:'#4CAF7D', amarillo:'#F5C842', naranjo:'#F07A30', rojo:'#E05252' }
const EL: Record<string,string> = { verde:'Todo bien', amarillo:'Atención leve', naranjo:'Síntoma notable', rojo:'Alerta' }

function calcEdad(f: string): string {
  const h = new Date(), n = new Date(f)
  const m = (h.getFullYear() - n.getFullYear()) * 12 + (h.getMonth() - n.getMonth())
  return m < 12 ? `${m} meses` : `${Math.floor(m/12)} años${m%12>0?` ${m%12} meses`:''}`
}

export default async function VetPage({ searchParams }: Props) {
  const token = searchParams?.token

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h1>
        <p className="text-gray-500 text-sm">Este link no es válido o ha expirado.</p>
      </div>
    )
  }

  const supabase = await createClient()

  const { data: link } = await supabase
    .from('links_veterinario')
    .select('*, mascotas(*)')
    .eq('token', token)
    .eq('activo', true)
    .single()

  if (!link) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white">
        <div className="text-5xl mb-4">⏰</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Link expirado</h1>
        <p className="text-gray-500 text-sm">Este link ya no está activo. Pide al tutor que genere uno nuevo.</p>
      </div>
    )
  }

  const mascota = link.mascotas as any

  const [{ data: registros }, { data: vacunas }, { data: antis }, { data: obs }] = await Promise.all([
    supabase.from('registros_diarios').select('*').eq('mascota_id', mascota.id).order('fecha', { ascending: false }).limit(30),
    supabase.from('vacunas').select('*').eq('mascota_id', mascota.id).order('fecha_aplicacion', { ascending: false }),
    supabase.from('antiparasitarios').select('*').eq('mascota_id', mascota.id).order('fecha_aplicacion', { ascending: false }),
    supabase.from('observaciones').select('*').eq('mascota_id', mascota.id).eq('estado', 'activa'),
  ])

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-12 max-w-lg mx-auto">

      <div className="bg-[#0F1117] text-white px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🐶</span>
          <div>
            <div className="text-xs font-bold text-[#E8A84C] tracking-widest uppercase">CHIQUI Entre Señales</div>
            <div className="text-xs text-[#8A8FA8]">Vista veterinaria · Solo lectura</div>
          </div>
        </div>
        <h1 className="text-2xl font-bold">{mascota.nombre}</h1>
        <p className="text-[#8A8FA8] text-sm mt-1">
          {mascota.especie}{mascota.raza ? ` · ${mascota.raza}` : ''}
          {mascota.fecha_nacimiento ? ` · ${calcEdad(mascota.fecha_nacimiento)}` : ''}
          {mascota.sexo ? ` · ${mascota.sexo}` : ''}
          {mascota.castrado ? ' · Castrado/a' : ''}
        </p>
        {mascota.alergias && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300">
            ⚠️ Alergia: {mascota.alergias}
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">

        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <h2 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">Ficha del paciente</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Peso actual', mascota.peso_actual ? `${mascota.peso_actual} kg` : '—'],
              ['Alimentación', mascota.alimentacion_tipo || '—'],
              ['Marca / proteína', mascota.alimentacion_marca || '—'],
              ['Microchip', mascota.microchip || '—'],
              ['Veterinaria habitual', mascota.veterinaria || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-gray-400">{k}</p>
                <p className="text-sm font-semibold mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {obs && obs.length > 0 && (
          <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
            <h2 className="font-bold text-xs text-orange-600 uppercase tracking-wider mb-3">⚠️ Observaciones activas</h2>
            {obs.map(o => (
              <div key={o.id} className="mb-3 last:mb-0">
                <p className="font-bold text-sm">{o.titulo}</p>
                {o.descripcion && <p className="text-sm text-gray-600 mt-0.5">{o.descripcion}</p>}
                <p className="text-xs text-gray-400 mt-1">Desde: {fmt(o.fecha_inicio)}</p>
              </div>
            ))}
          </div>
        )}

        {registros && registros.length > 0 && (
          <div>
            <h2 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">Registros recientes ({registros.length})</h2>
            <div className="space-y-2">
              {registros.map(r => (
                <div key={r.id} className="bg-white rounded-xl p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">{fmt(r.fecha)}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${EC[r.estado_dia]}20`, color: EC[r.estado_dia] }}>
                      {EL[r.estado_dia]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {[['Energía','energia'],['Ánimo','animo'],['Apetito','apetito'],['Agua','agua'],['Digestión','digestion'],['Pelaje','pelaje'],['Conducta','conducta'],['Movilidad','movilidad']].filter(([,k]) => r[k] && r[k] !== 'normal').map(([label, key]) => (
                      <span key={key} className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{label}:</span> {r[key].replace(/_/g,' ')}
                      </span>
                    ))}
                  </div>
                  {r.nota && <p className="text-xs text-gray-400 mt-1 italic">📝 {r.nota}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {vacunas && vacunas.length > 0 && (
          <div>
            <h2 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">💉 Vacunas</h2>
            <div className="space-y-2">
              {vacunas.map(v => (
                <div key={v.id} className="bg-white rounded-xl p-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{v.nombre}</p>
                    {v.proxima_fecha && <p className="text-xs text-gray-400">Próxima: {fmt(v.proxima_fecha)}</p>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Aplicada: {fmt(v.fecha_aplicacion)}{v.lote ? ` · Lote: ${v.lote}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {antis && antis.length > 0 && (
          <div>
            <h2 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">💊 Antiparasitarios</h2>
            <div className="space-y-2">
              {antis.map(a => (
                <div key={a.id} className="bg-white rounded-xl p-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{a.nombre}</p>
                    {a.proxima_fecha && <p className="text-xs text-gray-400">Próxima: {fmt(a.proxima_fecha)}</p>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{a.tipo} · {a.forma} · {fmt(a.fecha_aplicacion)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-300 leading-relaxed">
            Generado por CHIQUI Entre Señales<br/>
            Información de observación del tutor. No reemplaza la evaluación clínica.
          </p>
        </div>

      </div>
    </div>
  )
}
