import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidad — CHIQUI Entre Señales',
  description: 'Política de privacidad de la aplicación CHIQUI Entre Señales',
}

export default function PrivacidadPage() {
  const fecha = '24 de junio de 2026'

  return (
    <div className="min-h-screen bg-[#F5EDE3] px-5 py-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <img src="/logo-chiqui-compacto.png" alt="CHIQUI" className="w-12 h-12 object-contain" />
        <div>
          <h1 className="font-bold text-lg text-[#3D2B1F]">CHIQUI Entre Señales</h1>
          <p className="text-xs text-[#8A7560]">Política de Privacidad</p>
        </div>
      </div>

      <div className="bg-[#FFFCF8] rounded-2xl border border-[#EEE2D4] p-6 space-y-6 text-[#3D2B1F]">

        <p className="text-xs text-[#8A7560]">Última actualización: {fecha}</p>

        <section>
          <h2 className="font-bold text-base mb-2">1. ¿Qué es CHIQUI Entre Señales?</h2>
          <p className="text-sm leading-relaxed text-[#5C4A3A]">
            CHIQUI Entre Señales es una aplicación móvil que ayuda a los dueños de mascotas a registrar y hacer seguimiento de la salud y el bienestar de sus perros y gatos. Permite registrar síntomas diarios, vacunas, antiparasitarios, medicamentos, observaciones y revisiones corporales.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">2. Información que recopilamos</h2>
          <p className="text-sm leading-relaxed text-[#5C4A3A] mb-3">Recopilamos únicamente la información necesaria para el funcionamiento de la app:</p>
          <ul className="space-y-2">
            {[
              ['Información de cuenta', 'Dirección de correo electrónico para crear y gestionar tu cuenta.'],
              ['Información de tu mascota', 'Nombre, especie, raza, fecha de nacimiento, peso, foto y características generales de tu mascota.'],
              ['Registros de salud', 'Síntomas diarios, vacunas, antiparasitarios, medicamentos, enfermedades, observaciones y revisiones corporales que tú ingresas voluntariamente.'],
              ['Archivos', 'Fotos y documentos (como exámenes veterinarios en PDF) que decidas subir.'],
              ['Preferencias de notificaciones', 'Configuración de recordatorios y horarios de notificación.'],
            ].map(([titulo, texto]) => (
              <li key={titulo} className="flex gap-2 text-sm text-[#5C4A3A]">
                <span className="text-[#FFBD59] flex-shrink-0 mt-0.5">•</span>
                <span><strong>{titulo}:</strong> {texto}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">3. Cómo usamos tu información</h2>
          <p className="text-sm leading-relaxed text-[#5C4A3A] mb-2">Usamos la información recopilada exclusivamente para:</p>
          <ul className="space-y-1.5">
            {[
              'Permitirte registrar y consultar el historial de salud de tu mascota.',
              'Enviarte notificaciones de recordatorio según tus preferencias.',
              'Mostrarte análisis y tendencias sobre el bienestar de tu mascota.',
              'Mejorar el funcionamiento y la experiencia de la aplicación.',
            ].map((item) => (
              <li key={item} className="flex gap-2 text-sm text-[#5C4A3A]">
                <span className="text-[#FFBD59] flex-shrink-0 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">4. Compartición de datos</h2>
          <p className="text-sm leading-relaxed text-[#5C4A3A]">
            <strong>No vendemos, arrendamos ni compartimos tu información personal con terceros</strong> con fines comerciales o publicitarios. Tu información solo puede ser compartida en los siguientes casos:
          </p>
          <ul className="space-y-1.5 mt-2">
            {[
              'Con tu veterinario, únicamente si tú decides compartir el enlace de Vista Veterinaria.',
              'Con proveedores de servicios técnicos que nos ayudan a operar la app (Supabase para almacenamiento de datos, Vercel para hosting), quienes están obligados contractualmente a proteger tu información.',
              'Si la ley lo exige o para proteger los derechos de CHIQUI Entre Señales.',
            ].map((item) => (
              <li key={item} className="flex gap-2 text-sm text-[#5C4A3A]">
                <span className="text-[#FFBD59] flex-shrink-0 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">5. Almacenamiento y seguridad</h2>
          <p className="text-sm leading-relaxed text-[#5C4A3A]">
            Tus datos se almacenan en servidores seguros proporcionados por Supabase, con cifrado en tránsito (HTTPS) y en reposo. Cada usuario solo puede acceder a sus propios datos gracias a políticas de seguridad a nivel de fila (Row Level Security). Sin embargo, ningún sistema es 100% seguro y no podemos garantizar la seguridad absoluta de la información.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">6. Tus derechos</h2>
          <p className="text-sm leading-relaxed text-[#5C4A3A] mb-2">Tienes derecho a:</p>
          <ul className="space-y-1.5">
            {[
              'Acceder a todos los datos que hemos recopilado sobre ti y tu mascota.',
              'Corregir cualquier información incorrecta.',
              'Eliminar tu cuenta y todos tus datos en cualquier momento.',
              'Exportar tu información.',
            ].map((item) => (
              <li key={item} className="flex gap-2 text-sm text-[#5C4A3A]">
                <span className="text-[#FFBD59] flex-shrink-0 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-[#5C4A3A] mt-2">
            Para ejercer cualquiera de estos derechos, contáctanos a través del correo indicado al final de esta política.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">7. Menores de edad</h2>
          <p className="text-sm leading-relaxed text-[#5C4A3A]">
            CHIQUI Entre Señales no está dirigida a menores de 13 años. No recopilamos intencionalmente información de menores. Si detectamos que un menor ha creado una cuenta, eliminaremos su información.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">8. Notificaciones push</h2>
          <p className="text-sm leading-relaxed text-[#5C4A3A]">
            Si activas las notificaciones, almacenamos el token de tu dispositivo para poder enviarte recordatorios. Puedes desactivar las notificaciones en cualquier momento desde la configuración de la app o de tu dispositivo.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">9. Cambios a esta política</h2>
          <p className="text-sm leading-relaxed text-[#5C4A3A]">
            Podemos actualizar esta política de privacidad ocasionalmente. Te notificaremos de cambios importantes a través de la app. El uso continuado de CHIQUI después de los cambios implica tu aceptación de la nueva política.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">10. Contacto</h2>
          <p className="text-sm leading-relaxed text-[#5C4A3A]">
            Si tienes preguntas sobre esta política de privacidad o sobre el manejo de tus datos, puedes contactarnos en:
          </p>
          <div className="mt-2 bg-[#FBEAD9] rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-[#8C572F]">CHIQUI Entre Señales</p>
            <p className="text-sm text-[#5C4A3A]">chiquientresenales@gmail.com</p>
            <p className="text-sm text-[#5C4A3A]">Chile</p>
          </div>
        </section>

      </div>

      <p className="text-xs text-[#8A7560] text-center mt-6">
        © {new Date().getFullYear()} CHIQUI Entre Señales. Todos los derechos reservados.
      </p>
    </div>
  )
}
