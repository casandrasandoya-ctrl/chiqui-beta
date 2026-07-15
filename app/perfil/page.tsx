'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'
import LinkVet from '@/components/LinkVet'
import SelectorMascota from '@/components/SelectorMascota'
import { determinarMascotaActiva, guardarMascotaActivaId } from '@/utils/mascotaActiva'
import { iconoPorEspecie } from '@/utils/iconoEspecie'
import FotoMascota from '@/components/FotoMascota'
import ConfiguracionNotificaciones from '@/components/ConfiguracionNotificaciones'
import { calcularEtapaVida, formatearEdad } from '@/utils/etapaVida'
import GestionCotutor from '@/components/GestionCotutor'
import UnirseComoCotutor from '@/components/UnirseComoCotutor'

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
  foto_url?: string
}

export default function PerfilPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [mascota, setMascota] = useState<Mascota | null>(null)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Partial<Mascota>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [userNombre, setUserNombre] = useState('')
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nombreInput, setNombreInput] = useState('')
  const [savingNombre, setSavingNombre] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email || '')
      // Google guarda el nombre bajo "full_name" o "name" (no "nombre",
      // que es la llave que usa nuestro registro con email/contraseña) --
      // probamos las 3 para que funcione sin importar como haya entrado.
      const meta = user.user_metadata as any
      setUserNombre(meta?.nombre || meta?.full_name || meta?.name || '')
      const { data: todasMascotas } = await supabase.from('mascotas').select('*').order('created_at', { ascending: true })
      if (!todasMascotas || !todasMascotas.length) { router.push('/mascota/nueva'); return }
      setMascotas(todasMascotas)
      const m = determinarMascotaActiva(todasMascotas)!
      setMascota(m)
      setForm(m)
      setLoading(false)
    }
    init()
  }, [])

  function cambiarMascota(nueva: Mascota) {
    guardarMascotaActivaId(nueva.id)
    setMascota(nueva)
    setForm(nueva)
    // Cerramos el modo edicion al cambiar, para no terminar editando los
    // datos de una mascota pensando que es otra.
    setEditando(false)
  }

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

  async function guardarNombre() {
    const nuevo = nombreInput.trim()
    if (!nuevo) return
    setSavingNombre(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingNombre(false); return }

    // Se guarda en metadata de auth (de donde lee "Mi cuenta") y también
    // en perfil_usuario, para mantener ambos lugares sincronizados.
    const [{ error: errAuth }] = await Promise.all([
      supabase.auth.updateUser({ data: { nombre: nuevo } }),
      supabase.from('perfil_usuario').update({ nombre: nuevo }).eq('id', user.id),
    ])

    if (!errAuth) setUserNombre(nuevo)
    setEditandoNombre(false)
    setSavingNombre(false)
    if (!errAuth) showToast('Nombre actualizado')
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
  const etapa = mascota?.fecha_nacimiento ? calcularEtapaVida(mascota.fecha_nacimiento, mascota.especie) : null

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
        <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-9 h-9 object-contain absolute top-3 right-4 opacity-90" />
        <div className="mx-auto mb-3" style={{ width: 80 }}>
          {mascota && (
            <FotoMascota
              mascotaId={mascota.id}
              especie={mascota.especie}
              fotoUrl={mascota.foto_url}
              size={80}
              editable
              onFotoActualizada={(nuevaUrl) => {
                setMascota(prev => prev ? { ...prev, foto_url: nuevaUrl } : prev)
                setMascotas(prev => prev.map(m => m.id === mascota.id ? { ...m, foto_url: nuevaUrl } : m))
              }}
            />
          )}
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

      {/* Selector de mascota */}
      {mascota && <SelectorMascota mascotas={mascotas} mascotaActiva={mascota} onCambiar={cambiarMascota} />}

      {/* Etapa de vida */}
      {etapa && (
        <div className="mx-4 mt-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <img src="/chiqui/chiqui_idea.png" alt="" className="w-8 h-8 object-contain flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-[#3D2B1F]">{etapa.nombre} · {formatearEdad(etapa)}</p>
              <p className="text-[10px] text-[#8A7560] uppercase tracking-wider">Etapa de vida</p>
            </div>
          </div>
          <p className="text-xs text-[#5C4A3A] leading-relaxed bg-[#FBEAD9] rounded-xl px-3 py-2.5">
            💡 {etapa.recomendacion}
          </p>
        </div>
      )}

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
          <div className="font-bold text-sm text-[#4CAF7D]">{mascota?.castrado ? 'Esterilizado/a' : 'Entero/a'}</div>
          <div className="text-[10px] text-[#8A7560] uppercase tracking-wider mt-0.5">Estado</div>
        </div>
      </div>

      <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEE2D4]">
          <div className="flex items-center gap-2">
            <img src="/chiqui/chiqui_registro.png" alt="" className="w-7 h-7 object-contain" />
            <h2 className="font-bold text-sm">Datos del perfil</h2>
          </div>
          <button onClick={() => { setEditando(!editando); setForm(mascota || {}) }} className="text-xs font-bold text-[#FFBD59]">
            {editando ? 'Cancelar' : ' ✏️ Editar'}
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

      {mascota && <LinkVet key={mascota.id} mascotaId={mascota.id} />}

      {/* Co-tutor */}
      {mascota && (
        <GestionCotutor
          key={mascota.id}
          mascotaId={mascota.id}
          mascotaNombre={mascota.nombre}
        />
      )}

      {/* Unirse como co-tutor — para quien tiene un código */}
      <UnirseComoCotutor />

      <ConfiguracionNotificaciones />

      <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#EEE2D4]">
          <h2 className="font-bold text-sm">Mi cuenta</h2>
        </div>
        {userNombre && (
          <div className="px-4 py-3 border-b border-[#EEE2D4]">
            <p className="text-xs text-[#8A7560]">Nombre</p>
            {!editandoNombre ? (
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-sm">{userNombre}</p>
                <button
                  onClick={() => { setNombreInput(userNombre); setEditandoNombre(true) }}
                  className="text-xs font-bold text-[#FFBD59]"
                >
                  ✏️ Editar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  value={nombreInput}
                  onChange={e => setNombreInput(e.target.value)}
                  autoFocus
                  className="flex-1 bg-[#FBEAD9] border border-[#EEE2D4] rounded-lg px-3 py-2 text-[#3D2B1F] text-sm focus:outline-none"
                />
                <button
                  onClick={guardarNombre}
                  disabled={savingNombre || !nombreInput.trim()}
                  className="bg-[#FFBD59] text-[#1A1200] font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-50"
                >
                  {savingNombre ? '...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditandoNombre(false)}
                  className="text-[#8A7560] text-xs px-2"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
        <div className="px-4 py-3 border-b border-[#EEE2D4]">
          <p className="text-xs text-[#8A7560]">Email</p>
          <p className="text-sm mt-0.5">{userEmail}</p>
        </div>
        <button onClick={() => router.push('/mascota/nueva')} className="w-full px-4 py-3 text-left text-sm text-[#8C572F] font-semibold border-b border-[#EEE2D4]">
          + Agregar otra mascota
        </button>
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
