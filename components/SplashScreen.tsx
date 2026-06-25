'use client'
import { useEffect, useState } from 'react'

// Preguntas que aparecen aleatoriamente durante la carga de la app.
// Cada una apunta al mismo nervio desde un angulo distinto: ¿sabrías
// responder si algo pasa con tu mascota?
const PREGUNTAS = [
  '¿Si el vet pregunta\n"¿hace cuánto tiene eso?"...\n¿sabrías responder?',
  '¿Recuerdas cuándo\ncomió bien por última vez?',
  '¿Notas algo distinto hoy,\no todo igual que ayer?',
  '¿Cuándo fue su último paseo?\n¿Y el anterior?',
  'Si algo cambia esta noche,\n¿tendrías el historial\npara mostrárselo al vet?',
]

export default function SplashScreen() {
  const [pregunta, setPregunta] = useState('')

  useEffect(() => {
    // Elegir una pregunta aleatoria al montar el componente
    const idx = Math.floor(Math.random() * PREGUNTAS.length)
    setPregunta(PREGUNTAS[idx])
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F5EDE3]">
      {/* Logo */}
      <img
        src="/logo-chiqui-compacto.png"
        alt="CHIQUI"
        className="w-32 h-32 object-contain mb-6"
      />

      {/* Pregunta rotativa */}
      {pregunta && (
        <div className="mx-8 text-center">
          <p className="text-sm font-semibold text-[#8C572F] leading-relaxed whitespace-pre-line">
            {pregunta}
          </p>
        </div>
      )}

      {/* Indicador de carga sutil */}
      <div className="mt-8 flex gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FFBD59] animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-[#FFBD59] animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-[#FFBD59] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
