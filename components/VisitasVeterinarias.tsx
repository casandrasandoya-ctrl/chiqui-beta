'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import FechaSelector from '@/components/FechaSelector'

interface Props {
  mascotaId: string
}

// Tipos de visita al veterinario. El color ayuda a distinguirlos de un
// vistazo en la línea de tiempo.
const TIPOS_VISITA: { valor: string; label: string; emoji: string; color: string }[] = [
  { valor: 'rutina', label: 'Control / rutina', emoji: '🩺', color: '#4CAF7D' },
  { valor: 'examenes', label: 'Exámenes / chequeo', emoji: '🔬', color: '#4AABDB' },
  { valor: 'enfermedad', label: 'Por enfermedad', emoji: '🤒', color: '#F07A30' },
  { valor: 'tratamiento', label: 'Tratamiento continuo', emoji: '💗', color: '#CD7421' },
]

function tipoInfo(valor: string) {
  return TIPOS_VISITA.find(t => t.valor === valor) || TIPOS_VISITA[0]
}

// Fecha de hoy en zona horaria de Chile (YYYY-MM-DD), para separar
// futuras de pasadas sin errores de huso horario.
function hoyChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
}

// Formatear fecha a algo legible: "17 ago 2026"
function fmtFecha(f: string): string {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const [a, m, d] = f.split('-').map(Number)
  return `${d} ${meses[m - 1]} ${a}`
}

