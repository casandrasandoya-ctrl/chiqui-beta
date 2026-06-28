'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'
import PesoTracker from '@/components/PesoTracker'
import FechaSelector from '@/components/FechaSelector'
import RespiracionTracker from '@/components/RespiracionTracker'
import TemperaturaTracker from '@/components/TemperaturaTracker'
import ReproduccionTracker from '@/components/ReproduccionTracker'
import SelectorMascota from '@/components/SelectorMascota'
import { determinarMascotaActiva, guardarMascotaActivaId } from '@/utils/mascotaActiva'

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

// Textos de ayuda contextual de Chiqui para cada pestaña, mostrados al
// tocar el icono de interrogacion junto al titulo.
const AYUDA_POR_TAB: Record<string, string> = {
  peso: '🐾 Aquí puedes contarme cuánto pesa tu compañero cada vez que lo controlen, así vemos juntos cómo va cambiando.',
  vacunas: '🐾 Cuéntame qué vacunas le han puesto y cuándo toca la próxima. ¡Así nunca se les olvida!',
  anti: '🐾 Aquí van los antiparasitarios de tu compañero, internos y externos, con su fecha y la próxima dosis.',
  medicamentos: '🐾 Si tu compañero está tomando algún remedio, cuéntame cuál, cuánto, y cada cuánto. Así no se les pasa una toma.',
  enfermedades: '🐾 Aquí va su historial médico: diagnósticos, lesiones, cómo ha ido evolucionando. Pueden agregar una foto si ayuda a verlo mejor.',
  obs: '🐾 ¿Notaste algo raro en tu compañero? Una herida, un cambio de ánimo, lo que sea. Cuéntamelo aquí, con foto si quieres, para no olvidarlo.',
  examenes: '🐾 Suban los exámenes en PDF de tu compañero: hemogramas, análisis, lo que le hayan hecho. Todo junto, sin buscar entre papeles.',
}

