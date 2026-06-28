'use client'
import { useMemo, useRef } from 'react'

// Bateria de tarjetas educativas filtradas por especie.
// Rotan diariamente — cada dia se muestra un set distinto de 4 tarjetas
// tomadas desde la lista segun el dia del año.

const TARJETAS_PERRO = [
  { emoji: '🍎', titulo: 'Frutas que sí puedo comer', texto: 'Me encanta cuando compartimos un premio rico. Manzana, pera, sandía, melón y arándanos son seguros para mí. Solo acuérdate de quitar las semillas y la cáscara.' },
  { emoji: '🚫', titulo: 'Frutas que no debo comer', texto: 'Aunque te ponga ojitos, las uvas, las pasas y la palta pueden hacerme mucho daño e incluso afectar mis riñones. Mejor guárdalas solo para ti.' },
  { emoji: '🥦', titulo: 'Verduras seguras', texto: 'La zanahoria, el pepino, el brócoli y el zapallo son una buena opción para mí. ¡La zanahoria cruda incluso ayuda a mantener mis dientes más limpios!' },
  { emoji: '🌿', titulo: 'Plantas tóxicas', texto: 'Si tienes azaleas, hortensias, lirios o áloe vera, mejor mantenlas lejos de mí. Aunque sean lindas, pueden ser peligrosas para mi salud.' },
  { emoji: '🦷', titulo: 'Dientes sanos', texto: 'Si me ayudas a cepillar mis dientes 2 o 3 veces por semana, evitarás que el sarro me cause problemas que incluso pueden afectar mi corazón.' },
  { emoji: '💧', titulo: '¿Cuánta agua necesito?', texto: 'Lo normal es que tome cerca de 50 ml por cada kilo de peso al día. Si hace calor o jugué mucho, probablemente necesitaré un poco más.' },
  { emoji: '🐾', titulo: 'Señales de estrés', texto: 'Si bostezo, me lamo los labios, desvío la mirada o muestro la barriga de repente, quizás estoy intentando decirte que algo me incomoda.' },
  { emoji: '☀️', titulo: 'Cuidado con el calor', texto: 'Yo no sudo como tú. Solo jadeo y transpiro por mis patitas. Nunca me dejes dentro de un auto y evita caminar sobre asfalto muy caliente.' },
  { emoji: '🧅', titulo: 'Alimentos muy peligrosos', texto: 'La cebolla, el ajo, el puerro y el ciboulette pueden intoxicarme, incluso cocidos. Mejor mantenlos siempre fuera de mi plato.' },
  { emoji: '😴', titulo: '¿Cuánto duermo?', texto: 'Si soy adulto, dormir 12 a 14 horas es completamente normal. Si soy cachorro o senior, puedo descansar hasta 18 o 20 horas al día.' },
  { emoji: '🫀', titulo: 'Mi corazón', texto: 'Cuando estoy tranquilo, mi corazón suele latir entre 60 y 140 veces por minuto. Si soy de raza pequeña, es normal que lata un poquito más rápido.' },
  { emoji: '🌡️', titulo: 'Mi temperatura', texto: 'Mi temperatura normal está entre 38 °C y 39,2 °C. Si supera los 40 °C, necesito atención veterinaria.' },
  { emoji: '🦴', titulo: 'Huesos', texto: 'Los huesos cocidos pueden astillarse y hacerme daño. Si voy a comer uno, los huesos crudos de res o pollo son una opción más segura, siempre con supervisión.' },
  { emoji: '🏃', titulo: 'Ejercicio según mi edad', texto: 'Si soy cachorro, necesito 5 minutos de ejercicio por cada mes de vida, dos veces al día. Si soy adulto, entre 30 y 60 minutos. Si ya soy senior, prefiero paseos más suaves.' },
  { emoji: '🐜', titulo: 'Antiparasitarios', texto: 'Aunque no veas pulgas o garrapatas, necesito protección durante todo el año. En Chile lo recomendable es usar antiparasitarios cada mes o cada 3 meses, según indique mi veterinario.' },
  { emoji: '🧠', titulo: 'Juegos de olfato', texto: '¿Sabías que usar mi nariz también me cansa? Buscar premios durante 15 minutos puede cansarme más que una caminata de una hora.' },
  { emoji: '🧊', titulo: 'Kong congelado', texto: 'Un Kong con croquetas, puré de zapallo o yogur natural sin azúcar, bien congelado, puede mantenerme entretenido cerca de 30 minutos mientras espero que vuelvas.' },
  { emoji: '🫙', titulo: '¿Qué puedo poner en mi Kong?', texto: 'Mantequilla de maní sin xilitol, plátano, zanahoria rallada, queso crema o zapallo son buenas opciones. ¡Si lo congelas, durará mucho más!' },
  { emoji: '🎯', titulo: 'Snuffle Mat', texto: 'Buscar mi comida con el olfato despierta mi instinto y me ayuda a relajarme. ¡También puedes hacer uno en casa con una alfombra y tiras de polar!' },
  { emoji: '👅', titulo: 'Lick Mat', texto: 'Lamer me ayuda a relajarme porque libera serotonina. Un lick mat puede ser un gran compañero antes de quedarme solo un rato.' },
]

