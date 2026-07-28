'use client'

import { useState } from 'react'

// Landing tipo "linktree" de CHIQUI Entre Señales.
// Hub con la identidad de la marca que reúne los accesos en un solo
// lugar: redes/contacto, descargas (Android por formulario, iPhone con
// instrucciones PWA), abrir la web, privacidad y eliminar cuenta.
//
// Enlaces editables al inicio.

const APP_URL = 'https://chiqui-beta-lilac.vercel.app'
const INSTAGRAM = 'https://instagram.com/chiquientresenales'
const CORREO = 'chiquientresenales@gmail.com'
// Formulario de inscripción a la beta de Android.
const FORM_BETA = 'https://docs.google.com/forms/d/e/1FAIpQLSd029Vw0dKvwKtHiGWC6RiG6bQZEKyUpx6RoC5ThVVmzgHpeQ/viewform'
// EDITAR: cuando exista el link oficial de Google Play, pon la URL aquí
// y el botón de Android pasará solo de "beta" a "descargar".
const GOOGLE_PLAY_URL: string | null = null

export default function LinksPage() {
  const [iosAbierto, setIosAbierto] = useState(false)

  return (
    <div className="min-h-screen bg-[#3D2B1F] px-5 py-8">
      <div className="max-w-md mx-auto">

        {/* Tarjeta principal crema con forma de arco */}
        <div className="bg-[#F5EDE3] rounded-t-[120px] rounded-b-3xl px-6 pt-10 pb-8">

          {/* Hero: ilustración de mascotas con el logo */}
          <div className="flex justify-center">
            <img src="/chiqui/chiqui_gatos_y_perros.png" alt="CHIQUI Entre Señales" className="w-56 h-56 object-contain -mb-10" />
          </div>

          <div className="text-center mb-6">
            <h1 className="font-heading text-2xl font-extrabold text-[#3D2B1F]">Entre Señales</h1>
            <p className="text-xs text-[#8A7560] mt-0.5">Tu compañero de observación y cuidado</p>
          </div>

          {/* Síguenos / contáctanos */}
          <p className="text-[11px] font-bold text-[#3D2B1F] uppercase tracking-wider text-center mb-3">Conecta con nosotros</p>
          <div className="flex justify-center gap-4 mb-5">
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-[#FFFCF8] border border-[#EEE2D4] flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Instagram">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8C572F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a href={`mailto:${CORREO}`}
              className="w-12 h-12 rounded-full bg-[#FFFCF8] border border-[#EEE2D4] flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Correo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8C572F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </a>
          </div>

          {/* Fila de beneficios — contexto de valor, discreto */}
          <div className="flex justify-center items-center gap-3 mb-7 text-[#8A7560]">
            <span className="text-[11px] font-semibold flex items-center gap-1">📋 Registros</span>
            <span className="text-[#EEE2D4]">·</span>
            <span className="text-[11px] font-semibold flex items-center gap-1">📈 Tendencias</span>
            <span className="text-[#EEE2D4]">·</span>
            <span className="text-[11px] font-semibold flex items-center gap-1">🚨 Recordatorios</span>
          </div>

          {/* Descargar la app */}
          <p className="text-[11px] font-bold text-[#3D2B1F] uppercase tracking-wider mb-3">Descargar la app</p>
          <div className="space-y-3 mb-7">

            {/* Android → formulario de beta */}
            {GOOGLE_PLAY_URL ? (
              <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-[#FFFCF8] rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform shadow-sm">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#8C572F"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.46 11.46 0 00-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85L6.4 9.48A10.78 10.78 0 001 18h22a10.78 10.78 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/></svg>
                <div className="flex-1">
                  <p className="font-bold text-sm text-[#3D2B1F]">Descargar en Google Play</p>
                  <p className="text-[11px] text-[#8A7560]">Para teléfonos Android</p>
                </div>
                <span className="text-[#8C572F] font-bold text-lg">›</span>
              </a>
            ) : (
              <a href={FORM_BETA} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-[#FFFCF8] rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform shadow-sm">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#8C572F"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.46 11.46 0 00-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85L6.4 9.48A10.78 10.78 0 001 18h22a10.78 10.78 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/></svg>
                <div className="flex-1">
                  <p className="font-bold text-sm text-[#3D2B1F]">Únete a la Beta Cerrada de Chiqui</p>
                  <p className="text-[11px] text-[#8A7560]">Solicita tu acceso</p>
                </div>
                <span className="text-[#8C572F] font-bold text-lg">›</span>
              </a>
            )}

            {/* iPhone → instrucciones PWA desplegables, con manzana */}
            <div className="bg-[#FFFCF8] rounded-2xl overflow-hidden shadow-sm">
              <button onClick={() => setIosAbierto(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:scale-[0.98] transition-transform">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#8C572F"><path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.78 1.3 10.32.86 1.24 1.89 2.64 3.23 2.59 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.27 3.15-2.52.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.73-1.05-2.76-4.16zM14.6 4.5c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z"/></svg>
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
                    Abrir la app en Safari ›
                  </a>
                </div>
              )}
            </div>

            {/* Abrir versión web */}
            <a href={APP_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#FFFCF8] rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform shadow-sm">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8C572F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <div className="flex-1">
                <p className="font-bold text-sm text-[#3D2B1F]">Abrir Chiqui en tu navegador</p>
                <p className="text-[11px] text-[#8A7560]">Úsala directo, sin instalar nada</p>
              </div>
              <span className="text-[#8C572F] font-bold text-lg">›</span>
            </a>
          </div>

          {/* Tu cuenta y privacidad — requisitos, con menor protagonismo:
              enlaces más compactos y discretos, separados de la descarga. */}
          <p className="text-[10px] font-semibold text-[#B5A38F] uppercase tracking-wider mb-2 mt-8">Tu cuenta y privacidad</p>
          <div className="space-y-1.5">
            <a href="/privacidad"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl active:bg-[#FFFCF8] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B5A38F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span className="flex-1 text-xs font-medium text-[#8A7560]">Política de privacidad</span>
              <span className="text-[#B5A38F] text-sm">›</span>
            </a>
            <a href="/eliminar-cuenta"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl active:bg-[#FFFCF8] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B5A38F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span className="flex-1 text-xs font-medium text-[#8A7560]">Eliminar cuenta</span>
              <span className="text-[#B5A38F] text-sm">›</span>
            </a>
          </div>
        </div>

        {/* Pie sobre el fondo café */}
        <p className="text-center text-[11px] text-[#F5EDE3] mt-5 mb-1">
          Hecho con 💛 para las mascotas y quienes las cuidan.
        </p>
      </div>
    </div>
  )
}
