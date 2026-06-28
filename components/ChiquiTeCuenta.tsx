'use client'
import { useMemo, useRef } from 'react'

// Bateria de tarjetas educativas filtradas por especie.
// Rotan diariamente — cada dia se muestra un set distinto de 4 tarjetas
// tomadas desde la lista segun el dia del año.

const TARJETAS_PERRO = [
  { emoji: '🍎', titulo: 'Frutas que puede comer', texto: 'Manzana (sin semillas), sandía, pera, melón y arándanos son seguros para perros en pequeñas cantidades. Siempre sin pepas ni cáscaras.' },
  { emoji: '🚫', titulo: 'Frutas peligrosas', texto: 'Las uvas y pasas pueden causar falla renal en perros, incluso en pequeñas cantidades. El aguacate también es tóxico para ellos.' },
  { emoji: '🥦', titulo: 'Verduras seguras', texto: 'Zanahoria, pepino, brócoli y zapallo son excelentes snacks para perros. La zanahoria cruda además ayuda a limpiar los dientes.' },
  { emoji: '🌿', titulo: 'Plantas tóxicas', texto: 'Azalea, hortensia, lirio y áloe vera son peligrosas para los perros. Si tienes plantas en casa, revisa que no estén al alcance.' },
  { emoji: '🦷', titulo: 'Dientes sanos', texto: 'Los perros deberían tener limpieza dental al menos 2-3 veces por semana. El sarro acumulado puede causar enfermedades cardíacas.' },
  { emoji: '💧', titulo: 'Cuánta agua necesita', texto: 'Un perro necesita aprox. 50 ml de agua por kilo de peso al día. En verano o tras ejercicio, mucho más. Agua fresca siempre disponible.' },
  { emoji: '🐾', titulo: 'Señales de estrés', texto: 'Bostezar, lamerse los labios, desviar la mirada o mostrar la barriga de golpe son señales de que tu perro se siente incómodo o ansioso.' },
  { emoji: '☀️', titulo: 'Cuidado con el calor', texto: 'Los perros no sudan por la piel — solo jadean y transpiran por las patitas. En verano, nunca los dejes en autos y evita el asfalto caliente.' },
  { emoji: '🧅', titulo: 'Alimentos muy peligrosos', texto: 'Cebolla, ajo, puerro y ciboulette son tóxicos para perros aunque estén cocidos. Pueden destruir sus glóbulos rojos y causar anemia.' },
  { emoji: '😴', titulo: 'Cuánto duermen', texto: 'Los perros adultos duermen entre 12 y 14 horas al día. Los cachorros y seniors pueden dormir hasta 18-20 horas. Es completamente normal.' },
  { emoji: '🫀', titulo: 'Frecuencia cardíaca normal', texto: 'Un perro adulto tiene entre 60-140 latidos por minuto en reposo (más rápido en razas pequeñas). Puedes sentirlo apoyando la mano en su pecho.' },
  { emoji: '🌡️', titulo: 'Temperatura normal', texto: 'La temperatura corporal normal de un perro es entre 38°C y 39.2°C. Por encima de 40°C es fiebre y requiere atención veterinaria.' },
  { emoji: '🦴', titulo: 'Huesos cocidos', texto: 'Los huesos cocidos son peligrosos — se astillan y pueden perforar el intestino. Los huesos crudos de res o pollo son más seguros con supervisión.' },
  { emoji: '🏃', titulo: 'Ejercicio según la edad', texto: 'Cachorros: 5 minutos por mes de vida dos veces al día. Adultos: 30-60 min diarios. Seniors: caminatas cortas y suaves, sin sobre-esfuerzo.' },
  { emoji: '🐜', titulo: 'Antiparasitarios', texto: 'En Chile, los parásitos externos (pulgas, garrapatas) son activos todo el año. La protección mensual o trimestral es clave, no solo en verano.' },
  { emoji: '🧠', titulo: 'Juegos olfativos para la ansiedad', texto: 'Esconde premios por la casa y deja que tu perro los encuentre con la nariz. 15 minutos de búsqueda olfativa cansan más que 1 hora de caminata — y bajan la ansiedad notablemente.' },
  { emoji: '🧊', titulo: 'Kong congelado: el mejor aliado', texto: 'Mezcla croquetas con puré de zapallo o yogur natural sin azúcar, rellena un Kong y congélalo. Media hora con el Kong congelado puede hacer que tu perro olvide que te fuiste de casa.' },
  { emoji: '🫙', titulo: 'Qué poner en el Kong', texto: 'Opciones seguras para rellenar: mantequilla de maní sin xilitol, plátano aplastado, zanahoria rallada, queso crema, puré de zapallo. Congela siempre para que dure más.' },
  { emoji: '🎯', titulo: 'Snuffle mat para calmar la mente', texto: 'Un tapete olfativo (snuffle mat) con premios escondidos entre las tiras activa el instinto natural de búsqueda. Puedes hacerlo en casa con una alfombra de goma y tiras de polar.' },
  { emoji: '📦', titulo: 'Licker mat: concentración total', texto: 'Untarle comida en un licker mat (tapete de lamer) genera un estado de relajación natural. El acto de lamer libera serotonina — funciona especialmente bien antes de dejarlo solo.' },]

