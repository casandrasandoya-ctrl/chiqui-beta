const fs = require('fs');
const path = require('path');

function write(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ ' + filePath);
}

// ── CALENDARIO
write('app/calendario/page.tsx', `'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
const EC:Record<string,string>={verde:'#4CCB7F',amarillo:'#F5C842',naranjo:'#F39B35',rojo:'#E25D5D'}
const EB:Record<string,string>={verde:'rgba(76,203,127,0.18)',amarillo:'rgba(245,200,66,0.15)',naranjo:'rgba(243,155,53,0.18)',rojo:'rgba(226,93,93,0.18)'}
const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
export default function CalendarioPage() {
  const router=useRouter(),supabase=createClient()
  const [mascota,setMascota]=useState<any>(null)
  const [registros,setRegistros]=useState<Record<string,any>>({})
  const [mes,setMes]=useState(new Date().getMonth())
  const [año,setAño]=useState(new Date().getFullYear())
  const [dia,setDia]=useState<number|null>(null)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    async function init(){
      const{data:{user}}=await supabase.auth.getUser()
      if(!user){router.push('/login');return}
      const{data:m}=await supabase.from('mascotas').select('*').limit(1).single()
      if(!m){router.push('/mascota/nueva');return}
      setMascota(m);await load(m.id,mes,año);setLoading(false)
    }
    init()
  },[])
  async function load(id:string,m:number,a:number){
    const ini=\`\${a}-\${String(m+1).padStart(2,'0')}-01\`
    const fin=\`\${a}-\${String(m+1).padStart(2,'0')}-31\`
    const{data}=await supabase.from('registros_diarios').select('fecha,estado_dia,nota,energia,animo,apetito,agua,digestion,pelaje,conducta,movilidad').eq('mascota_id',id).gte('fecha',ini).lte('fecha',fin)
    const map:Record<string,any>={}
    data?.forEach(r=>{map[r.fecha]=r})
    setRegistros(map)
  }
  async function changeMes(d:number){
    let nm=mes+d,na=año
    if(nm<0){nm=11;na--}if(nm>11){nm=0;na++}
    setMes(nm);setAño(na);if(mascota)await load(mascota.id,nm,na)
  }
  const dim=new Date(año,mes+1,0).getDate()
  const first=(new Date(año,mes,1).getDay()+6)%7
  const hoy=new Date()
  const isHoy=(d:number)=>d===hoy.getDate()&&mes===hoy.getMonth()&&año===hoy.getFullYear()
  const fkey=(d:number)=>\`\${año}-\${String(mes+1).padStart(2,'0')}-\${String(d).padStart(2,'0')}\`
  const rd=dia?registros[fkey(dia)]:null
  if(loading)return<div className="min-h-screen flex items-center justify-center text-[#8A8FA8]">Cargando...</div>
  return(
    <div className="min-h-screen pb-24 fade-in">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between sticky top-0 bg-[#0B1020] z-10 border-b border-white/5">
        <button onClick={()=>changeMes(-1)} className="w-9 h-9 rounded-full bg-[#1E2848] flex items-center justify-center text-lg">‹</button>
        <div className="text-center"><h1 className="text-base font-bold">{MESES[mes]} {año}</h1><p className="text-xs text-[#8A8FA8]">{mascota?.nombre}</p></div>
        <button onClick={()=>changeMes(1)} className="w-9 h-9 rounded-full bg-[#1E2848] flex items-center justify-center text-lg">›</button>
      </div>
      <div className="flex gap-4 px-5 py-2 overflow-x-auto">
        {[['verde','Todo bien'],['amarillo','Leve'],['naranjo','Síntoma'],['rojo','Alerta']].map(([e,l])=>(
          <div key={e} className="flex items-center gap-1.5 text-xs text-[#8A8FA8] whitespace-nowrap">
            <div className="w-2.5 h-2.5 rounded-full" style={{background:EC[e]}}/>{l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 px-3 pb-1">
        {['L','M','M','J','V','S','D'].map((d,i)=><div key={i} className="text-center text-xs font-bold text-[#8A8FA8] py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 px-3">
        {Array(first).fill(null).map((_,i)=><div key={\`e\${i}\`}/>)}
        {Array(dim).fill(null).map((_,i)=>{
          const d=i+1,key=fkey(d),reg=registros[key]
          const fut=new Date(año,mes,d)>hoy,sel=dia===d
          return(
            <button key={d} onClick={()=>setDia(sel?null:d)} disabled={fut}
              className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all"
              style={{background:sel?'rgba(255,255,255,0.15)':reg?EB[reg.estado_dia]:'rgba(255,255,255,0.04)',border:isHoy(d)?'1.5px solid #E3A84A':sel?'1.5px solid white':'1px solid transparent',opacity:fut?0.25:1}}>
              <span className="text-sm font-bold leading-none" style={{color:reg?EC[reg.estado_dia]:isHoy(d)?'#E3A84A':'#8A8FA8'}}>{d}</span>
              {reg?.nota&&<div className="w-1 h-1 rounded-full bg-[#E3A84A]"/>}
            </button>
          )
        })}
      </div>
      {dia&&(
        <div className="mx-4 mt-4 bg-[#1E2848] rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-sm font-bold">{dia} de {MESES[mes]}</p>
            <button onClick={()=>setDia(null)} className="text-[#8A8FA8] text-lg">✕</button>
          </div>
          {rd?(
            <div className="p-4">
              <div className="inline-flex items-center gap-1.5 mb-3 px-2 py-0.5 rounded-full text-xs font-semibold" style={{background:\`\${EC[rd.estado_dia]}20\`,color:EC[rd.estado_dia]}}>
                <div className="w-1.5 h-1.5 rounded-full" style={{background:EC[rd.estado_dia]}}/>
                {{verde:'Todo bien',amarillo:'Atención leve',naranjo:'Síntoma notable',rojo:'Alerta'}[rd.estado_dia as string]}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[['⚡','Energía','energia'],['😄','Ánimo','animo'],['🍽️','Apetito','apetito'],['💧','Agua','agua'],['🫃','Digestión','digestion'],['✨','Pelaje','pelaje'],['🧠','Conducta','conducta'],['🦴','Movilidad','movilidad']].map(([icon,label,campo])=>rd[campo]&&(
                  <div key={campo} className="bg-[#1B2340] rounded-xl p-2 text-center">
                    <div className="text-lg">{icon}</div>
                    <div className="text-[9px] text-[#8A8FA8] mt-0.5">{label}</div>
                    <div className="text-[10px] text-[#F0EEE8] font-semibold mt-0.5 leading-tight">{(rd[campo] as string).replace(/_/g,' ')}</div>
                  </div>
                ))}
              </div>
              {rd.nota&&<div className="mt-3 bg-[#1B2340] rounded-xl p-3 text-xs text-[#8A8FA8] italic">📝 {rd.nota}</div>}
            </div>
          ):(
            <div className="p-6 text-center">
              <p className="text-sm text-[#8A8FA8] mb-3">Sin registro para este día</p>
              {isHoy(dia)&&<Link href="/registro" className="bg-[#E3A84A] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm inline-block">Registrar hoy →</Link>}
            </div>
          )}
        </div>
      )}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        {[{label:'Registros',val:Object.keys(registros).length,color:'#3DD6B5'},{label:'Días verdes',val:Object.values(registros).filter((r:any)=>r.estado_dia==='verde').length,color:'#4CCB7F'},{label:'Con síntoma',val:Object.values(registros).filter((r:any)=>['naranjo','rojo'].includes(r.estado_dia)).length,color:'#F39B35'}].map(s=>(
          <div key={s.label} className="bg-[#1E2848] rounded-2xl border border-white/8 p-3 text-center">
            <div className="text-xl font-bold" style={{color:s.color}}>{s.val}</div>
            <div className="text-[10px] text-[#8A8FA8] mt-0.5 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>
      <BottomNav/>
    </div>
  )
}
`);

