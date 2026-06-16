'use client'
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
    const ini=`${a}-${String(m+1).padStart(2,'0')}-01`
    const fin=`${a}-${String(m+1).padStart(2,'0')}-31`
    console.log('Buscando registros entre', ini, 'y', fin)
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
  const fkey=(d:number)=>`${año}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
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
        {Array(first).fill(null).map((_,i)=><div key={`e${i}`}/>)}
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
              <div className="inline-flex items-center gap-1.5 mb-3 px-2 py-0.5 rounded-full text-xs font-semibold" style={{background:`${EC[rd.estado_dia]}20`,color:EC[rd.estado_dia]}}>
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
              <Link href={`/registro?fecha=${fkey(dia)}`} className="bg-[#E3A84A] text-[#1A1200] font-bold px-6 py-2.5 rounded-xl text-sm inline-block">Registrar este día →</Link>
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
