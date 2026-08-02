'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

// ============================================================
// INSIGNIA DEL TUTOR
// ============================================================
// Medalla que acompaña al nombre en "Mi cuenta".
//
// La lleva la PERSONA, no la mascota: Canelita no es parte de la
// comunidad fundadora, Jenna sí. Ponerla junto al nombre de la mascota
// confundiría de quién es el reconocimiento, y quien tenga tres
// mascotas la vería repetida tres veces.
//
// Se guarda un CÓDIGO en la base ('fundador'), no este texto. Así el
// nombre de la medalla se puede cambiar acá sin tocar la base de datos.
//
// Es un componente aparte y carga su propio dato a propósito: así
// agregarla al perfil cuesta una sola línea, sin meterse en la carga de
// datos que ya existía. Si no hay insignia, no dibuja nada.

const INSIGNIAS: Record<string, { emoji: string; label: string; fondo: string; texto: string }> = {
  fundador: {
    emoji: '🏅',
    label: 'Comunidad fundadora',
    fondo: '#FFBD59',
    texto: '#1A1200',
  },
  equipo: {
    emoji: '⭐',
    label: 'Equipo',
    fondo: '#8C572F',
    texto: '#FFFCF8',
  },
}

export default function InsigniaTutor() {
  const supabase = createClient()
  const [codigo, setCodigo] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('perfil_usuario')
        .select('insignia')
        .eq('id', user.id)
        .maybeSingle()
      if (!cancelado && data?.insignia) setCodigo(data.insignia as string)
    })()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!codigo) return null
  const ins = INSIGNIAS[codigo]
  if (!ins) return null

  return (
    <span
      className="text-[10px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap"
      style={{ background: ins.fondo, color: ins.texto }}
    >
      {ins.emoji} {ins.label}
    </span>
  )
}
