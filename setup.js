const fs = require('fs');
const path = require('path');

function write(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ ' + filePath);
}

// ── utils/supabase/client.ts
write('utils/supabase/client.ts', `import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
`);

// ── utils/supabase/server.ts
write('utils/supabase/server.ts', `import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}
`);

// ── middleware.ts
write('middleware.ts', `import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const protectedPaths = ['/dashboard', '/mascota', '/calendario', '/prevencion', '/analisis', '/perfil']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/registro')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }
  return supabaseResponse
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|vet).*)'] }
`);

// ── app/globals.css
write('app/globals.css', `@tailwind base;
@tailwind components;
@tailwind utilities;
:root {
  --bg: #0B1020; --bg2: #111830; --bg3: #1B2340; --card: #1E2848;
  --border: rgba(255,255,255,0.08); --text: #F0EEE8; --muted: #8A8FA8;
  --accent: #E3A84A; --green: #4CCB7F; --yellow: #F5C842;
  --orange: #F39B35; --red: #E25D5D; --blue: #4AABDB; --teal: #3DD6B5;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
body { font-family: var(--font-poppins), sans-serif; background: var(--bg); color: var(--text); max-width: 480px; margin: 0 auto; min-height: 100vh; -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.fade-in { animation: fadeIn 0.25s ease-out; }
`);

// ── app/layout.tsx
write('app/layout.tsx', `import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
const poppins = Poppins({ subsets: ['latin'], weight: ['400','500','600','700','800'], variable: '--font-poppins' })
export const metadata: Metadata = {
  title: 'CHIQUI Entre Señales',
  description: 'Tu compañero de observación y cuidado.',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={\`\${poppins.variable} font-sans bg-[#0B1020] text-[#F0EEE8] min-h-screen\`}>
        {children}
      </body>
    </html>
  )
}
`);

// ── app/page.tsx
write('app/page.tsx', `import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  else redirect('/login')
}
`);

// ── app/login/page.tsx
write('app/login/page.tsx', `'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email o contraseña incorrectos.'); setLoading(false); return }
    router.push('/dashboard'); router.refresh()
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🐶</div>
        <div className="text-3xl font-bold tracking-tight">CHIQUI</div>
        <div className="text-sm font-semibold text-[#E3A84A] tracking-widest uppercase mt-1">Entre Señales</div>
        <div className="text-xs text-[#8A8FA8] mt-1 italic">Tu compañero de observación y cuidado.</div>
      </div>
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        {error && <div className="bg-[#E25D5D]/10 border border-[#E25D5D]/30 rounded-xl px-4 py-3 text-sm text-[#E25D5D]">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" required className="w-full bg-[#1E2848] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E3A84A]/60"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">Contraseña</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required className="w-full bg-[#1E2848] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E3A84A]/60"/>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-[#E3A84A] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-50 mt-2">
          {loading ? 'Ingresando...' : 'Ingresar →'}
        </button>
      </form>
      <p className="mt-6 text-sm text-[#8A8FA8]">¿No tienes cuenta? <Link href="/registro" className="text-[#4AABDB] font-semibold">Regístrate gratis</Link></p>
      <p className="mt-10 text-xs text-[#8A8FA8]/60 text-center max-w-xs leading-relaxed">CHIQUI no es una aplicación veterinaria. Es una herramienta de observación y acompañamiento.</p>
    </div>
  )
}
`);

