'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import SelectorMascota from '@/components/SelectorMascota'
import { guardarMascotaActivaId, obtenerMascotaActivaId } from '@/utils/mascotaActiva'
import { iconoPorEspecie } from '@/utils/iconoEspecie'
import { calcularEtapaVida, formatearEdad } from '@/utils/etapaVida'
import BannerNotificaciones from '@/components/BannerNotificaciones'
import BannerInstalarApp from '@/components/BannerInstalarApp'
import { useEffect, useState } from 'react'

function calcEdad(f: string) {
  const h = new Date(), n = new Date(f)
  const m = (h.getFullYear() - n.getFullYear()) * 12 + (h.getMonth() - n.getMonth())
  return m < 12 ? `${m}m` : m % 12 > 0 ? `${Math.floor(m / 12)}a ${m % 12}m` : `${Math.floor(m / 12)}a`
}
function fmtFecha(f: string) {
  const ms = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const d = new Date(f + 'T00:00:00')
  return `${d.getDate()} ${ms[d.getMonth()]} ${d.getFullYear()}`
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
  obsActiva: { titulo: string; fecha_inicio: string } | null | undefined
  proximosItems: { label: string; sub: string; dias: string; color: string; url?: string }[]
  tieneRegistroHoy: boolean
  cuidadosRecientes: { grupo: string; label: string; emoji: string; dias: number }[]
  rachaPaseo: number | null
}