// ── ANALISIS
write('app/analisis/page.tsx', `'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'
const EC:Record<string,string>={verde:'#4CCB7F',amarillo:'#F5C842',naranjo:'#F39B35',rojo:'#E25D5D'}
export default function AnalisisPage() {
  const router=useRouter(),supabase=createClient()
  const [mascota,setMascota]=useState<any>(null)
  const [registros,setRegistros]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    async function init(){
      const{data:{user}}=await supabase.auth.getUser()
      if(!user){router.push('/login');return}
      const{data:m}=await supabase.from('mascotas').select('*').limit(1).single()
      if(!m){router.push('/mascota/nueva');return}
      setMascota(m)
      const desde=new Date();desde.setDate(desde.getDate()-30)
      const{data:r}=await supabase.from('registros_diarios').select('*').eq('mascota_id',m.id).gte('fecha',desde.toISOString().split('T')[0]).order('fecha',{ascending:false})
      setRegistros(r||[]);setLoading(false)
    }
    init()
  },[])
  if(loading)return<div className="min-h-screen flex items-center justify-center text-[#8A8FA8]">Cargando...</div>
  const total=registros.length
  const verdes=registros.filter(r=>r.estado_dia==='verde').length
  const sintomas=registros.filter(r=>['naranjo','rojo'].includes(r.estado_dia)).length
  const pct=total>0?Math.round((verdes/total)*100):0
  const vomitos=registros.filter(r=>r.digestion==='vomito').length
  const rascado=registros.filter(r=>r.pelaje==='rasca').length
  const insights=total===0?[{icon:'🐶',text:\`Aún no hay registros. Empieza a registrar las señales de \${mascota?.nombre} para ver tendencias aquí.\`,tipo:'info'}]:[
    pct>=70&&{icon:'✅',text:\`Energía y ánimo normales o positivos en el \${pct}% de los días registrados.\`,tipo:'good'},
    sintomas>0&&{icon:'👁️',text:\`Se detectaron \${sintomas} días con síntomas notables en los últimos 30 días. Vale la pena observar.\`,tipo:'warn'},
    vomitos>0&&{icon:'🤮',text:\`Se registraron \${vomitos} episodio(s) de vómito. Si se repiten, coméntalo con el veterinario.\`,tipo:'warn'},
    rascado>=3&&{icon:'🐾',text:\`Noté \${rascado} días con rascado registrado. Quizás sería bueno comentarlo en la próxima consulta veterinaria.\`,tipo:'warn'},
    {icon:'📊',text:\`Total de \${total} registros en los últimos 30 días. \${verdes} días con todo bien.\`,tipo:'info'},
  ].filter(Boolean) as any[]
  const MS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const ultimos7=registros.slice(0,7).reverse()
  return(
    <div className="min-h-screen pb-24 fade-in">
      <div className="px-5 pt-6 pb-3"><h1 className="text-xl font-bold">Análisis</h1><p className="text-xs text-[#8A8FA8]">{mascota?.nombre} · últimos 30 días</p></div>
      <div className="mx-4 mb-4 bg-[#1E2848] rounded-2xl border border-white/8 overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5">
          <span className="text-lg">🐶</span>
          <div><p className="text-sm font-bold">Lo que observé este mes</p><p className="text-xs text-[#8A8FA8]">{total} registros</p></div>
        </div>
        {insights.map((ins:any,i:number)=>(
          <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0">
            <div className={\`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 \${ins.tipo==='good'?'bg-[#4CCB7F]/15':ins.tipo==='warn'?'bg-[#F39B35]/15':'bg-[#4AABDB]/15'}\`}>{ins.icon}</div>
            <p className="text-xs text-[#F0EEE8] leading-relaxed">{ins.text}</p>
          </div>
        ))}
      </div>
      {total>0&&<>
        <div className="grid grid-cols-4 gap-2 mx-4 mb-4">
          {[{label:'Total',val:total,color:'#3DD6B5'},{label:'Verdes',val:verdes,color:'#4CCB7F'},{label:'Leve',val:registros.filter(r=>r.estado_dia==='amarillo').length,color:'#F5C842'},{label:'Síntoma',val:sintomas,color:'#F39B35'}].map(s=>(
            <div key={s.label} className="bg-[#1E2848] rounded-2xl border border-white/8 p-3 text-center">
              <div className="font-bold text-lg" style={{color:s.color}}>{s.val}</div>
              <div className="text-[9px] text-[#8A8FA8] uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="px-5 mb-2"><h2 className="text-xs font-bold text-[#8A8FA8] uppercase tracking-wider">Últimos 7 días</h2></div>
        <div className="mx-4 mb-4 bg-[#1E2848] rounded-2xl border border-white/8 p-4">
          <div className="flex items-end justify-between gap-1 h-16">
            {Array(7).fill(null).map((_,i)=>{
              const reg=ultimos7[i],color=reg?EC[reg.estado_dia]:'rgba(255,255,255,0.08)'
              const d=new Date();d.setDate(d.getDate()-(6-i))
              return(<div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-lg" style={{height:reg?'100%':'20%',background:color,minHeight:'8px'}}/>
                <span className="text-[9px] text-[#8A8FA8]">{d.getDate()}</span>
              </div>)
            })}
          </div>
        </div>
        <div className="px-5 mb-2"><h2 className="text-xs font-bold text-[#8A8FA8] uppercase tracking-wider">Registros recientes</h2></div>
        <div className="mx-4 mb-4 bg-[#1E2848] rounded-2xl border border-white/8 overflow-hidden">
          {registros.slice(0,10).map(r=>{
            const d=new Date(r.fecha+'T00:00:00'),color=EC[r.estado_dia]
            const labels:Record<string,string>={verde:'Todo bien',amarillo:'Atención leve',naranjo:'Síntoma notable',rojo:'Alerta'}
            return(<div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:color}}/>
              <div className="flex-1">
                <p className="text-xs font-semibold">{d.getDate()} {MS[d.getMonth()]}</p>
                <p className="text-xs mt-0.5" style={{color}}>{labels[r.estado_dia]}</p>
                {r.nota&&<p className="text-[10px] text-[#8A8FA8] mt-0.5 italic">{r.nota}</p>}
              </div>
            </div>)
          })}
        </div>
      </>}
      {total===0&&<div className="mx-4 bg-[#1E2848] rounded-2xl border border-white/8 p-8 text-center">
        <div className="text-5xl mb-3">📊</div>
        <p className="text-sm text-[#8A8FA8] mb-4">Empieza a registrar para ver tendencias aquí.</p>
        <a href="/registro" className="bg-[#E3A84A] text-[#1A1200] font-bold px-6 py-3 rounded-xl text-sm inline-block">Registrar hoy →</a>
      </div>}
      <BottomNav/>
    </div>
  )
}
`);

