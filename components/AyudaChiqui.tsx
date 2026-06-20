'use client'
import { useState } from 'react'

export default function AyudaChiqui({ texto }: { texto: string }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setAbierto(a => !a)}
        className="w-5 h-5 rounded-full bg-[#EEE2D4] text-[#8C572F] text-[11px] font-bold flex items-center justify-center"
        aria-label="Ayuda"
      >
        ?
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
          <div className="absolute left-0 top-7 z-40 w-64 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-3.5 shadow-md">
            <p className="text-xs text-[#3D2B1F] leading-relaxed">{texto}</p>
          </div>
        </>
      )}
    </span>
  )
}
