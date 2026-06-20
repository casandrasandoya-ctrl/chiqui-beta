'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { iconoPorEspecie } from '@/utils/iconoEspecie'

const MAX_ARCHIVO_BYTES = 2 * 1024 * 1024 // 2MB

interface Props {
  mascotaId: string
  especie?: string | null
  fotoUrl?: string | null
  // Tamaño del circulo en pixeles (ej. 80 para w-20 h-20, 64 para w-16 h-16)
  size: number
  // Si es true, muestra el boton de camara para cambiar la foto.
  // Si es false, solo muestra la foto/emoji sin poder editarla (ej. en
  // el dashboard o el selector, donde no tiene sentido editar ahi mismo).
  editable?: boolean
  onFotoActualizada?: (nuevaUrl: string) => void
}

export default function FotoMascota({
  mascotaId, especie, fotoUrl, size, editable = false, onFotoActualizada,
}: Props) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const [urlLocal, setUrlLocal] = useState(fotoUrl)

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setError('')

    if (!archivo.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes.')
      return
    }
    if (archivo.size > MAX_ARCHIVO_BYTES) {
      setError('La imagen supera los 2MB. Intenta con una foto más liviana.')
      return
    }

    setSubiendo(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubiendo(false); return }

    // Usamos siempre el mismo nombre de archivo por mascota (no un
    // timestamp), para que al subir una foto nueva simplemente
    // reemplace la anterior en vez de acumular fotos viejas sin usar.
    const extension = archivo.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${mascotaId}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('fotos-mascotas')
      .upload(path, archivo, { upsert: true })

    if (uploadError) {
      setError('No se pudo subir la foto. Intenta de nuevo.')
      setSubiendo(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('fotos-mascotas')
      .getPublicUrl(path)

    // Le agregamos un parametro de tiempo a la URL para evitar que el
    // navegador muestre una version cacheada vieja de la foto cuando se
    // reemplaza (el path es el mismo, asi que sin esto podria no
    // refrescarse visualmente de inmediato).
    const urlConCacheBuster = `${urlData.publicUrl}?t=${Date.now()}`

    await supabase.from('mascotas').update({ foto_url: urlConCacheBuster }).eq('id', mascotaId)

    setUrlLocal(urlConCacheBuster)
    onFotoActualizada?.(urlConCacheBuster)
    setSubiendo(false)
  }

  return (
    <div className="relative inline-block">
      <div
        className="rounded-full bg-[#FFFCF8] border-2 border-[#4CAF7D] flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        {urlLocal ? (
          <img src={urlLocal} alt="Foto de la mascota" className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: size * 0.5 }}>{iconoPorEspecie(especie)}</span>
        )}
      </div>

      {editable && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#FFBD59] border-2 border-[#FFFCF8] flex items-center justify-center text-xs disabled:opacity-50"
            aria-label="Cambiar foto"
          >
            {subiendo ? '...' : '📷'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={manejarArchivo}
            className="hidden"
          />
        </>
      )}

      {error && (
        <p className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-[10px] text-[#E05252] whitespace-nowrap bg-[#FFFCF8] px-2 py-1 rounded-lg border border-[#E05252]/30">
          {error}
        </p>
      )}
    </div>
  )
}
