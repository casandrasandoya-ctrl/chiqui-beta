'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Props {
  mascotaId: string
  especie: string
}

// Catálogos de etiquetas (replicados del registro diario para que el
// componente sea autónomo). Solo se usan para MOSTRAR, no para crear.

function etiquetaHito(especie: string, value: string): { emoji: string; label: string } {
  const comunes: Record<string, { emoji: string; label: string }> = {
    primer_diente_leche: { emoji: '🦷', label: 'Se le cayó su primer diente de leche' },
    primer_diente_definitivo: { emoji: '😁', label: 'Le salió su primer diente definitivo' },
    primeras_vacunas: { emoji: '💉', label: 'Completó sus primeras vacunas' },
    responde_nombre: { emoji: '📛', label: 'Responde a su nombre' },
    primera_noche_completa: { emoji: '🌙', label: 'Primera noche durmiendo completa' },
    primer_arenero: { emoji: '🧹', label: 'Usó el arenero solo por primera vez' },
    primer_ronroneo: { emoji: '😺', label: 'Su primer ronroneo contigo' },
    exploro_casa: { emoji: '🪟', label: 'Exploró toda la casa por primera vez' },
    primer_paseo: { emoji: '🦮', label: 'Su primer paseo en la calle' },
    necesidades_lugar: { emoji: '✅', label: 'Aprendió a hacer sus necesidades donde corresponde' },
    conocio_otro_perro: { emoji: '🐶', label: 'Conoció a otro perro por primera vez' },
  }
  return comunes[value] || { emoji: '🐾', label: value }
}

function etiquetaMomento(tipo: string): { emoji: string; label: string } {
  const cat: Record<string, { emoji: string; label: string }> = {
    llego_a_casa: { emoji: '🏡', label: 'El día que llegó a casa' },
    mudanza: { emoji: '🏠', label: 'Se mudó de casa' },
    nuevo_integrante: { emoji: '👶', label: 'Llegó un nuevo integrante a la familia' },
    nuevo_companero: { emoji: '🐾', label: 'Conoció a un nuevo compañero peludo' },
    esterilizacion: { emoji: '✂️', label: 'Esterilización' },
    primer_viaje: { emoji: '✈️', label: 'Su primer viaje' },
    conocio_mar: { emoji: '🌊', label: 'Conoció el mar' },
    supero_enfermedad: { emoji: '💪', label: 'Superó una enfermedad' },
    despedida_companero: { emoji: '🕊️', label: 'Se despidió de un compañero' },
    otro: { emoji: '💛', label: 'Otro momento importante' },
    ojos_opacos: { emoji: '👀', label: 'Ojos más opacos o azulados' },
    primeras_canas: { emoji: '🐺', label: 'Le salieron sus primeras canas' },
  }
  return cat[tipo] || { emoji: '💛', label: tipo }
}

function fmtFecha(f: string): string {
  const d = new Date(f + 'T00:00:00')
  const ms = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getDate()} ${ms[d.getMonth()]} ${d.getFullYear()}`
}

export default function LineaTiempoMomentos({ mascotaId, especie }: Props) {
  const supabase = createClient()
  const [abierto, setAbierto] = useState(false)
  const [hitos, setHitos] = useState<any[]>([])
  const [momentos, setMomentos] = useState<any[]>([])
  const [cargado, setCargado] = useState(false)

  useEffect(() => {
    if (mascotaId) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mascotaId])

  async function cargar() {
    const [h, m] = await Promise.all([
      supabase.from('hitos_cachorro').select('*').eq('mascota_id', mascotaId),
      supabase.from('momentos').select('*').eq('mascota_id', mascotaId),
    ])
    setHitos(h.data || [])
    setMomentos(m.data || [])
    setCargado(true)
  }

  // Separar por grupos
  const momentosVida = momentos
    .filter(m => m.categoria !== 'cambio_edad')
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
  const cambiosEdad = momentos
    .filter(m => m.categoria === 'cambio_edad')
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
  const hitosBebe = [...hitos].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  const total = momentosVida.length + cambiosEdad.length + hitosBebe.length

  function Fila({ emoji, label, fecha, nota }: { emoji: string; label: string; fecha: string; nota?: string }) {
    return (
      <div className="flex items-start gap-2.5 px-3 py-2.5 bg-[#FFFCF8] rounded-xl border border-[#EEE2D4]">
        <span className="text-base flex-shrink-0" style={{ lineHeight: 1.3 }}>{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#3D2B1F]">{label}</p>
          {nota && <p className="text-[10px] text-[#8A7560] mt-0.5 italic">{nota}</p>}
          {fecha && <p className="text-[10px] font-semibold text-[#8C572F] mt-0.5">{fmtFecha(fecha)}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-4 mb-4 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
      <button onClick={() => setAbierto(v => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌱</span>
          <h2 className="font-bold text-sm text-[#3D2B1F]">Momentos de su vida</h2>
          {cargado && total > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFBD59]/20 text-[#8C572F]">{total}</span>
          )}
        </div>
        <span className="text-[#8C572F] text-sm font-bold">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="border-t border-[#EEE2D4] px-4 py-3 space-y-4">
          {total === 0 && (
            <p className="text-xs text-[#8A7560] text-center py-2">
              Aún no hay momentos registrados. Ve al registro diario para guardar los momentos especiales de {especie === 'Gato' ? 'tu gato' : 'tu peludo'}.
            </p>
          )}

          {/* Hitos de bebé */}
          {hitosBebe.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#8C572F] uppercase tracking-wider mb-2">🍼 Hitos de bebé</p>
              <div className="space-y-1.5">
                {hitosBebe.map(h => {
                  const info = etiquetaHito(especie, h.hito)
                  return <Fila key={h.id} emoji={info.emoji} label={info.label} fecha={h.fecha} />
                })}
              </div>
            </div>
          )}

          {/* Momentos de vida */}
          {momentosVida.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#8C572F] uppercase tracking-wider mb-2">💛 Momentos de vida</p>
              <div className="space-y-1.5">
                {momentosVida.map(m => {
                  const info = etiquetaMomento(m.tipo)
                  const label = m.tipo === 'otro' && m.nota ? m.nota : info.label
                  const nota = m.tipo !== 'otro' ? m.nota : undefined
                  return <Fila key={m.id} emoji={info.emoji} label={label} fecha={m.fecha} nota={nota} />
                })}
              </div>
            </div>
          )}

          {/* Cambios propios de la edad */}
          {cambiosEdad.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#8C572F] uppercase tracking-wider mb-2">🍂 Cambios de la edad</p>
              <div className="space-y-1.5">
                {cambiosEdad.map(m => {
                  const info = etiquetaMomento(m.tipo)
                  return <Fila key={m.id} emoji={info.emoji} label={info.label} fecha={m.fecha} />
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
