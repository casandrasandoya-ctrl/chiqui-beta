'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'
import LinkVet from '@/components/LinkVet'

const IC = "w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60"
const SC = "w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm focus:outline-none appearance-none"

function calcEdad(f: string): string {
  const h = new Date(), n = new Date(f)
  const m = (h.getFullYear() - n.getFullYear()) * 12 + (h.getMonth() - n.getMonth())
  return m < 12 ? `${m}m` : m % 12 > 0 ? `${Math.floor(m/12)}a ${m%12}m` : `${Math.floor(m/12)}a`
}

interface Mascota {
  id: string
  nombre: string
  especie: string
  raza?: string
  sexo?: string
  fecha_nacimiento?: string
  color?: string
  castrado?: boolean
  peso_actual?: number
  alimentacion_tipo?: string
  alimentacion_marca?: string
  alergias?: string
  microchip?: string
  veterinaria?: string
}

export default function PerfilPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mascota, setMascota] = useState<Mascota | null>(null)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Partial<Mascota>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email || '')
      const { data: m } = await supabase.from('mascotas').select('*').limit(1).single()
      if (!m) { router.push('/mascota/nueva'); return }
      setMascota(m)
      setForm(m)
      setLoading(false)
    }
    init()
  }, [])

  async function guardar() {
    if (!mascota) return
    setSaving(true)
    const { error } = await supabase.from('mascotas').update({
      nombre: form.nombre,
      raza: form.raza,
      fecha_nacimiento: form.fecha_nacimiento,
      color: form.color,
      castrado: form.castrado,
      peso_actual: form.peso_actual ? parseFloat(String(form.peso_actual)) : null,
      alimentacion_tipo: form.alimentacion_tipo,
      alimentacion_marca: form.alimentacion_marca,
      alergias: form.alergias,
      microchip: form.microchip,
      veterinaria: form.veterinaria,
    }).eq('id', mascota.id)
    if (!error) {
      setMascota({ ...mascota, ...form } as Mascota)
      setEditando(false)
      showToast('Perfil actualizado')
    }
    setSaving(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const u = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-[#8A7560]">Cargando...</div>
  )

  const edad = mascota?.fecha_nacimiento ? calcEdad(mascota.fecha_nacimiento) : ''

  const datos: [string, string][] = [
    ['Especie', mascota?.especie || '-'],
    ['Raza', mascota?.raza || '-'],
    ['Nacimiento', mascota?.fecha_nacimiento || '-'],
    ['Color', mascota?.color || '-'],
    ['Alimentación', mascota?.alimentacion_tipo ? `${mascota.alimentacion_tipo}${mascota.alimentacion_marca ? ' · ' + mascota.alimentacion_marca : ''}` : '-'],
    ['Alergias', mascota?.alergias || 'Ninguna conocida'],
    ['Microchip', mascota?.microchip || '-'],
    ['Veterinaria', mascota?.veterinaria || '-'],
  ]

  return (
    <div className="min-h-screen pb-24 fade-in">

      <div className="relative bg-gradient-to-b from-[#8C572F] to-[#F5EDE3] pt-8 pb-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#FFFCF8] border-2 border-[#4CAF7D] flex items-center justify-center text-4xl mx-auto mb-3">
          🐶
        </div>
        <h1 className="font-heading text-xl font-extrabold">{mascota?.nombre}</h1>
        <p className="text-sm text-[#8A7560] mt-1">
          {mascota?.especie}
          {mascota?.raza ? ` · ${mascota.raza}` : ''}
          {edad ? ` · ${edad}` : ''}
        </p>
        {mascota?.alergias && (
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold bg-[#E05252]/15 text-[#E05252]">
            ⚠️ Alergia: {mascota.alergias}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mx-4 mt-4 mb-4">
        <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3 text-center">
          <div className="font-bold text-sm text-[#F07A30]">{mascota?.peso_actual ? `${mascota.peso_actual}kg` : '-'}</div>
          <div className="text-[10px] text-[#8A7560] uppercase tracking-wider mt-0.5">Peso</div>
        </div>
        <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3 text-center">
          <div className="font-bold text-sm text-[#FFBD59]">{mascota?.sexo || '-'}</div>
          <div className="text-[10px] text-[#8A7560] uppercase tracking-wider mt-0.5">Sexo</div>
        </div>
        <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-3 text-center">
          <div className="font-bold text-sm text-[#4CAF7D]">{mascota?.castrado ? 'Sí' : 'No'}</div>
          <div className="text-[10px] text-[#8A7560] uppercase tracking-wider mt-0.5">Castrado</div>
        </div>
      </div>

      <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEE2D4]">
          <h2 className="font-bold text-sm">Datos del perfil</h2>
          <button onClick={() => { setEditando(!editando); setForm(mascota || {}) }} className="text-xs font-bold text-[#FFBD59]">
            {editando ? 'Cancelar' : '✏️ Editar'}
          </button>
        </div>

        {!editando ? (
          <div className="divide-y divide-[#EEE2D4]">
            {datos.map(([label, val]) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-xs text-[#8A7560]">{label}</p>
                  <p className="text-sm font-medium mt-0.5">{val}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {[
              ['Nombre', 'nombre', 'text', 'ej. Luna'],
              ['Raza', 'raza', 'text', 'ej. Mestizo'],
              ['Fecha de nacimiento', 'fecha_nacimiento', 'date', ''],
              ['Color', 'color', 'text', 'ej. Caramelo'],
              ['Peso (kg)', 'peso_actual', 'number', 'ej. 8.5'],
              ['Marca / proteína', 'alimentacion_marca', 'text', 'ej. Belcando salmón'],
              ['Alergias', 'alergias', 'text', 'ej. Pollo'],
              ['Microchip', 'microchip', 'text', ''],
              ['Veterinaria', 'veterinaria', 'text', ''],
            ].map(([label, key, type, placeholder]) => (
              <div key={key}>
                <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">{label}</label>
                <input
                  type={type}
                  step={type === 'number' ? '0.1' : undefined}
                  className={IC}
                  placeholder={placeholder}
                  value={String((form as Record<string, unknown>)[key] || '')}
                  onChange={e => u(key, e.target.value)}
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Alimentación</label>
              <select className={SC} value={form.alimentacion_tipo || ''} onChange={e => u('alimentacion_tipo', e.target.value)}>
                <option value="">Seleccionar...</option>
                <option>Pellet seco</option>
                <option>BARF / Raw</option>
                <option>Húmedo / Lata</option>
                <option>Mixto</option>
              </select>
            </div>
            <button onClick={guardar} disabled={saving} className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>

      {mascota && <LinkVet mascotaId={mascota.id} />}

      <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EEE2D4]">
          <h2 className="font-bold text-sm">Mi cuenta</h2>
        </div>
        <div className="px-4 py-3 border-b border-[#EEE2D4]">
          <p className="text-xs text-[#8A7560]">Email</p>
          <p className="text-sm mt-0.5">{userEmail}</p>
        </div>
        <button onClick={cerrarSesion} className="w-full px-4 py-3 text-left text-sm text-[#E05252] font-semibold">
          Cerrar sesión →
        </button>
      </div>

      <div className="mx-4 mb-4 bg-[#FBEAD9] border border-[#EEE2D4] rounded-2xl p-4">
        <p className="text-xs text-[#8A7560] leading-relaxed text-center">
          <span className="text-[#FFBD59] font-bold">CHIQUI Entre Señales</span><br/>
          No es una aplicación veterinaria. Es una herramienta de observación y acompañamiento.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#4CAF7D] text-[#0a2418] font-bold text-sm px-5 py-3 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