const TARJETAS_GATO = [
  { emoji: '🐟', titulo: 'El pescado con moderación', texto: 'El atún en lata no debe ser diario — tiene demasiado sodio y puede causar deficiencia de vitamina E. El pescado fresco cocido sí es bueno.' },
  { emoji: '🥛', titulo: 'Los gatos y la leche', texto: 'La mayoría de los gatos adultos son intolerantes a la lactosa. La leche puede causarles diarrea. Agua fresca es todo lo que necesitan.' },
  { emoji: '🌿', titulo: 'Plantas tóxicas', texto: 'Lirio, tulipán, narciso, pothos y áloe vera son muy tóxicos para gatos. El lirio en particular puede causar falla renal con solo olerlo.' },
  { emoji: '😴', titulo: 'Cuánto duermen', texto: 'Los gatos duermen entre 12 y 16 horas al día — es normal. Son animales de actividad crepuscular: más activos al amanecer y al atardecer.' },
  { emoji: '💧', titulo: 'No toman suficiente agua', texto: 'Los gatos tienen bajo instinto de sed porque evolutivamente obtenían agua de sus presas. Las fuentes de agua corriente los incentivan a beber más.' },
  { emoji: '🧅', titulo: 'Alimentos muy peligrosos', texto: 'Cebolla, ajo, uvas, chocolate y xilitol (edulcorante) son tóxicos para gatos. El chocolate puede ser fatal incluso en pequeñas cantidades.' },
  { emoji: '🐾', titulo: 'Por qué amasan', texto: 'El amasado (hacer "pan") es un comportamiento de cachorro que persiste en la vida adulta. Es señal de que tu gato se siente seguro y cómodo.' },
  { emoji: '🦷', titulo: 'Salud dental', texto: 'El 70% de los gatos mayores de 3 años tiene enfermedad periodontal. Cepillar sus dientes o dar snacks dentales puede prevenir problemas serios.' },
  { emoji: '🌡️', titulo: 'Temperatura normal', texto: 'La temperatura normal de un gato es entre 38°C y 39.2°C. Si está más baja de 37.5°C o más alta de 40°C, es urgente consultar al vet.' },
  { emoji: '🎯', titulo: 'Necesidad de cazar', texto: 'Los gatos domésticos mantienen su instinto de caza. Jugar con ellos 10-15 minutos diarios con juguetes interactivos reduce el estrés y la ansiedad.' },
  { emoji: '🫀', titulo: 'Ronroneo no siempre es felicidad', texto: 'Los gatos también ronronean cuando están estresados o doloridos — es un mecanismo de autorregulación. Observa el contexto para interpretarlo.' },
  { emoji: '☀️', titulo: 'Gatos y el sol', texto: 'Los gatos de pelaje claro o sin pelo pueden quemarse con el sol. Las orejas y la nariz son las zonas más vulnerables en gatos de exterior.' },
  { emoji: '🧶', titulo: 'Bolas de pelo', texto: 'Cepillar a tu gato 2-3 veces por semana reduce significativamente las bolas de pelo. Los de pelo largo deberían cepillarse a diario.' },
  { emoji: '🐜', titulo: 'Parásitos internos', texto: 'Los gatos que salen al exterior o cazan deben desparasitarse cada 3 meses. Los de interior, cada 6 meses es suficiente.' },
  { emoji: '🏠', titulo: 'Enriquecimiento ambiental', texto: 'Un gato sin estimulación puede desarrollar ansiedad y problemas de conducta. Rascadores, alturas, juguetes y ventanas con vista son esenciales.' },
  { emoji: '🧶', titulo: 'Juego antes de salir: reduce ansiedad', texto: 'Jugar 10 minutos intensos con tu gato antes de irte de casa lo deja cansado y satisfecho. Un gato que cazó está listo para dormir, no para maullar de ansiedad.' },
  { emoji: '🌿', titulo: 'Catnip y valeriana para calmar', texto: 'La hierba gatera (catnip) genera un estado de euforia seguido de relajación profunda. La valeriana tiene efecto similar. Son seguros y naturales para reducir estrés en gatos.' },
  { emoji: '📦', titulo: 'Cajas y bolsas de papel', texto: 'Una caja de cartón abierta o una bolsa de papel son enriquecimiento gratuito. Los gatos necesitan explorar espacios nuevos — rotar sus escondites cada semana reduce el aburrimiento.' },
  { emoji: '🎯', titulo: 'Alimentación como juego', texto: 'En vez de darle la comida en plato, escóndela en diferentes partes de la casa o usa una pelota dispensadora. Activa su instinto de caza y reduce ansiedad por aburrimiento.' },
  { emoji: '🪟', titulo: 'La ventana como televisión', texto: 'Un gato con acceso a una ventana con vista tiene estimulación constante. Agrega un comedero de pájaros afuera si puedes — tu gato tendrá su propia pantalla de streaming.' },]

