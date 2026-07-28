'use client'

import { useState } from 'react'

// Landing tipo "linktree" de CHIQUI Entre Señales.
// Reúne en un solo lugar: accesos por plataforma (Android / iPhone /
// Samsung), abrir la app web, redes, contacto, privacidad y eliminar
// cuenta. Diseñada con la identidad de la marca (café/crema/dorado).
//
// Los enlaces marcados con {/* EDITAR */} se pueden cambiar fácil
// cuando estén disponibles (ej. el link oficial de Google Play).

const APP_URL = 'https://chiqui-beta-lilac.vercel.app'
const INSTAGRAM = 'https://instagram.com/chiquientresenales'
const CORREO = 'chiquientresenales@gmail.com'
// EDITAR: cuando exista el link oficial de Google Play, reemplaza null
// por la URL y el botón pasará de "beta" a "descargar" automáticamente.
const GOOGLE_PLAY_URL: string | null = null

export default function LinksPage() {
  const [iosAbierto, setIosAbierto] = useState(false)

  // Correo prellenado para pedir acceso a la beta de Android.
  const mailtoBeta = `mailto:${CORREO}?subject=${encodeURIComponent('Quiero unirme a la beta de Android')}&body=${encodeURIComponent('¡Hola! Me gustaría participar en la prueba de CHIQUI Entre Señales en Android. Mi correo de Google (Gmail) para agregarme como tester es:\n\n')}`

  return (
    <div className="min-h-screen bg-[#F5EDE3] px-5 py-10">
      <div className="max-w-md mx-auto">

        {/* Encabezado con marca */}
        <div className="flex flex-col items-center text-center mb-7">
          <img src="/chiqui/chiqui_hola.png" alt="Chiqui" className="w-24 h-24 object-contain mb-2" />
          <h1 className="font-heading text-2xl font-extrabold text-[#8C572F]">CHIQUI Entre Señales</h1>
          <p className="text-sm text-[#8A7560] mt-1">Aprende a leer las señales de salud de tu mascota 🐾</p>
        </div>

        {/* Bloque: cómo obtener la app */}
        <p className="text-[11px] font-bold text-[#8A7560] uppercase tracking-wider mb-2 px-1">Descarga la app</p>
        <div className="space-y-3 mb-6">

          {/* Android / Google Play */}
          {GOOGLE_PLAY_URL ? (
            <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
              <span className="text-2xl">🤖</span>
              <div className="flex-1">
                <p className="font-bold text-sm text-[#3D2B1F]">Descargar en Google Play</p>
                <p className="text-[11px] text-[#8A7560]">Para teléfonos Android</p>
              </div>
              <span className="text-[#8C572F] font-bold">→</span>
            </a>
          ) : (
            <a href={mailtoBeta}
              className="flex items-center gap-3 bg-[#FFFCF8] border-2 border-[#FFBD59] rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
              <span className="text-2xl">🤖</span>
              <div className="flex-1">
                <p className="font-bold text-sm text-[#3D2B1F]">¿Quieres probar la beta en Android?</p>
                <p className="text-[11px] text-[#8A7560]">Escríbenos y te agregamos como tester</p>
              </div>
              <span className="text-[#8C572F] font-bold">→</span>
            </a>
          )}

          {/* iPhone / iOS — despliega instrucciones de PWA */}
          <div className="bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl overflow-hidden">
            <button onClick={() => setIosAbierto(v => !v)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.98] transition-transform">
              <span className="text-2xl"></span>
              <div className="flex-1">
                <p className="font-bold text-sm text-[#3D2B1F]">Instalar en iPhone</p>
                <p className="text-[11px] text-[#8A7560]">Toca para ver cómo</p>
              </div>
              <span className="text-[#8C572F] text-base font-bold">{iosAbierto ? '▲' : '▼'}</span>
            </button>
            {iosAbierto && (
              <div className="px-4 pb-4 border-t border-[#EEE2D4] pt-3">
                <ol className="space-y-2.5">
                  {[
                    ['1', 'Abre el enlace de la app en Safari (no en otro navegador).'],
                    ['2', 'Toca el botón de compartir (el cuadrado con la flecha hacia arriba).'],
                    ['3', 'Baja y elige "Agregar a pantalla de inicio".'],
                    ['4', '¡Listo! El ícono de Chiqui quedará en tu pantalla como una app.'],
                  ].map(([n, t]) => (
                    <li key={n} className="flex gap-2.5 text-xs text-[#5C4A3A] leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-[#FFBD59] text-[#3D2B1F] flex items-center justify-center text-[11px] font-bold flex-shrink-0">{n}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
                <a href={APP_URL} target="_blank" rel="noopener noreferrer"
                  className="mt-3 block text-center bg-[#FFBD59] text-[#3D2B1F] font-bold text-sm py-2.5 rounded-xl active:opacity-80">
                  Abrir la app en Safari →
                </a>
              </div>
            )}
          </div>

          {/* Samsung Galaxy Store */}
          <a href={APP_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-[#3D2B1F]">Samsung Galaxy</p>
              <p className="text-[11px] text-[#8A7560]">Abre la app desde tu navegador</p>
            </div>
            <span className="text-[#8C572F] font-bold">→</span>
          </a>
        </div>

        {/* Bloque: abrir directo */}
        <a href={APP_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-[#8C572F] text-white rounded-2xl px-4 py-4 mb-6 active:scale-[0.98] transition-transform">
          <span className="text-lg">🐾</span>
          <span className="font-bold text-sm">Abrir la app ahora</span>
        </a>

        {/* Bloque: comunidad y contacto */}
        <p className="text-[11px] font-bold text-[#8A7560] uppercase tracking-wider mb-2 px-1">Síguenos y contáctanos</p>
        <div className="space-y-3 mb-6">
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
            <span className="text-2xl">📸</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-[#3D2B1F]">Instagram</p>
              <p className="text-[11px] text-[#8A7560]">@chiquientresenales</p>
            </div>
            <span className="text-[#8C572F] font-bold">→</span>
          </a>
          <a href={`mailto:${CORREO}`}
            className="flex items-center gap-3 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
            <span className="text-2xl">✉️</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-[#3D2B1F]">Escríbenos</p>
              <p className="text-[11px] text-[#8A7560]">{CORREO}</p>
            </div>
            <span className="text-[#8C572F] font-bold">→</span>
          </a>
        </div>

        {/* Bloque: legal / cuenta */}
        <p className="text-[11px] font-bold text-[#8A7560] uppercase tracking-wider mb-2 px-1">Tu cuenta y privacidad</p>
        <div className="space-y-3 mb-8">
          <a href="/privacidad"
            className="flex items-center gap-3 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
            <span className="text-2xl">🛡️</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-[#3D2B1F]">Política de privacidad</p>
              <p className="text-[11px] text-[#8A7560]">Cómo cuidamos tus datos</p>
            </div>
            <span className="text-[#8C572F] font-bold">→</span>
          </a>
          <a href="/eliminar-cuenta"
            className="flex items-center gap-3 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
            <span className="text-2xl">🗑️</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-[#3D2B1F]">Eliminar cuenta</p>
              <p className="text-[11px] text-[#8A7560]">Solicita borrar tus datos</p>
            </div>
            <span className="text-[#8C572F] font-bold">→</span>
          </a>
        </div>

        {/* Pie */}
        <p className="text-center text-[11px] text-[#8A7560]">
          Hecho con 💛 para las mascotas y quienes las cuidan.
        </p>
      </div>
    </div>
  )
}
