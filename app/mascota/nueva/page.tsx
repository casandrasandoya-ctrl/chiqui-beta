'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const ESPECIES = ['Perro', 'Gato', 'Conejo', 'Ave', 'Otro']
const RAZAS_PERRO = ['Mestizo', 'Labrador', 'Golden Retriever', 'French Bulldog', 'Beagle', 'Poodle', 'Schnauzer', 'Yorkshire Terrier', 'Otro']
const RAZAS_GATO = ['Mestizo', 'Siamés', 'Persa', 'Maine Coon', 'Ragdoll', 'Bengalí', 'Otro']

export default function NuevaMascotaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    especie: '',
    raza: '',
    sexo: '',
    fecha_nacimiento: '',
    color: '',
    castrado: false,
    peso_actual: '',
    alimentacion_tipo: '',
    alimentacion_marca: '',
    alergias: '',
    microchip: '',
    veterinaria: '',
  })

  const update = (key: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('mascotas').insert({
      ...form,
      peso_actual: form.peso_actual ? parseFloat(form.peso_actual) : null,
      user_id: user.id,
    })

    if (error) {
      setError('Hubo un error guardando la mascota. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const razas = form.especie === 'Perro' ? RAZAS_PERRO : form.especie === 'Gato' ? RAZAS_GATO : []

  return (
    <div className="min-h-screen pb-8 fade-in">

      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-1">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="text-[#8A8FA8] text-xl">←</button>
          )}
          <div>
            <p className="text-xs text-[#8A8FA8]">Paso {step} de 3</p>
            <h1 className="text-xl font-bold">
              {step === 1 ? '¿Quién es tu compañero?' : step === 2 ? 'Cuéntame más' : 'Últimos detalles'}
            </h1>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full mt-3">
          <div className="h-1 bg-[#E8A84C] rounded-full transition-all" style={{ width: `${(step/3)*100}%` }} />
        </div>
      </div>

      <div className="px-5 space-y-4">

        {error && (
          <div className="bg-[#E05252]/10 border border-[#E05252]/30 rounded-xl px-4 py-3 text-sm text-[#E05252]">
            {error}
          </div>
        )}

        {/* ─── PASO 1: Básicos ─── */}
        {step === 1 && (
          <>
            <Field label="Nombre de tu mascota">
              <input className={inputClass} placeholder="ej. Luna, Mochi, Simba..."
                value={form.nombre} onChange={e => update('nombre', e.target.value)} />
            </Field>

            <Field label="Especie">
              <div className="grid grid-cols-3 gap-2">
                {ESPECIES.map(e => (
                  <button key={e} onClick={() => update('especie', e)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.especie === e ? 'bg-[#E8A84C]/15 border-[#E8A84C] text-[#E8A84C]' : 'bg-[#232840] border-white/10 text-[#8A8FA8]'}`}>
                    {e === 'Perro' ? '🐕' : e === 'Gato' ? '🐈' : e === 'Conejo' ? '🐇' : e === 'Ave' ? '🐦' : '🐾'} {e}
                  </button>
                ))}
              </div>
            </Field>

            {razas.length > 0 && (
              <Field label="Raza">
                <select className={selectClass} value={form.raza} onChange={e => update('raza', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {razas.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
            )}

            <Field label="Sexo">
              <div className="flex gap-2">
                {['Macho', 'Hembra'].map(s => (
                  <button key={s} onClick={() => update('sexo', s)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.sexo === s ? 'bg-[#E8A84C]/15 border-[#E8A84C] text-[#E8A84C]' : 'bg-[#232840] border-white/10 text-[#8A8FA8]'}`}>
                    {s === 'Macho' ? '🐾 Macho' : '🌸 Hembra'}
                  </button>
                ))}
              </div>
            </Field>

            <button
              disabled={!form.nombre || !form.especie || !form.sexo}
              onClick={() => setStep(2)}
              className="w-full bg-[#E8A84C] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-40 mt-2">
              Siguiente →
            </button>
          </>
        )}

        {/* ─── PASO 2: Más datos ─── */}
        {step === 2 && (
          <>
            <Field label="Fecha de nacimiento">
              <input type="date" className={inputClass}
                value={form.fecha_nacimiento} onChange={e => update('fecha_nacimiento', e.target.value)} />
            </Field>

            <Field label="Color / pelaje">
              <input className={inputClass} placeholder="ej. Caramelo, negro, atigrado..."
                value={form.color} onChange={e => update('color', e.target.value)} />
            </Field>

            <Field label="¿Está castrado/a?">
              <div className="flex gap-2">
                {[['Sí', true], ['No', false]].map(([label, val]) => (
                  <button key={String(label)} onClick={() => update('castrado', val as boolean)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.castrado === val ? 'bg-[#E8A84C]/15 border-[#E8A84C] text-[#E8A84C]' : 'bg-[#232840] border-white/10 text-[#8A8FA8]'}`}>
                    {label as string}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Peso actual (kg)" optional>
              <input type="number" step="0.1" className={inputClass} placeholder="ej. 8.5"
                value={form.peso_actual} onChange={e => update('peso_actual', e.target.value)} />
            </Field>

            <Field label="Alimentación" optional>
              <select className={selectClass} value={form.alimentacion_tipo} onChange={e => update('alimentacion_tipo', e.target.value)}>
                <option value="">Tipo de alimentación...</option>
                <option>Pellet seco</option>
                <option>BARF / Raw</option>
                <option>Húmedo / Lata</option>
                <option>Mixto</option>
              </select>
            </Field>

            {form.alimentacion_tipo && (
              <Field label="Marca o proteína principal" optional>
                <input className={inputClass} placeholder="ej. Belcando salmón, Royal Canin..."
                  value={form.alimentacion_marca} onChange={e => update('alimentacion_marca', e.target.value)} />
              </Field>
            )}

            <button onClick={() => setStep(3)}
              className="w-full bg-[#E8A84C] text-[#1A1200] font-bold py-4 rounded-xl text-base mt-2">
              Siguiente →
            </button>
          </>
        )}

        {/* ─── PASO 3: Opcionales ─── */}
        {step === 3 && (
          <>
            <div className="bg-[#1E2333] border border-[#3DD6B5]/15 rounded-xl p-3 flex gap-2.5">
              <span className="text-lg flex-shrink-0">🐶</span>
              <p className="text-xs text-[#F0EEE8] leading-relaxed">
                Cuanto más sé de tu compañero, mejor puedo ayudarte a interpretar sus señales. Pero estos datos son opcionales y los puedes completar después.
              </p>
            </div>

            <Field label="Alergias conocidas" optional>
              <input className={inputClass} placeholder="ej. Pollo, trigo, ninguna..."
                value={form.alergias} onChange={e => update('alergias', e.target.value)} />
            </Field>

            <Field label="N° de microchip" optional>
              <input className={inputClass} placeholder="ej. 992001000355054"
                value={form.microchip} onChange={e => update('microchip', e.target.value)} />
            </Field>

            <Field label="Veterinaria habitual" optional>
              <input className={inputClass} placeholder="Nombre de la clínica"
                value={form.veterinaria} onChange={e => update('veterinaria', e.target.value)} />
            </Field>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#E8A84C] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-50 mt-2">
              {loading ? 'Guardando...' : `Crear perfil de ${form.nombre || 'mi mascota'} 🐾`}
            </button>

            <button onClick={() => setStep(2)} className="w-full text-[#8A8FA8] text-sm py-2">
              ← Volver
            </button>
          </>
        )}

      </div>
    </div>
  )
}

function Field({ label, children, optional }: { label: string, children: React.ReactNode, optional?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">
        {label} {optional && <span className="text-[#8A8FA8]/50 normal-case tracking-normal font-normal">· opcional</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full bg-[#232840] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E8A84C]/60 transition-colors"
const selectClass = "w-full bg-[#232840] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm focus:outline-none focus:border-[#E8A84C]/60 transition-colors appearance-none"
