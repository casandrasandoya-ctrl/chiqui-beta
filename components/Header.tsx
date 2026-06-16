'use client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  titulo: string
  subtitulo?: string
  accion?: React.ReactNode
}

export default function Header({ titulo, subtitulo, accion }: HeaderProps) {
  const router = useRouter()
  return (
    <div className="px-5 pt-6 pb-3 flex items-center gap-3 sticky top-0 bg-[#0B1020] z-10 border-b border-white/5">
      <button
        onClick={() => router.back()}
        className="w-9 h-9 rounded-full bg-[#1E2848] flex items-center justify-center text-lg flex-shrink-0"
      >
        ←
      </button>
      <div className="flex-1">
        <h1 className="text-base font-bold">{titulo}</h1>
        {subtitulo && <p className="text-xs text-[#8A8FA8]">{subtitulo}</p>}
      </div>
      {accion && <div>{accion}</div>}
    </div>
  )
}
