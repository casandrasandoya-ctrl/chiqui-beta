import { createVetClient } from '@/utils/supabase/vet-client'

interface Props {
  searchParams: { token?: string }
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function fmt(f: string) { const d = new Date(f + 'T00:00:00'); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}` }
const EC: Record<string,string> = { verde:'#4CAF7D', amarillo:'#F5C842', naranjo:'#F07A30', rojo:'#E05252' }
const EL: Record<string,string> = { verde:'Todo bien', amarillo:'Atención leve', naranjo:'Síntoma notable', rojo:'Alerta' }

const CATEGORIAS_EXAMEN: Record<string, { label: string; icon: string }> = {
  hemograma: { label: 'Hemograma', icon: '🩸' },
  bioquimico: { label: 'Perfil bioquímico', icon: '🧪' },
  orina: { label: 'Orina', icon: '🚽' },
  corazon: { label: 'Corazón', icon: '❤️' },
  otro: { label: 'Otro', icon: '📄' },
}

function calcEdad(f: string): string {
  const h = new Date(), n = new Date(f)
  const m = (h.getFullYear() - n.getFullYear()) * 12 + (h.getMonth() - n.getMonth())
  return m < 12 ? `${m} meses` : `${Math.floor(m/12)} años${m%12>0?` ${m%12} meses`:''}`
}

export default async function VetPage({ searchParams }: Props) {
  const token = searchParams?.token

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#F5EDE3]">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-[#3D2B1F] mb-2">Link inválido</h1>
        <p className="text-[#8A7560] text-sm">Este link no es válido o ha expirado.</p>
      </div>
    )
  }

  // Cliente especial con service_role: no depende de sesion ni cookies.
  // La seguridad real la aplica la funcion obtener_datos_veterinario,
  // que valida el token antes de devolver cualquier dato.
  const supabase = createVetClient()

  const { data: datos, error } = await supabase
    .rpc('obtener_datos_veterinario', { token_param: token })

  if (error || !datos) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#F5EDE3]">
        <div className="text-5xl mb-4">⏰</div>
        <h1 className="text-xl font-bold text-[#3D2B1F] mb-2">Link expirado</h1>
        <p className="text-[#8A7560] text-sm">Este link ya no está activo. Pide al tutor que genere uno nuevo.</p>
      </div>
    )
  }

  const mascota = datos.mascota
  const registros = datos.registros || []
  const vacunas = datos.vacunas || []
  const antis = datos.antiparasitarios || []
  const obs = datos.observaciones || []
  const examenes = datos.examenes || []
  const enfermedades = datos.enfermedades || []
  const medicamentos = datos.medicamentos || []

  // Generar URLs firmadas (validas 60 segundos) para los PDFs de examenes.
  // Estos archivos ya fueron confirmados por la funcion segura como
  // pertenecientes a esta mascota especifica, asi que es seguro firmarlos.
  const examenesConUrl = await Promise.all(
    examenes.map(async (ex: any) => {
      const { data: signed } = await supabase.storage
        .from('examenes')
        .createSignedUrl(ex.archivo_path, 60)
      return { ...ex, signedUrl: signed?.signedUrl || null }
    })
  )

  return (
    <div className="min-h-screen bg-[#F5EDE3] text-[#3D2B1F] pb-12 max-w-lg mx-auto">

      <div className="bg-gradient-to-b from-[#8C572F] to-[#F5EDE3] text-white px-5 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🐶</span>
          <div>
            <div className="text-xs font-bold text-[#FFBD59] tracking-widest uppercase">CHIQUI Entre Señales</div>
            <div className="text-xs text-white/80">Vista veterinaria · Solo lectura</div>
          </div>
        </div>
        <h1 className="text-2xl font-bold">{mascota.nombre}</h1>
        <p className="text-white/80 text-sm mt-1">
          {mascota.especie}{mascota.raza ? ` · ${mascota.raza}` : ''}
          {mascota.fecha_nacimiento ? ` · ${calcEdad(mascota.fecha_nacimiento)}` : ''}
          {mascota.sexo ? ` · ${mascota.sexo}` : ''}
          {mascota.castrado ? ' · Castrado/a' : ''}
        </p>
        {mascota.alergias && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E05252]/20 text-white">
            ⚠️ Alergia: {mascota.alergias}
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">

        <div className="bg-[#FFFCF8] rounded-2xl p-4 border border-[#EEE2D4]">
          <h2 className="font-bold text-xs text-[#8A7560] uppercase tracking-wider mb-3">Ficha del paciente</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Peso actual', mascota.peso_actual ? `${mascota.peso_actual} kg` : '—'],
              ['Alimentación', mascota.alimentacion_tipo || '—'],
              ['Marca / proteína', mascota.alimentacion_marca || '—'],
              ['Microchip', mascota.microchip || '—'],
              ['Veterinaria habitual', mascota.veterinaria || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-[#8A7560]">{k}</p>
                <p className="text-sm font-semibold mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {obs.length > 0 && (
          <div className="bg-[#FBEAD9] rounded-2xl p-4 border border-[#F07A30]/20">
            <h2 className="font-bold text-xs text-[#F07A30] uppercase tracking-wider mb-3">⚠️ Observaciones activas</h2>
            {obs.map((o: any) => (
              <div key={o.id} className="mb-3 last:mb-0">
                <p className="font-bold text-sm">{o.titulo}</p>
                {o.descripcion && <p className="text-sm text-[#8A7560] mt-0.5">{o.descripcion}</p>}
                <p className="text-xs text-[#8A7560] mt-1">Desde: {fmt(o.fecha_inicio)}</p>
                {o.foto_url && (
                  <img src={o.foto_url} alt={o.titulo} className="w-full h-40 object-cover rounded-xl mt-2" />
                )}
              </div>
            ))}
          </div>
        )}

        {examenesConUrl.length > 0 && (
          <div>
            <h2 className="font-bold text-xs text-[#8A7560] uppercase tracking-wider mb-3">📄 Exámenes</h2>
            <div className="space-y-2">
              {examenesConUrl.map((ex: any) => {
                const cat = CATEGORIAS_EXAMEN[ex.categoria] || CATEGORIAS_EXAMEN.otro
                return (
                  <div key={ex.id} className="bg-[#FFFCF8] rounded-xl p-3 border border-[#EEE2D4]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{cat.icon}</span>
                        <div>
                          <p className="font-semibold text-sm">{ex.nombre || cat.label}</p>
                          <p className="text-xs text-[#8A7560]">{cat.label} · {fmt(ex.fecha)}</p>
                        </div>
                      </div>
                    </div>
                    {ex.nota && <p className="text-xs text-[#8A7560] mt-2 italic">📝 {ex.nota}</p>}
                    {ex.signedUrl ? (
                      <a
                        href={ex.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-3 bg-[#8C572F]/10 text-[#8C572F] font-bold py-2 rounded-xl text-sm inline-flex items-center justify-center"
                      >
                        📄 Ver / descargar PDF
                      </a>
                    ) : (
                      <p className="text-xs text-[#8A7560] mt-2">No se pudo generar el enlace al archivo.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {registros.length > 0 && (
          <div>
            <h2 className="font-bold text-xs text-[#8A7560] uppercase tracking-wider mb-3">Registros recientes ({registros.length})</h2>
            <div className="space-y-2">
              {registros.map((r: any) => (
                <div key={r.id} className="bg-[#FFFCF8] rounded-xl p-3 border border-[#EEE2D4]">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">{fmt(r.fecha)}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${EC[r.estado_dia]}20`, color: EC[r.estado_dia] }}>
                      {EL[r.estado_dia]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {[['Energía','energia'],['Ánimo','animo'],['Apetito','apetito'],['Agua','agua'],['Digestión','digestion'],['Pelaje','pelaje'],['Conducta','conducta'],['Movilidad','movilidad']].filter(([,k]) => r[k] && r[k] !== 'normal').map(([label, key]) => (
                      <span key={key} className="text-xs text-[#8A7560]">
                        <span className="font-medium text-[#3D2B1F]">{label}:</span> {r[key].replace(/_/g,' ')}
                      </span>
                    ))}
                  </div>
                  {r.nota && <p className="text-xs text-[#8A7560] mt-1 italic">📝 {r.nota}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {vacunas.length > 0 && (
          <div>
            <h2 className="font-bold text-xs text-[#8A7560] uppercase tracking-wider mb-3">💉 Vacunas</h2>
            <div className="space-y-2">
              {vacunas.map((v: any) => (
                <div key={v.id} className="bg-[#FFFCF8] rounded-xl p-3 border border-[#EEE2D4]">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{v.nombre}</p>
                    {v.proxima_fecha && <p className="text-xs text-[#8A7560]">Próxima: {fmt(v.proxima_fecha)}</p>}
                  </div>
                  <p className="text-xs text-[#8A7560] mt-0.5">Aplicada: {fmt(v.fecha_aplicacion)}{v.lote ? ` · Lote: ${v.lote}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {antis.length > 0 && (
          <div>
            <h2 className="font-bold text-xs text-[#8A7560] uppercase tracking-wider mb-3">💊 Antiparasitarios</h2>
            <div className="space-y-2">
              {antis.map((a: any) => (
                <div key={a.id} className="bg-[#FFFCF8] rounded-xl p-3 border border-[#EEE2D4]">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{a.nombre}</p>
                    {a.proxima_fecha && <p className="text-xs text-[#8A7560]">Próxima: {fmt(a.proxima_fecha)}</p>}
                  </div>
                  <p className="text-xs text-[#8A7560] mt-0.5">{a.tipo} · {a.forma} · {fmt(a.fecha_aplicacion)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {medicamentos.length > 0 && (
          <div>
            <h2 className="font-bold text-xs text-[#8A7560] uppercase tracking-wider mb-3">🩹 Medicamentos</h2>
            <div className="space-y-2">
              {medicamentos.map((med: any) => (
                <div key={med.id} className="bg-[#FFFCF8] rounded-xl p-3 border border-[#EEE2D4]">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{med.nombre}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${med.estado === 'activo' ? 'bg-[#4AABDB]/20 text-[#4AABDB]' : 'bg-[#EEE2D4] text-[#8A7560]'}`}>
                      {med.estado === 'activo' ? 'Activo' : 'Finalizado'}
                    </span>
                  </div>
                  {med.dosis && <p className="text-xs text-[#8A7560] mt-0.5">{med.dosis}{med.frecuencia ? ` · ${med.frecuencia}` : ''}</p>}
                  <p className="text-xs text-[#8A7560] mt-0.5">Desde: {fmt(med.fecha_inicio)}{med.fecha_fin ? ` hasta ${fmt(med.fecha_fin)}` : ''}</p>
                  {med.motivo && <p className="text-xs text-[#8A7560] mt-0.5">Motivo: {med.motivo}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {enfermedades.length > 0 && (
          <div>
            <h2 className="font-bold text-xs text-[#8A7560] uppercase tracking-wider mb-3">🏥 Enfermedades</h2>
            <div className="space-y-2">
              {enfermedades.map((enf: any) => {
                const estadoColor: Record<string,string> = { activa: '#F07A30', cronica: '#E05252', resuelta: '#4CAF7D' }
                const estadoLabel: Record<string,string> = { activa: 'Activa', cronica: 'Crónica', resuelta: 'Resuelta' }
                return (
                  <div key={enf.id} className="bg-[#FFFCF8] rounded-xl p-3 border border-[#EEE2D4]">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{enf.diagnostico}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: `${estadoColor[enf.estado]}20`, color: estadoColor[enf.estado] }}>
                        {estadoLabel[enf.estado] || enf.estado}
                      </span>
                    </div>
                    <p className="text-xs text-[#8A7560] mt-0.5">Diagnosticada: {fmt(enf.fecha_diagnostico)}{enf.veterinario ? ` · ${enf.veterinario}` : ''}</p>
                    {enf.nota && <p className="text-xs text-[#8A7560] mt-1 italic">📝 {enf.nota}</p>}
                    {enf.foto_url && (
                      <img src={enf.foto_url} alt={enf.diagnostico} className="w-full h-40 object-cover rounded-xl mt-2" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="text-center pt-4 border-t border-[#EEE2D4]">
          <p className="text-xs text-[#8A7560] leading-relaxed">
            Generado por CHIQUI Entre Señales<br/>
            Información de observación del tutor. No reemplaza la evaluación clínica.
          </p>
        </div>

      </div>
    </div>
  )
}
