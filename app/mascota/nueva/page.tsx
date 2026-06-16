'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
const IC = "w-full bg-[#1E2848] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E3A84A]/60 transition-colors"
const SC = "w-full bg-[#1E2848] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm focus:outline-none focus:border-[#E3A84A]/60 appearance-none"
function Field({label,children,optional}:{label:string,children:React.ReactNode,optional?:boolean}) {
  return <div><label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">{label}{optional&&<span className="text-[#8A8FA8]/50 normal-case tracking-normal font-normal"> · opcional</span>}</label>{children}</div>
}
export default function NuevaMascota() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nombre:'',especie:'',raza:'',sexo:'',fecha_nacimiento:'',color:'',castrado:false,peso_actual:'',alimentacion_tipo:'',alimentacion_marca:'',alergias:'',microchip:'',veterinaria:'' })
  const u = (k:string,v:string|boolean) => setForm(p=>({...p,[k]:v}))
  const razas = form.especie==='Perro'?['Mestizo','Labrador','Golden Retriever','French Bulldog','Beagle','Poodle','Schnauzer','Yorkshire Terrier','Otro']:form.especie==='Gato'?['Mestizo','Siamés','Persa','Maine Coon','Ragdoll','Bengalí','Otro']:[]
  async function submit() {
    setLoading(true); setError('')
    const {data:{user}} = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const {error} = await supabase.from('mascotas').insert({...form,peso_actual:form.peso_actual?parseFloat(form.peso_actual):null,user_id:user.id})
    if (error) { setError('Error guardando. Intenta de nuevo.'); setLoading(false); return }
    router.push('/dashboard'); router.refresh()
  }
  return (
    <div className="min-h-screen pb-8 fade-in">
      <div className="px-5 pt-8 pb-4">
        {step>1&&<button onClick={()=>setStep(s=>s-1)} className="text-[#8A8FA8] text-xl mb-2">←</button>}
        <p className="text-xs text-[#8A8FA8]">Paso {step} de 3</p>
        <h1 className="text-xl font-bold">{step===1?'¿Quién es tu compañero?':step===2?'Cuéntame más':'Últimos detalles'}</h1>
        <div className="h-1 bg-white/10 rounded-full mt-3"><div className="h-1 bg-[#E3A84A] rounded-full transition-all" style={{width:`${(step/3)*100}%`}}/></div>
      </div>
      <div className="px-5 space-y-4">
        {error&&<div className="bg-[#E25D5D]/10 border border-[#E25D5D]/30 rounded-xl px-4 py-3 text-sm text-[#E25D5D]">{error}</div>}
        {step===1&&<>
          <Field label="Nombre"><input className={IC} placeholder="ej. Luna, Simba..." value={form.nombre} onChange={e=>u('nombre',e.target.value)}/></Field>
          <Field label="Especie"><div className="grid grid-cols-3 gap-2">{['Perro','Gato','Otro'].map(e=><button key={e} onClick={()=>u('especie',e)} className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.especie===e?'bg-[#E3A84A]/15 border-[#E3A84A] text-[#E3A84A]':'bg-[#1E2848] border-white/10 text-[#8A8FA8]'}`}>{e==='Perro'?'🐕':e==='Gato'?'🐈':'🐾'} {e}</button>)}</div></Field>
          {razas.length>0&&<Field label="Raza"><select className={SC} value={form.raza} onChange={e=>u('raza',e.target.value)}><option value="">Seleccionar...</option>{razas.map(r=><option key={r}>{r}</option>)}</select></Field>}
          <Field label="Sexo"><div className="flex gap-2">{['Macho','Hembra'].map(s=><button key={s} onClick={()=>u('sexo',s)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.sexo===s?'bg-[#E3A84A]/15 border-[#E3A84A] text-[#E3A84A]':'bg-[#1E2848] border-white/10 text-[#8A8FA8]'}`}>{s==='Macho'?'🐾 Macho':'🌸 Hembra'}</button>)}</div></Field>
          <button disabled={!form.nombre||!form.especie||!form.sexo} onClick={()=>setStep(2)} className="w-full bg-[#E3A84A] text-[#1A1200] font-bold py-4 rounded-xl disabled:opacity-40">Siguiente →</button>
        </>}
        {step===2&&<>
          <Field label="Fecha de nacimiento"><input type="date" className={IC} value={form.fecha_nacimiento} onChange={e=>u('fecha_nacimiento',e.target.value)}/></Field>
          <Field label="Color / pelaje"><input className={IC} placeholder="ej. Caramelo, negro..." value={form.color} onChange={e=>u('color',e.target.value)}/></Field>
          <Field label="¿Está castrado/a?"><div className="flex gap-2">{[['Sí',true],['No',false]].map(([l,v])=><button key={String(l)} onClick={()=>u('castrado',v as boolean)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.castrado===v?'bg-[#E3A84A]/15 border-[#E3A84A] text-[#E3A84A]':'bg-[#1E2848] border-white/10 text-[#8A8FA8]'}`}>{l as string}</button>)}</div></Field>
          <Field label="Peso actual (kg)" optional><input type="number" step="0.1" className={IC} placeholder="ej. 8.5" value={form.peso_actual} onChange={e=>u('peso_actual',e.target.value)}/></Field>
          <Field label="Tipo de alimentación" optional><select className={SC} value={form.alimentacion_tipo} onChange={e=>u('alimentacion_tipo',e.target.value)}><option value="">Seleccionar...</option><option>Pellet seco</option><option>BARF / Raw</option><option>Húmedo / Lata</option><option>Mixto</option></select></Field>
          {form.alimentacion_tipo&&<Field label="Marca o proteína" optional><input className={IC} placeholder="ej. Belcando salmón..." value={form.alimentacion_marca} onChange={e=>u('alimentacion_marca',e.target.value)}/></Field>}
          <button onClick={()=>setStep(3)} className="w-full bg-[#E3A84A] text-[#1A1200] font-bold py-4 rounded-xl">Siguiente →</button>
        </>}
        {step===3&&<>
          <div className="bg-[#1B2340] border border-[#3DD6B5]/15 rounded-xl p-3 flex gap-2.5">
            <span className="text-lg">🐶</span>
            <p className="text-xs text-[#F0EEE8] leading-relaxed">Cuanto más sé de tu compañero, mejor puedo ayudarte a interpretar sus señales. Puedes completar esto después.</p>
          </div>
          <Field label="Alergias conocidas" optional><input className={IC} placeholder="ej. Pollo, trigo, ninguna..." value={form.alergias} onChange={e=>u('alergias',e.target.value)}/></Field>
          <Field label="N° de microchip" optional><input className={IC} placeholder="ej. 992001000355054" value={form.microchip} onChange={e=>u('microchip',e.target.value)}/></Field>
          <Field label="Veterinaria habitual" optional><input className={IC} placeholder="Nombre de la clínica" value={form.veterinaria} onChange={e=>u('veterinaria',e.target.value)}/></Field>
          <button onClick={submit} disabled={loading} className="w-full bg-[#E3A84A] text-[#1A1200] font-bold py-4 rounded-xl disabled:opacity-50">
            {loading?`Guardando...`:`Crear perfil de ${form.nombre||'mi mascota'} 🐾`}
          </button>
          <button onClick={()=>setStep(2)} className="w-full text-[#8A8FA8] text-sm py-2">← Volver</button>
        </>}
      </div>
    </div>
  )
}
