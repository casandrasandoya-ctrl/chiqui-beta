'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'

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

export default function PrevencionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mascota, setMascota] = useState<any>(null)
  const [vacunas, setVacunas] = useState<any[]>([])
  const [antis, setAntis] = useState<any[]>([])
  const [obs, setObs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'vacunas' | 'anti' | 'obs'>('vacunas')
  const [modal, setModal] = useState<'vacuna' | 'anti' | 'obs' | null>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

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
    const [v, a, o] = await Promise.all([
      supabase.from('vacunas').select('*').eq('mascota_id', id).order('fecha_aplicacion', { ascending: false }),
      supabase.from('antiparasitarios').select('*').eq('mascota_id', id).order('fecha_aplicacion', { ascending: false }),
      supabase.from('observaciones').select('*').eq('mascota_id', id).order('created_at', { ascending: false }),
    ])
    setVacunas(v.data || [])
    setAntis(a.data || [])
    setObs(o.data || [])
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
    }
    await cargarDatos(mascota.id)
    setModal(null); setForm({}); setSaving(false)
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
        <button
          onClick={() => { setModal(tab === 'vacunas' ? 'vacuna' : tab === 'anti' ? 'anti' : 'obs'); setForm({}) }}
          className="bg-[#E8A84C] text-[#1A1200] text-xs font-bold px-4 py-2 rounded-xl"
        >
          + Agregar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-2 mb-4">
        {[['vacunas','💉 Vacunas'],['anti','💊 Antiparasitarios'],['obs','👁️ Observaciones']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-[#E8A84C] text-[#1A1200]' : 'bg-[#232840] text-[#8A8FA8]'}`}>
            {l}
          </button>
        ))}
      </div>

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

      {/* MODAL AGREGAR */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="w-full max-w-[480px] bg-[#232840] rounded-t-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-base">
                {modal === 'vacuna' ? '💉 Nueva vacuna' : modal === 'anti' ? '💊 Nuevo antiparasitario' : '👁️ Nueva observación'}
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

            <button onClick={guardar} disabled={saving || !form.nombre && !form.titulo}
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