export default function PrevencionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mascotas, setMascotas] = useState<any[]>([])
  const [mascota, setMascota] = useState<any>(null)
  const [vacunas, setVacunas] = useState<any[]>([])
  const [antis, setAntis] = useState<any[]>([])
  const [obs, setObs] = useState<any[]>([])
  const [medicamentos, setMedicamentos] = useState<any[]>([])
  const [enfermedades, setEnfermedades] = useState<any[]>([])
  const [examenes, setExamenes] = useState<any[]>([])
  const [revisiones, setRevisiones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Set<string>>(new Set(['peso']))

  function toggleSeccion(s: string) {
    setSeccionesAbiertas(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(s)) { nuevo.delete(s) } else { nuevo.add(s) }
      return nuevo
    })
  }
  function estaAbierta(s: string) { return seccionesAbiertas.has(s) }
  const [modal, setModal] = useState<'vacuna' | 'anti' | 'obs' | 'medicamento' | 'enfermedad' | 'examen' | null>(null)
  const [form, setForm] = useState<any>({})
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [menuAbierto, setMenuAbierto] = useState<{ tipo: 'vacuna' | 'anti'; id: string } | null>(null)
  const [saving, setSaving] = useState(false)

  // Bloquear scroll del body cuando modal abierto (fix Android)
  useEffect(() => {
    if (modal || menuAbierto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modal, menuAbierto])
  const [archivoExamen, setArchivoExamen] = useState<File | null>(null)
  const [errorExamen, setErrorExamen] = useState('')
  const [urlEnProgreso, setUrlEnProgreso] = useState<string | null>(null)
  const [fotoSalud, setFotoSalud] = useState<File | null>(null)
  const [fotoSaludPreview, setFotoSaludPreview] = useState<string | null>(null)
  const [errorFotoSalud, setErrorFotoSalud] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: todasMascotas } = await supabase.from('mascotas').select('*').order('created_at', { ascending: true })
      if (!todasMascotas || !todasMascotas.length) { router.push('/mascota/nueva'); return }
      setMascotas(todasMascotas)
      const m = determinarMascotaActiva(todasMascotas)!
      setMascota(m)
      await cargarDatos(m.id)
      setLoading(false)
    }
    init()
  }, [])

  async function cambiarMascota(nueva: any) {
    setLoading(true)
    guardarMascotaActivaId(nueva.id)
    setMascota(nueva)
    setSeccionesAbiertas(new Set(['peso']))
    await cargarDatos(nueva.id)
    setLoading(false)
  }

  async function cargarDatos(id: string) {
    const [v, a, o, med, enf, exa, rev] = await Promise.all([
      supabase.from('vacunas').select('*').eq('mascota_id', id).order('fecha_aplicacion', { ascending: false }),
      supabase.from('antiparasitarios').select('*').eq('mascota_id', id).order('fecha_aplicacion', { ascending: false }),
      supabase.from('observaciones').select('*').eq('mascota_id', id).order('created_at', { ascending: false }),
      supabase.from('medicamentos').select('*').eq('mascota_id', id).order('fecha_inicio', { ascending: false }),
      supabase.from('enfermedades').select('*').eq('mascota_id', id).order('fecha_diagnostico', { ascending: false }),
      supabase.from('examenes').select('*').eq('mascota_id', id).order('fecha', { ascending: false }),
      supabase.from('revisiones_corporales').select('*').eq('mascota_id', id).order('fecha', { ascending: false }),
    ])
    setVacunas(v.data || [])
    setAntis(a.data || [])
    setObs(o.data || [])
    setMedicamentos(med.data || [])
    setEnfermedades(enf.data || [])
    setExamenes(exa.data || [])
    setRevisiones(rev.data || [])
  }

  function elegirFotoSalud(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setErrorFotoSalud('')
    if (!archivo.type.startsWith('image/')) {
      setErrorFotoSalud('Solo se aceptan imágenes.')
      return
    }
    if (archivo.size > 5 * 1024 * 1024) {
      setErrorFotoSalud('La imagen supera los 5MB. Intenta con una foto más liviana.')
      return
    }
    setFotoSalud(archivo)
    setFotoSaludPreview(URL.createObjectURL(archivo))
  }

  async function guardar() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !mascota) return
    const base = { mascota_id: mascota.id, user_id: user.id }
    if (modal === 'vacuna') {
      if (editandoId) {
        await supabase.from('vacunas').update(form).eq('id', editandoId)
      } else {
        await supabase.from('vacunas').insert({ ...base, ...form })
      }
    } else if (modal === 'anti') {
      if (editandoId) {
        await supabase.from('antiparasitarios').update(form).eq('id', editandoId)
      } else {
        await supabase.from('antiparasitarios').insert({ ...base, ...form })
      }
    } else if (modal === 'obs') {
      const { data: nuevaObs } = await supabase.from('observaciones').insert({ ...base, ...form, fecha_inicio: form.fecha_inicio || new Date().toISOString().split('T')[0] }).select('id').single()
      if (nuevaObs && fotoSalud) await subirFotoSalud('observaciones', nuevaObs.id, user.id)
    } else if (modal === 'medicamento') {
      await supabase.from('medicamentos').insert({ ...base, ...form, fecha_inicio: form.fecha_inicio || new Date().toISOString().split('T')[0], indicado_por_vet: !!form.indicado_por_vet })
    } else if (modal === 'enfermedad') {
      const { data: nuevaEnf } = await supabase.from('enfermedades').insert({ ...base, ...form, fecha_diagnostico: form.fecha_diagnostico || new Date().toISOString().split('T')[0] }).select('id').single()
      if (nuevaEnf && fotoSalud) await subirFotoSalud('enfermedades', nuevaEnf.id, user.id)
    }
    await cargarDatos(mascota.id)
    setModal(null); setForm({}); setSaving(false); setEditandoId(null)
    setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('')
  }

  // Sube la foto de salud (observacion o enfermedad) ya creada, y
  // actualiza la fila con la URL publica resultante. Si falla la
  // subida, no bloquea -- el registro ya quedo creado, solo sin foto.
  async function subirFotoSalud(tabla: 'observaciones' | 'enfermedades', registroId: string, userId: string) {
    if (!fotoSalud) return
    const extension = fotoSalud.name.split('.').pop() || 'jpg'
    const path = `${userId}/${tabla}/${registroId}.${extension}`
    const { error: uploadError } = await supabase.storage.from('fotos-salud').upload(path, fotoSalud, { upsert: true })
    if (uploadError) return
    const { data: urlData } = supabase.storage.from('fotos-salud').getPublicUrl(path)
    await supabase.from(tabla).update({ foto_url: `${urlData.publicUrl}?t=${Date.now()}` }).eq('id', registroId)
  }

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
      await supabase.storage.from('examenes').remove([path])
      setErrorExamen('No se pudo guardar el examen. Intenta de nuevo.')
      setSaving(false)
      return
    }

    await cargarDatos(mascota.id)
    setModal(null); setForm({}); setArchivoExamen(null); setSaving(false)
  }

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

  function editarVacuna(v: any) {
    setEditandoId(v.id)
    setForm({ nombre: v.nombre, fecha_aplicacion: v.fecha_aplicacion, proxima_fecha: v.proxima_fecha || '', lote: v.lote || '', nota: v.nota || '' })
    setModal('vacuna')
    setMenuAbierto(null)
  }

  async function eliminarVacuna(id: string) {
    setMenuAbierto(null)
    if (!confirm('¿Eliminar esta vacuna? Esta acción no se puede deshacer.')) return
    await supabase.from('vacunas').delete().eq('id', id)
    if (mascota) await cargarDatos(mascota.id)
  }

  function editarAnti(a: any) {
    setEditandoId(a.id)
    setForm({ nombre: a.nombre, tipo: a.tipo || '', forma: a.forma || '', fecha_aplicacion: a.fecha_aplicacion, proxima_fecha: a.proxima_fecha || '', nota: a.nota || '' })
    setModal('anti')
    setMenuAbierto(null)
  }

  async function eliminarAnti(id: string) {
    setMenuAbierto(null)
    if (!confirm('¿Eliminar este antiparasitario? Esta acción no se puede deshacer.')) return
    await supabase.from('antiparasitarios').delete().eq('id', id)
    if (mascota) await cargarDatos(mascota.id)
  }
  const IC = "w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
  const SC = "w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm focus:outline-none appearance-none"

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#8A7560]">Cargando...</div>

  return (
    <div className="min-h-screen pb-24 fade-in">

      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-9 h-9 object-contain" />
          <div>
            <h1 className="font-heading text-xl font-extrabold">Salud preventiva</h1>
            <p className="text-xs text-[#8A7560]">{mascota?.nombre}</p>
          </div>
        </div>
        {false && (
          <button className="hidden">+ Agregar</button>
        )}
      </div>

      {/* Selector de mascota */}
      {mascota && <SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} />}


      {/* SECCIONES EN ACORDEÓN */}
      {/* PESO */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('peso')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <span className="font-bold text-sm text-[#3D2B1F]">⚖️ Peso</span>
          <span className="text-[#8A7560] text-lg">{estaAbierta('peso') ? '⌃' : '⌄'}</span>
        </button>
        {estaAbierta('peso') && !!mascota && (
          <div className="border-t border-[#EEE2D4]">
            <div className="mx-4 mb-3 bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
              <span className="text-base flex-shrink-0">🐾</span>
              <p className="text-xs text-[#7A4A2F] leading-relaxed">Aquí puedes contarme cuánto pesa tu compañero cada vez que lo controlen, así vemos juntos cómo va cambiando.</p>
            </div>
            <PesoTracker mascotaId={mascota.id} pesoActual={mascota.peso_actual} />
          </div>
        )}
      </div>

      {/* FRECUENCIA RESPIRATORIA */}
      {mascota && (mascota.especie === 'Perro' || mascota.especie === 'Gato') && (
        <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
          <button onClick={() => toggleSeccion('respiracion')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <span className="font-bold text-sm text-[#3D2B1F]">🫁 Frecuencia respiratoria</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('respiracion') ? '⌃' : '⌄'}</span>
          </button>
          {estaAbierta('respiracion') && (
            <div className="border-t border-[#EEE2D4] px-4 pb-4 pt-2">
              <RespiracionTracker mascotaId={mascota.id} especie={mascota.especie} />
            </div>
          )}
        </div>
      )}

      {/* TEMPERATURA CORPORAL */}
      {mascota && (mascota.especie === 'Perro' || mascota.especie === 'Gato') && (
        <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
          <button onClick={() => toggleSeccion('temperatura')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <span className="font-bold text-sm text-[#3D2B1F]">🌡️ Temperatura corporal</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('temperatura') ? '⌃' : '⌄'}</span>
          </button>
          {estaAbierta('temperatura') && (
            <div className="border-t border-[#EEE2D4]">
              <TemperaturaTracker mascotaId={mascota.id} especie={mascota.especie} />
            </div>
          )}
        </div>
      )}
      {/* VACUNAS */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('vacunas')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <span className="font-bold text-sm text-[#3D2B1F]">💉 Vacunas</span>
          <div className="flex items-center gap-2">
            <span
              onClick={(e) => { e.stopPropagation(); setModal('vacuna'); setForm({}); setEditandoId(null); setArchivoExamen(null); setErrorExamen(''); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }}
              className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg"
            >+ Agregar</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('vacunas') ? '⌃' : '⌄'}</span>
          </div>
        </button>
        {estaAbierta('vacunas') && (
          <div className="border-t border-[#EEE2D4]">
<div className="mx-4 space-y-3">
          <div className="bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">🐾</span>
            <p className="text-xs text-[#7A4A2F] leading-relaxed">Cuéntame qué vacunas le han puesto y cuándo toca la próxima. ¡Así nunca se les olvida!</p>
          </div>
          {vacunas.length === 0 && (
            <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
              <div className="text-4xl mb-3">💉</div>
              <p className="text-sm text-[#8A7560]">Sin vacunas registradas</p>
              <button onClick={() => { setModal('vacuna'); setForm({}); setEditandoId(null) }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Agregar primera vacuna
              </button>
            </div>
          )}
          {vacunas.map(v => (
            <div key={v.id} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#4CAF7D]/15 flex items-center justify-center text-xl">💉</div>
                    <div>
                      <p className="font-bold text-sm">{v.nombre}</p>
                      <p className="text-xs text-[#8A7560] mt-0.5">Aplicada: {fmt(v.fecha_aplicacion)}</p>
                      {v.lote && <p className="text-xs text-[#8A7560]">Lote: {v.lote}</p>}
                    </div>
                  </div>
                  <div className="flex items-start gap-1">
                    {v.proxima_fecha && (
                      <div className="text-right mr-1">
                        <p className="text-xs text-[#8A7560]">Próxima</p>
                        <p className="text-xs font-bold" style={{ color: diasColor(v.proxima_fecha) }}>{dias(v.proxima_fecha)}</p>
                        <p className="text-xs text-[#8A7560]">{fmt(v.proxima_fecha)}</p>
                      </div>
                    )}
                    <button onClick={() => setMenuAbierto({ tipo: 'vacuna', id: v.id })} className="w-7 h-7 flex items-center justify-center text-[#8A7560] text-lg flex-shrink-0">⋮</button>
                  </div>
                </div>
                {v.nota && <p className="text-xs text-[#8A7560] mt-2 italic bg-[#FBEAD9] rounded-xl p-2">📝 {v.nota}</p>}
              </div>
            </div>
          ))}
        </div>
          </div>
        )}
      </div>
      {/* ANTIPARASITARIOS */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('anti')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <span className="font-bold text-sm text-[#3D2B1F]">💊 Antiparasitarios</span>
          <div className="flex items-center gap-2">
            <span
              onClick={(e) => { e.stopPropagation(); setModal('anti'); setForm({}); setEditandoId(null); setArchivoExamen(null); setErrorExamen(''); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }}
              className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg"
            >+ Agregar</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('anti') ? '⌃' : '⌄'}</span>
          </div>
        </button>
        {estaAbierta('anti') && (
          <div className="border-t border-[#EEE2D4]">
<div className="mx-4 space-y-3">
          <div className="bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">🐾</span>
            <p className="text-xs text-[#7A4A2F] leading-relaxed">Aquí van los antiparasitarios de tu compañero, internos y externos, con su fecha y la próxima dosis.</p>
          </div>
          {antis.length === 0 && (
            <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
              <div className="text-4xl mb-3">💊</div>
              <p className="text-sm text-[#8A7560]">Sin antiparasitarios registrados</p>
              <button onClick={() => { setModal('anti'); setForm({}); setEditandoId(null) }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Agregar primero
              </button>
            </div>
          )}
          {antis.map(a => (
            <div key={a.id} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F5C842]/15 flex items-center justify-center text-xl">💊</div>
                    <div>
                      <p className="font-bold text-sm">{a.nombre}</p>
                      <p className="text-xs text-[#8A7560] mt-0.5">{a.tipo} · {a.forma}</p>
                      <p className="text-xs text-[#8A7560]">Aplicado: {fmt(a.fecha_aplicacion)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1">
                    {a.proxima_fecha && (
                      <div className="text-right mr-1">
                        <p className="text-xs text-[#8A7560]">Próximo</p>
                        <p className="text-xs font-bold" style={{ color: diasColor(a.proxima_fecha) }}>{dias(a.proxima_fecha)}</p>
                      </div>
                    )}
                    <button onClick={() => setMenuAbierto({ tipo: 'anti', id: a.id })} className="w-7 h-7 flex items-center justify-center text-[#8A7560] text-lg flex-shrink-0">⋮</button>
                  </div>
                </div>
                {a.nota && <p className="text-xs text-[#8A7560] mt-2 italic bg-[#FBEAD9] rounded-xl p-2">📝 {a.nota}</p>}
              </div>
            </div>
          ))}
        </div>
          </div>
        )}
      </div>
      {/* MEDICAMENTOS */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('medicamentos')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <span className="font-bold text-sm text-[#3D2B1F]">🩹 Medicamentos</span>
          <div className="flex items-center gap-2">
            <span
              onClick={(e) => { e.stopPropagation(); setModal('medicamento'); setForm({}); setEditandoId(null); setArchivoExamen(null); setErrorExamen(''); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }}
              className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg"
            >+ Agregar</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('medicamentos') ? '⌃' : '⌄'}</span>
          </div>
        </button>
        {estaAbierta('medicamentos') && (
          <div className="border-t border-[#EEE2D4]">
<div className="mx-4 space-y-3">
          <div className="bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">🐾</span>
            <p className="text-xs text-[#7A4A2F] leading-relaxed">Si tu compañero está tomando algún remedio, cuéntame cuál, cuánto, y cada cuánto. Así no se les pasa una toma.</p>
          </div>
          {medicamentos.length === 0 && (
            <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
              <div className="text-4xl mb-3">🩹</div>
              <p className="text-sm text-[#8A7560]">Sin medicamentos registrados</p>
              <button onClick={() => { setModal('medicamento'); setForm({}) }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Agregar medicamento
              </button>
            </div>
          )}
          {medicamentos.map(med => (
            <div key={med.id} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#4AABDB]/15 flex items-center justify-center text-xl">🩹</div>
                    <div>
                      <p className="font-bold text-sm">{med.nombre}</p>
                      {med.dosis && <p className="text-xs text-[#8A7560] mt-0.5">{med.dosis}{med.frecuencia ? ` · ${med.frecuencia}` : ''}</p>}
                      <p className="text-xs text-[#8A7560]">Desde: {fmt(med.fecha_inicio)}{med.fecha_fin ? ` hasta ${fmt(med.fecha_fin)}` : ''}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${med.estado === 'activo' ? 'bg-[#4AABDB]/20 text-[#4AABDB]' : 'bg-[#EEE2D4] text-[#8A7560]'}`}>
                    {med.estado === 'activo' ? 'Activo' : 'Finalizado'}
                  </span>
                </div>
                {med.motivo && <p className="text-xs text-[#8A7560] mt-2">Motivo: {med.motivo}</p>}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs">{med.indicado_por_vet ? '🩺' : '💡'}</span>
                  <span className="text-xs text-[#8A7560]">{med.indicado_por_vet ? 'Indicado por veterinario' : 'Sin indicación veterinaria'}</span>
                </div>
                {med.proximo_control && (
                  <div className="flex items-center gap-1.5 mt-2 bg-[#4AABDB]/10 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs">⏰</span>
                    <span className="text-xs text-[#4AABDB] font-semibold">Próximo control: {fmt(med.proximo_control)}</span>
                  </div>
                )}
                {med.nota && <p className="text-xs text-[#8A7560] mt-2 italic bg-[#FBEAD9] rounded-xl p-2">📝 {med.nota}</p>}
              </div>
            </div>
          ))}
        </div>
          </div>
        )}
      </div>
      {/* ENFERMEDADES */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('enfermedades')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <span className="font-bold text-sm text-[#3D2B1F]">🏥 Enfermedades</span>
          <div className="flex items-center gap-2">
            <span
              onClick={(e) => { e.stopPropagation(); setModal('enfermedad'); setForm({}); setEditandoId(null); setArchivoExamen(null); setErrorExamen(''); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }}
              className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg"
            >+ Agregar</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('enfermedades') ? '⌃' : '⌄'}</span>
          </div>
        </button>
        {estaAbierta('enfermedades') && (
          <div className="border-t border-[#EEE2D4]">
<div className="mx-4 space-y-3">
          <div className="bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">🐾</span>
            <p className="text-xs text-[#7A4A2F] leading-relaxed">Aquí va su historial médico: diagnósticos, lesiones, cómo ha ido evolucionando. Pueden agregar una foto si ayuda a verlo mejor.</p>
          </div>
          {enfermedades.length === 0 && (
            <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
              <div className="text-4xl mb-3">🏥</div>
              <p className="text-sm text-[#8A7560]">Sin enfermedades registradas</p>
              <button onClick={() => { setModal('enfermedad'); setForm({}); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Agregar diagnóstico
              </button>
            </div>
          )}
          {enfermedades.map(enf => {
            const estadoColor: Record<string,string> = { activa: '#F07A30', cronica: '#E05252', resuelta: '#4CAF7D' }
            const estadoLabel: Record<string,string> = { activa: 'Activa', cronica: 'Crónica', resuelta: 'Resuelta' }
            return (
              <div key={enf.id} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${estadoColor[enf.estado]}20` }}>🏥</div>
                      <div>
                        <p className="font-bold text-sm">{enf.diagnostico}</p>
                        <p className="text-xs text-[#8A7560] mt-0.5">Diagnosticada: {fmt(enf.fecha_diagnostico)}</p>
                        {enf.veterinario && <p className="text-xs text-[#8A7560]">Por: {enf.veterinario}</p>}
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
                  {enf.nota && <p className="text-xs text-[#8A7560] mt-2 italic bg-[#FBEAD9] rounded-xl p-2">📝 {enf.nota}</p>}
                  {enf.fecha_resolucion && <p className="text-xs text-[#4CAF7D] mt-2">Resuelta: {fmt(enf.fecha_resolucion)}</p>}
                  {enf.foto_url && (
                    <img src={enf.foto_url} alt={enf.diagnostico} className="w-full h-40 object-cover rounded-xl mt-2" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
          </div>
        )}
      </div>
      {/* OBSERVACIONES */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('obs')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <span className="font-bold text-sm text-[#3D2B1F]">👁️ Observaciones</span>
          <div className="flex items-center gap-2">
            <span
              onClick={(e) => { e.stopPropagation(); setModal('obs'); setForm({}); setEditandoId(null); setArchivoExamen(null); setErrorExamen(''); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }}
              className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg"
            >+ Agregar</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('obs') ? '⌃' : '⌄'}</span>
          </div>
        </button>
        {estaAbierta('obs') && (
          <div className="border-t border-[#EEE2D4]">
<div className="mx-4 space-y-3">
          <div className="bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">🐾</span>
            <p className="text-xs text-[#7A4A2F] leading-relaxed">¿Notaste algo raro en tu compañero? Una herida, un cambio de ánimo, lo que sea. Cuéntamelo aquí, con foto si quieres, para no olvidarlo.</p>
          </div>
          {obs.length === 0 && (
            <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
              <div className="text-4xl mb-3">👁️</div>
              <p className="text-sm text-[#8A7560]">Sin observaciones registradas</p>
              <button onClick={() => { setModal('obs'); setForm({}); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Agregar observación
              </button>
            </div>
          )}
          {obs.map(o => (
            <div key={o.id} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
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
                    {o.descripcion && <p className="text-xs text-[#8A7560] mt-1 leading-relaxed">{o.descripcion}</p>}
                    <p className="text-xs text-[#8A7560] mt-1">Desde: {fmt(o.fecha_inicio)}</p>
                    {o.foto_url && (
                      <img src={o.foto_url} alt={o.titulo} className="w-full h-40 object-cover rounded-xl mt-2" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
          </div>
        )}
      </div>
      {/* EXÁMENES */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('examenes')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <span className="font-bold text-sm text-[#3D2B1F]">📄 Exámenes</span>
          <div className="flex items-center gap-2">
            <span
              onClick={(e) => { e.stopPropagation(); setModal('examen'); setForm({}); setEditandoId(null); setArchivoExamen(null); setErrorExamen(''); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }}
              className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg"
            >+ Agregar</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('examenes') ? '⌃' : '⌄'}</span>
          </div>
        </button>
        {estaAbierta('examenes') && (
          <div className="border-t border-[#EEE2D4]">
<div className="mx-4 space-y-3">
          <div className="bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">🐾</span>
            <p className="text-xs text-[#7A4A2F] leading-relaxed">Suban los exámenes en PDF de tu compañero: hemogramas, análisis, lo que le hayan hecho. Todo junto, sin buscar entre papeles.</p>
          </div>
          {examenes.length === 0 && (
            <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-sm text-[#8A7560]">Sin exámenes registrados</p>
              <p className="text-xs text-[#8A7560]/70 mt-1">Sube hemogramas, perfiles bioquímicos y otros exámenes en PDF</p>
              <button onClick={() => { setModal('examen'); setForm({}); setArchivoExamen(null); setErrorExamen('') }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">
                + Subir primer examen
              </button>
            </div>
          )}
          {examenes.map(ex => {
            const cat = CATEGORIAS_EXAMEN[ex.categoria] || CATEGORIAS_EXAMEN.otro
            return (
              <div key={ex.id} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#9B7FE8]/15 flex items-center justify-center text-xl flex-shrink-0">{cat.icon}</div>
                      <div>
                        <p className="font-bold text-sm">{ex.nombre || cat.label}</p>
                        <p className="text-xs text-[#8A7560] mt-0.5">{cat.label} · {fmt(ex.fecha)}</p>
                      </div>
                    </div>
                    <button onClick={() => borrarExamen(ex.id, ex.archivo_path)} className="text-[#8A7560] text-sm px-1 flex-shrink-0">✕</button>
                  </div>
                  {ex.nota && <p className="text-xs text-[#8A7560] mt-2 italic bg-[#FBEAD9] rounded-xl p-2">📝 {ex.nota}</p>}
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
          </div>
        )}
      </div>

      {/* REPRODUCCIÓN */}
      {mascota && mascota.sexo === 'Hembra' && mascota.seguimiento_reproductivo !== false && (
        <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
          <button onClick={() => toggleSeccion('reproduccion')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <span className="font-bold text-sm text-[#3D2B1F]">🌸 Reproducción</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('reproduccion') ? '⌃' : '⌄'}</span>
          </button>
          {estaAbierta('reproduccion') && (
            <div className="border-t border-[#EEE2D4] px-4 pb-4 pt-3">
              <ReproduccionTracker
                mascotaId={mascota.id}
                sexo={mascota.sexo || ''}
                especie={mascota.especie || ''}
                seguimientoReproductivo={mascota.seguimiento_reproductivo || false}
                estadoReproductivo={mascota.estado_reproductivo || 'desconocido'}
                nombreMascota={mascota.nombre}
              />
            </div>
          )}
        </div>
      )}

      {/* REVISIÓN CORPORAL */}
      {revisiones.length > 0 && (
        <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
          <button onClick={() => toggleSeccion('revisiones')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <span className="font-bold text-sm text-[#3D2B1F]">🔍 Revisiones Corporales</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('revisiones') ? '⌃' : '⌄'}</span>
          </button>
          {estaAbierta('revisiones') && (
            <div className="border-t border-[#EEE2D4]">
              {revisiones.map((rev, i) => {
                const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
                const d = new Date(rev.fecha + 'T00:00:00')
                const conAlgo = rev.resultado === 'con_observacion'
                return (
                  <div key={rev.id} className={`px-4 py-3 ${i < revisiones.length-1 ? 'border-b border-[#EEE2D4]' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-[#3D2B1F]">
                        {d.getDate()} {MESES[d.getMonth()]} {d.getFullYear()}
                      </p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conAlgo ? 'bg-[#F5C842]/20 text-[#8C6A00]' : 'bg-[#4CAF7D]/15 text-[#3B8C5E]'}`}>
                        {conAlgo ? '⚠ Con observación' : '✓ Todo normal'}
                      </span>
                    </div>
                    {rev.nota && <p className="text-[11px] text-[#8A7560] italic">{rev.nota}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

            {/* MODAL DE ACCIONES (editar/eliminar) — siempre centrado abajo,
          nunca se corta por la posicion de la tarjeta en la pantalla */}
      {menuAbierto && (
        <div className="fixed inset-0 z-[60] overflow-hidden flex items-end justify-center bg-black/60" onClick={() => setMenuAbierto(null)}>
          <div className="w-full max-w-[420px] bg-[#FFFCF8] rounded-t-2xl p-2 pb-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#EEE2D4] rounded-full mx-auto mb-3 mt-1" />
            <button
              onClick={() => {
                if (menuAbierto.tipo === 'vacuna') {
                  const v = vacunas.find((x: any) => x.id === menuAbierto.id)
                  if (v) editarVacuna(v)
                } else {
                  const a = antis.find((x: any) => x.id === menuAbierto.id)
                  if (a) editarAnti(a)
                }
              }}
              className="w-full px-4 py-3.5 text-left text-sm font-medium text-[#3D2B1F] flex items-center gap-3"
            >
              <span className="text-lg">✏️</span> Editar
            </button>
            <div className="h-px bg-[#EEE2D4] mx-4" />
            <button
              onClick={() => {
                if (menuAbierto.tipo === 'vacuna') eliminarVacuna(menuAbierto.id)
                else eliminarAnti(menuAbierto.id)
              }}
              className="w-full px-4 py-3.5 text-left text-sm font-medium text-[#E05252] flex items-center gap-3"
            >
              <span className="text-lg">🗑️</span> Eliminar
            </button>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR */}
      {modal && (
        <div className="fixed inset-0 z-[60] overflow-hidden flex items-end justify-center bg-black/60" onClick={() => { setModal(null); setEditandoId(null) }}>
          <div className="w-full max-w-[480px] bg-[#FFFCF8] rounded-t-2xl p-5 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 80px)", paddingBottom: "24px" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-base">
                {modal === 'vacuna' ? (editandoId ? '💉 Editar vacuna' : '💉 Nueva vacuna') : modal === 'anti' ? (editandoId ? '💊 Editar antiparasitario' : '💊 Nuevo antiparasitario') : modal === 'medicamento' ? '🩹 Nuevo medicamento' : modal === 'enfermedad' ? '🏥 Nuevo diagnóstico' : modal === 'examen' ? '📄 Nuevo examen' : '👁️ Nueva observación'}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={modal === 'examen' ? guardarExamen : guardar} disabled={saving}
                  className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-40">
                  {saving ? '...' : editandoId ? 'Guardar cambios' : 'Guardar'}
                </button>
                <button onClick={() => { setModal(null); setEditandoId(null) }} className="text-[#8A7560] text-xl">✕</button>
              </div>
            </div>

            {modal === 'vacuna' && <>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nombre de la vacuna *</label>
                <input className={IC} placeholder="ej. Séxtuple, Antirrábica..." value={form.nombre || ''} onChange={e => u('nombre', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha de aplicación *</label>
                <FechaSelector value={form.fecha_aplicacion || ''} onChange={v => u('fecha_aplicacion', v)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Próxima vacunación</label>
                <FechaSelector value={form.proxima_fecha || ''} onChange={v => u('proxima_fecha', v)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Lote / Serie</label>
                <input className={IC} placeholder="ej. A16301" value={form.lote || ''} onChange={e => u('lote', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nota</label>
                <input className={IC} placeholder="Observación opcional" value={form.nota || ''} onChange={e => u('nota', e.target.value)}/></div>
            </>}

            {modal === 'anti' && <>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nombre del producto *</label>
                <input className={IC} placeholder="ej. Bravecto, Simparica..." value={form.nombre || ''} onChange={e => u('nombre', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Tipo *</label>
                <select className={SC} value={form.tipo || ''} onChange={e => u('tipo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option>interno</option><option>externo</option><option>ambos</option>
                </select></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Forma</label>
                <select className={SC} value={form.forma || ''} onChange={e => u('forma', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option>pastilla</option><option>liquido</option><option>collar</option><option>otro</option>
                </select></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha de aplicación *</label>
                <FechaSelector value={form.fecha_aplicacion || ''} onChange={v => u('fecha_aplicacion', v)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Próxima dosis</label>
                <FechaSelector value={form.proxima_fecha || ''} onChange={v => u('proxima_fecha', v)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nota</label>
                <input className={IC} placeholder="Observación opcional" value={form.nota || ''} onChange={e => u('nota', e.target.value)}/></div>
            </>}

            {modal === 'medicamento' && <>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nombre del medicamento *</label>
                <input className={IC} placeholder="ej. Amoxicilina" value={form.nombre || ''} onChange={e => u('nombre', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Dosis</label>
                <input className={IC} placeholder="ej. 250mg, media pastilla" value={form.dosis || ''} onChange={e => u('dosis', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Frecuencia</label>
                <input className={IC} placeholder="ej. cada 12 horas, 1 vez al día" value={form.frecuencia || ''} onChange={e => u('frecuencia', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Motivo</label>
                <input className={IC} placeholder="ej. Infección de oído" value={form.motivo || ''} onChange={e => u('motivo', e.target.value)}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha de inicio *</label>
                  <FechaSelector value={form.fecha_inicio || ''} onChange={v => u('fecha_inicio', v)} /></div>
                <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha de término</label>
                  <FechaSelector value={form.fecha_fin || ''} onChange={v => u('fecha_fin', v)} /></div>
              </div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Próximo control</label>
                <FechaSelector value={form.proximo_control || ''} onChange={v => u('proximo_control', v)} /></div>
              <button type="button" onClick={() => u('indicado_por_vet', form.indicado_por_vet ? '' : 'true')}
                className="w-full flex items-center gap-3 bg-[#FBEAD9] rounded-xl px-4 py-3 border border-[#EEE2D4]">
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs flex-shrink-0" style={{ background: form.indicado_por_vet ? '#4AABDB' : 'transparent', border: form.indicado_por_vet ? 'none' : '1.5px solid #8A7560' }}>
                  {form.indicado_por_vet ? '✓' : ''}
                </div>
                <span className="text-sm">Indicado por veterinario</span>
              </button>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nota</label>
                <input className={IC} placeholder="Observación opcional" value={form.nota || ''} onChange={e => u('nota', e.target.value)}/></div>
            </>}

            {modal === 'enfermedad' && <>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Diagnóstico *</label>
                <input className={IC} placeholder="ej. Displasia de cadera, Gastritis" value={form.diagnostico || ''} onChange={e => u('diagnostico', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha de diagnóstico *</label>
                <FechaSelector value={form.fecha_diagnostico || ''} onChange={v => u('fecha_diagnostico', v)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Estado *</label>
                <select className={SC} value={form.estado || ''} onChange={e => u('estado', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="activa">Activa</option>
                  <option value="cronica">Crónica</option>
                  <option value="resuelta">Resuelta</option>
                </select></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Veterinario tratante</label>
                <input className={IC} placeholder="ej. Dr. González, Clínica X" value={form.veterinario || ''} onChange={e => u('veterinario', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Próxima revisión</label>
                <FechaSelector value={form.proxima_revision || ''} onChange={v => u('proxima_revision', v)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Notas</label>
                <textarea className={IC} rows={3} placeholder="Detalles del diagnóstico, tratamiento indicado..." value={form.nota || ''} onChange={e => u('nota', e.target.value)}/></div>
              <div>
                <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Foto (opcional)</label>
                <div className="flex items-center gap-3">
                  <label className="w-16 h-16 rounded-xl bg-[#FFFCF8] border border-[#EEE2D4] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer">
                    {fotoSaludPreview ? (
                      <img src={fotoSaludPreview} alt="Vista previa" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">📷</span>
                    )}
                    <input type="file" accept="image/*" onChange={elegirFotoSalud} className="hidden" />
                  </label>
                  <p className="text-xs text-[#8A7560]">Toca para agregar una foto del diagnóstico o lesión.</p>
                </div>
                {errorFotoSalud && <p className="text-[11px] text-[#E05252] mt-1.5">{errorFotoSalud}</p>}
              </div>
            </>}

            {modal === 'obs' && <>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Título *</label>
                <input className={IC} placeholder="ej. Grano en oreja derecha" value={form.titulo || ''} onChange={e => u('titulo', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Tipo</label>
                <select className={SC} value={form.tipo || ''} onChange={e => u('tipo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option>alergia</option><option>enfermedad</option><option>lesion</option><option>comportamiento</option><option>otro</option>
                </select></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Descripción</label>
                <textarea className={IC} rows={3} placeholder="Describe lo observado..." value={form.descripcion || ''} onChange={e => u('descripcion', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha de inicio</label>
                <FechaSelector value={form.fecha_inicio || ''} onChange={v => u('fecha_inicio', v)} /></div>
              <div>
                <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Foto (opcional)</label>
                <div className="flex items-center gap-3">
                  <label className="w-16 h-16 rounded-xl bg-[#FFFCF8] border border-[#EEE2D4] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer">
                    {fotoSaludPreview ? (
                      <img src={fotoSaludPreview} alt="Vista previa" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">📷</span>
                    )}
                    <input type="file" accept="image/*" onChange={elegirFotoSalud} className="hidden" />
                  </label>
                  <p className="text-xs text-[#8A7560]">Toca para agregar una foto de lo que observaste.</p>
                </div>
                {errorFotoSalud && <p className="text-[11px] text-[#E05252] mt-1.5">{errorFotoSalud}</p>}
              </div>
            </>}

            {modal === 'examen' && <>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Categoría *</label>
                <select className={SC} value={form.categoria || ''} onChange={e => u('categoria', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {Object.entries(CATEGORIAS_EXAMEN).map(([key, c]) => (
                    <option key={key} value={key}>{c.icon} {c.label}</option>
                  ))}
                </select></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nombre del examen</label>
                <input className={IC} placeholder="ej. Control anual, Chequeo pre-cirugía" value={form.nombre || ''} onChange={e => u('nombre', e.target.value)}/></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha del examen *</label>
                <FechaSelector value={form.fecha || ''} onChange={v => u('fecha', v)} /></div>
              <div>
                <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Archivo PDF *</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setArchivoExamen(e.target.files?.[0] || null)}
                  className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#FFBD59] file:text-[#1A1200] file:text-xs file:font-bold"
                />
                <p className="text-[11px] text-[#8A7560] mt-1.5">Máximo 8MB, solo PDF.</p>
                {archivoExamen && <p className="text-xs text-[#4CAF7D] mt-1">✓ {archivoExamen.name} ({(archivoExamen.size / 1024 / 1024).toFixed(1)}MB)</p>}
              </div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nota / resultado</label>
                <textarea className={IC} rows={3} placeholder="ej. Todo normal, colesterol levemente alto..." value={form.nota || ''} onChange={e => u('nota', e.target.value)}/></div>
              {errorExamen && <p className="text-xs text-[#E05252] bg-[#E05252]/10 rounded-xl p-3">{errorExamen}</p>}
            </>}


          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