// ── PERFIL
write('app/perfil/page.tsx', `'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'
function calcEdad(f:string){const h=new Date(),n=new Date(f),m=(h.getFullYear()-n.getFullYear())*12+(h.getMonth()-n.getMonth());return m<12?\`\${m}m\`:m%12>0?\`\${Math.floor(m/12)}a \${m%12}m\`:\`\${Math.floor(m/12)}a\`}
const IC="w-full bg-[#1B2340] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E3A84A]/60"
const SC="w-full bg-[#1B2340] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm focus:outline-none appearance-none"
export default function PerfilPage() {
  const router=useRouter(),supabase=createClient()
  const [mascota,setMascota]=useState<any>(null)
  const [editando,setEditando]=useState(false)
  const [form,setForm]=useState<any>({})
  const [saving,setSaving]=useState(false)
  const [toast,setToast]=useState('')
  const [loading,setLoading]=useState(true)
  const [user,setUser]=useState<any>(null)
  useEffect(()=>{
    async function init(){
      const{data:{user}}=await supabase.auth.getUser()
      if(!user){router.push('/login');return}
      setUser(user)
      const{data:m}=await supabase.from('mascotas').select('*').limit(1).single()
      if(!m){router.push('/mascota/nueva');return}
      setMascota(m);setForm(m);setLoading(false)
    }
    init()
  },[])
  async function guardar(){
    setSaving(true)
    const{error}=await supabase.from('mascotas').update({nombre:form.nombre,especie:form.especie,raza:form.raza,sexo:form.sexo,fecha_nacimiento:form.fecha_nacimiento,color:form.color,castrado:form.castrado,peso_actual:form.peso_actual?parseFloat(form.peso_actual):null,alimentacion_tipo:form.alimentacion_tipo,alimentacion_marca:form.alimentacion_marca,alergias:form.alergias,microchip:form.microchip,veterinaria:form.veterinaria}).eq('id',mascota.id)
    if(!error){setMascota({...mascota,...form});setEditando(false);showToast('✅ Perfil actualizado')}
    setSaving(false)
  }
  async function cerrarSesion(){await supabase.auth.signOut();router.push('/login');router.refresh()}
  function showToast(msg:string){setToast(msg);setTimeout(()=>setToast(''),2500)}
  const u=(k:string,v:any)=>setForm((p:any)=>({...p,[k]:v}))
  if(loading)return<div className="min-h-screen flex items-center justify-center text-[#8A8FA8]">Cargando...</div>
  return(
    <div className="min-h-screen pb-24 fade-in">
      <div className="relative bg-gradient-to-b from-[#1B2340] to-[#0B1020] pt-8 pb-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#1E2848] border-2 border-[#4CCB7F] flex items-center justify-center text-4xl mx-auto mb-3">🐶</div>
        <h1 className="text-xl font-bold">{mascota?.nombre}</h1>
        <p className="text-sm text-[#8A8FA8] mt-1">{mascota?.especie}{mascota?.raza?\` · \${mascota.raza}\`:''}{mascota?.fecha_nacimiento?\` · \${calcEdad(mascota.fecha_nacimiento)}\":''}</p>
        {mascota?.alergias&&<div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold bg-[#E25D5D]/15 text-[#E25D5D]">⚠️ Alergia: {mascota.alergias}</div>}
      </div>
      <div className="grid grid-cols-3 gap-3 mx-4 mt-4 mb-4">
        {[{label:'Peso',val:mascota?.peso_actual?\`\${mascota.peso_actual}kg\`:'—',color:'#F39B35'},{label:'Sexo',val:mascota?.sexo||'—',color:'#4AABDB'},{label:'Castrado',val:mascota?.castrado?'Sí':'No',color:'#4CCB7F'}].map(s=>(
          <div key={s.label} className="bg-[#1E2848] rounded-2xl border border-white/8 p-3 text-center">
            <div className="font-bold text-sm" style={{color:s.color}}>{s.val}</div>
            <div className="text-[10px] text-[#8A8FA8] uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mx-4 mb-4 bg-[#1E2848] rounded-2xl border border-white/8 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h2 className="font-bold text-sm">Datos del perfil</h2>
          <button onClick={()=>{setEditando(!editando);setForm(mascota)}} className="text-xs font-bold text-[#4AABDB]">{editando?'Cancelar':'✏️ Editar'}</button>
        </div>
        {!editando?(
          <div className="divide-y divide-white/5">
            {[['🐕','Especie',mascota?.especie],['🔬','Raza',mascota?.raza||'—'],['🎂','Nacimiento',mascota?.fecha_nacimiento||'—'],['🎨','Color',mascota?.color||'—'],['🍽️','Alimentación',mascota?.alimentacion_tipo?\`\${mascota.alimentacion_tipo}\${mascota.alimentacion_marca?\` · \${mascota.alimentacion_marca}\`:''}\`:'—'],['🚫','Alergias',mascota?.alergias||'Ninguna conocida'],['💉','Microchip',mascota?.microchip||'—'],['🏥','Veterinaria',mascota?.veterinaria||'—']].map(([icon,label,val])=>(
              <div key={label as string} className="flex items-center gap-3 px-4 py-3">
                <span className="text-base w-6">{icon}</span>
                <div className="flex-1"><p className="text-xs text-[#8A8FA8]">{label}</p><p className="text-sm font-medium mt-0.5">{val}</p></div>
              </div>
            ))}
          </div>
        ):(
          <div className="p-4 space-y-3">
            <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nombre</label><input className={IC} value={form.nombre||''} onChange={e=>u('nombre',e.target.value)}/></div>
            <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Raza</label><input className={IC} placeholder="ej. Mestizo..." value={form.raza||''} onChange={e=>u('raza',e.target.value)}/></div>
            <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Fecha de nacimiento</label><input type="date" className={IC} value={form.fecha_nacimiento||''} onChange={e=>u('fecha_nacimiento',e.target.value)}/></div>
            <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Color</label><input className={IC} value={form.color||''} onChange={e=>u('color',e.target.value)}/></div>
            <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Peso (kg)</label><input type="number" step="0.1" className={IC} value={form.peso_actual||''} onChange={e=>u('peso_actual',e.target.value)}/></div>
            <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Alimentación</label><select className={SC} value={form.alimentacion_tipo||''} onChange={e=>u('alimentacion_tipo',e.target.value)}><option value="">Seleccionar...</option><option>Pellet seco</option><option>BARF / Raw</option><option>Húmedo / Lata</option><option>Mixto</option></select></div>
            <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Marca / proteína</label><input className={IC} placeholder="ej. Belcando salmón" value={form.alimentacion_marca||''} onChange={e=>u('alimentacion_marca',e.target.value)}/></div>
            <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Alergias</label><input className={IC} placeholder="ej. Pollo, trigo..." value={form.alergias||''} onChange={e=>u('alergias',e.target.value)}/></div>
            <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Microchip</label><input className={IC} value={form.microchip||''} onChange={e=>u('microchip',e.target.value)}/></div>
            <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Veterinaria</label><input className={IC} value={form.veterinaria||''} onChange={e=>u('veterinaria',e.target.value)}/></div>
            <button onClick={guardar} disabled={saving} className="w-full bg-[#E3A84A] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-50">{saving?'Guardando...':'Guardar cambios'}</button>
          </div>
        )}
      </div>
      <div className="mx-4 mb-4 bg-[#1E2848] rounded-2xl border border-white/8 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5"><h2 className="font-bold text-sm">Mi cuenta</h2></div>
        <div className="px-4 py-3 border-b border-white/5"><p className="text-xs text-[#8A8FA8]">Email</p><p className="text-sm mt-0.5">{user?.email}</p></div>
        <button onClick={cerrarSesion} className="w-full px-4 py-3 text-left text-sm text-[#E25D5D] font-semibold">Cerrar sesión →</button>
      </div>
      <div className="mx-4 mb-4 bg-[#1B2340] border border-white/5 rounded-2xl p-4">
        <p className="text-xs text-[#8A8FA8] leading-relaxed text-center"><span className="text-[#E3A84A] font-bold">CHIQUI Entre Señales</span><br/>No es una aplicación veterinaria. Es una herramienta de observación y acompañamiento.</p>
      </div>
      {toast&&<div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#4CCB7F] text-[#0a2418] font-bold text-sm px-5 py-3 rounded-full shadow-lg z-50">{toast}</div>}
      <BottomNav/>
    </div>
  )
}
`);