// ── app/registro/page.tsx
write('app/registro/page.tsx', `'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
export default function RegistroPage() {
  const router = useRouter()
  const supabase = createClient()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); setLoading(false); return }
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { nombre } } })
    if (error) { setError('Hubo un error al crear la cuenta. Intenta de nuevo.'); setLoading(false); return }
    setSuccess(true); setLoading(false)
  }
  if (success) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🐶</div>
      <h1 className="text-2xl font-bold mb-3">¡Cuenta creada!</h1>
      <p className="text-[#8A8FA8] text-sm leading-relaxed mb-8 max-w-xs">Revisa tu email y haz clic en el enlace de confirmación para activar tu cuenta.</p>
      <Link href="/login" className="bg-[#E3A84A] text-[#1A1200] font-bold px-8 py-4 rounded-xl text-sm">Ir al login →</Link>
    </div>
  )
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🐶</div>
        <div className="text-2xl font-bold">Crear cuenta</div>
        <div className="text-sm text-[#E3A84A] font-semibold tracking-widest uppercase mt-1">CHIQUI Entre Señales</div>
      </div>
      <form onSubmit={handleRegistro} className="w-full max-w-sm space-y-4">
        {error && <div className="bg-[#E25D5D]/10 border border-[#E25D5D]/30 rounded-xl px-4 py-3 text-sm text-[#E25D5D]">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">Tu nombre</label>
          <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="¿Cómo te llamamos?" required className="w-full bg-[#1E2848] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E3A84A]/60"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" required className="w-full bg-[#1E2848] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E3A84A]/60"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#8A8FA8] uppercase tracking-wider mb-2">Contraseña</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required className="w-full bg-[#1E2848] border border-white/10 rounded-xl px-4 py-3 text-[#F0EEE8] text-sm placeholder-[#8A8FA8] focus:outline-none focus:border-[#E3A84A]/60"/>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-[#E3A84A] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-50 mt-2">
          {loading ? 'Creando cuenta...' : 'Crear cuenta gratis →'}
        </button>
      </form>
      <p className="mt-6 text-sm text-[#8A8FA8]">¿Ya tienes cuenta? <Link href="/login" className="text-[#4AABDB] font-semibold">Inicia sesión</Link></p>
    </div>
  )
}
`);

// ── components/BottomNav.tsx
write('components/BottomNav.tsx', `'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
const nav = [
  { href: '/dashboard', icon: '🏠', label: 'Inicio' },
  { href: '/calendario', icon: '📅', label: 'Calendario' },
  { href: '/registro', icon: '✏️', label: '', center: true },
  { href: '/prevencion', icon: '🛡️', label: 'Salud' },
  { href: '/perfil', icon: '🐾', label: 'Perfil' },
]
export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className="w-full max-w-[480px] bg-[#111830] border-t border-white/8 flex items-center justify-around px-2 pb-4 pt-2">
        {nav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          if (item.center) return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center -mt-5">
              <div className="w-14 h-14 rounded-full bg-[#E3A84A] flex items-center justify-center text-2xl shadow-lg border-4 border-[#0B1020]">{item.icon}</div>
            </Link>
          )
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 min-w-[52px] py-1">
              <span className="text-xl">{item.icon}</span>
              <span className={\`text-[10px] font-medium \${active ? 'text-[#E3A84A]' : 'text-[#8A8FA8]'}\`}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
`);

// ── app/mascota/nueva/page.tsx
write('app/mascota/nueva/page.tsx', `'use client'
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
        <div className="h-1 bg-white/10 rounded-full mt-3"><div className="h-1 bg-[#E3A84A] rounded-full transition-all" style={{width:\`\${(step/3)*100}%\`}}/></div>
      </div>
      <div className="px-5 space-y-4">
        {error&&<div className="bg-[#E25D5D]/10 border border-[#E25D5D]/30 rounded-xl px-4 py-3 text-sm text-[#E25D5D]">{error}</div>}
        {step===1&&<>
          <Field label="Nombre"><input className={IC} placeholder="ej. Luna, Simba..." value={form.nombre} onChange={e=>u('nombre',e.target.value)}/></Field>
          <Field label="Especie"><div className="grid grid-cols-3 gap-2">{['Perro','Gato','Otro'].map(e=><button key={e} onClick={()=>u('especie',e)} className={\`py-2.5 rounded-xl text-sm font-semibold border transition-all \${form.especie===e?'bg-[#E3A84A]/15 border-[#E3A84A] text-[#E3A84A]':'bg-[#1E2848] border-white/10 text-[#8A8FA8]'}\`}>{e==='Perro'?'🐕':e==='Gato'?'🐈':'🐾'} {e}</button>)}</div></Field>
          {razas.length>0&&<Field label="Raza"><select className={SC} value={form.raza} onChange={e=>u('raza',e.target.value)}><option value="">Seleccionar...</option>{razas.map(r=><option key={r}>{r}</option>)}</select></Field>}
          <Field label="Sexo"><div className="flex gap-2">{['Macho','Hembra'].map(s=><button key={s} onClick={()=>u('sexo',s)} className={\`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all \${form.sexo===s?'bg-[#E3A84A]/15 border-[#E3A84A] text-[#E3A84A]':'bg-[#1E2848] border-white/10 text-[#8A8FA8]'}\`}>{s==='Macho'?'🐾 Macho':'🌸 Hembra'}</button>)}</div></Field>
          <button disabled={!form.nombre||!form.especie||!form.sexo} onClick={()=>setStep(2)} className="w-full bg-[#E3A84A] text-[#1A1200] font-bold py-4 rounded-xl disabled:opacity-40">Siguiente →</button>
        </>}
        {step===2&&<>
          <Field label="Fecha de nacimiento"><input type="date" className={IC} value={form.fecha_nacimiento} onChange={e=>u('fecha_nacimiento',e.target.value)}/></Field>
          <Field label="Color / pelaje"><input className={IC} placeholder="ej. Caramelo, negro..." value={form.color} onChange={e=>u('color',e.target.value)}/></Field>
          <Field label="¿Está castrado/a?"><div className="flex gap-2">{[['Sí',true],['No',false]].map(([l,v])=><button key={String(l)} onClick={()=>u('castrado',v as boolean)} className={\`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all \${form.castrado===v?'bg-[#E3A84A]/15 border-[#E3A84A] text-[#E3A84A]':'bg-[#1E2848] border-white/10 text-[#8A8FA8]'}\`}>{l as string}</button>)}</div></Field>
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
            {loading?\`Guardando...\`:\`Crear perfil de \${form.nombre||'mi mascota'} 🐾\`}
          </button>
          <button onClick={()=>setStep(2)} className="w-full text-[#8A8FA8] text-sm py-2">← Volver</button>
        </>}
      </div>
    </div>
  )
}
`);

