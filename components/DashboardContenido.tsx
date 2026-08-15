'use client'
import MenuCuenta from '@/components/MenuCuenta'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import SelectorMascota from '@/components/SelectorMascota'
import { guardarMascotaActivaId, obtenerMascotaActivaId } from '@/utils/mascotaActiva'
import { iconoPorEspecie } from '@/utils/iconoEspecie'
import { calcularEtapaVida, formatearEdad } from '@/utils/etapaVida'
import BannerInstalarApp from '@/components/BannerInstalarApp'
import Novedades from '@/components/Novedades'
import { useEffect, useState } from 'react'
import ChiquiTeCuenta from '@/components/ChiquiTeCuenta'
import LineaVet from '@/components/LineaVet'
import { createClient } from '@/utils/supabase/client'

function calcEdad(f: string) {
  const h = new Date(), n = new Date(f)
  const m = (h.getFullYear() - n.getFullYear()) * 12 + (h.getMonth() - n.getMonth())
  return m < 12 ? `${m}m` : m % 12 > 0 ? `${Math.floor(m / 12)}a ${m % 12}m` : `${Math.floor(m / 12)}a`
}

interface MascotaResumen {
  id: string
  nombre: string
  especie: string
  raza?: string
  foto_url?: string
}

interface Props {
  mascotas: MascotaResumen[]
  mascota: any
  edad: string | null
  color: string
  estadoLabel: string
  proximosItems: { label: string; sub: string; dias: string; color: string; url?: string }[]
  tieneRegistroHoy: boolean
  seguimientosPendientes: { id: string; titulo: string; diasSinActualizar: number }[]
  diasSinCampo: { apetito: number | null; agua: number | null; heces: number | null; peso: number | null }
  medicamentosPendientesHoy: {
    id: string
    nombreOriginal: string
    frecuencia: string | null
    dosisPorDia: number
    tomasHoy: number
  }[]
  cuidadosRecientes: { grupo: string; label: string; emoji: string; dias: number }[]
  rachaPaseo: number | null
  rachaEnRiesgo: boolean
  rachaRegistros: number
  celoActivoHoy: boolean
  diaCeloHoy: number
  visitasProximas: { id: string; fecha: string; tipo: string; motivo: string | null; veterinario: string | null }[]
}