// Tarjetas generales (para otras especies)
const TARJETAS_GENERAL = [
  { emoji: '💧', titulo: 'Agua siempre fresca', texto: 'El agua limpia y fresca es lo más importante para cualquier mascota. Cámbiala al menos una vez al día y limpia el recipiente regularmente.' },
  { emoji: '🌡️', titulo: 'Conoce la temperatura normal', texto: 'Saber la temperatura normal de tu mascota te ayuda a detectar fiebre a tiempo. Pregúntale a tu vet cuál es el rango normal para su especie.' },
  { emoji: '🐾', titulo: 'Observar es cuidar', texto: 'Conocer el comportamiento habitual de tu mascota es la mejor herramienta para detectar cambios. Lo que notas tú en casa es información valiosa para el vet.' },
]

interface Props {
  especie: string
}

export default function ChiquiTeCuenta({ especie }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Seleccionar 5 tarjetas del dia — rotan segun dia del año
  const tarjetasHoy = useMemo(() => {
    const lista = especie === 'Perro' ? TARJETAS_PERRO
      : especie === 'Gato' ? TARJETAS_GATO
      : TARJETAS_GENERAL

    const hoy = new Date()
    const diaAnio = Math.floor((hoy.getTime() - new Date(hoy.getFullYear(), 0, 0).getTime()) / 86400000)
    const inicio = (diaAnio * 5) % lista.length

    // Tomar 5 tarjetas ciclicamente desde el indice de hoy
    const resultado = []
    for (let i = 0; i < 5; i++) {
      resultado.push(lista[(inicio + i) % lista.length])
    }
    return resultado
  }, [especie])

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="px-5 mb-2.5 flex items-center gap-2">
        <span className="text-base">🐶🤓</span>
        <span className="font-bold text-xs text-[#3D2B1F] uppercase tracking-wider">Chiqui te cuenta</span>
      </div>

      {/* Carrusel horizontal */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-2"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
      >
        {tarjetasHoy.map((t, i) => (
          <div
            key={i}
            className="flex-shrink-0 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl p-4"
            style={{ width: '240px', scrollSnapAlign: 'start' }}
          >
            <div className="text-2xl mb-2">{t.emoji}</div>
            <p className="font-bold text-sm text-[#3D2B1F] mb-1.5 leading-snug">{t.titulo}</p>
            <p className="text-xs text-[#8A7560] leading-relaxed">{t.texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