// ── app/dashboard/page.tsx
write('app/dashboard/page.tsx', `import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import BottomNav from '@/components/BottomNav'
function calcEdad(f:string){const h=new Date(),n=new Date(f),m=(h.getFullYear()-n.getFullYear())*12+(h.getMonth()-n.getMonth());return m<12?\`\${m}m\`:m%12>0?\`\${Math.floor(m/12)}a \${m%12}m\`:\`\${Math.floor(m/12)}a\`}
function fmtFecha(f:string){const ms=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],d=new Date(f+'T00:00:00');return \`\${d.getDate()} \${ms[d.getMonth()]} \${d.getFullYear()}\`}
function diasR(f:string){const diff=Math.round((new Date(f+'T00:00:00').getTime()-new Date().getTime())/(86400000));return diff<=0?'Hoy':diff===1?'Mañana':diff<30?\`\${diff}d\`:diff<365?\`\${Math.round(diff/30)}m\`:\`\${Math.round(diff/365)}a\`}
const EC:Record<string,string>={verde:'#4CCB7F',amarillo:'#F5C842',naranjo:'#F39B35',rojo:'#E25D5D'}
const EL:Record<string,string>={verde:'Todo bien',amarillo:'Atención leve',naranjo:'Síntoma notable',rojo:'Alerta'}
export default async function Dashboard() {
  const supabase = await createClient()
  const {data:{user}} = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const {data:mascotas} = await supabase.from('mascotas').select('*').order('created_at',{ascending:true})
  if (!mascotas||!mascotas.length) redirect('/mascota/nueva')
  const m = mascotas[0]
  const hoy = new Date().toISOString().split('T')[0]
  const [{data:regHoy},{data:vacunas},{data:antis}] = await Promise.all([
    supabase.from('registros_diarios').select('estado_dia').eq('mascota_id',m.id).eq('fecha',hoy).single(),
    supabase.from('vacunas').select('nombre,proxima_fecha').eq('mascota_id',m.id).gte('proxima_fecha',hoy).order('proxima_fecha').limit(2),
    supabase.from('antiparasitarios').select('nombre,proxima_fecha').eq('mascota_id',m.id).gte('proxima_fecha',hoy).order('proxima_fecha').limit(2),
  ])
  const color = regHoy?.estado_dia?EC[regHoy.estado_dia]:'#8A8FA8'
  const today=new Date()
  const dias=['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return (
    <div className="min-h-screen pb-24 fade-in">
      <div className="px-5 pt-8 pb-4">
        <p className="text-xs text-[#8A8FA8] capitalize">\${dias[today.getDay()]} \${today.getDate()} de \${meses[today.getMonth()]}</p>
        <h1 className="text-xl font-bold mt-0.5">Hola 👋</h1>
      </div>
      <div className="mx-4 mb-4 bg-[#1E2848] rounded-2xl border border-white/8 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-full bg-[#1B2340] border-2 flex items-center justify-center text-3xl flex-shrink-0" style={{borderColor:color}}>🐶</div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{m.nombre}</h2>
              <p className="text-xs text-[#8A8FA8] mt-0.5">{m.especie}{m.raza?\` · \${m.raza}\`:''}{m.fecha_nacimiento?\` · \${calcEdad(m.fecha_nacimiento)}\":''}</p>
              {regHoy?.estado_dia
                ?<div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{background:\`\${color}20\`,color}}><div className="w-1.5 h-1.5 rounded-full" style={{background:color}}/>{EL[regHoy.estado_dia]}</div>
                :<div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-[#8A8FA8]">Sin registro hoy</div>}
            </div>
          </div>
          <div className="mt-3 bg-[#1B2340] rounded-xl p-3 flex gap-2.5 border border-[#3DD6B5]/15">
            <span className="text-lg flex-shrink-0">🐶</span>
            <p className="text-xs text-[#F0EEE8] leading-relaxed">{!regHoy?\`"¿Cómo estuvo \${m.nombre} hoy? Registra sus señales del día."\`:\`"Ya tengo el registro de hoy. Gracias por observar."\`}</p>
          </div>
        </div>
        {!regHoy&&<Link href="/registro" className="flex items-center justify-between px-4 py-3.5 bg-[#E3A84A] text-[#1A1200]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">✏️</div>
            <div><p className="text-sm font-bold">Registrar hoy</p><p className="text-xs opacity-60">¿Cómo estuvo {m.nombre}?</p></div>
          </div>
          <span className="text-lg">›</span>
        </Link>}
      </div>
      {((vacunas&&vacunas.length>0)||(antis&&antis.length>0))&&<div className="mx-4 mb-4">
        <h3 className="text-xs font-bold text-[#8A8FA8] uppercase tracking-wider mb-2 px-1">Próximos</h3>
        <div className="bg-[#1E2848] rounded-2xl border border-white/8 overflow-hidden">
          {vacunas?.map((v,i)=><div key={v.nombre+i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-[#4CCB7F]/15 flex items-center justify-center">💉</div>
            <div className="flex-1"><p className="text-sm font-semibold">{v.nombre}</p><p className="text-xs text-[#8A8FA8]">{fmtFecha(v.proxima_fecha)}</p></div>
            <span className="text-xs font-bold text-[#4CCB7F]">{diasR(v.proxima_fecha)}</span>
          </div>)}
          {antis?.map((a,i)=><div key={a.nombre+i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-[#F5C842]/15 flex items-center justify-center">💊</div>
            <div className="flex-1"><p className="text-sm font-semibold">{a.nombre}</p><p className="text-xs text-[#8A8FA8]">{fmtFecha(a.proxima_fecha)}</p></div>
            <span className="text-xs font-bold text-[#F5C842]">{diasR(a.proxima_fecha)}</span>
          </div>)}
        </div>
      </div>}
      <div className="mx-4 mb-4">
        <h3 className="text-xs font-bold text-[#8A8FA8] uppercase tracking-wider mb-2 px-1">Accesos rápidos</h3>
        <div className="grid grid-cols-2 gap-3">
          {[{href:'/calendario',icon:'📅',label:'Calendario'},{href:'/prevencion',icon:'🛡️',label:'Prevención'},{href:'/analisis',icon:'📊',label:'Análisis'},{href:'/perfil',icon:'🐾',label:'Perfil'}].map(item=>(
            <Link key={item.href} href={item.href} className="bg-[#1E2848] border border-white/8 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span><span className="text-sm font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
      <BottomNav/>
    </div>
  )
}
`);

// ── tailwind.config.ts
write('tailwind.config.ts', `import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}','./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { fontFamily: { sans: ['var(--font-poppins)','sans-serif'] } } },
  plugins: [],
}
export default config
`);

// ── next.config.mjs
write('next.config.mjs', `/** @type {import('next').NextConfig} */
const nextConfig = {}
export default nextConfig
`);

console.log('\n✅ Todos los archivos creados. Ahora ejecuta: npm run dev');
