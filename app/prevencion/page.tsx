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
import ExamenesLab from '@/components/ExamenesLab'

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

const MAX_ARCHIVO_BYTES = 8 * 1024 * 1024

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
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Set<string>>(new Set())

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
  // Mejora 2: marcar observación como resuelta
  const [modalResolverObs, setModalResolverObs] = useState<string | null>(null)
  const [fechaResolucion, setFechaResolucion] = useState('')
  // Mejora 1: timeline de evoluciones
  const [evoluciones, setEvoluciones] = useState<Record<string, any[]>>({})
  const [obsExpandida, setObsExpandida] = useState<string | null>(null)
  const [modalEvo, setModalEvo] = useState<string | null>(null) // obsId
  const [formEvo, setFormEvo] = useState<{ fecha: string; nota: string }>({ fecha: '', nota: '' })
  const [fotoEvo, setFotoEvo] = useState<File | null>(null)
  const [fotoEvoPreview, setFotoEvoPreview] = useState<string | null>(null)
  const [savingEvo, setSavingEvo] = useState(false)
  const [editandoEvoId, setEditandoEvoId] = useState<string | null>(null)

  useEffect(() => {
    const anyModal = modal || menuAbierto || modalEvo || modalResolverObs
    if (anyModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [modal, menuAbierto, modalEvo, modalResolverObs])

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
    setSeccionesAbiertas(new Set())
    setObsExpandida(null)
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
    if (!archivo.type.startsWith('image/')) { setErrorFotoSalud('Solo se aceptan imágenes.'); return }
    if (archivo.size > 5 * 1024 * 1024) { setErrorFotoSalud('La imagen supera los 5MB.'); return }
    setFotoSalud(archivo)
    setFotoSaludPreview(URL.createObjectURL(archivo))
  }

  function elegirFotoEvo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    if (!archivo.type.startsWith('image/')) return
    if (archivo.size > 5 * 1024 * 1024) return
    setFotoEvo(archivo)
    setFotoEvoPreview(URL.createObjectURL(archivo))
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
      if (editandoId) {
        await supabase.from('observaciones').update({ ...form }).eq('id', editandoId)
        if (fotoSalud) await subirFotoSalud('observaciones', editandoId, user.id)
      } else {
        const { data: nuevaObs } = await supabase.from('observaciones').insert({
          ...base, ...form,
          estado: 'activa',
          fecha_inicio: form.fecha_inicio || new Date().toISOString().split('T')[0]
        }).select('id').single()
        if (nuevaObs && fotoSalud) await subirFotoSalud('observaciones', nuevaObs.id, user.id)
      }
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
    if (archivoExamen.size > MAX_ARCHIVO_BYTES) { setErrorExamen('El archivo supera los 8MB.'); return }
    if (archivoExamen.type !== 'application/pdf') { setErrorExamen('Solo se aceptan archivos PDF.'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !mascota) { setSaving(false); return }
    const timestamp = Date.now()
    const nombreLimpio = archivoExamen.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/${mascota.id}/${timestamp}_${nombreLimpio}`
    const { error: uploadError } = await supabase.storage.from('examenes').upload(path, archivoExamen, { contentType: 'application/pdf', upsert: false })
    if (uploadError) { setErrorExamen('No se pudo subir el archivo.'); setSaving(false); return }
    const { error: insertError } = await supabase.from('examenes').insert({
      mascota_id: mascota.id, user_id: user.id,
      categoria: form.categoria, nombre: form.nombre || null, nota: form.nota || null,
      fecha: form.fecha, archivo_path: path, archivo_nombre_original: archivoExamen.name,
    })
    if (insertError) { await supabase.storage.from('examenes').remove([path]); setErrorExamen('No se pudo guardar.'); setSaving(false); return }
    await cargarDatos(mascota.id)
    setModal(null); setForm({}); setArchivoExamen(null); setSaving(false)
  }

  async function abrirExamen(examenId: string, path: string) {
    setUrlEnProgreso(examenId)
    const { data, error } = await supabase.storage.from('examenes').createSignedUrl(path, 60)
    setUrlEnProgreso(null)
    if (error || !data) { alert('No se pudo abrir el archivo.'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function borrarExamen(examenId: string, path: string) {
    if (!confirm('¿Eliminar este examen?')) return
    await supabase.storage.from('examenes').remove([path])
    await supabase.from('examenes').delete().eq('id', examenId)
    if (mascota) await cargarDatos(mascota.id)
  }

  async function marcarResuelta(obsId: string) {
    if (!fechaResolucion) return
    await supabase.from('observaciones').update({
      estado: 'resuelta',
      fecha_resolucion: fechaResolucion,
    }).eq('id', obsId)
    setModalResolverObs(null)
    setFechaResolucion('')
    if (mascota) await cargarDatos(mascota.id)
  }

  async function cargarEvoluciones(obsId: string) {
    const { data } = await supabase
      .from('observacion_evoluciones')
      .select('*')
      .eq('observacion_id', obsId)
      .order('fecha', { ascending: false })
    setEvoluciones(prev => ({ ...prev, [obsId]: data || [] }))
  }

  function toggleObs(obsId: string) {
    if (obsExpandida === obsId) {
      setObsExpandida(null)
    } else {
      setObsExpandida(obsId)
      if (!evoluciones[obsId]) cargarEvoluciones(obsId)
    }
  }

  async function guardarEvolucion(obsId: string) {
    if (!formEvo.fecha) return
    setSavingEvo(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingEvo(false); return }

    let evoId: string | null = null
    if (editandoEvoId) {
      // Edición: actualizar fecha y nota de la evolución existente
      await supabase.from('observacion_evoluciones').update({
        fecha: formEvo.fecha,
        nota: formEvo.nota || null,
      }).eq('id', editandoEvoId)
      evoId = editandoEvoId
    } else {
      const { data: nuevaIns } = await supabase.from('observacion_evoluciones').insert({
        observacion_id: obsId,
        user_id: user.id,
        fecha: formEvo.fecha,
        nota: formEvo.nota || null,
      }).select('id').single()
      evoId = nuevaIns?.id || null
    }
    const nueva = evoId ? { id: evoId } : null

    if (nueva && fotoEvo) {
      const ext = fotoEvo.name.split('.').pop() || 'jpg'
      const path = `${user.id}/evoluciones/${nueva.id}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('fotos-salud').upload(path, fotoEvo, { upsert: true })
      if (uploadErr) {
        console.error('Error subiendo foto evolución:', uploadErr)
      } else {
        const { data: urlData } = supabase.storage.from('fotos-salud').getPublicUrl(path)
        const fotoFinalUrl = `${urlData.publicUrl}?t=${Date.now()}`
        console.log('Foto URL generada:', fotoFinalUrl)
        await supabase.from('observacion_evoluciones').update({
          foto_url: fotoFinalUrl
        }).eq('id', nueva.id)
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    await cargarEvoluciones(obsId)
    setModalEvo(null)
    setFormEvo({ fecha: '', nota: '' })
    setFotoEvo(null)
    setFotoEvoPreview(null)
    setEditandoEvoId(null)
    setSavingEvo(false)
  }

  function editarEvo(evo: any, obsId: string) {
    setEditandoEvoId(evo.id)
    setFormEvo({ fecha: evo.fecha || '', nota: evo.nota || '' })
    setFotoEvo(null)
    setFotoEvoPreview(evo.foto_url || null)
    setModalEvo(obsId)
  }

  async function eliminarEvo(evo: any, obsId: string) {
    if (!confirm('¿Eliminar esta evolución? Esta acción no se puede deshacer.')) return
    // Borrar foto del storage si existe
    if (evo.foto_url) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Reconstruir el path: userId/evoluciones/evoId.ext
        const match = evo.foto_url.match(/evoluciones\/([^?]+)/)
        if (match) {
          await supabase.storage.from('fotos-salud').remove([`${user.id}/evoluciones/${match[1]}`])
        }
      }
    }
    await supabase.from('observacion_evoluciones').delete().eq('id', evo.id)
    await cargarEvoluciones(obsId)
  }

  async function reactivarObs(obsId: string) {
    await supabase.from('observaciones').update({
      estado: 'activa',
      fecha_resolucion: null,
    }).eq('id', obsId)
    if (mascota) await cargarDatos(mascota.id)
  }

  function editarObs(o: any) {
    setEditandoId(o.id)
    setForm({
      titulo: o.titulo || '',
      tipo: o.tipo || '',
      descripcion: o.descripcion || '',
      fecha_inicio: o.fecha_inicio || '',
    })
    setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('')
    setModal('obs')
  }

  async function eliminarObs(id: string) {
    if (!confirm('¿Eliminar esta observación? Esta acción no se puede deshacer.')) return
    await supabase.from('observaciones').delete().eq('id', id)
    if (mascota) await cargarDatos(mascota.id)
  }

  const u = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }))

  function editarVacuna(v: any) {
    setEditandoId(v.id)
    setForm({ nombre: v.nombre, fecha_aplicacion: v.fecha_aplicacion, proxima_fecha: v.proxima_fecha || '', lote: v.lote || '', nota: v.nota || '' })
    setModal('vacuna'); setMenuAbierto(null)
  }
  async function eliminarVacuna(id: string) {
    setMenuAbierto(null)
    if (!confirm('¿Eliminar esta vacuna?')) return
    await supabase.from('vacunas').delete().eq('id', id)
    if (mascota) await cargarDatos(mascota.id)
  }
  function editarAnti(a: any) {
    setEditandoId(a.id)
    setForm({ nombre: a.nombre, tipo: a.tipo || '', forma: a.forma || '', fecha_aplicacion: a.fecha_aplicacion, proxima_fecha: a.proxima_fecha || '', nota: a.nota || '' })
    setModal('anti'); setMenuAbierto(null)
  }
  async function eliminarAnti(id: string) {
    setMenuAbierto(null)
    if (!confirm('¿Eliminar este antiparasitario?')) return
    await supabase.from('antiparasitarios').delete().eq('id', id)
    if (mascota) await cargarDatos(mascota.id)
  }

  const IC = "w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
  const SC = "w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm focus:outline-none appearance-none"

  // Separar obs activas y resueltas
  const obsActivas = obs.filter(o => o.estado !== 'resuelta')
  const obsResueltas = obs.filter(o => o.estado === 'resuelta')

  // --- Mini-resúmenes de estado por sección ---
  // Cada encabezado muestra a la derecha una o más "píldoras" que
  // resumen su estado de un vistazo, sin abrir la sección. Un badge
  // tiene texto y color del semáforo de salud de la app.
  interface Badge { texto: string; color: string }
  const HOY_PREV = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  function diasHasta(fecha: string): number {
    const h = new Date(HOY_PREV + 'T00:00:00')
    const f = new Date(fecha + 'T00:00:00')
    return Math.round((f.getTime() - h.getTime()) / 86400000)
  }

  // Vacunas / antiparasitarios: SOLO la dosis más reciente manda
  // (regla del proyecto). Una dosis antigua cuya "próxima" ya venció
  // NO debe marcar la sección como vencida si después se aplicó otra
  // dosis con su próxima fecha aún vigente. Se ordena por fecha de
  // aplicación y se mira la próxima fecha de la más nueva.
  function badgePreventivo(items: any[]): Badge | null {
    if (items.length === 0) return null
    const masReciente = items
      .slice()
      .sort((a, b) => String(b.fecha_aplicacion || '').localeCompare(String(a.fecha_aplicacion || '')))[0]
    const prox = masReciente?.proxima_fecha
    if (!prox) return { texto: 'Sin próxima', color: '#8A7560' }
    const min = diasHasta(prox)
    if (min < 0) return { texto: 'Vencido', color: '#E05252' }
    if (min === 0) return { texto: 'Hoy', color: '#F07A30' }
    if (min <= 30) return { texto: `En ${min} ${min === 1 ? 'día' : 'días'}`, color: '#F5C842' }
    return { texto: 'Al día', color: '#4CAF7D' }
  }
  const badgeVacunas = (() => {
    // Vacunas: cada tipo (antirrábica, séxtuple...) tiene su propio
    // ciclo. Se agrupa por nombre, se toma la dosis más reciente de
    // cada una, y el badge refleja la MÁS URGENTE entre ellas.
    if (vacunas.length === 0) return null
    const porNombre = new Map<string, any>()
    for (const v of vacunas) {
      const k = (v.nombre || '').toLowerCase().trim()
      const prev = porNombre.get(k)
      if (!prev || String(v.fecha_aplicacion || '').localeCompare(String(prev.fecha_aplicacion || '')) > 0) {
        porNombre.set(k, v)
      }
    }
    const dias = Array.from(porNombre.values()).map(v => v.proxima_fecha).filter(Boolean).map(f => diasHasta(f))
    if (dias.length === 0) return { texto: 'Sin próxima', color: '#8A7560' }
    const min = Math.min(...dias)
    if (min < 0) return { texto: 'Vencido', color: '#E05252' }
    if (min === 0) return { texto: 'Hoy', color: '#F07A30' }
    if (min <= 30) return { texto: `En ${min} ${min === 1 ? 'día' : 'días'}`, color: '#F5C842' }
    return { texto: 'Al día', color: '#4CAF7D' }
  })()
  const badgeAntis = badgePreventivo(antis)

  // Observaciones: cuántas activas (rojo) y cuántas resueltas (verde)
  const badgesObs: Badge[] = []
  if (obsActivas.length > 0) badgesObs.push({ texto: `${obsActivas.length} activa${obsActivas.length === 1 ? '' : 's'}`, color: '#F07A30' })
  if (obsResueltas.length > 0) badgesObs.push({ texto: `${obsResueltas.length} resuelta${obsResueltas.length === 1 ? '' : 's'}`, color: '#4CAF7D' })

  // Medicamentos: activos (azul, color reservado de la categoría)
  const medsActivos = medicamentos.filter(m => m.estado === 'activo')
  const badgeMeds: Badge | null = medicamentos.length === 0 ? null
    : medsActivos.length > 0 ? { texto: `${medsActivos.length} activo${medsActivos.length === 1 ? '' : 's'}`, color: '#4AABDB' }
    : { texto: 'Sin activos', color: '#8A7560' }

  // Enfermedades: activas/crónicas (rojo) vs solo resueltas (verde)
  const enfActivas = enfermedades.filter(e => e.estado === 'activa' || e.estado === 'cronica')
  const badgeEnf: Badge | null = enfermedades.length === 0 ? null
    : enfActivas.length > 0 ? { texto: `${enfActivas.length} activa${enfActivas.length === 1 ? '' : 's'}`, color: '#E05252' }
    : { texto: 'Resueltas', color: '#4CAF7D' }

  // Peso / exámenes / revisiones: "hace N días" desde el último registro
  function badgeUltimo(items: any[], campoFecha: string): Badge | null {
    if (items.length === 0) return null
    const fechas = items.map(i => i[campoFecha]).filter(Boolean).map(f => diasHasta(f))
    if (fechas.length === 0) return null
    const dias = Math.abs(Math.max(...fechas)) // el más reciente
    if (dias === 0) return { texto: 'Hoy', color: '#4CAF7D' }
    return { texto: `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`, color: '#8A7560' }
  }
  const badgeExamenes = badgeUltimo(examenes, 'fecha')
  const badgeRevisiones = badgeUltimo(revisiones, 'fecha')

  // Píldora reutilizable para los encabezados de sección
  function PildoraBadge({ b }: { b: Badge }) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${b.color}1F`, color: b.color }}>
        {b.texto}
      </span>
    )
  }


  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#8A7560]">Cargando...</div>

  return (
    <div className="min-h-screen pb-24 fade-in">

      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/chiqui/chiqui_escudo.png" alt="CHIQUI" className="w-9 h-9 object-contain" />
          <div>
            <h1 className="font-heading text-xl font-extrabold">Salud preventiva</h1>
            <p className="text-xs text-[#8A7560]">{mascota?.nombre}</p>
          </div>
        </div>
      </div>

      {mascota && <SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} />}

      {/* ÁREA 1: Signos vitales */}
      <div className="mx-4 mb-2 mt-1 flex items-center gap-2">
        <img src="/chiqui/chiqui_temperatura.png" alt="" className="w-7 h-7 object-contain" />
        <p className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Signos vitales</p>
      </div>

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
              <p className="text-xs text-[#7A4A2F] leading-relaxed">Aquí puedes contarme cuánto pesa tu compañero cada vez que lo controlen.</p>
            </div>
            <PesoTracker mascotaId={mascota.id} pesoActual={mascota.peso_actual} />
          </div>
        )}
      </div>

      {mascota && <ExamenesLab mascotaId={mascota.id} especie={mascota.especie || ''} />}

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

      {/* ÁREA 2: Prevención */}
      <div className="mx-4 mb-2 mt-3 flex items-center gap-2">
        <img src="/chiqui/chiqui_medicamentos.png" alt="" className="w-7 h-7 object-contain" />
        <p className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Prevención</p>
      </div>

      {/* VACUNAS */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('vacunas')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <div className="flex items-center gap-2"><span className="font-bold text-sm text-[#3D2B1F]">💉 Vacunas</span>{badgeVacunas && <PildoraBadge b={badgeVacunas} />}</div>
          <div className="flex items-center gap-2">
            <span onClick={(e) => { e.stopPropagation(); setModal('vacuna'); setForm({}); setEditandoId(null); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }} className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg">+ Agregar</span>
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
                  <button onClick={() => { setModal('vacuna'); setForm({}); setEditandoId(null) }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">+ Agregar primera vacuna</button>
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
          <div className="flex items-center gap-2"><span className="font-bold text-sm text-[#3D2B1F]">💊 Antiparasitarios</span>{badgeAntis && <PildoraBadge b={badgeAntis} />}</div>
          <div className="flex items-center gap-2">
            <span onClick={(e) => { e.stopPropagation(); setModal('anti'); setForm({}); setEditandoId(null); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }} className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg">+ Agregar</span>
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
                  <button onClick={() => { setModal('anti'); setForm({}); setEditandoId(null) }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">+ Agregar primero</button>
                </div>
              )}
              {(() => {
                // Solo la dosis MAS RECIENTE (por fecha_aplicacion) muestra el
                // indicador de "Próximo/Vencido" -- una dosis vieja ya
                // reemplazada por una más nueva no debería seguir alarmando
                // en rojo, ya que esa fecha dejó de ser información accionable.
                const idAntiMasReciente = antis.length > 0
                  ? antis.slice().sort((x, y) => (y.fecha_aplicacion || '').localeCompare(x.fecha_aplicacion || ''))[0].id
                  : null
                return antis.map(a => (
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
                          {a.proxima_fecha && a.id === idAntiMasReciente && (
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
                ))
              })()}
            </div>
          </div>
        )}
      </div>

      {/* MEDICAMENTOS */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('medicamentos')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <div className="flex items-center gap-2"><span className="font-bold text-sm text-[#3D2B1F]">🩹 Medicamentos</span>{badgeMeds && <PildoraBadge b={badgeMeds} />}</div>
          <div className="flex items-center gap-2">
            <span onClick={(e) => { e.stopPropagation(); setModal('medicamento'); setForm({}); setEditandoId(null); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }} className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg">+ Agregar</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('medicamentos') ? '⌃' : '⌄'}</span>
          </div>
        </button>
        {estaAbierta('medicamentos') && (
          <div className="border-t border-[#EEE2D4]">
            <div className="mx-4 space-y-3">
              <div className="bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
                <span className="text-base flex-shrink-0">🐾</span>
                <p className="text-xs text-[#7A4A2F] leading-relaxed">Si tu compañero está tomando algún remedio, cuéntame cuál, cuánto, y cada cuánto.</p>
              </div>
              {medicamentos.length === 0 && (
                <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
                  <div className="text-4xl mb-3">🩹</div>
                  <p className="text-sm text-[#8A7560]">Sin medicamentos registrados</p>
                  <button onClick={() => { setModal('medicamento'); setForm({}) }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">+ Agregar medicamento</button>
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
                    {med.nota && <p className="text-xs text-[#8A7560] mt-2 italic bg-[#FBEAD9] rounded-xl p-2">📝 {med.nota}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ÁREA 3: Historial médico */}
      <div className="mx-4 mb-2 mt-3 flex items-center gap-2">
        <img src="/chiqui/chiqui_examen.png" alt="" className="w-7 h-7 object-contain" />
        <p className="text-xs font-bold text-[#8A7560] uppercase tracking-wider">Historial médico</p>
      </div>

      {/* ENFERMEDADES */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('enfermedades')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <div className="flex items-center gap-2"><span className="font-bold text-sm text-[#3D2B1F]">🏥 Enfermedades</span>{badgeEnf && <PildoraBadge b={badgeEnf} />}</div>
          <div className="flex items-center gap-2">
            <span onClick={(e) => { e.stopPropagation(); setModal('enfermedad'); setForm({}); setEditandoId(null); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }} className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg">+ Agregar</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('enfermedades') ? '⌃' : '⌄'}</span>
          </div>
        </button>
        {estaAbierta('enfermedades') && (
          <div className="border-t border-[#EEE2D4]">
            <div className="mx-4 space-y-3">
              <div className="bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
                <span className="text-base flex-shrink-0">🐾</span>
                <p className="text-xs text-[#7A4A2F] leading-relaxed">Aquí va su historial médico: diagnósticos, lesiones, cómo ha ido evolucionando.</p>
              </div>
              {enfermedades.length === 0 && (
                <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
                  <div className="text-4xl mb-3">🏥</div>
                  <p className="text-sm text-[#8A7560]">Sin enfermedades registradas</p>
                  <button onClick={() => { setModal('enfermedad'); setForm({}); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">+ Agregar diagnóstico</button>
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
                      {enf.nota && <p className="text-xs text-[#8A7560] mt-2 italic bg-[#FBEAD9] rounded-xl p-2">📝 {enf.nota}</p>}
                      {enf.foto_url && <img src={enf.foto_url} alt={enf.diagnostico} className="w-full h-40 object-cover rounded-xl mt-2" />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* OBSERVACIONES — MEJORAS 1 y 2 */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('obs')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <div className="flex items-center gap-2"><span className="font-bold text-sm text-[#3D2B1F]">👁️ Observaciones</span>{badgesObs.map((b, i) => <PildoraBadge key={i} b={b} />)}</div>
          <div className="flex items-center gap-2">
            <span onClick={(e) => { e.stopPropagation(); setModal('obs'); setForm({}); setEditandoId(null); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }} className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg">+ Nueva</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('obs') ? '⌃' : '⌄'}</span>
          </div>
        </button>
        {estaAbierta('obs') && (
          <div className="border-t border-[#EEE2D4]">
            <div className="mx-4 space-y-3">
              <div className="bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
                <span className="text-base flex-shrink-0">🐾</span>
                <p className="text-xs text-[#7A4A2F] leading-relaxed">¿Notaste algo raro? Regístralo aquí y agrega evoluciones para seguir el progreso con el tiempo.</p>
              </div>

              {obs.length === 0 && (
                <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
                  <div className="text-4xl mb-3">👁️</div>
                  <p className="text-sm text-[#8A7560]">Sin observaciones registradas</p>
                  <button onClick={() => { setModal('obs'); setForm({}); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">+ Agregar observación</button>
                </div>
              )}

              {/* ACTIVAS */}
              {obsActivas.map(o => (
                <div key={o.id} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
                  {/* Header de la observación */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 bg-[#F07A30]" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm">{o.titulo}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#F07A30]/20 text-[#F07A30]">Activa</span>
                            <button onClick={() => editarObs(o)} className="text-[#8A7560] text-sm w-6 h-6 flex items-center justify-center">✏️</button>
                            <button onClick={() => eliminarObs(o.id)} className="text-[#E05252] text-sm w-6 h-6 flex items-center justify-center">🗑️</button>
                          </div>
                        </div>
                        {o.descripcion && <p className="text-xs text-[#8A7560] mt-1 leading-relaxed">{o.descripcion}</p>}
                        <p className="text-xs text-[#8A7560] mt-1">Desde: {fmt(o.fecha_inicio)}</p>
                        {o.foto_url && obsExpandida !== o.id && <img src={o.foto_url} alt={o.titulo} className="w-full max-h-64 object-contain bg-[#FBEAD9] rounded-xl mt-2" />}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => toggleObs(o.id)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#FBEAD9] text-[#8C572F]"
                      >
                        {obsExpandida === o.id ? '⌃ Ocultar evoluciones' : `⌄ Ver evoluciones${evoluciones[o.id] ? ` (${evoluciones[o.id].length})` : ''}`}
                      </button>
                      <button
                        onClick={() => { setModalEvo(o.id); setEditandoEvoId(null); setFormEvo({ fecha: '', nota: '' }); setFotoEvo(null); setFotoEvoPreview(null) }}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FFBD59] text-[#1A1200]"
                      >
                        + Evolución
                      </button>
                      <button
                        onClick={() => { setModalResolverObs(o.id); setFechaResolucion('') }}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-[#4CAF7D]/15 text-[#4CAF7D]"
                      >
                        ✓ Resuelta
                      </button>
                    </div>
                  </div>

                  {/* TIMELINE DE EVOLUCIONES — incluye la entrada inicial integrada cronológicamente */}
                  {obsExpandida === o.id && (
                    <div className="border-t border-[#EEE2D4] bg-[#F5EDE3]/50 px-4 py-3">
                      {!evoluciones[o.id] ? (
                        <p className="text-xs text-[#8A7560] text-center py-2">Cargando...</p>
                      ) : (
                        <div className="space-y-3">
                          {/* Combinar evoluciones + entrada inicial, ordenadas más reciente primero */}
                          {[
                            ...evoluciones[o.id].map((evo: any) => ({ ...evo, esInicial: false })),
                            { id: `inicial-${o.id}`, fecha: o.fecha_inicio, nota: o.descripcion, foto_url: o.foto_url, esInicial: true },
                          ]
                            .sort((a: any, b: any) => (b.fecha || '').localeCompare(a.fecha || ''))
                            .map((evo: any, idx: number, arr: any[]) => (
                            <div key={evo.id} className="flex gap-3">
                              {/* Línea de tiempo */}
                              <div className="flex flex-col items-center">
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${evo.esInicial ? 'bg-[#CD7421]' : 'bg-[#8C572F]'}`} />
                                {idx < arr.length - 1 && (
                                  <div className="w-0.5 flex-1 bg-[#EEE2D4] mt-1" />
                                )}
                              </div>
                              <div className="flex-1 pb-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-[#8C572F]">
                                    {fmt(evo.fecha)}{evo.esInicial ? ' · Inicio' : ''}
                                  </p>
                                  {!evo.esInicial && (
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => editarEvo(evo, o.id)} className="text-[#8A7560] text-xs w-6 h-6 flex items-center justify-center">✏️</button>
                                      <button onClick={() => eliminarEvo(evo, o.id)} className="text-[#E05252] text-xs w-6 h-6 flex items-center justify-center">🗑️</button>
                                    </div>
                                  )}
                                </div>
                                {evo.nota && <p className="text-xs text-[#3D2B1F] mt-0.5 leading-relaxed">{evo.nota}</p>}
                                {evo.foto_url && <img src={evo.foto_url} alt="" className="w-full max-h-64 object-contain bg-[#FFFCF8] rounded-xl mt-1.5" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* RESUELTAS — colapsadas por debajo */}
              {obsResueltas.length > 0 && (
                <div>
                  <button onClick={() => toggleSeccion('obs_resueltas')} className="w-full flex items-center justify-between py-2 px-1">
                    <span className="text-xs font-bold text-[#8A7560]">Resueltas ({obsResueltas.length})</span>
                    <span className="text-[#8A7560] text-sm">{estaAbierta('obs_resueltas') ? '⌃' : '⌄'}</span>
                  </button>
                  {estaAbierta('obs_resueltas') && (
                    <div className="space-y-2">
                      {obsResueltas.map(o => (
                        <div key={o.id} className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden opacity-75">
                          <div className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#4CAF7D]" />
                                <p className="font-semibold text-sm text-[#3D2B1F]">{o.titulo}</p>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#4CAF7D]/15 text-[#4CAF7D]">Resuelta</span>
                            </div>
                            <p className="text-xs text-[#8A7560] mt-1">
                              {fmt(o.fecha_inicio)} → {o.fecha_resolucion ? fmt(o.fecha_resolucion) : 'sin fecha de resolución'}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => toggleObs(o.id)} className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-[#FBEAD9] text-[#8C572F]">
                                {obsExpandida === o.id ? '⌃ Ocultar' : `⌄ Ver evoluciones${evoluciones[o.id] ? ` (${evoluciones[o.id].length})` : ''}`}
                              </button>
                              <button onClick={() => reactivarObs(o.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#EEE2D4] text-[#8A7560]">
                                Reactivar
                              </button>
                            </div>
                            {obsExpandida === o.id && evoluciones[o.id] && evoluciones[o.id].length > 0 && (
                              <div className="mt-2 border-t border-[#EEE2D4] pt-2 space-y-2">
                                {evoluciones[o.id].map(evo => (
                                  <div key={evo.id} className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#8C572F] flex-shrink-0 mt-1" />
                                    <div className="flex-1">
                                      <p className="text-xs font-bold text-[#8C572F]">{fmt(evo.fecha)}</p>
                                      {evo.nota && <p className="text-xs text-[#3D2B1F]">{evo.nota}</p>}
                                      {evo.foto_url && <img src={evo.foto_url} alt="evolución" className="w-full h-32 object-cover rounded-xl mt-1.5" />}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* EXÁMENES */}
      <div className="mx-4 mb-2 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <button onClick={() => toggleSeccion('examenes')} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
          <div className="flex items-center gap-2"><span className="font-bold text-sm text-[#3D2B1F]">📄 Exámenes</span>{badgeExamenes && <PildoraBadge b={badgeExamenes} />}</div>
          <div className="flex items-center gap-2">
            <span onClick={(e) => { e.stopPropagation(); setModal('examen'); setForm({}); setEditandoId(null); setArchivoExamen(null); setErrorExamen(''); setFotoSalud(null); setFotoSaludPreview(null); setErrorFotoSalud('') }} className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1 rounded-lg">+ Agregar</span>
            <span className="text-[#8A7560] text-lg">{estaAbierta('examenes') ? '⌃' : '⌄'}</span>
          </div>
        </button>
        {estaAbierta('examenes') && (
          <div className="border-t border-[#EEE2D4]">
            <div className="mx-4 space-y-3">
              <div className="bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5">
                <span className="text-base flex-shrink-0">🐾</span>
                <p className="text-xs text-[#7A4A2F] leading-relaxed">Suban los exámenes en PDF: hemogramas, análisis, lo que le hayan hecho.</p>
              </div>
              {examenes.length === 0 && (
                <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-8 text-center">
                  <div className="text-4xl mb-3">📄</div>
                  <p className="text-sm text-[#8A7560]">Sin exámenes registrados</p>
                  <button onClick={() => { setModal('examen'); setForm({}); setArchivoExamen(null); setErrorExamen('') }} className="mt-4 bg-[#FFBD59] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">+ Subir primer examen</button>
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
                      <button onClick={() => abrirExamen(ex.id, ex.archivo_path)} disabled={urlEnProgreso === ex.id}
                        className="w-full mt-3 bg-[#9B7FE8]/15 text-[#9B7FE8] font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
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
            <div className="flex items-center gap-2">
              <img src="/chiqui/chiqui_amor.png" alt="" className="w-7 h-7 object-contain" />
              <span className="font-bold text-sm text-[#3D2B1F]">🌸 Reproducción</span>
            </div>
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
            <div className="flex items-center gap-2"><span className="font-bold text-sm text-[#3D2B1F]">🔍 Revisiones Corporales</span>{badgeRevisiones && <PildoraBadge b={badgeRevisiones} />}</div>
            <span className="text-[#8A7560] text-lg">{estaAbierta('revisiones') ? '⌃' : '⌄'}</span>
          </button>
          {estaAbierta('revisiones') && (
            <div className="border-t border-[#EEE2D4]">
              {revisiones.map((rev, i) => {
                const MESES2 = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
                const d = new Date(rev.fecha + 'T00:00:00')
                const conAlgo = rev.resultado === 'con_observacion'
                return (
                  <div key={rev.id} className={`px-4 py-3 ${i < revisiones.length-1 ? 'border-b border-[#EEE2D4]' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-[#3D2B1F]">{d.getDate()} {MESES2[d.getMonth()]} {d.getFullYear()}</p>
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

      {/* MODAL MENÚ EDITAR/ELIMINAR */}
      {menuAbierto && (
        <div className="fixed inset-0 z-[60] overflow-hidden flex items-end justify-center bg-black/60" onClick={() => setMenuAbierto(null)}>
          <div className="w-full max-w-[420px] bg-[#FFFCF8] rounded-t-2xl p-2 pb-5" style={{ maxHeight: 'calc(100vh - 80px)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#EEE2D4] rounded-full mx-auto mb-3 mt-1" />
            <button onClick={() => {
              if (menuAbierto.tipo === 'vacuna') { const v = vacunas.find((x: any) => x.id === menuAbierto.id); if (v) editarVacuna(v) }
              else { const a = antis.find((x: any) => x.id === menuAbierto.id); if (a) editarAnti(a) }
            }} className="w-full px-4 py-3.5 text-left text-sm font-medium text-[#3D2B1F] flex items-center gap-3">
              <span className="text-lg">✏️</span> Editar
            </button>
            <div className="h-px bg-[#EEE2D4] mx-4" />
            <button onClick={() => {
              if (menuAbierto.tipo === 'vacuna') eliminarVacuna(menuAbierto.id)
              else eliminarAnti(menuAbierto.id)
            }} className="w-full px-4 py-3.5 text-left text-sm font-medium text-[#E05252] flex items-center gap-3">
              <span className="text-lg">🗑️</span> Eliminar
            </button>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR/EDITAR */}
      {modal && (
        <div className="fixed inset-0 z-[60] overflow-hidden flex items-end justify-center bg-black/60" onClick={() => { setModal(null); setEditandoId(null) }}>
          <div className="w-full max-w-[480px] bg-[#FFFCF8] rounded-t-2xl p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)', paddingBottom: '24px' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-base">
                {modal === 'vacuna' ? (editandoId ? '💉 Editar vacuna' : '💉 Nueva vacuna')
                  : modal === 'anti' ? (editandoId ? '💊 Editar antiparasitario' : '💊 Nuevo antiparasitario')
                  : modal === 'medicamento' ? '🩹 Nuevo medicamento'
                  : modal === 'enfermedad' ? '🏥 Nuevo diagnóstico'
                  : modal === 'examen' ? '📄 Nuevo examen'
                  : '👁️ Nueva observación'}
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
                <input className={IC} placeholder="ej. Séxtuple, Antirrábica..." value={form.nombre || ''} onChange={e => u('nombre', e.target.value)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha de aplicación *</label>
                <FechaSelector value={form.fecha_aplicacion || ''} onChange={v => u('fecha_aplicacion', v)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Próxima vacunación</label>
                <FechaSelector value={form.proxima_fecha || ''} onChange={v => u('proxima_fecha', v)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Lote / Serie</label>
                <input className={IC} placeholder="ej. A16301" value={form.lote || ''} onChange={e => u('lote', e.target.value)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nota</label>
                <input className={IC} placeholder="Observación opcional" value={form.nota || ''} onChange={e => u('nota', e.target.value)} /></div>
            </>}

            {modal === 'anti' && <>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nombre del producto *</label>
                <input className={IC} placeholder="ej. Bravecto, Simparica..." value={form.nombre || ''} onChange={e => u('nombre', e.target.value)} /></div>
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
                <input className={IC} placeholder="Observación opcional" value={form.nota || ''} onChange={e => u('nota', e.target.value)} /></div>
            </>}

            {modal === 'medicamento' && <>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nombre del medicamento *</label>
                <input className={IC} placeholder="ej. Amoxicilina" value={form.nombre || ''} onChange={e => u('nombre', e.target.value)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Dosis</label>
                <input className={IC} placeholder="ej. 250mg, media pastilla" value={form.dosis || ''} onChange={e => u('dosis', e.target.value)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Frecuencia</label>
                <input className={IC} placeholder="ej. cada 12 horas" value={form.frecuencia || ''} onChange={e => u('frecuencia', e.target.value)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Motivo</label>
                <input className={IC} placeholder="ej. Infección de oído" value={form.motivo || ''} onChange={e => u('motivo', e.target.value)} /></div>
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
                <input className={IC} placeholder="Observación opcional" value={form.nota || ''} onChange={e => u('nota', e.target.value)} /></div>
            </>}

            {modal === 'enfermedad' && <>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Diagnóstico *</label>
                <input className={IC} placeholder="ej. Displasia de cadera, Gastritis" value={form.diagnostico || ''} onChange={e => u('diagnostico', e.target.value)} /></div>
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
                <input className={IC} placeholder="ej. Dr. González, Clínica X" value={form.veterinario || ''} onChange={e => u('veterinario', e.target.value)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Próxima revisión</label>
                <FechaSelector value={form.proxima_revision || ''} onChange={v => u('proxima_revision', v)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Notas</label>
                <textarea className={IC} rows={3} placeholder="Detalles del diagnóstico..." value={form.nota || ''} onChange={e => u('nota', e.target.value)} /></div>
              <div>
                <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Foto (opcional)</label>
                <div className="flex items-center gap-3">
                  <label className="w-16 h-16 rounded-xl bg-[#FFFCF8] border border-[#EEE2D4] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer">
                    {fotoSaludPreview ? <img src={fotoSaludPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">📷</span>}
                    <input type="file" accept="image/*" onChange={elegirFotoSalud} className="hidden" />
                  </label>
                  <p className="text-xs text-[#8A7560]">Toca para agregar una foto.</p>
                </div>
                {errorFotoSalud && <p className="text-[11px] text-[#E05252] mt-1.5">{errorFotoSalud}</p>}
              </div>
            </>}

            {modal === 'obs' && <>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Título *</label>
                <input className={IC} placeholder="ej. Grano en oreja derecha" value={form.titulo || ''} onChange={e => u('titulo', e.target.value)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Tipo</label>
                <select className={SC} value={form.tipo || ''} onChange={e => u('tipo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option>alergia</option><option>enfermedad</option><option>lesion</option><option>comportamiento</option><option>otro</option>
                </select></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Descripción inicial</label>
                <textarea className={IC} rows={3} placeholder="Describe lo observado..." value={form.descripcion || ''} onChange={e => u('descripcion', e.target.value)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha de inicio</label>
                <FechaSelector value={form.fecha_inicio || ''} onChange={v => u('fecha_inicio', v)} /></div>
              <div>
                <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Foto inicial (opcional)</label>
                <div className="flex items-center gap-3">
                  <label className="w-16 h-16 rounded-xl bg-[#FFFCF8] border border-[#EEE2D4] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer">
                    {fotoSaludPreview ? <img src={fotoSaludPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">📷</span>}
                    <input type="file" accept="image/*" onChange={elegirFotoSalud} className="hidden" />
                  </label>
                  <p className="text-xs text-[#8A7560]">Foto del estado inicial (opcional). Podrás agregar más en las evoluciones.</p>
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
                <input className={IC} placeholder="ej. Control anual" value={form.nombre || ''} onChange={e => u('nombre', e.target.value)} /></div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha del examen *</label>
                <FechaSelector value={form.fecha || ''} onChange={v => u('fecha', v)} /></div>
              <div>
                <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Archivo PDF *</label>
                <input type="file" accept="application/pdf" onChange={e => setArchivoExamen(e.target.files?.[0] || null)}
                  className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#FFBD59] file:text-[#1A1200] file:text-xs file:font-bold" />
                <p className="text-[11px] text-[#8A7560] mt-1.5">Máximo 8MB, solo PDF.</p>
                {archivoExamen && <p className="text-xs text-[#4CAF7D] mt-1">✓ {archivoExamen.name} ({(archivoExamen.size / 1024 / 1024).toFixed(1)}MB)</p>}
              </div>
              <div><label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nota / resultado</label>
                <textarea className={IC} rows={3} placeholder="ej. Todo normal, colesterol levemente alto..." value={form.nota || ''} onChange={e => u('nota', e.target.value)} /></div>
              {errorExamen && <p className="text-xs text-[#E05252] bg-[#E05252]/10 rounded-xl p-3">{errorExamen}</p>}
            </>}
          </div>
        </div>
      )}

      {/* MODAL: Nueva evolución */}
      {modalEvo && (
        <div className="fixed inset-0 z-[60] overflow-hidden flex items-end justify-center bg-black/60"
          onClick={() => { setModalEvo(null); setEditandoEvoId(null); setFotoEvo(null); setFotoEvoPreview(null) }}>
          <div className="w-full max-w-[480px] bg-[#FFFCF8] rounded-t-2xl p-5 space-y-4 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 80px)', paddingBottom: '24px' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">{editandoEvoId ? '✏️ Editar evolución' : '📝 Nueva evolución'}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => guardarEvolucion(modalEvo)}
                  disabled={!formEvo.fecha || savingEvo}
                  className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-40"
                >
                  {savingEvo ? '...' : 'Guardar'}
                </button>
                <button onClick={() => { setModalEvo(null); setEditandoEvoId(null); setFotoEvo(null); setFotoEvoPreview(null) }} className="text-[#8A7560] text-xl">✕</button>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha *</label>
              <FechaSelector value={formEvo.fecha} onChange={v => setFormEvo(f => ({ ...f, fecha: v }))} />
            </div>
            <div>
              <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Nota</label>
              <textarea
                className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none"
                rows={3}
                placeholder="¿Cómo está hoy? ¿Mejoró, empeoró, igual?"
                value={formEvo.nota}
                onChange={e => setFormEvo(f => ({ ...f, nota: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Foto (opcional)</label>
              <div className="flex items-center gap-3">
                <label className="w-16 h-16 rounded-xl bg-[#FFFCF8] border border-[#EEE2D4] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer">
                  {fotoEvoPreview ? (
                    <img src={fotoEvoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">📷</span>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setFotoEvo(file)
                    setFotoEvoPreview(URL.createObjectURL(file))
                  }} />
                </label>
                <p className="text-xs text-[#8A7560]">Toca para agregar una foto de cómo evoluciona.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Marcar observación como resuelta */}
      {modalResolverObs && (
        <div className="fixed inset-0 z-[60] overflow-hidden flex items-end justify-center bg-black/60"
          onClick={() => setModalResolverObs(null)}>
          <div className="w-full max-w-[480px] bg-[#FFFCF8] rounded-t-2xl p-5 space-y-4 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 80px)', paddingBottom: '24px' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">✓ Marcar como resuelta</h2>
              <button onClick={() => setModalResolverObs(null)} className="text-[#8A7560] text-xl">✕</button>
            </div>
            <p className="text-xs text-[#8A7560] leading-relaxed">
              ¿En qué fecha se resolvió esta observación?
            </p>
            <div>
              <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Fecha de resolución *</label>
              <FechaSelector value={fechaResolucion} onChange={setFechaResolucion} />
            </div>
            <button
              onClick={() => marcarResuelta(modalResolverObs)}
              disabled={!fechaResolucion}
              className="w-full bg-[#4CAF7D] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
