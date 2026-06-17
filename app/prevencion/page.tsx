'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'
import PesoTracker from '@/components/PesoTracker'

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function fmt(f: string) { const d = new Date(f + 'T00:00:00'); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}` }
function dias(f: string) {
  const diff = Math.round((new Date(f + 'T00:00:00').getTime() - new Date().getTime()) / 86400000)
  if (diff < 0) return 'Vencido'
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff < 30) return `${diff}d`
  return `${Math.round(diff / 30)}m`
}
function diasColor(f: string) {
  const diff = Math.round((new Date(f + 'T00:00:00').getTime() - new Date().getTime()) / 86400000)
  if (diff < 0) return '#E05252'
  if (diff < 30) return '#F07A30'
  return '#4CAF7D'
}

const CATEGORIAS_EXAMEN: Record<string, { label: string; icon: string }> = {
  hemograma: { label: 'Hemograma', icon: '🩸' },
  bioquimico: { label: 'Perfil bioquímico', icon: '🧪' },
  orina: { label: 'Orina', icon: '🚽' },
  corazon: { label: 'Corazón', icon: '❤️' },
  otro: { label: 'Otro', icon: '📄' },
}

const MAX_ARCHIVO_BYTES = 8 * 1024 * 1024 // 8MB

export default function PrevencionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mascota, setMascota] = useState<any>(null)
  const [vacunas, setVacunas] = useState<any[]>([])
  const [antis, setAntis] = useState<any[]>([])
  const [obs, setObs] = useState<any[]>([])
  const [medicamentos, setMedicamentos] = useState<any[]>([])
  const [enfermedades, setEnfermedades] = useState<any[]>([])
  const [examenes, setExamenes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'peso' | 'vacunas' | 'anti' | 'medicamentos' | 'enfermedades' | 'obs' | 'examenes'>('peso')
  const [modal, setModal] = useState<'vacuna' | 'anti' | 'obs' | 'medicamento' | 'enfermedad' | 'examen' | null>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [archivoExamen, setArchivoExamen] = useState<File | null>(null)
  const [errorExamen, setErrorExamen] = useState('')
  const [urlEnProgreso, setUrlEnProgreso] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: m } = await supabase.from('mascotas').select('*').limit(1).single()
      if (!m) { router.push('/mascota/nueva'); return }
      setMascota(m)
      await cargarDatos(m.id)
      setLoading(false)
    }
    init()
  }, [])

  async function cargarDatos(id: string) {
    const [v, a, o, med, enf, exa] = await Promise.all([
      supabase.from('vacunas').select('*').eq('mascota_id', id).order('fecha_aplicacion', { ascending: false }),
      supabase.from('antiparasitarios').select('*').eq('mascota_id', id).order('fecha_aplicacion', { ascending: false }),
      supabase.from('observaciones').select('*').eq('mascota_id', id).order('created_at', { ascending: false }),
      supabase.from('medicamentos').select('*').eq('mascota_id', id).order('fecha_inicio', { ascending: false }),
      supabase.from('enfermedades').select('*').eq('mascota_id', id).order('fecha_diagnostico', { ascending: false }),
      supabase.from('examenes').select('*').eq('mascota_id', id).order('fecha', { ascending: false }),
    ])
    setVacunas(v.data || [])
    setAntis(a.data || [])
    setObs(o.data || [])
    setMedicamentos(med.data || [])
    setEnfermedades(enf.data || [])
    setExamenes(exa.data || [])
  }

  async function guardar() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !mascota) return
    const base = { mascota_id: mascota.id, user_id: user.id }
    if (modal === 'vacuna') {
      await supabase.from('vacunas').insert({ ...base, ...form })
    } else if (modal === 'anti') {
      await supabase.from('antiparasitarios').insert({ ...base, ...form })
    } else if (modal === 'obs') {
      await supabase.from('observaciones').insert({ ...base, ...form, fecha_inicio: form.fecha_inicio || new Date().toISOString().split('T')[0] })
    } else if (modal === 'medicamento') {
      await supabase.from('medicamentos').insert({ ...base, ...form, fecha_inicio: form.fecha_inicio || new Date().toISOString().split('T')[0], indicado_por_vet: !!form.indicado_por_vet })
    } else if (modal === 'enfermedad') {
      await supabase.from('enfermedades').insert({ ...base, ...form, fecha_diagnostico: form.fecha_diagnostico || new Date().toISOString().split('T')[0] })
    }
    await cargarDatos(mascota.id)
    setModal(null); setForm({}); setSaving(false)
  }

  // Guardar examen es distinto: primero sube el PDF a Storage, y solo si
  // esa subida funciona, se crea la fila en la tabla examenes con la ruta.
  // Si falla cualquiera de los dos pasos, no queda nada huérfano a medias.
  async function guardarExamen() {
    setErrorExamen('')
    if (!archivoExamen) { setErrorExamen('Selecciona un archivo PDF.'); return }
    if (!form.categoria) { setErrorExamen('Selecciona una categoría.'); return }
    if (!form.fecha) { setErrorExamen('Selecciona la fecha del examen.'); return }
    if (archivoExamen.size > MAX_ARCHIVO_BYTES) {
      setErrorExamen('El archivo supera los 8MB. Intenta comprimirlo o sacar una foto en menor resolución.')
      return
    }
    if (archivoExamen.type !== 'application/pdf') {
      setErrorExamen('Solo se aceptan archivos PDF.')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !mascota) { setSaving(false); return }

    const timestamp = Date.now()
    const nombreLimpio = archivoExamen.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/${mascota.id}/${timestamp}_${nombreLimpio}`

    const { error: uploadError } = await supabase.storage.from('examenes').upload(path, archivoExamen, {
      contentType: 'application/pdf',
      upsert: false,
    })

    if (uploadError) {
      setErrorExamen('No se pudo subir el archivo. Intenta de nuevo.')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('examenes').insert({
      mascota_id: mascota.id,
      user_id: user.id,
      categoria: form.categoria,
      nombre: form.nombre || null,
      nota: form.nota || null,
      fecha: form.fecha,
      archivo_path: path,
      archivo_nombre_original: archivoExamen.name,
    })

    if (insertError) {
      // Si falla guardar el registro, eliminamos el archivo ya subido
      // para no dejar un PDF huérfano ocupando espacio sin un registro asociado.
      await supabase.storage.from('examenes').remove([path])
      setErrorExamen('No se pudo guardar el examen. Intenta de nuevo.')
      setSaving(false)
      return
    }

    await cargarDatos(mascota.id)
    setModal(null); setForm({}); setArchivoExamen(null); setSaving(false)
  }

  // Genera una URL firmada temporal (válida 60 segundos) para ver/descargar
  // el PDF. No se guarda la URL en ningún lado porque expira sola.
  async function abrirExamen(examenId: string, path: string) {
    setUrlEnProgreso(examenId)
    const { data, error } = await supabase.storage.from('examenes').createSignedUrl(path, 60)
    setUrlEnProgreso(null)
    if (error || !data) { alert('No se pudo abrir el archivo. Intenta de nuevo.'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function borrarExamen(examenId: string, path: string) {
    if (!confirm('¿Eliminar este examen? Esta acción no se puede deshacer.')) return
    await supabase.storage.from('examenes').remove([path])
    await supabase.from('examenes').delete().eq('id', examenId)
    if (mascota) await cargarDatos(mascota.id)
  }

  const u = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }))
  const IC = "w-full bg-[#1E2333] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E8A84C]/60"
  const SC = "w-full bg-[#1E2333] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm focus:outline-none appearance-none"

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#8A8FA8]">Cargando...</div>

  return (
    <div className="min-h-screen pb-24 fade-in">

      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-extrabold">Salud preventiva</h1>
          <p className="text-xs text-[#8A8FA8]">{mascota?.nombre}</p>
        </div>
        {tab !== 'peso' && (
          <button
            onClick={() => {
              const modalMap: Record<string, any> = { vacunas:'vacuna', anti:'anti', medicamentos:'medicamento', enfermedades:'enfermedad', obs:'obs', examenes:'examen' }
              setModal(modalMap[tab]); setForm({}); setArchivoExamen(null); setErrorExamen('')
            }}
            className="bg-[#E8A84C] text-[#1A1200] text-xs font-bold px-4 py-2 rounded-xl"
          >
            + Agregar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-2 mb-4 overflow-x-auto">
        {[['peso','⚖️ Peso'],['vacunas','💉 Vacunas'],['anti','💊 Antipar.'],['medicamentos','🩹 Medicamentos'],['enfermedades','🏥 Enfermedades'],['obs','👁️ Obs.'],['examenes','📄 Exámenes']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${tab === t ? 'bg-[#E8A84C] text-[#1A1200]' : 'bg-[#232840] text-[#8A8FA8]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* PESO */}
      {tab === 'peso' && mascota && (
        <PesoTracker mascotaId={mascota.id} pesoActual={mascota.peso_actual} />
      )}

      {/* VACUNAS */}
      {tab === 'vacunas' && (
        <div className="mx-4 space-y-3">
          {vacunas.length === 0 && (
            <div className="bg-[#232840] rounded-2xl border border-white/8 p-8 text-center">
              <div className="text-4xl mb-3">💉</div>
              <p className="text-sm text-[#8A8FA8]">Sin vacunas registradas</p>
              <button onClick={() => { setModal('vacuna'); setForm({}) }} className="mt-4 bg-[#E8A84C] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Agregar primera vacuna
              </button>
            </div>
          )}
          {vacunas.map(v => (
            <div key={v.id} className="bg-[#232840] rounded-2xl border border-white/8 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#4CAF7D]/15 flex items-center justify-center text-xl">💉</div>
                    <div>
                      <p className="font-bold text-sm">{v.nombre}</p>
                      <p className="text-xs text-[#8A8FA8] mt-0.5">Aplicada: {fmt(v.fecha_aplicacion)}</p>
                      {v.lote && <p className="text-xs text-[#8A8FA8]">Lote: {v.lote}</p>}
                    </div>
                  </div>
                  {v.proxima_fecha && (
                    <div className="text-right">
                      <p className="text-xs text-[#8A8FA8]">Próxima</p>
                      <p className="text-xs font-bold" style={{ color: diasColor(v.proxima_fecha) }}>{dias(v.proxima_fecha)}</p>
                      <p className="text-xs text-[#8A8FA8]">{fmt(v.proxima_fecha)}</p>
                    </div>
                  )}
                </div>
                {v.nota && <p className="text-xs text-[#8A8FA8] mt-2 italic bg-[#1E2333] rounded-xl p-2">📝 {v.nota}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ANTIPARASITARIOS */}
      {tab === 'anti' && (
        <div className="mx-4 space-y-3">
          {antis.length === 0 && (
            <div className="bg-[#232840] rounded-2xl border border-white/8 p-8 text-center">
              <div className="text-4xl mb-3">💊</div>
              <p className="text-sm text-[#8A8FA8]">Sin antiparasitarios registrados</p>
              <button onClick={() => { setModal('anti'); setForm({}) }} className="mt-4 bg-[#E8A84C] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Agregar primero
              </button>
            </div>
          )}
          {antis.map(a => (
            <div key={a.id} className="bg-[#232840] rounded-2xl border border-white/8 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F5C842]/15 flex items-center justify-center text-xl">💊</div>
                    <div>
                      <p className="font-bold text-sm">{a.nombre}</p>
                      <p className="text-xs text-[#8A8FA8] mt-0.5">{a.tipo} · {a.forma}</p>
                      <p className="text-xs text-[#8A8FA8]">Aplicado: {fmt(a.fecha_aplicacion)}</p>
                    </div>
                  </div>
                  {a.proxima_fecha && (
                    <div className="text-right">
                      <p className="text-xs text-[#8A8FA8]">Próximo</p>
                      <p className="text-xs font-bold" style={{ color: diasColor(a.proxima_fecha) }}>{dias(a.proxima_fecha)}</p>
                    </div>
                  )}
                </div>
                {a.nota && <p className="text-xs text-[#8A8FA8] mt-2 italic bg-[#1E2333] rounded-xl p-2">📝 {a.nota}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MEDICAMENTOS */}
      {tab === 'medicamentos' && (
        <div className="mx-4 space-y-3">
          {medicamentos.length === 0 && (
            <div className="bg-[#232840] rounded-2xl border border-white/8 p-8 text-center">
              <div className="text-4xl mb-3">🩹</div>
              <p className="text-sm text-[#8A8FA8]">Sin medicamentos registrados</p>
              <button onClick={() => { setModal('medicamento'); setForm({}) }} className="mt-4 bg-[#E8A84C] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Agregar medicamento
              </button>
            </div>
          )}
          {medicamentos.map(med => (
            <div key={med.id} className="bg-[#232840] rounded-2xl border border-white/8 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#4AABDB]/15 flex items-center justify-center text-xl">🩹</div>
                    <div>
                      <p className="font-bold text-sm">{med.nombre}</p>
                      {med.dosis && <p className="text-xs text-[#8A8FA8] mt-0.5">{med.dosis}{med.frecuencia ? ` · ${med.frecuencia}` : ''}</p>}
                      <p className="text-xs text-[#8A8FA8]">Desde: {fmt(med.fecha_inicio)}{med.fecha_fin ? ` hasta ${fmt(med.fecha_fin)}` : ''}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${med.estado === 'activo' ? 'bg-[#4AABDB]/20 text-[#4AABDB]' : 'bg-white/10 text-[#8A8FA8]'}`}>
                    {med.estado === 'activo' ? 'Activo' : 'Finalizado'}
                  </span>
                </div>
                {med.motivo && <p className="text-xs text-[#8A8FA8] mt-2">Motivo: {med.motivo}</p>}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs">{med.indicado_por_vet ? '🩺' : '💡'}</span>
                  <span className="text-xs text-[#8A8FA8]">{med.indicado_por_vet ? 'Indicado por veterinario' : 'Sin indicación veterinaria'}</span>
                </div>
                {med.proximo_control && (
                  <div className="flex items-center gap-1.5 mt-2 bg-[#4AABDB]/10 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs">⏰</span>
                    <span className="text-xs text-[#4AABDB] font-semibold">Próximo control: {fmt(med.proximo_control)}</span>
                  </div>
                )}
                {med.nota && <p className="text-xs text-[#8A8FA8] mt-2 italic bg-[#1E2333] rounded-xl p-2">📝 {med.nota}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ENFERMEDADES */}
      {tab === 'enfermedades' && (
        <div className="mx-4 space-y-3">
          {enfermedades.length === 0 && (
            <div className="bg-[#232840] rounded-2xl border border-white/8 p-8 text-center">
              <div className="text-4xl mb-3">🏥</div>
              <p className="text-sm text-[#8A8FA8]">Sin enfermedades registradas</p>
              <button onClick={() => { setModal('enfermedad'); setForm({}) }} className="mt-4 bg-[#E8A84C] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Agregar diagnóstico
              </button>
            </div>
          )}
          {enfermedades.map(enf => {
            const estadoColor: Record<string,string> = { activa: '#F07A30', cronica: '#E05252', resuelta: '#4CAF7D' }
            const estadoLabel: Record<string,string> = { activa: 'Activa', cronica: 'Crónica', resuelta: 'Resuelta' }
            return (
              <div key={enf.id} className="bg-[#232840] rounded-2xl border border-white/8 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${estadoColor[enf.estado]}20` }}>🏥</div>
                      <div>
                        <p className="font-bold text-sm">{enf.diagnostico}</p>
                        <p className="text-xs text-[#8A8FA8] mt-0.5">Diagnosticada: {fmt(enf.fecha_diagnostico)}</p>
                        {enf.veterinario && <p className="text-xs text-[#8A8FA8]">Por: {enf.veterinario}</p>}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: `${estadoColor[enf.estado]}20`, color: estadoColor[enf.estado] }}>
                      {estadoLabel[enf.estado] || enf.estado}
                    </span>
                  </div>
                  {enf.proxima_revision && (
                    <div className="flex items-center gap-1.5 mt-2 bg-[#E05252]/10 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs">⏰</span>
                      <span className="text-xs text-[#E05252] font-semibold">Próxima revisión: {fmt(enf.proxima_revision)}</span>
                    </div>
                  )}
                  {enf.nota && <p className="text-xs text-[#8A8FA8] mt-2 italic bg-[#1E2333] rounded-xl p-2">📝 {enf.nota}</p>}
                  {enf.fecha_resolucion && <p className="text-xs text-[#4CAF7D] mt-2">Resuelta: {fmt(enf.fecha_resolucion)}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* OBSERVACIONES */}
      {tab === 'obs' && (
        <div className="mx-4 space-y-3">
          {obs.length === 0 && (
            <div className="bg-[#232840] rounded-2xl border border-white/8 p-8 text-center">
              <div className="text-4xl mb-3">👁️</div>
              <p className="text-sm text-[#8A8FA8]">Sin observaciones registradas</p>
              <button onClick={() => { setModal('obs'); setForm({}) }} className="mt-4 bg-[#E8A84C] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Agregar observación
              </button>
            </div>
          )}
          {obs.map(o => (
            <div key={o.id} className="bg-[#232840] rounded-2xl border border-white/8 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${o.estado === 'activa' ? 'bg-[#F07A30]' : 'bg-[#4CAF7D]'}`}/>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">{o.titulo}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${o.estado === 'activa' ? 'bg-[#F07A30]/20 text-[#F07A30]' : 'bg-[#4CAF7D]/20 text-[#4CAF7D]'}`}>
                        {o.estado === 'activa' ? 'Activa' : 'Resuelta'}
                      </span>
                    </div>
                    {o.descripcion && <p className="text-xs text-[#8A8FA8] mt-1 leading-relaxed">{o.descripcion}</p>}
                    <p className="text-xs text-[#8A8FA8] mt-1">Desde: {fmt(o.fecha_inicio)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EXÁMENES */}
      {tab === 'examenes' && (
        <div className="mx-4 space-y-3">
          {examenes.length === 0 && (
            <div className="bg-[#232840] rounded-2xl border border-white/8 p-8 text-center">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm text-[#8A8FA8]">Sin exámenes registrados</p>
              <p className="text-xs text-[#8A8FA8]/70 mt-1">Sube hemogramas, perfiles bioquímicos y otros exámenes en PDF</p>
              <button onClick={() => { setModal('examen'); setForm({}); setArchivoExamen(null); setErrorExamen('') }} className="mt-4 bg-[#E8A84C] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Subir primer examen
              </button>
            </div>
          )}
          {examenes.map(ex => {
            const cat = CATEGORIAS_EXAMEN[ex.categoria] || CATEGORIAS_EXAMEN.otro
            return (
              <div key={ex.id} className="bg-[#232840] rounded-2xl border border-white/8 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#9B7FE8]/15 flex items-center justify-center text-xl flex-shrink-0">{cat.icon}</div>
                      <div>
                        <p className="font-bold text-sm">{ex.nombre || cat.label}</p>
                        <p className="text-xs text-[#8A8FA8] mt-0.5">{cat.label} · {fmt(ex.fecha)}</p>
                      </div>
                    </div>
                    <button onClick={() => borrarExamen(ex.id, ex.archivo_path)} className="text-[#8A8FA8] text-sm px-1 flex-shrink-0">✕</button>
                  </div>
                  {ex.nota && <p className="text-xs text-[#8A8FA8] mt-2 italic bg-[#1E2333] rounded-xl p-2">📝 {ex.nota}</p>}
                  <button
                    onClick={() => abrirExamen(ex.id, ex.archivo_path)}
                    disabled={urlEnProgreso === ex.id}
                    className="w-full mt-3 bg-[#9B7FE8]/15 text-[#9B7FE8] font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
                  >
                    {urlEnProgreso === ex.id ? 'Abriendo...' : '📄 Ver / descargar PDF'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL AGREGAR */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="w-full max-w-[480px] bg-[#232840] rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-base">
                {modal === 'vacuna' ? '💉 Nueva vacuna' : modal === 'anti' ? '💊 Nuevo antiparasitario' : modal === 'medicamento' ? '🩹 Nuevo medicamento' : modal === 'enfermedad' ? '🏥 Nuevo diagnóstico' : modal === 'examen' ? '📄 Nuevo examen' : '👁️ Nueva observación'}
              </h2>
              <button onClick={() => setModal(null)} className="text-[#8A8FA8] text-xl">✕</button>
            </div>

            {modal === 'vacuna' && <>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nombre de la vacuna *</label>
                <input className={IC} placeholder="ej. Séxtuple, Antirrábica..." value={form.nombre || ''} onChange={e => u('nombre', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Fecha de aplicación *</label>
                <input type="date" className={IC} value={form.fecha_aplicacion || ''} onChange={e => u('fecha_aplicacion', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Próxima vacunación</label>
                <input type="date" className={IC} value={form.proxima_fecha || ''} onChange={e => u('proxima_fecha', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Lote / Serie</label>
                <input className={IC} placeholder="ej. A16301" value={form.lote || ''} onChange={e => u('lote', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nota</label>
                <input className={IC} placeholder="Observación opcional" value={form.nota || ''} onChange={e => u('nota', e.target.value)}/></div>
            </>}

            {modal === 'anti' && <>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nombre del producto *</label>
                <input className={IC} placeholder="ej. Bravecto, Simparica..." value={form.nombre || ''} onChange={e => u('nombre', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Tipo *</label>
                <select className={SC} value={form.tipo || ''} onChange={e => u('tipo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option>interno</option><option>externo</option><option>ambos</option>
                </select></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Forma</label>
                <select className={SC} value={form.forma || ''} onChange={e => u('forma', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option>pastilla</option><option>liquido</option><option>collar</option><option>otro</option>
                </select></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Fecha de aplicación *</label>
                <input type="date" className={IC} value={form.fecha_aplicacion || ''} onChange={e => u('fecha_aplicacion', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Próxima dosis</label>
                <input type="date" className={IC} value={form.proxima_fecha || ''} onChange={e => u('proxima_fecha', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nota</label>
                <input className={IC} placeholder="Observación opcional" value={form.nota || ''} onChange={e => u('nota', e.target.value)}/></div>
            </>}

            {modal === 'medicamento' && <>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nombre del medicamento *</label>
                <input className={IC} placeholder="ej. Amoxicilina" value={form.nombre || ''} onChange={e => u('nombre', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Dosis</label>
                <input className={IC} placeholder="ej. 250mg, media pastilla" value={form.dosis || ''} onChange={e => u('dosis', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Frecuencia</label>
                <input className={IC} placeholder="ej. cada 12 horas, 1 vez al día" value={form.frecuencia || ''} onChange={e => u('frecuencia', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Motivo</label>
                <input className={IC} placeholder="ej. Infección de oído" value={form.motivo || ''} onChange={e => u('motivo', e.target.value)}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Fecha de inicio *</label>
                  <input type="date" className={IC} value={form.fecha_inicio || ''} onChange={e => u('fecha_inicio', e.target.value)}/></div>
                <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Fecha de término</label>
                  <input type="date" className={IC} value={form.fecha_fin || ''} onChange={e => u('fecha_fin', e.target.value)}/></div>
              </div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Próximo control</label>
                <input type="date" className={IC} value={form.proximo_control || ''} onChange={e => u('proximo_control', e.target.value)}/></div>
              <button type="button" onClick={() => u('indicado_por_vet', form.indicado_por_vet ? '' : 'true')}
                className="w-full flex items-center gap-3 bg-[#1E2333] rounded-xl px-4 py-3 border border-white/10">
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs flex-shrink-0" style={{ background: form.indicado_por_vet ? '#4AABDB' : 'transparent', border: form.indicado_por_vet ? 'none' : '1.5px solid #8A8FA8' }}>
                  {form.indicado_por_vet ? '✓' : ''}
                </div>
                <span className="text-sm">Indicado por veterinario</span>
              </button>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nota</label>
                <input className={IC} placeholder="Observación opcional" value={form.nota || ''} onChange={e => u('nota', e.target.value)}/></div>
            </>}

            {modal === 'enfermedad' && <>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Diagnóstico *</label>
                <input className={IC} placeholder="ej. Displasia de cadera, Gastritis" value={form.diagnostico || ''} onChange={e => u('diagnostico', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Fecha de diagnóstico *</label>
                <input type="date" className={IC} value={form.fecha_diagnostico || ''} onChange={e => u('fecha_diagnostico', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Estado *</label>
                <select className={SC} value={form.estado || ''} onChange={e => u('estado', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="activa">Activa</option>
                  <option value="cronica">Crónica</option>
                  <option value="resuelta">Resuelta</option>
                </select></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Veterinario tratante</label>
                <input className={IC} placeholder="ej. Dr. González, Clínica X" value={form.veterinario || ''} onChange={e => u('veterinario', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Próxima revisión</label>
                <input type="date" className={IC} value={form.proxima_revision || ''} onChange={e => u('proxima_revision', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Notas</label>
                <textarea className={IC} rows={3} placeholder="Detalles del diagnóstico, tratamiento indicado..." value={form.nota || ''} onChange={e => u('nota', e.target.value)}/></div>
            </>}

            {modal === 'obs' && <>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Título *</label>
                <input className={IC} placeholder="ej. Grano en oreja derecha" value={form.titulo || ''} onChange={e => u('titulo', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Tipo</label>
                <select className={SC} value={form.tipo || ''} onChange={e => u('tipo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option>alergia</option><option>enfermedad</option><option>lesion</option><option>comportamiento</option><option>otro</option>
                </select></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Descripción</label>
                <textarea className={IC} rows={3} placeholder="Describe lo observado..." value={form.descripcion || ''} onChange={e => u('descripcion', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Fecha de inicio</label>
                <input type="date" className={IC} value={form.fecha_inicio || ''} onChange={e => u('fecha_inicio', e.target.value)}/></div>
            </>}

            {modal === 'examen' && <>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Categoría *</label>
                <select className={SC} value={form.categoria || ''} onChange={e => u('categoria', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {Object.entries(CATEGORIAS_EXAMEN).map(([key, c]) => (
                    <option key={key} value={key}>{c.icon} {c.label}</option>
                  ))}
                </select></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nombre del examen</label>
                <input className={IC} placeholder="ej. Control anual, Chequeo pre-cirugía" value={form.nombre || ''} onChange={e => u('nombre', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Fecha del examen *</label>
                <input type="date" className={IC} value={form.fecha || ''} onChange={e => u('fecha', e.target.value)}/></div>
              <div>
                <label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Archivo PDF *</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setArchivoExamen(e.target.files?.[0] || null)}
                  className="w-full bg-[#1E2333] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#E8A84C] file:text-[#1A1200] file:text-xs file:font-bold"
                />
                <p className="text-[11px] text-[#8A8FA8] mt-1.5">Máximo 8MB, solo PDF.</p>
                {archivoExamen && <p className="text-xs text-[#4CAF7D] mt-1">✓ {archivoExamen.name} ({(archivoExamen.size / 1024 / 1024).toFixed(1)}MB)</p>}
              </div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nota / resultado</label>
                <textarea className={IC} rows={3} placeholder="ej. Todo normal, colesterol levemente alto..." value={form.nota || ''} onChange={e => u('nota', e.target.value)}/></div>
              {errorExamen && <p className="text-xs text-[#E05252] bg-[#E05252]/10 rounded-xl p-3">{errorExamen}</p>}
            </>}

            <button
              onClick={modal === 'examen' ? guardarExamen : guardar}
              disabled={saving || (modal !== 'examen' && (!form.nombre && !form.titulo && !form.diagnostico))}
              className="w-full bg-[#E8A84C] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-40">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