export default function DashboardContenido({
  mascotas, mascota: m, color, estadoLabel, obsActiva, proximosItems, tieneRegistroHoy, cuidadosRecientes, rachaPaseo,
}: Props) {
  const router = useRouter()
  const [cuidadosExpandido, setCuidadosExpandido] = useState(false)
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
      </div>

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

      {/* Saludo con Chiqui — pañoleta cambia según el estado del día:
          roja = sin registro hoy, azul = registró (normal),
          verde = registró y todo bien (verde), amarilla = precaución */}
      {(() => {
        let imagen = '/chiqui-roja.png'
        let mensaje = `¡Hola! ¿Cómo estuvo ${m.nombre} hoy? Aún no has registrado.`
        if (tieneRegistroHoy) {
          if (color === '#4CAF7D') {
            imagen = '/chiqui-verde.png'
            mensaje = `¡Todo registrado hoy! ${m.nombre} está muy bien. 🐾`
          } else if (color === '#F5C842' || color === '#F07A30') {
            imagen = '/chiqui-amarilla.png'
            mensaje = `Registrado. Hay algo que merece atención en ${m.nombre} hoy.`
          } else {
            imagen = '/chiqui-azul.png'
            mensaje = `¡Gracias por observar a ${m.nombre} hoy!`
          }
        }
        return (
          <div className="mx-4 mb-3 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-3 py-2.5 flex items-center gap-2.5">
            <img src={imagen} alt="Chiqui" className="w-12 h-12 flex-shrink-0 object-contain" />
            <p className="text-xs font-semibold text-[#5C4A3A] leading-snug">{mensaje}</p>
          </div>
        )
      })()}

      <BannerInstalarApp />
      <BannerNotificaciones mascotaId={m.id} />

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
      <Link href="/perfil" className="relative mx-4 mb-4 bg-[#8C572F] rounded-2xl p-5 overflow-hidden block">
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
          <div className="flex-1 pt-0.5">
            <div className="font-heading text-lg font-extrabold leading-none text-[#FFFCF8]">{m.nombre}</div>
            <div className="text-xs text-[#F0DEC8] mt-1 mb-2">
              {m.especie}{m.raza ? ` · ${m.raza}` : ''}{m.sexo ? ` · ${m.sexo}` : ''}
              {(() => {
                const etapa = calcularEtapaVida(m.fecha_nacimiento, m.especie)
                if (!etapa) return null
                return ` · ${formatearEdad(etapa)} · ${etapa.nombre}`
              })()}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${color}26`, border: `1px solid ${color}4D`, color: '#FFFCF8' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              {estadoLabel}
            </div>
          </div>
          <span className="text-[#FFFCF8]/50 text-xl pt-1">›</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-[#FFFCF8]/15">
          <div className="text-center">
            {(() => {
              const etapa = calcularEtapaVida(m.fecha_nacimiento, m.especie)
              return etapa ? (
                <>
                  <div className="font-heading text-base font-extrabold text-[#FFFCF8]">{formatearEdad(etapa)}</div>
                  <div className="text-[10px] text-[#D9B596] mt-0.5">{etapa.nombre}</div>
                </>
              ) : (
                <>
                  <div className="font-heading text-base font-extrabold text-[#FFFCF8]">—</div>
                  <div className="text-[10px] text-[#D9B596] mt-0.5">Edad</div>
                </>
              )
            })()}
          </div>
          <div className="text-center">
            <div className="font-heading text-base font-extrabold text-[#FFFCF8]">{m.peso_actual ? `${m.peso_actual} kg` : '—'}</div>
            <div className="text-[10px] text-[#D9B596] mt-0.5">Peso actual</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-base font-extrabold text-[#FFFCF8]">{m.castrado ? 'Castrado' : 'Entero'}</div>
            <div className="text-[10px] text-[#D9B596] mt-0.5">Estado</div>
          </div>
        </div>
      </Link>

      {/* MENSAJE / ESTADO DEL DÍA */}
      <div className="mx-4 mb-3 bg-[#FBEAD9] rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
        <span className="text-lg flex-shrink-0">🐾</span>
        <p className="text-xs leading-relaxed font-semibold text-[#7A4A2F]">
          {!tieneRegistroHoy
            ? `¿Cómo estuvo ${m.nombre} hoy? Registra sus señales del día.`
            : 'Todo registrado el día de hoy. Gracias por observar.'}
        </p>
      </div>

      {/* ALERT BANNER - observación activa */}
      {obsActiva && (
        <div className="mx-4 mb-3 bg-[#EFE4DB] rounded-2xl px-3.5 py-2.5">
          <p className="text-xs leading-relaxed text-[#7A6555]">
            <strong className="text-[#5C4A3A]">En observación:</strong> {obsActiva.titulo}, desde {fmtFecha(obsActiva.fecha_inicio)}.
          </p>
        </div>
      )}

      {/* BOTÓN REGISTRAR HOY */}
      {!tieneRegistroHoy && (
        <Link href="/registro-diario" className="mx-4 mb-4 bg-[#FFBD59] rounded-2xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/30 flex items-center justify-center text-lg">✏️</div>
            <div className="text-left">
              <div className="font-heading text-[15px] font-extrabold text-[#5C3A12]">Registrar hoy</div>
              <div className="text-[11px] text-[#5C3A12]/70 mt-0.5">¿Cómo estuvo {m.nombre}?</div>
            </div>
          </div>
          <span className="text-xl text-[#5C3A12]/50">›</span>
        </Link>
      )}

      {/* PRÓXIMOS — grid 2x2 */}
      {proximosItems.length > 0 && (
        <>
          <div className="flex items-center justify-between px-5 pb-2.5">
            <span className="font-heading text-[13px] font-bold text-[#3D2B1F] uppercase tracking-wider">Próximos</span>
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
                  {item.url && <p className="text-[10px] text-[#CD7421] font-semibold mt-1.5">Tocar para iniciar →</p>}
                </>
              )
              return item.url ? (
                <Link key={item.label} href={item.url} className="bg-[#FFFCF8] border border-[#FFBD59]/40 rounded-2xl p-3 block">
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
            <span className="font-heading text-[13px] font-bold text-[#3D2B1F] uppercase tracking-wider">Cuidados recientes</span>
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
                      {rachaPaseo === 0 ? 'Sin racha activa' : `${rachaPaseo} ${rachaPaseo === 1 ? 'día' : 'días'} seguidos`}
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
                          {rachaPaseo === 0 ? 'Sin racha activa' : `${rachaPaseo} ${rachaPaseo === 1 ? 'día' : 'días'} seguidos`}
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

      {/* ACCESOS RÁPIDOS */}
      <div className="px-5 pb-2.5">
        <span className="font-heading text-[13px] font-bold text-[#3D2B1F] uppercase tracking-wider">Accesos rápidos</span>
      </div>
      <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
        {[
          { href: '/calendario', label: 'Calendario' },
          { href: '/analisis', label: 'Análisis' },
          { href: '/prevencion', label: 'Prevención' },
          { href: '/perfil', label: 'Perfil' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="bg-[#FFBD59] rounded-2xl p-4 flex items-center justify-center">
            <span className="text-sm font-bold text-[#5C3A12]">{item.label}</span>
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