export default function DashboardContenido({
  mascotas, mascota: m, color, estadoLabel, proximosItems, tieneRegistroHoy, cuidadosRecientes, rachaPaseo, rachaEnRiesgo, celoActivoHoy, diaCeloHoy, rachaRegistros, seguimientosPendientes, diasSinCampo, medicamentosPendientesHoy, visitasProximas,
}: Props) {
  const router = useRouter()
  const [cuidadosExpandido, setCuidadosExpandido] = useState(false)
  // Confirmación de cierre de sesión (útil para cuentas de prueba y
  // para evitar cerrar sesión por error).
  const [confirmarCerrar, setConfirmarCerrar] = useState(false)
  async function cerrarSesion() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }
  const today = new Date()
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

  // Si el usuario tiene una mascota activa guardada de una sesion anterior
  // (en localStorage) y esa mascota NO es la que el servidor mostro por
  // defecto, redirigimos una sola vez agregando el parametro a la URL para
  // que el servidor cargue los datos correctos. Esto solo importa cuando
  // se entra sin parametro ?mascota= en la URL (ej. al iniciar sesion).
  useEffect(() => {
    const idGuardado = obtenerMascotaActivaId()
    if (idGuardado && idGuardado !== m.id) {
      const existeEnLista = mascotas.some(ms => ms.id === idGuardado)
      if (existeEnLista) {
        router.replace(`/dashboard?mascota=${idGuardado}`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cambiarMascota(nueva: MascotaResumen) {
    guardarMascotaActivaId(nueva.id)
    router.push(`/dashboard?mascota=${nueva.id}`)
  }

  return (
    <div className="min-h-screen pb-24 fade-in bg-[#F5EDE3] text-[#3D2B1F]">

      {/* TOP BAR - Marca */}
      <div className="flex items-center justify-between px-5 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-16 h-16 object-contain" />
          <span className="font-heading text-2xl font-extrabold text-[#8C572F]">Entre Señales</span>
        </div>
        {/* Menú de cuenta: perfil, recordatorios, panel y cerrar
            sesión. Reemplaza al botón suelto de Salir. */}
        <MenuCuenta />
      </div>

      {/* Modal de confirmación de cierre de sesión */}
      {confirmarCerrar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8" style={{ background: 'rgba(61,43,31,0.45)' }} onClick={() => setConfirmarCerrar(false)}>
          <div className="bg-[#FFFCF8] rounded-2xl w-full max-w-xs p-5 text-center" onClick={e => e.stopPropagation()}>
            <img src="/chiqui/chiqui_hola.png" alt="" className="w-14 h-14 object-contain mx-auto mb-2" />
            <p className="font-bold text-sm text-[#3D2B1F] mb-1">¿Cerrar sesión?</p>
            <p className="text-xs text-[#8A7560] mb-4">Tendrás que iniciar sesión de nuevo para volver a entrar.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarCerrar(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#8A7560] bg-[#F0E2CE]">
                Cancelar
              </button>
              <button onClick={cerrarSesion} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#E05252' }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fecha */}
      <div className="px-5 pb-3">
        <span className="text-xs text-[#8A7560] tracking-wide capitalize">{dias[today.getDay()]}, {today.getDate()} {meses[today.getMonth()]} {today.getFullYear()}</span>
      </div>

      {/* Selector de mascota (solo aparece visualmente activo si hay mas de una, pero siempre muestra la actual) */}
      <SelectorMascota
        mascotas={mascotas}
        mascotaActiva={mascotas.find(ms => ms.id === m.id) || mascotas[0]}
        onCambiar={cambiarMascota}
      />

      {/* NOVEDADES — el único sistema de eventos del dashboard:
          cumpleaños, aniversario, fechas especiales, estado del
          registro diario, rachas, mensajes positivos y recordatorios.
          Una tarjeta a la vez; ver components/Novedades.tsx */}
      <Novedades
        mascota={m}
        mascotas={mascotas}
        tieneRegistroHoy={tieneRegistroHoy}
        color={color}
        rachaRegistros={rachaRegistros}
        seguimientos={seguimientosPendientes}
        diasSinCampo={diasSinCampo}
        medicamentosPendientesHoy={medicamentosPendientesHoy}
        visitasProximas={visitasProximas}
      />

      {/* TARJETA CELO ACTIVO */}
      {m.sexo === 'Hembra' && m.seguimiento_reproductivo !== false && !m.castrado && celoActivoHoy && (
        <div className="mx-4 mb-3 bg-[#FDEAEA] border border-[#E05252]/30 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#E05252] flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-sm font-bold text-[#E05252]">🌸 {m.nombre} está en celo · Día {diaCeloHoy}</p>
            <p className="text-xs text-[#8A7560] mt-0.5">Evita contacto con machos si no buscas reproducción.</p>
          </div>
        </div>
      )}

      <BannerInstalarApp />

      {/* Banner de etapa — solo Adulto Maduro y Senior */}
      {(() => {
        const etapa = calcularEtapaVida(m.fecha_nacimiento, m.especie)
        if (!etapa?.alertaChequeo) return null
        return (
          <div className="mx-4 mb-3 bg-[#FFBD59]/20 border border-[#FFBD59]/40 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
            <span className="text-xl flex-shrink-0">🩺</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-[#7A4A2F]">{etapa.nombre} · {formatearEdad(etapa)}</p>
              <p className="text-[10px] text-[#8C572F]/80 leading-snug mt-0.5">
                {etapa.nombre === 'Senior' ? 'Chequeo preventivo cada 6 meses' : 'Chequeo preventivo cada 6-12 meses'}
              </p>
            </div>
          </div>
        )
      })()}


      {/* HERO */}
      <Link href="/perfil" className="relative mx-4 mb-4 bg-[#8C572F] rounded-3xl p-5 overflow-hidden block">
        <div className="flex items-start gap-3.5">
          {m.foto_url ? (
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#FFFCF8]/40 flex-shrink-0">
              <img src={m.foto_url} alt={m.nombre} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="relative w-16 h-16 rounded-full bg-[#FFBD59] border-2 border-[#FFFCF8]/40 flex items-center justify-center text-4xl flex-shrink-0">
              {iconoPorEspecie(m.especie)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="font-heading text-2xl font-extrabold leading-none text-[#FFFCF8] truncate">{m.nombre}</div>
              <span className="text-[13px] font-extrabold text-[#FFBD59] flex-shrink-0 pt-0.5">Ver Perfil ▶</span>
            </div>
            {/* Dos líneas de datos con círculos de separación. Antes
                edad, peso y esterilización vivían en una grilla al pie
                de la tarjeta; acá caben en el mismo lugar y dejan ese
                espacio para los chips. */}
            <p className="text-[13px] text-[#F0DEC8] mt-2 truncate">
              {[m.especie, m.raza, m.sexo].filter(Boolean).join('  ○  ')}
            </p>
            <p className="text-[13px] text-[#F0DEC8] mt-0.5 truncate">
              {(() => {
                const etapa = calcularEtapaVida(m.fecha_nacimiento, m.especie)
                const partes: string[] = []
                if (etapa) partes.push(formatearEdad(etapa))
                if (m.peso_actual) partes.push(`${m.peso_actual} kg`)
                // Se muestra en los DOS casos: antes, si no estaba
                // esterilizada, la línea quedaba a medias.
                //
                // "Fértil" en vez de "No esterilizado": describir por
                // ausencia sugiere que falta algo que debería estar, y
                // eso es un juicio que la app no tiene por qué hacer.
                //
                // Si el campo estuviera vacío no se afirma nada: decir
                // "Fértil" sobre un dato que nadie ingresó sería
                // inventarlo.
                if (m.castrado === true) partes.push('Esterilizado/a')
                else if (m.castrado === false) partes.push('Fértil')
                return partes.join('  ○  ')
              })()}
            </p>
          </div>
        </div>

        {/* gap-1.5 y chips de 11px para que los tres entren en una
            sola linea. flex-wrap queda como red de seguridad: si un
            texto crece, bajan en vez de desbordarse. */}
        <div className="mt-4 pt-4 border-t border-[#FFFCF8]/20 flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${color}26`, border: `1.5px solid ${color}`, color: '#FFFCF8' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            {estadoLabel}
          </div>

          {/* Racha: indicador permanente, no una celebración. Solo
              aparece si hay al menos un día. */}
          {rachaRegistros > 0 && (
            <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: '#FFBD5926', border: '1.5px solid #FFBD59', color: '#FFFCF8' }}>
              🔥 {rachaRegistros} {rachaRegistros === 1 ? 'día' : 'días'}
            </div>
          )}

          {/* Tiempo juntos. Si no hay fecha de unión, en vez de dejar
              un hueco se invita a completarla: toda la tarjeta lleva al
              perfil, que es justo donde se agrega. */}
          {(() => {
            const juntos = (() => {
              if (!m.fecha_union) return null
              // Mediodía: a medianoche los cambios de horario de verano
              // pueden correr el cálculo un día.
              const desde = new Date(m.fecha_union + 'T12:00:00')
              const ahora = new Date()
              const meses = (ahora.getFullYear() - desde.getFullYear()) * 12 + (ahora.getMonth() - desde.getMonth())
              if (meses < 0) return null
              if (meses < 1) return 'Recién llegó'
              if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'} juntos`
              const anios = Math.floor(meses / 12)
              return `${anios} ${anios === 1 ? 'año' : 'años'} juntos`
            })()
            return (
              <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: '#E88FB826', border: '1.5px solid #E88FB8', color: '#FFFCF8' }}>
                {juntos ? `💕 ${juntos}` : '💕 ¿Cuándo llegó?'}
              </div>
            )
          })()}
        </div>
      </Link>

      {/* PRÓXIMOS — grid 2x2 */}
      {proximosItems.length > 0 && (
        <>
          <div className="flex items-center justify-between px-5 pb-2.5">
            <div className="flex items-center gap-2">
              <img src="/chiqui/chiqui_lupa.png" alt="" className="w-8 h-8 object-contain" />
              <span className="font-heading text-[13px] font-bold text-[#3D2B1F] uppercase tracking-wider">Próximos</span>
            </div>
            <Link href="/prevencion" className="text-xs text-[#CD7421] font-semibold">Ver todo</Link>
          </div>
          <div className="mx-4 mb-4 grid grid-cols-2 gap-2.5">
            {proximosItems.map(item => {
              const contenido = (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[12.5px] font-bold text-[#3D2B1F]">{item.label}</p>
                    <span className="text-[10.5px] font-bold" style={{ color: item.color }}>{item.dias}</span>
                  </div>
                  <p className="text-[11px] text-[#8A7560] leading-tight">{item.sub}</p>
                  {item.url && <p className="text-[10px] font-semibold text-[#CD7421] mt-1">Registrar →</p>}
                </>
              )
              return item.url ? (
                <Link key={item.label} href={item.url} className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-3 block active:scale-[0.98] transition-transform">
                  {contenido}
                </Link>
              ) : (
                <div key={item.label} className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-3">
                  {contenido}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* CUIDADOS RECIENTES */}
      {(cuidadosRecientes.length > 0 || rachaPaseo !== null) && (
        <>
          <div className="flex items-center justify-between px-5 pb-2.5">
            <div className="flex items-center gap-2">
              <img src="/chiqui/chiqui_cuidados.png" alt="" className="w-8 h-8 object-contain" />
              <span className="font-heading text-[13px] font-bold text-[#3D2B1F] uppercase tracking-wider">Cuidados recientes</span>
            </div>
            {cuidadosRecientes.length > 4 && (
              <button onClick={() => setCuidadosExpandido(e => !e)} className="text-xs text-[#CD7421] font-semibold">
                {cuidadosExpandido ? 'Ver menos' : 'Ver todo'}
              </button>
            )}
          </div>

          {!cuidadosExpandido ? (
            <div className="mx-4 mb-4 grid grid-cols-2 gap-2.5">
              {rachaPaseo !== null && (
                <div className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-3 flex items-center gap-2.5">
                  <span className="text-lg flex-shrink-0">🔥</span>
                  <div>
                    <p className="text-[12.5px] font-bold text-[#3D2B1F]">Racha de paseos</p>
                    <p className="text-[11px] text-[#8A7560]">
                      {rachaPaseo === 0 ? 'Sin racha activa' : rachaEnRiesgo ? `⚠️ ${rachaPaseo} ${rachaPaseo === 1 ? 'día' : 'días'} — ¡pasea hoy para mantenerla!` : `${rachaPaseo} ${rachaPaseo === 1 ? 'día' : 'días'} seguidos`}
                    </p>
                  </div>
                </div>
              )}
              {cuidadosRecientes.slice(0, rachaPaseo !== null ? 3 : 4).map(item => (
                <div key={item.label} className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-3 flex items-center gap-2.5">
                  <span className="text-lg flex-shrink-0">{item.emoji}</span>
                  <div>
                    <p className="text-[12.5px] font-bold text-[#3D2B1F]">{item.label}</p>
                    <p className="text-[11px] text-[#8A7560]">
                      {item.dias === 0 ? 'Hoy' : item.dias === 1 ? 'Ayer' : `Hace ${item.dias} días`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-4 mb-4 space-y-3">
              {rachaPaseo !== null && (
                <div>
                  <p className="text-[11px] font-semibold text-[#CD7421] mb-1.5">Paseo</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-3 flex items-center gap-2.5">
                      <span className="text-lg flex-shrink-0">🔥</span>
                      <div>
                        <p className="text-[12.5px] font-bold text-[#3D2B1F]">Racha de paseos</p>
                        <p className="text-[11px] text-[#8A7560]">
                          {rachaPaseo === 0 ? 'Sin racha activa' : rachaEnRiesgo ? `⚠️ ${rachaPaseo} ${rachaPaseo === 1 ? 'día' : 'días'} — ¡pasea hoy para mantenerla!` : `${rachaPaseo} ${rachaPaseo === 1 ? 'día' : 'días'} seguidos`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {Array.from(new Set(cuidadosRecientes.map(c => c.grupo))).map(grupo => (
                <div key={grupo}>
                  <p className="text-[11px] font-semibold text-[#CD7421] mb-1.5">{grupo}</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {cuidadosRecientes.filter(c => c.grupo === grupo).map(item => (
                      <div key={item.label} className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-3 flex items-center gap-2.5">
                        <span className="text-lg flex-shrink-0">{item.emoji}</span>
                        <div>
                          <p className="text-[12.5px] font-bold text-[#3D2B1F]">{item.label}</p>
                          <p className="text-[11px] text-[#8A7560]">
                            {item.dias === 0 ? 'Hoy' : item.dias === 1 ? 'Ayer' : `Hace ${item.dias} días`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* LINEA VET — compartir el historial con el veterinario.
          Vive tambien en Perfil, pero ahi casi nadie la encontraba:
          es la funcion que distingue a CHIQUI y merece estar visible. */}
      <LineaVet mascotaId={m.id} mascotaNombre={m.nombre} />

      {/* CHIQUI TE CUENTA — carrusel de datos curiosos, cambia cada dia */}
      <ChiquiTeCuenta especie={m.especie} />

      <BottomNav />
    </div>
  )
}
