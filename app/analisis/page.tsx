'use client'
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
  const insights=total===0?[{icon:'🐶',text:`Aún no hay registros. Empieza a registrar las señales de ${mascota?.nombre} para ver tendencias aquí.`,tipo:'info'}]:[
    pct>=70&&{icon:'✅',text:`Energía y ánimo normales o positivos en el ${pct}% de los días registrados.`,tipo:'good'},
    sintomas>0&&{icon:'👁️',text:`Se detectaron ${sintomas} días con síntomas notables en los últimos 30 días. Vale la pena observar.`,tipo:'warn'},
    vomitos>0&&{icon:'🤮',text:`Se registraron ${vomitos} episodio(s) de vómito. Si se repiten, coméntalo con el veterinario.`,tipo:'warn'},
    rascado>=3&&{icon:'🐾',text:`Noté ${rascado} días con rascado registrado. Quizás sería bueno comentarlo en la próxima consulta veterinaria.`,tipo:'warn'},
    {icon:'📊',text:`Total de ${total} registros en los últimos 30 días. ${verdes} días con todo bien.`,tipo:'info'},
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
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${ins.tipo==='good'?'bg-[#4CCB7F]/15':ins.tipo==='warn'?'bg-[#F39B35]/15':'bg-[#4AABDB]/15'}`}>{ins.icon}</div>
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