// Días que faltan para una fecha futura (desde hoy Chile)
function diasHasta(f: string): number {
  const hoy = new Date(hoyChile() + 'T12:00:00')
  const objetivo = new Date(f + 'T12:00:00')
  return Math.round((objetivo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

export default function VisitasVeterinarias({ mascotaId }: Props) {
  const supabase = createClient()
  const [abierto, setAbierto] = useState(false)
  const [visitas, setVisitas] = useState<any[]>([])
  const [visitasRegistro, setVisitasRegistro] = useState<any[]>([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [guardando, setGuardando] = useState(false)

  // Campos del formulario
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [tipo, setTipo] = useState('rutina')
  const [motivo, setMotivo] = useState('')
  const [veterinario, setVeterinario] = useState('')
  const [nota, setNota] = useState('')

  useEffect(() => {
    if (mascotaId) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mascotaId])

  async function cargar() {
    // 1) Visitas formales de la tabla visitas_veterinarias
    const { data: visitasData } = await supabase
      .from('visitas_veterinarias')
      .select('*')
      .eq('mascota_id', mascotaId)
      .order('fecha', { ascending: true })
    const visitasFormales = visitasData || []
    setVisitas(visitasFormales)

    // 2) Días marcados "fue al veterinario" en los registros diarios.
    //    Son visitas que ocurrieron (pasadas o de hoy) pero sin detalle.
    //    Se muestran en el historial y se pueden "completar" después.
    const { data: regData } = await supabase
      .from('registros_diarios')
      .select('fecha, fue_al_vet')
      .eq('mascota_id', mascotaId)
      .eq('fue_al_vet', true)
      .order('fecha', { ascending: false })

    // Evitar duplicados: si ya existe una visita formal en esa misma
    // fecha, no mostramos también el registro diario (sería la misma
    // visita vista dos veces).
    const fechasFormales = new Set(visitasFormales.map(v => v.fecha))
    const desdeRegistro = (regData || [])
      .filter(r => !fechasFormales.has(r.fecha))
      .map(r => ({
        id: `reg_${r.fecha}`,   // id sintético (no es de la tabla visitas)
        fecha: r.fecha,
        tipo: 'rutina',
        motivo: null,
        veterinario: null,
        nota: null,
        _desdeRegistro: true,   // marca: vino del registro diario
      }))
    setVisitasRegistro(desdeRegistro)
  }

  function abrirNueva() {
    setEditando(null)
    setFecha(''); setHora(''); setTipo('rutina'); setMotivo(''); setVeterinario(''); setNota('')
    setModalAbierto(true)
    document.body.style.overflow = 'hidden'
  }

  // Completar un día "fue al vet" del registro diario: abre el modal con
  // la fecha precargada, pero SIN editando (editando=null), de modo que
  // al guardar se CREA una visita formal nueva en esa fecha. El día
  // marcado en el registro diario se mantiene; al haber ya una visita
  // formal en esa fecha, deja de mostrarse por separado (sin duplicar).
  function abrirCompletar(v: any) {
    setEditando(null)
    setFecha(v.fecha || ''); setHora(''); setTipo('rutina'); setMotivo(''); setVeterinario(''); setNota('')
    setModalAbierto(true)
    document.body.style.overflow = 'hidden'
  }

  function abrirEditar(v: any) {
    setEditando(v)
    setFecha(v.fecha || ''); setHora(v.hora ? v.hora.slice(0, 5) : ''); setTipo(v.tipo || 'rutina')
    setMotivo(v.motivo || ''); setVeterinario(v.veterinario || ''); setNota(v.nota || '')
    setModalAbierto(true)
    document.body.style.overflow = 'hidden'
  }

  function cerrarModal() {
    setModalAbierto(false)
    document.body.style.overflow = ''
  }

  async function guardar() {
    if (!fecha) return
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGuardando(false); return }
    const payload: any = {
      mascota_id: mascotaId,
      user_id: user.id,
      fecha,
      hora: hora || null,
      tipo,
      motivo: motivo || null,
      veterinario: veterinario || null,
      nota: nota || null,
    }
    if (editando) {
      await supabase.from('visitas_veterinarias').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('visitas_veterinarias').insert(payload)
    }
    setGuardando(false)
    cerrarModal()
    cargar()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta visita?')) return
    await supabase.from('visitas_veterinarias').delete().eq('id', id)
    cargar()
  }

  const hoy = hoyChile()
  // Todas las visitas juntas: las formales + las que vienen de los
  // registros diarios (días marcados "fue al vet").
  const todas = [...visitas, ...visitasRegistro]
  // Futuras: fecha >= hoy, ordenadas de la más próxima a la más lejana.
  // (Las del registro diario nunca son futuras, así que solo aporta la tabla.)
  const futuras = todas.filter(v => v.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  // Pasadas: fecha < hoy, de la más reciente hacia atrás.
  const pasadas = todas.filter(v => v.fecha < hoy).sort((a, b) => b.fecha.localeCompare(a.fecha))

  // Badge: si hay una visita próxima dentro de 7 días, avisamos en el título.
  const proxima = futuras[0]
  const diasProxima = proxima ? diasHasta(proxima.fecha) : null

  function TarjetaVisita({ v, esFutura }: { v: any; esFutura: boolean }) {
    const info = tipoInfo(v.tipo)
    const dias = esFutura ? diasHasta(v.fecha) : null
    const desdeRegistro = v._desdeRegistro === true
    return (
      <div className="bg-[#FFFCF8] rounded-xl border border-[#EEE2D4] p-3">
        <div className="flex items-start gap-2.5">
          <span className="text-lg flex-shrink-0" style={{ lineHeight: 1.2 }}>{desdeRegistro ? '🩺' : info.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-[#3D2B1F]">{fmtFecha(v.fecha)}</span>
              {v.hora && <span className="text-[11px] text-[#8A7560]">{v.hora.slice(0, 5)} hrs</span>}
              {desdeRegistro ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8A7560]/15 text-[#8A7560]">
                  Registrada en el día
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${info.color}22`, color: info.color }}>
                  {info.label}
                </span>
              )}
            </div>
            {v.motivo && <p className="text-xs text-[#3D2B1F] mt-1">{v.motivo}</p>}
            {v.veterinario && <p className="text-[11px] text-[#8A7560] mt-0.5">📍 {v.veterinario}</p>}
            {v.nota && <p className="text-[11px] text-[#8A7560] mt-0.5 italic">{v.nota}</p>}
            {desdeRegistro && (
              <p className="text-[11px] text-[#8A7560] mt-1 italic">Marcada desde el registro diario. Puedes completar el detalle.</p>
            )}
            {esFutura && dias !== null && (
              <p className="text-[11px] font-semibold mt-1" style={{ color: dias <= 7 ? '#F07A30' : '#8A7560' }}>
                {dias === 0 ? '¡Es hoy!' : dias === 1 ? 'Mañana' : `En ${dias} días`}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 flex-shrink-0">
            {desdeRegistro ? (
              <button onClick={() => abrirCompletar(v)} className="text-[11px] text-[#CD7421] font-semibold">Completar</button>
            ) : (
              <>
                <button onClick={() => abrirEditar(v)} className="text-[11px] text-[#CD7421] font-semibold">Editar</button>
                <button onClick={() => eliminar(v.id)} className="text-[11px] text-[#E05252] font-semibold">Eliminar</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-4 mb-3 bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] overflow-hidden">
      <button onClick={() => setAbierto(v => !v)} className="w-full flex items-center justify-between px-4 py-3.5 text-left">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-[#3D2B1F]">🏥 Visitas veterinarias</span>
          {diasProxima !== null && diasProxima <= 7 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F07A30]/15 text-[#F07A30]">
              {diasProxima === 0 ? 'Hoy' : diasProxima === 1 ? 'Mañana' : `En ${diasProxima} días`}
            </span>
          )}
        </div>
        <span className="text-[#8C572F] text-sm font-bold">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="border-t border-[#EEE2D4] px-4 py-3">
          <button onClick={abrirNueva} className="w-full bg-[#FFBD59] text-[#3D2B1F] font-bold text-sm py-2.5 rounded-xl mb-3 active:opacity-80">
            + Agregar visita
          </button>

          {todas.length === 0 && (
            <p className="text-xs text-[#8A7560] text-center py-3">
              Aún no hay visitas registradas. Agenda la próxima o registra las que ya fueron.
            </p>
          )}

          {/* Próximas visitas */}
          {futuras.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-bold text-[#8C572F] uppercase tracking-wider mb-2">Próximas</p>
              <div className="space-y-2">
                {futuras.map(v => <TarjetaVisita key={v.id} v={v} esFutura={true} />)}
              </div>
            </div>
          )}

          {/* Historial de visitas pasadas */}
          {pasadas.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[#8A7560] uppercase tracking-wider mb-2">Historial</p>
              <div className="space-y-2">
                {pasadas.map(v => <TarjetaVisita key={v.id} v={v} esFutura={false} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal agregar / editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(61,43,31,0.45)' }} onClick={cerrarModal}>
          <div className="bg-[#F5EDE3] rounded-t-3xl w-full max-w-md p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-[#3D2B1F]">{editando ? 'Editar visita' : 'Nueva visita'}</h3>
              <button onClick={cerrarModal} className="text-[#8A7560] text-xl leading-none">✕</button>
            </div>

            <div className="space-y-3">
              {/* Fecha */}
              <div>
                <label className="text-xs font-semibold text-[#8A7560] mb-1 block">Fecha *</label>
                <FechaSelector value={fecha} onChange={setFecha} />
              </div>

              {/* Hora */}
              <div>
                <label className="text-xs font-semibold text-[#8A7560] mb-1 block">Hora (opcional)</label>
                <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                  className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-3 py-2.5 text-sm text-[#3D2B1F]" />
              </div>

              {/* Tipo */}
              <div>
                <label className="text-xs font-semibold text-[#8A7560] mb-1 block">Tipo de visita</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_VISITA.map(t => (
                    <button key={t.valor} onClick={() => setTipo(t.valor)}
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold transition-colors"
                      style={{
                        borderColor: tipo === t.valor ? t.color : '#EEE2D4',
                        background: tipo === t.valor ? `${t.color}18` : '#FFFCF8',
                        color: tipo === t.valor ? t.color : '#8A7560',
                      }}>
                      <span>{t.emoji}</span>
                      <span className="text-left leading-tight">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="text-xs font-semibold text-[#8A7560] mb-1 block">Motivo (opcional)</label>
                <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
                  placeholder="Ej. Vacuna anual, control de peso..."
                  className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-3 py-2.5 text-sm text-[#3D2B1F]" />
              </div>

              {/* Veterinario / clínica */}
              <div>
                <label className="text-xs font-semibold text-[#8A7560] mb-1 block">Veterinario o clínica (opcional)</label>
                <input type="text" value={veterinario} onChange={e => setVeterinario(e.target.value)}
                  placeholder="Ej. Clínica Patitas, Dra. Pérez"
                  className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-3 py-2.5 text-sm text-[#3D2B1F]" />
              </div>

              {/* Nota */}
              <div>
                <label className="text-xs font-semibold text-[#8A7560] mb-1 block">Nota corta (opcional)</label>
                <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2}
                  placeholder="Algo que quieras recordar de esta visita"
                  className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-3 py-2.5 text-sm text-[#3D2B1F] resize-none" />
              </div>

              <button onClick={guardar} disabled={!fecha || guardando}
                className="w-full bg-[#FFBD59] text-[#3D2B1F] font-bold text-sm py-3 rounded-xl disabled:opacity-50">
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Agregar visita'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