// ── PREVENCION
write('app/prevencion/page.tsx', `'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'
const MS=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function fmt(f:string){const d=new Date(f+'T00:00:00');return\`\${d.getDate()} \${MS[d.getMonth()]} \${d.getFullYear()}\`}
function diasR(f:string){const diff=Math.round((new Date(f+'T00:00:00').getTime()-new Date().getTime())/86400000);return diff<0?'Vencido':diff===0?'Hoy':diff===1?'Mañana':diff<30?\`\${diff}d\`:\`\${Math.round(diff/30)}m\`}
function dc(f:string){const diff=Math.round((new Date(f+'T00:00:00').getTime()-new Date().getTime())/86400000);return diff<0?'#E25D5D':diff<30?'#F39B35':'#4CCB7F'}
const IC="w-full bg-[#1B2340] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E3A84A]/60"
const SC="w-full bg-[#1B2340] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm focus:outline-none appearance-none"
export default function PrevencionPage() {
  const router=useRouter(),supabase=createClient()
  const [mascota,setMascota]=useState<any>(null)
  const [vacunas,setVacunas]=useState<any[]>([])
  const [antis,setAntis]=useState<any[]>([])
  const [obs,setObs]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [tab,setTab]=useState<'vacunas'|'anti'|'obs'>('vacunas')
  const [modal,setModal]=useState<'vacuna'|'anti'|'obs'|null>(null)
  const [form,setForm]=useState<any>({})
  const [saving,setSaving]=useState(false)
  useEffect(()=>{
    async function init(){
      const{data:{user}}=await supabase.auth.getUser()
      if(!user){router.push('/login');return}
      const{data:m}=await supabase.from('mascotas').select('*').limit(1).single()
      if(!m){router.push('/mascota/nueva');return}
      setMascota(m);await load(m.id);setLoading(false)
    }
    init()
  },[])
  async function load(id:string){
    const[v,a,o]=await Promise.all([
      supabase.from('vacunas').select('*').eq('mascota_id',id).order('fecha_aplicacion',{ascending:false}),
      supabase.from('antiparasitarios').select('*').eq('mascota_id',id).order('fecha_aplicacion',{ascending:false}),
      supabase.from('observaciones').select('*').eq('mascota_id',id).order('created_at',{ascending:false}),
    ])
    setVacunas(v.data||[]);setAntis(a.data||[]);setObs(o.data||[])
  }
  async function guardar(){
    setSaving(true)
    const{data:{user}}=await supabase.auth.getUser()
    if(!user||!mascota)return
    const base={mascota_id:mascota.id,user_id:user.id}
    if(modal==='vacuna')await supabase.from('vacunas').insert({...base,...form})
    else if(modal==='anti')await supabase.from('antiparasitarios').insert({...base,...form})
    else if(modal==='obs')await supabase.from('observaciones').insert({...base,...form,fecha_inicio:form.fecha_inicio||new Date().toISOString().split('T')[0]})
    await load(mascota.id);setModal(null);setForm({});setSaving(false)
  }
  const u=(k:string,v:string)=>setForm((p:any)=>({...p,[k]:v}))
  if(loading)return<div className="min-h-screen flex items-center justify-center text-[#8A8FA8]">Cargando...</div>
  return(
    <div className="min-h-screen pb-24 fade-in">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Salud preventiva</h1><p className="text-xs text-[#8A8FA8]">{mascota?.nombre}</p></div>
        <button onClick={()=>{setModal(tab==='vacunas'?'vacuna':tab==='anti'?'anti':'obs');setForm({})}} className="bg-[#E3A84A] text-[#1A1200] text-xs font-bold px-4 py-2 rounded-xl">+ Agregar</button>
      </div>
      <div className="flex px-4 gap-2 mb-4">
        {[['vacunas','💉 Vacunas'],['anti','💊 Antipar.'],['obs','👁️ Obs.']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t as any)} className={\`px-3 py-2 rounded-xl text-xs font-bold transition-all \${tab===t?'bg-[#E3A84A] text-[#1A1200]':'bg-[#1E2848] text-[#8A8FA8]'}\`}>{l}</button>
        ))}
      </div>
      {tab==='vacunas'&&<div className="mx-4 space-y-3">
        {vacunas.length===0&&<div className="bg-[#1E2848] rounded-2xl border border-white/8 p-8 text-center"><div className="text-4xl mb-3">💉</div><p className="text-sm text-[#8A8FA8]">Sin vacunas registradas</p><button onClick={()=>{setModal('vacuna');setForm({})}} className="mt-4 bg-[#E3A84A] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">+ Agregar primera vacuna</button></div>}
        {vacunas.map(v=>(
          <div key={v.id} className="bg-[#1E2848] rounded-2xl border border-white/8 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4CCB7F]/15 flex items-center justify-center text-xl">💉</div>
                <div><p className="font-bold text-sm">{v.nombre}</p><p className="text-xs text-[#8A8FA8]">Aplicada: {fmt(v.fecha_aplicacion)}</p>{v.lote&&<p className="text-xs text-[#8A8FA8]">Lote: {v.lote}</p>}</div>
              </div>
              {v.proxima_fecha&&<div className="text-right"><p className="text-xs text-[#8A8FA8]">Próxima</p><p className="text-xs font-bold" style={{color:dc(v.proxima_fecha)}}>{diasR(v.proxima_fecha)}</p><p className="text-xs text-[#8A8FA8]">{fmt(v.proxima_fecha)}</p></div>}
            </div>
            {v.nota&&<p className="text-xs text-[#8A8FA8] mt-2 italic bg-[#1B2340] rounded-xl p-2">📝 {v.nota}</p>}
          </div>
        ))}
      </div>}
      {tab==='anti'&&<div className="mx-4 space-y-3">
        {antis.length===0&&<div className="bg-[#1E2848] rounded-2xl border border-white/8 p-8 text-center"><div className="text-4xl mb-3">💊</div><p className="text-sm text-[#8A8FA8]">Sin antiparasitarios registrados</p><button onClick={()=>{setModal('anti');setForm({})}} className="mt-4 bg-[#E3A84A] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">+ Agregar primero</button></div>}
        {antis.map(a=>(
          <div key={a.id} className="bg-[#1E2848] rounded-2xl border border-white/8 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5C842]/15 flex items-center justify-center text-xl">💊</div>
                <div><p className="font-bold text-sm">{a.nombre}</p><p className="text-xs text-[#8A8FA8]">{a.tipo} · {a.forma}</p><p className="text-xs text-[#8A8FA8]">Aplicado: {fmt(a.fecha_aplicacion)}</p></div>
              </div>
              {a.proxima_fecha&&<div className="text-right"><p className="text-xs text-[#8A8FA8]">Próximo</p><p className="text-xs font-bold" style={{color:dc(a.proxima_fecha)}}>{diasR(a.proxima_fecha)}</p></div>}
            </div>
            {a.nota&&<p className="text-xs text-[#8A8FA8] mt-2 italic bg-[#1B2340] rounded-xl p-2">📝 {a.nota}</p>}
          </div>
        ))}
      </div>}
      {tab==='obs'&&<div className="mx-4 space-y-3">
        {obs.length===0&&<div className="bg-[#1E2848] rounded-2xl border border-white/8 p-8 text-center"><div className="text-4xl mb-3">👁️</div><p className="text-sm text-[#8A8FA8]">Sin observaciones registradas</p><button onClick={()=>{setModal('obs');setForm({})}} className="mt-4 bg-[#E3A84A] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm">+ Agregar observación</button></div>}
        {obs.map(o=>(
          <div key={o.id} className="bg-[#1E2848] rounded-2xl border border-white/8 p-4">
            <div className="flex items-start gap-3">
              <div className={\`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 \${o.estado==='activa'?'bg-[#F39B35]':'bg-[#4CCB7F]'}\`}/>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm">{o.titulo}</p>
                  <span className={\`text-xs px-2 py-0.5 rounded-full font-bold \${o.estado==='activa'?'bg-[#F39B35]/20 text-[#F39B35]':'bg-[#4CCB7F]/20 text-[#4CCB7F]'}\`}>{o.estado==='activa'?'Activa':'Resuelta'}</span>
                </div>
                {o.descripcion&&<p className="text-xs text-[#8A8FA8] mt-1 leading-relaxed">{o.descripcion}</p>}
                <p className="text-xs text-[#8A8FA8] mt-1">Desde: {fmt(o.fecha_inicio)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>}
      {modal&&(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={()=>setModal(null)}>
          <div className="w-full max-w-[480px] bg-[#1E2848] rounded-t-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="font-bold text-base">{modal==='vacuna'?'💉 Nueva vacuna':modal==='anti'?'💊 Nuevo antiparasitario':'👁️ Nueva observación'}</h2><button onClick={()=>setModal(null)} className="text-[#8A8FA8] text-xl">✕</button></div>
            {modal==='vacuna'&&<>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nombre *</label><input className={IC} placeholder="ej. Séxtuple..." value={form.nombre||''} onChange={e=>u('nombre',e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Fecha aplicación *</label><input type="date" className={IC} value={form.fecha_aplicacion||''} onChange={e=>u('fecha_aplicacion',e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Próxima vacunación</label><input type="date" className={IC} value={form.proxima_fecha||''} onChange={e=>u('proxima_fecha',e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Lote</label><input className={IC} placeholder="ej. A16301" value={form.lote||''} onChange={e=>u('lote',e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nota</label><input className={IC} value={form.nota||''} onChange={e=>u('nota',e.target.value)}/></div>
            </>}
            {modal==='anti'&&<>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nombre *</label><input className={IC} placeholder="ej. Bravecto..." value={form.nombre||''} onChange={e=>u('nombre',e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Tipo *</label><select className={SC} value={form.tipo||''} onChange={e=>u('tipo',e.target.value)}><option value="">Seleccionar...</option><option>interno</option><option>externo</option><option>ambos</option></select></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Forma</label><select className={SC} value={form.forma||''} onChange={e=>u('forma',e.target.value)}><option value="">Seleccionar...</option><option>pastilla</option><option>liquido</option><option>collar</option><option>otro</option></select></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Fecha aplicación *</label><input type="date" className={IC} value={form.fecha_aplicacion||''} onChange={e=>u('fecha_aplicacion',e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Próxima dosis</label><input type="date" className={IC} value={form.proxima_fecha||''} onChange={e=>u('proxima_fecha',e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Nota</label><input className={IC} value={form.nota||''} onChange={e=>u('nota',e.target.value)}/></div>
            </>}
            {modal==='obs'&&<>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Título *</label><input className={IC} placeholder="ej. Grano en oreja" value={form.titulo||''} onChange={e=>u('titulo',e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Tipo</label><select className={SC} value={form.tipo||''} onChange={e=>u('tipo',e.target.value)}><option value="">Seleccionar...</option><option>alergia</option><option>enfermedad</option><option>lesion</option><option>comportamiento</option><option>otro</option></select></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Descripción</label><textarea className={IC} rows={3} value={form.descripcion||''} onChange={e=>u('descripcion',e.target.value)}/></div>
              <div><label className="text-xs text-[#8A8FA8] uppercase tracking-wider mb-1.5 block">Fecha inicio</label><input type="date" className={IC} value={form.fecha_inicio||''} onChange={e=>u('fecha_inicio',e.target.value)}/></div>
            </>}
            <button onClick={guardar} disabled={saving||(!form.nombre&&!form.titulo)} className="w-full bg-[#E3A84A] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-40">{saving?'Guardando...':'Guardar'}</button>
          </div>
        </div>
      )}
      <BottomNav/>
    </div>
  )
}
`);

console.log('\n✅ Las 4 páginas están listas. Ahora ejecuta:');
console.log('git add .');
console.log('git commit -m "todas las paginas beta"');
console.log('git push origin master');