const TARJETAS_GATO = [
  { emoji: '🐟', titulo: 'El pescado con moderación', texto: 'Me encanta el pescado, pero el atún en lata es solo un gusto de vez en cuando porque tiene mucho sodio. Si quieres consentirme, mejor pescado fresco bien cocido.' },
  { emoji: '🥛', titulo: '¿Y la leche?', texto: 'Aunque salga en las películas, la mayoría de nosotros somos intolerantes a la lactosa. Lo que más agradezco siempre será agua fresca.' },
  { emoji: '🌿', titulo: 'Plantas tóxicas', texto: 'Si tienes lirios, tulipanes, narcisos, pothos o áloe vera, mejor mantenlos lejos de mí. El lirio puede dañar gravemente mis riñones, incluso con muy poca exposición.' },
  { emoji: '😴', titulo: '¿Cuánto duermo?', texto: 'Dormir entre 12 y 16 horas es completamente normal para mí. Al amanecer y al atardecer es cuando normalmente tengo más energía.' },
  { emoji: '💧', titulo: 'Agua', texto: 'A veces no tomo toda el agua que necesito. Una fuente con agua en movimiento puede ayudarme a beber mucho más.' },
  { emoji: '🧅', titulo: 'Alimentos muy peligrosos', texto: 'La cebolla, el ajo, las uvas, el chocolate y el xilitol pueden hacerme mucho daño. Mejor mantén esos alimentos lejos de mi alcance.' },
  { emoji: '🐾', titulo: '¿Por qué amaso?', texto: 'Cuando amaso con mis patitas, muchas veces te estoy diciendo que me siento seguro y feliz contigo. Es un comportamiento que conservé desde que era cachorro.' },
  { emoji: '🦷', titulo: 'Salud dental', texto: 'Cerca del 70% de nosotros desarrolla enfermedad periodontal antes de los 3 años. Un cepillado o snacks dentales pueden marcar una gran diferencia.' },
  { emoji: '🌡️', titulo: 'Mi temperatura', texto: 'Mi temperatura normal está entre 38 °C y 39,2 °C. Si baja de 37,5 °C o supera los 40 °C, necesito atención veterinaria.' },
  { emoji: '🎯', titulo: 'Mi instinto de caza', texto: 'Aunque viva dentro de casa, sigo siendo un cazador. Jugar conmigo 10 a 15 minutos al día me ayuda a mantenerme sano y reduce el estrés.' },
  { emoji: '🫀', titulo: 'Mi ronroneo', texto: 'Me encanta ronronear cuando estoy feliz, pero también puedo hacerlo si siento dolor o estoy estresado. Siempre fíjate en el contexto.' },
  { emoji: '☀️', titulo: 'Cuidado con el sol', texto: 'Si tengo el pelaje claro, mis orejas y mi nariz pueden quemarse con el sol. Un poquito de sombra también es una forma de cuidarme.' },
  { emoji: '🧶', titulo: 'Bolas de pelo', texto: 'Si me cepillas 2 o 3 veces por semana, reducirás las bolas de pelo. Si tengo el pelaje largo, lo ideal es hacerlo todos los días.' },
  { emoji: '🐜', titulo: 'Antiparasitarios', texto: 'Si salgo al exterior o soy cazador, normalmente necesitaré antiparasitarios cada 3 meses. Si vivo solo dentro de casa, muchas veces bastará cada 6 meses, según indique mi veterinario.' },
  { emoji: '🏠', titulo: 'Enriquecimiento ambiental', texto: 'Me encanta tener rascadores, lugares altos, juguetes y una ventana para observar el mundo. Todo eso mantiene mi mente activa y feliz.' },
  { emoji: '🎣', titulo: 'Jugar antes de que salgas', texto: 'Si juegas conmigo 10 minutos antes de irte, descargaré energía y será mucho más fácil que después me quede descansando tranquilo.' },
  { emoji: '🌿', titulo: 'Catnip y valeriana', texto: 'El catnip y la valeriana pueden hacerme jugar un rato y luego ayudarme a relajarme. Son opciones seguras para la mayoría de nosotros.' },
  { emoji: '📦', titulo: 'Cajas y bolsas de papel', texto: 'Una caja o una bolsa de papel pueden ser el mejor juguete del mundo. Si además cambias mis escondites de vez en cuando, evitarás que me aburra.' },
  { emoji: '🍽️', titulo: 'Comer también puede ser un juego', texto: 'Si escondes mi comida o usas una pelota dispensadora, activarás mi instinto de caza mientras me alimento. ¡Es mucho más entretenido para mí!' },
  { emoji: '🪟', titulo: 'Mi televisión favorita', texto: 'Para mí, una ventana es como tener televisión todo el día. Si además hay pajaritos afuera, créeme... podría pasar horas mirando.' },
]

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
