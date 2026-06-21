'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { guardarMascotaActivaId } from '@/utils/mascotaActiva'

const ESPECIES = ['Perro', 'Gato', 'Conejo', 'Ave', 'Otro']

const RAZAS_PERRO = [
  'Mestizo', 'Poodle', 'Pastor Alemán', 'Yorkshire Terrier', 'Dachshund',
  'Fox Terrier', 'Beagle', 'Labrador Retriever', 'Golden Retriever',
  'Chihuahua', 'Boxer', 'Galgo', 'Pug', 'Maltés', 'French Bulldog',
  'Bulldog Inglés', 'Border Collie', 'Schnauzer', 'Husky Siberiano',
  'Rottweiler', 'Otro',
]

const RAZAS_GATO = [
  'Mestizo', 'Doméstico pelo corto', 'Doméstico pelo largo', 'Siamés',
  'Persa', 'Maine Coon', 'Ragdoll', 'Bengalí', 'Esfinge (Sphynx)',
  'Británico de pelo corto', 'Angora', 'Otro',
]

export default function NuevaMascotaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [errorFoto, setErrorFoto] = useState('')

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
    setForm(prev => {
      if (key === 'especie' && value !== prev.especie) {
        return { ...prev, especie: value as string, raza: '' }
      }
      return { ...prev, [key]: value }
    })

  function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setErrorFoto('')
    if (!archivo.type.startsWith('image/')) {
      setErrorFoto('Solo se aceptan imágenes.')
      return
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setErrorFoto('La imagen supera los 2MB. Intenta con una foto más liviana.')
      return
    }
    setFotoArchivo(archivo)
    setFotoPreview(URL.createObjectURL(archivo))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: nuevaMascota, error } = await supabase.from('mascotas').insert({
      ...form,
      peso_actual: form.peso_actual ? parseFloat(form.peso_actual) : null,
      user_id: user.id,
    }).select('id').single()

    if (error || !nuevaMascota) {
      setError('Hubo un error guardando la mascota. Intenta de nuevo.')
      setLoading(false)
      return
    }

    // Si se eligio una foto antes de guardar, la subimos ahora que ya
    // existe el id de la mascota (la foto no se podia subir antes porque
    // el componente necesita ese id para construir la ruta del archivo).
    if (fotoArchivo) {
      const extension = fotoArchivo.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${nuevaMascota.id}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from('fotos-mascotas')
        .upload(path, fotoArchivo, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('fotos-mascotas').getPublicUrl(path)
        await supabase.from('mascotas').update({ foto_url: `${urlData.publicUrl}?t=${Date.now()}` }).eq('id', nuevaMascota.id)
      }
      // Si falla la subida de la foto, no bloqueamos la creacion de la
      // mascota -- ya quedo guardada, solo sin foto. La persona puede
      // agregarla despues desde Perfil.
    }

    guardarMascotaActivaId(nuevaMascota.id)
    router.push(`/mascota/vacuna-inicial?mascotaId=${nuevaMascota.id}&nombre=${encodeURIComponent(form.nombre)}`)
    router.refresh()
  }

  const mostrarSelectorRaza = form.especie === 'Perro' || form.especie === 'Gato'
  const razas = form.especie === 'Perro' ? RAZAS_PERRO : form.especie === 'Gato' ? RAZAS_GATO : []

  const paso1Completo = !!form.nombre && !!form.especie && !!form.sexo && (!mostrarSelectorRaza || !!form.raza)

  return (
    <div className="min-h-screen pb-8 fade-in">

      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-1">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="text-[#8A7560] text-xl">←</button>
          )}
          <div>
            <p className="text-xs text-[#8A7560]">Paso {step} de 3</p>
            <h1 className="text-xl font-bold">
              {step === 1 ? '¿Quién es tu compañero?' : step === 2 ? 'Cuéntame más' : 'Últimos detalles'}
            </h1>
          </div>
        </div>
        <div className="h-1 bg-[#EEE2D4] rounded-full mt-3">
          <div className="h-1 bg-[#FFBD59] rounded-full transition-all" style={{ width: `${(step/3)*100}%` }} />
        </div>
      </div>

      <div className="px-5 space-y-4">

        {error && (
          <div className="bg-[#E05252]/10 border border-[#E05252]/30 rounded-xl px-4 py-3 text-sm text-[#E05252]">
            {error}
          </div>
        )}

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
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.especie === e ? 'bg-[#FFBD59]/15 border-[#FFBD59] text-[#FFBD59]' : 'bg-[#FFFCF8] border-[#EEE2D4] text-[#8A7560]'}`}>
                    {e === 'Perro' ? '🐕' : e === 'Gato' ? '🐈' : e === 'Conejo' ? '🐇' : e === 'Ave' ? '🐦' : '🐾'} {e}
                  </button>
                ))}
              </div>
            </Field>

            {mostrarSelectorRaza && (
              <Field label="Raza">
                <select className={selectClass} value={form.raza} onChange={e => update('raza', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {razas.map(r => <option key={r}>{r}</option>)}
                </select>
                {!form.raza && (
                  <p className="text-[11px] text-[#8A7560] mt-1.5">Elige una raza para continuar. Si no sabes cuál, selecciona "Mestizo" u "Otro".</p>
                )}
              </Field>
            )}

            <Field label="Sexo">
              <div className="flex gap-2">
                {['Macho', 'Hembra'].map(s => (
                  <button key={s} onClick={() => update('sexo', s)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.sexo === s ? 'bg-[#FFBD59]/15 border-[#FFBD59] text-[#FFBD59]' : 'bg-[#FFFCF8] border-[#EEE2D4] text-[#8A7560]'}`}>
                    {s === 'Macho' ? '🐾 Macho' : '🌸 Hembra'}
                  </button>
                ))}
              </div>
            </Field>

            <button
              disabled={!paso1Completo}
              onClick={() => setStep(2)}
              className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-40 mt-2">
              Siguiente →
            </button>
          </>
        )}

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
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.castrado === val ? 'bg-[#FFBD59]/15 border-[#FFBD59] text-[#FFBD59]' : 'bg-[#FFFCF8] border-[#EEE2D4] text-[#8A7560]'}`}>
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
              className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base mt-2">
              Siguiente →
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="bg-[#FBEAD9] border border-[#3DD6B5]/15 rounded-xl p-3 flex gap-2.5">
              <span className="text-lg flex-shrink-0">🐶</span>
              <p className="text-xs text-[#3D2B1F] leading-relaxed">
                Cuanto más sé de tu compañero, mejor puedo ayudarte a interpretar sus señales. Pero estos datos son opcionales y los puedes completar después.
              </p>
            </div>

            <Field label="Foto de tu mascota" optional>
              <div className="flex items-center gap-3">
                <label className="w-16 h-16 rounded-full bg-[#FFFCF8] border-2 border-[#EEE2D4] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">📷</span>
                  )}
                  <input type="file" accept="image/*" onChange={elegirFoto} className="hidden" />
                </label>
                <p className="text-xs text-[#8A7560]">Toca el círculo para elegir una foto desde tu cámara o galería.</p>
              </div>
              {errorFoto && <p className="text-[11px] text-[#E05252] mt-1.5">{errorFoto}</p>}
            </Field>

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
              className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-50 mt-2">
              {loading ? 'Guardando...' : `Crear perfil de ${form.nombre || 'mi mascota'} 🐾`}
            </button>

            <button onClick={() => setStep(2)} className="w-full text-[#8A7560] text-sm py-2">
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
      <label className="block text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2">
        {label} {optional && <span className="text-[#8A7560]/50 normal-case tracking-normal font-normal">· opcional</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none focus:border-[#FFBD59]/60 transition-colors"
const selectClass = "w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm focus:outline-none focus:border-[#FFBD59]/60 transition-colors appearance-none"
