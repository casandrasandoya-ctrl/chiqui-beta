'use client'
import { useMemo, useState } from 'react'

// Bateria de tarjetas educativas filtradas por especie.
// Rotan diariamente — cada dia se muestra un set distinto de 4 tarjetas
// tomadas desde la lista segun el dia del año.

const TARJETAS_PERRO = [
  { emoji: '🍎', cat: 'alim', titulo: 'Frutas que sí puedo comer', pregunta: '¿Qué frutas son seguras para perros?', texto: 'Me encanta cuando compartimos un premio rico. Manzana, pera, sandía, melón y arándanos son seguros para mí. Solo acuérdate de quitar las semillas y la cáscara.' },
  { emoji: '🚫', cat: 'seg',  titulo: 'Frutas que no debo comer', pregunta: '¿Qué frutas nunca debería comer un perro?', texto: 'Aunque te ponga ojitos, las uvas, las pasas y la palta pueden hacerme mucho daño e incluso afectar mis riñones. Mejor guárdalas solo para ti.' },
  { emoji: '🥦', cat: 'alim', titulo: 'Verduras seguras', pregunta: '¿Qué verduras puedo ofrecer como premio?', texto: 'La zanahoria, el pepino, el brócoli y el zapallo son una buena opción para mí. ¡La zanahoria cruda incluso ayuda a mantener mis dientes más limpios!' },
  { emoji: '🌿', cat: 'seg',  titulo: 'Plantas tóxicas', pregunta: '¿Qué plantas pueden ser tóxicas para perros?', texto: 'Si tienes azaleas, hortensias, lirios o áloe vera, mejor mantenlas lejos de mí. Aunque sean lindas, pueden ser peligrosas para mi salud.' },
  { emoji: '🦷', cat: 'salud',titulo: 'Dientes sanos', pregunta: '¿Cada cuánto debería cepillarle los dientes?', texto: 'Si me ayudas a cepillar mis dientes 2 o 3 veces por semana, evitarás que el sarro me cause problemas que incluso pueden afectar mi corazón.' },
  { emoji: '💧', cat: 'bien', titulo: '¿Cuánta agua necesito?', pregunta: '¿Cuánta agua necesita un perro al día?', texto: 'Lo normal es que tome cerca de 50 ml por cada kilo de peso al día. Si hace calor o jugué mucho, probablemente necesitaré un poco más.' },
  { emoji: '🐾', cat: 'comp', titulo: 'Señales de estrés', pregunta: '¿Cómo saber si un perro está estresado?', texto: 'Si bostezo, me lamo los labios, desvío la mirada o muestro la barriga de repente, quizás estoy intentando decirte que algo me incomoda.' },
  { emoji: '☀️', cat: 'bien', titulo: 'Cuidado con el calor', pregunta: '¿Cómo reconocer un golpe de calor?', texto: 'Yo no sudo como tú. Solo jadeo y transpiro por mis patitas. Nunca me dejes dentro de un auto y evita caminar sobre asfalto muy caliente.' },
  { emoji: '🧅', cat: 'seg',  titulo: 'Alimentos muy peligrosos', pregunta: '¿Qué alimentos nunca debería darle?', texto: 'La cebolla, el ajo, el puerro y el ciboulette pueden intoxicarme, incluso cocidos. Mejor mantenlos siempre fuera de mi plato.' },
  { emoji: '😴', cat: 'comp', titulo: '¿Cuánto duermo?', pregunta: '¿Es normal que mi perro duerma tantas horas?', texto: 'Si soy adulto, dormir 12 a 14 horas es completamente normal. Si soy cachorro o senior, puedo descansar hasta 18 o 20 horas al día.' },
  { emoji: '🫀', cat: 'salud',titulo: 'Mi corazón', pregunta: '¿Cuál es la frecuencia cardíaca normal de un perro?', texto: 'Cuando estoy tranquilo, mi corazón suele latir entre 60 y 140 veces por minuto. Si soy de raza pequeña, es normal que lata un poquito más rápido.' },
  { emoji: '🌡️', cat: 'salud',titulo: 'Mi temperatura', pregunta: '¿Cuál es la temperatura normal de un perro?', texto: 'Mi temperatura normal está entre 38 °C y 39,2 °C. Si supera los 40 °C, necesito atención veterinaria.' },
  { emoji: '🦴', cat: 'alim', titulo: 'Huesos', pregunta: '¿Todos los huesos son seguros para los perros?', texto: 'Los huesos cocidos pueden astillarse y hacerme daño. Si voy a comer uno, los huesos crudos de res o pollo son una opción más segura, siempre con supervisión.' },
  { emoji: '🏃', cat: 'bien', titulo: 'Ejercicio según mi edad', pregunta: '¿Cuánto ejercicio necesita un perro según su edad?', texto: 'Si soy cachorro, necesito 5 minutos de ejercicio por cada mes de vida, dos veces al día. Si soy adulto, entre 30 y 60 minutos. Si ya soy senior, prefiero paseos más suaves.' },
  { emoji: '🐜', cat: 'salud',titulo: 'Antiparasitarios', pregunta: '¿Los antiparasitarios se usan solo en verano?', texto: 'Aunque no veas pulgas o garrapatas, necesito protección durante todo el año. En Chile lo recomendable es usar antiparasitarios cada mes o cada 3 meses, según indique mi veterinario.' },
  { emoji: '🧠', cat: 'comp', titulo: 'Juegos de olfato', pregunta: '¿Por qué los juegos de olfato cansan tanto?', texto: '¿Sabías que usar mi nariz también me cansa? Buscar premios durante 15 minutos puede cansarme más que una caminata de una hora.' },
  { emoji: '🧊', cat: 'bien', titulo: 'Kong congelado', pregunta: '¿Para qué sirve un Kong congelado?', texto: 'Un Kong con croquetas, puré de zapallo o yogur natural sin azúcar, bien congelado, puede mantenerme entretenido cerca de 30 minutos mientras espero que vuelvas.' },
  { emoji: '🫙', cat: 'alim', titulo: '¿Qué puedo poner en mi Kong?', pregunta: '¿Con qué puedo rellenar un Kong?', texto: 'Mantequilla de maní sin xilitol, plátano, zanahoria rallada, queso crema o zapallo son buenas opciones. ¡Si lo congelas, durará mucho más!' },
  { emoji: '🎯', cat: 'bien', titulo: 'Snuffle Mat', pregunta: '¿Qué es un Snuffle Mat y para qué sirve?', texto: 'Buscar mi comida con el olfato despierta mi instinto y me ayuda a relajarme. ¡También puedes hacer uno en casa con una alfombra y tiras de polar!' },
  { emoji: '👅', cat: 'bien', titulo: 'Lick Mat', pregunta: '¿Por qué un Lick Mat ayuda a reducir la ansiedad?', texto: 'Lamer me ayuda a relajarme porque libera serotonina. Un lick mat puede ser un gran compañero antes de quedarme solo un rato.' },
  { emoji: '💩', cat: 'salud', titulo: 'El color de mis heces importa', pregunta: '¿Qué puede decir el color de las heces sobre su salud?', texto: 'Lo normal es que sean marrón chocolate. Si son verdes, amarillas, naranjas, blancas, grises, negras o con sangre roja, algo podría no andar bien. Anótalo en CHIQUI y consulta con mi veterinario si el cambio persiste o me notas decaído.' },
  { emoji: '💩', cat: 'salud', titulo: 'La forma y el tamaño también dicen mucho', pregunta: '¿Cómo deberían verse las heces normales de un perro?', texto: 'Lo ideal es que mis heces sean firmes, con forma definida y fáciles de recoger. Muy duras → podría necesitar más agua. Blandas → mi intestino podría estar irritado. Líquidas → es diarrea. Si además cambian mucho de tamaño durante varios días, también vale registrarlo.' },
  { emoji: '🟤', cat: 'salud', titulo: 'Heces blandas: ¿cuándo preocuparse?', pregunta: '¿Cuándo las heces blandas dejan de ser normales?', texto: 'Una vez puede pasar por algo que comí o por estrés. Pero si duran más de 48 horas, aparecen junto a vómitos, sangre o decaimiento, necesito que me revise un veterinario.' },
  { emoji: '⚫', cat: 'salud', titulo: 'Heces negras', pregunta: '¿Las heces negras son una urgencia?', texto: 'Si mis heces son negras y brillantes, como alquitrán, podrían contener sangre digerida proveniente del estómago o intestino. Es una señal importante y conviene consultar con mi veterinario ese mismo día.' },
  { emoji: '🤮', cat: 'salud', titulo: 'Vomité... ¿es normal?', pregunta: '¿Cuándo un vómito requiere atención veterinaria?', texto: 'Vomitar una vez puede ocurrir. Pero si vomito varias veces, hay sangre, dejo de comer o estoy muy decaído, necesito atención veterinaria. Tú me conoces mejor que nadie.' },

]

const TARJETAS_GATO = [
  { emoji: '🐟', cat: 'alim', titulo: 'El pescado con moderación', pregunta: '¿Puede un gato comer pescado todos los días?', texto: 'Me encanta el pescado, pero el atún en lata es solo un gusto de vez en cuando porque tiene mucho sodio. Si quieres consentirme, mejor pescado fresco bien cocido.' },
  { emoji: '🥛', cat: 'alim', titulo: '¿Y la leche?', pregunta: '¿Los gatos pueden tomar leche?', texto: 'Aunque salga en las películas, la mayoría de nosotros somos intolerantes a la lactosa. Lo que más agradezco siempre será agua fresca.' },
  { emoji: '🌿', cat: 'seg',  titulo: 'Plantas tóxicas', pregunta: '¿Qué plantas pueden ser tóxicas para perros?', texto: 'Si tienes lirios, tulipanes, narcisos, pothos o áloe vera, mejor mantenlos lejos de mí. El lirio puede dañar gravemente mis riñones, incluso con muy poca exposición.' },
  { emoji: '😴', cat: 'comp', titulo: '¿Cuánto duermo?', pregunta: '¿Es normal que mi perro duerma tantas horas?', texto: 'Dormir entre 12 y 16 horas es completamente normal para mí. Al amanecer y al atardecer es cuando normalmente tengo más energía.' },
  { emoji: '💧', cat: 'bien', titulo: 'Agua', pregunta: '¿Por qué los gatos toman tan poca agua?', texto: 'A veces no tomo toda el agua que necesito. Una fuente con agua en movimiento puede ayudarme a beber mucho más.' },
  { emoji: '🧅', cat: 'seg',  titulo: 'Alimentos muy peligrosos', pregunta: '¿Qué alimentos nunca debería darle?', texto: 'La cebolla, el ajo, las uvas, el chocolate y el xilitol pueden hacerme mucho daño. Mejor mantén esos alimentos lejos de mi alcance.' },
  { emoji: '🐾', cat: 'comp', titulo: '¿Por qué amaso?', pregunta: '¿Por qué los gatos amasan con las patas?', texto: 'Cuando amaso con mis patitas, muchas veces te estoy diciendo que me siento seguro y feliz contigo. Es un comportamiento que conservé desde que era cachorro.' },
  { emoji: '🦷', cat: 'salud',titulo: 'Salud dental', pregunta: '¿Cada cuánto necesita atención dental un gato?', texto: 'Cerca del 70% de nosotros desarrolla enfermedad periodontal antes de los 3 años. Un cepillado o snacks dentales pueden marcar una gran diferencia.' },
  { emoji: '🌡️', cat: 'salud',titulo: 'Mi temperatura', pregunta: '¿Cuál es la temperatura normal de un perro?', texto: 'Mi temperatura normal está entre 38 °C y 39,2 °C. Si baja de 37,5 °C o supera los 40 °C, necesito atención veterinaria.' },
  { emoji: '🎯', cat: 'comp', titulo: 'Mi instinto de caza', pregunta: '¿Por qué un gato de interior necesita jugar tanto?', texto: 'Aunque viva dentro de casa, sigo siendo un cazador. Jugar conmigo 10 a 15 minutos al día me ayuda a mantenerme sano y reduce el estrés.' },
  { emoji: '🫀', cat: 'comp', titulo: 'Mi ronroneo', pregunta: '¿Ronronear siempre significa que está feliz?', texto: 'Me encanta ronronear cuando estoy feliz, pero también puedo hacerlo si siento dolor o estoy estresado. Siempre fíjate en el contexto.' },
  { emoji: '☀️', cat: 'salud',titulo: 'Cuidado con el sol', pregunta: '¿Los gatos pueden quemarse con el sol?', texto: 'Si tengo el pelaje claro, mis orejas y mi nariz pueden quemarse con el sol. Un poquito de sombra también es una forma de cuidarme.' },
  { emoji: '🧶', cat: 'salud',titulo: 'Bolas de pelo', pregunta: '¿Cómo reducir las bolas de pelo en casa?', texto: 'Si me cepillas 2 o 3 veces por semana, reducirás las bolas de pelo. Si tengo el pelaje largo, lo ideal es hacerlo todos los días.' },
  { emoji: '🐜', cat: 'salud',titulo: 'Antiparasitarios', pregunta: '¿Los antiparasitarios se usan solo en verano?', texto: 'Si salgo al exterior o soy cazador, normalmente necesitaré antiparasitarios cada 3 meses. Si vivo solo dentro de casa, muchas veces bastará cada 6 meses, según indique mi veterinario.' },
  { emoji: '🏠', cat: 'bien', titulo: 'Enriquecimiento ambiental', pregunta: '¿Qué necesita un gato para estar feliz en casa?', texto: 'Me encanta tener rascadores, lugares altos, juguetes y una ventana para observar el mundo. Todo eso mantiene mi mente activa y feliz.' },
  { emoji: '🎣', cat: 'bien', titulo: 'Jugar antes de que salgas', pregunta: '¿Por qué jugar antes de salir ayuda a los gatos?', texto: 'Si juegas conmigo 10 minutos antes de irte, descargaré energía y será mucho más fácil que después me quede descansando tranquilo.' },
  { emoji: '🌿', cat: 'bien', titulo: 'Catnip y valeriana', pregunta: '¿El catnip y la valeriana son seguros para todos los gatos?', texto: 'El catnip y la valeriana pueden hacerme jugar un rato y luego ayudarme a relajarme. Son opciones seguras para la mayoría de nosotros.' },
  { emoji: '📦', cat: 'bien', titulo: 'Cajas y bolsas de papel', pregunta: '¿Por qué a los gatos les encantan las cajas?', texto: 'Una caja o una bolsa de papel pueden ser el mejor juguete del mundo. Si además cambias mis escondites de vez en cuando, evitarás que me aburra.' },
  { emoji: '🍽️', cat: 'bien', titulo: 'Comer también puede ser un juego', pregunta: '¿Puede la comida ser más entretenida para un gato?', texto: 'Si escondes mi comida o usas una pelota dispensadora, activarás mi instinto de caza mientras me alimento. ¡Es mucho más entretenido para mí!' },
  { emoji: '🪟', cat: 'bien', titulo: 'Mi televisión favorita', pregunta: '¿Por qué los gatos pasan horas mirando por la ventana?', texto: 'Para mí, una ventana es como tener televisión todo el día. Si además hay pajaritos afuera, créeme... podría pasar horas mirando.' },
  { emoji: '💩', cat: 'salud', titulo: 'Mis heces normales y lo que me dicen', pregunta: '¿Cómo deberían verse las heces de un gato sano?', texto: 'Lo normal es que sean marrones, firmes y con forma cilíndrica. Si son muy duras, probablemente necesito más agua. Si son blandas o sin forma, puede ser estrés o un problema digestivo. Si cambian de tamaño durante varios días, también vale registrarlo en CHIQUI.' },
  { emoji: '💩', cat: 'salud', titulo: 'La forma también importa', pregunta: '¿Qué forma deberían tener las heces de un gato?', texto: 'Mis heces deberían mantener su forma. Muy duras → podría necesitar más agua. Blandas → algo puede estar irritando mi intestino. Líquidas → si continúa durante el día o me siento mal, necesita que consultes con mi veterinario.' },
  { emoji: '⚫', cat: 'salud', titulo: 'Heces negras', pregunta: '¿Las heces negras son una urgencia?', texto: 'Si mis deposiciones son negras y pegajosas, podrían contener sangre digerida. Es una señal importante y conviene que un veterinario me evalúe pronto.' },
  { emoji: '🔴', cat: 'salud', titulo: 'Sangre en las heces', pregunta: '¿Qué hago si veo sangre en las heces de mi gato?', texto: 'Si ves sangre roja brillante, generalmente proviene de la parte final del intestino. Si la sangre es oscura o viene mezclada con las heces, el origen puede estar más arriba en el aparato digestivo. En ambos casos, avísale a mi veterinario.' },
  { emoji: '🤮', cat: 'salud', titulo: 'Vomité... ¿debo preocuparme?', pregunta: '¿Cuándo el vómito de un gato requiere atención veterinaria?', texto: 'A veces vomitamos por bolas de pelo. Pero si vomito varias veces en un día, hay sangre o dejo de comer por más de 24 horas, necesito que me vea un veterinario. No siempre es una bola de pelo.' },

]

// Tarjetas generales (para otras especies)
const TARJETAS_GENERAL = [
  { emoji: '💧', titulo: 'Agua siempre fresca', pregunta: '¿Sabías esto sobre agua siempre fresca?', texto: 'El agua limpia y fresca es lo más importante para cualquier mascota. Cámbiala al menos una vez al día y limpia el recipiente regularmente.' },
  { emoji: '🌡️', titulo: 'Conoce la temperatura normal', pregunta: '¿Sabías esto sobre conoce la temperatura normal?', texto: 'Saber la temperatura normal de tu mascota te ayuda a detectar fiebre a tiempo. Pregúntale a tu vet cuál es el rango normal para su especie.' },
  { emoji: '🐾', titulo: 'Observar es cuidar', pregunta: '¿Sabías esto sobre observar es cuidar?', texto: 'Conocer el comportamiento habitual de tu mascota es la mejor herramienta para detectar cambios. Lo que notas tú en casa es información valiosa para el vet.' },
]


const COLORES_CAT: Record<string, { color: string; bg: string; border: string; label: string }> = {
  alim:  { color: '#CD7421', bg: '#FEF3E7', border: '#F5C09A', label: 'Alimentación' },
  salud: { color: '#2E7D52', bg: '#EAF6EF', border: '#A8D5B5', label: 'Salud' },
  comp:  { color: '#6B3FA0', bg: '#F3EEFF', border: '#C9A8F0', label: 'Comportamiento' },
  bien:  { color: '#1A6B9A', bg: '#EBF6FC', border: '#8DCCED', label: 'Bienestar' },
  seg:   { color: '#B83232', bg: '#FDEAEA', border: '#F0AAAA', label: 'Seguridad' },
}

interface Props {
  especie: string
}

export default function ChiquiTeCuenta({ especie }: Props) {
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

  const [expandido, setExpandido] = useState<number | null>(null)

  // Sexta tarjeta dinámica según el tema del set de hoy
  const sextaTarjeta = useMemo(() => {
    const titulos = tarjetasHoy.map((t: any) => t.titulo)
    const todos = titulos.join(' ').toLowerCase()

    if (todos.includes('heces') || todos.includes('vomit') || todos.includes('caca')) {
      return { img: '/chiqui/chiqui_caca.png', titulo: '¿Sabes leer las heces de tu mascota?', texto: 'Lee los tips de Chiqui y descubre qué te dice cada color y forma.' }
    }
    if (todos.includes('kong') || todos.includes('snuffle') || todos.includes('lick') || todos.includes('olfato') || todos.includes('juego')) {
      return { img: '/chiqui/chiqui_juguetes.png', titulo: '¿Quieres ayudarlo con la ansiedad?', texto: 'Lee los tips de Chiqui y descubre cómo el juego olfativo puede calmarlo.' }
    }
    if (todos.includes('fruta') || todos.includes('verdura') || todos.includes('alimento') || todos.includes('hueso') || todos.includes('agua') || todos.includes('peligros')) {
      return { img: '/chiqui/chiqui_chef.png', titulo: '¿Sabes qué puede comer tu mascota?', texto: 'Lee los tips de Chiqui y descubre qué sí y qué no puede comer.' }
    }
    if (todos.includes('planta') || todos.includes('tóxic')) {
      return { img: '/chiqui/chiqui_alerta.png', titulo: '¿Conoces las plantas peligrosas para tu mascota?', texto: 'Lee los tips de Chiqui y descubre cuáles evitar en casa.' }
    }
    if (todos.includes('temperatura') || todos.includes('corazón') || todos.includes('respirat') || todos.includes('diente') || todos.includes('antiparasit')) {
      return { img: '/chiqui/chiqui_doctor.png', titulo: '¿Sabes cuáles son sus signos vitales normales?', texto: 'Lee los tips de Chiqui y aprende a reconocerlos en casa.' }
    }
    if (todos.includes('estrés') || todos.includes('duerm') || todos.includes('sueñ') || todos.includes('ejercicio') || todos.includes('calor') || todos.includes('paseo')) {
      return { img: '/chiqui/chiqui_paseo.png', titulo: '¿Sabes cuánto ejercicio necesita tu mascota?', texto: 'Lee los tips de Chiqui y descubre qué necesita según su edad.' }
    }
    // Default
    return { img: '/chiqui/chiqui_idea.png', titulo: '¿Quieres aprender más sobre tu mascota?', texto: 'Lee los tips de Chiqui y descubre algo nuevo cada vez que entras.' }
  }, [tarjetasHoy])

  return (
    <div className="mb-4 px-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <img src="/chiqui/chiqui_leyendo.png" alt="Chiqui" className="w-8 h-8 object-contain" />
        <span className="font-bold text-sm text-[#3D2B1F]">Chiqui Tips</span>
      </div>
      <p className="text-xs text-[#8A7560] mb-3 ml-9">Tips y curiosidades para cuidarte mejor 🐾</p>

      {/* Grid 2 columnas — 6 tarjetas en 3 filas */}
      <div className="grid grid-cols-2 gap-2.5 items-start">
        {/* Sexta tarjeta dinámica — primera del grid, mismo tamaño que las otras */}
        <div className="rounded-2xl p-3 flex flex-col"
          style={{ background: '#FFFCF8', border: '1.5px solid #EEE2D4' }}>
          <img src={sextaTarjeta.img} alt="Chiqui" className="w-10 h-10 object-contain mb-2" />
          <p className="font-bold text-xs text-[#3D2B1F] leading-snug mb-1">{sextaTarjeta.titulo}</p>
          <p className="text-[10px] text-[#8A7560] leading-relaxed">{sextaTarjeta.texto}</p>
        </div>
        {tarjetasHoy.map((t, i) => {
          const cat = COLORES_CAT[(t as any).cat] || COLORES_CAT.bien
          const abierto = expandido === i
          return (
            <div
              key={i}
              className="rounded-2xl p-3 flex flex-col"
              style={{ background: '#FFFCF8', border: `1.5px solid ${cat.border}` }}
            >
              {/* Badge categoría */}
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#F5EDE3]" style={{ color: cat.color }}>
                  {cat.label}
                </span>
              </div>

              {/* Emoji */}
              <div className="mb-1.5">
                <span className="text-xl">{t.emoji}</span>
              </div>

              {/* Título */}
              <p className="font-bold text-xs leading-snug mb-1" style={{ color: cat.color }}>{t.titulo}</p>

              {/* Pregunta corta o texto expandido */}
              {!abierto ? (
                <>
                  <p className="text-[10px] text-[#8A7560] leading-relaxed mb-1 font-medium">
                    {(t as any).pregunta}
                  </p>
                  <button
                    onClick={() => setExpandido(i)}
                    className="text-[10px] font-bold mt-auto text-left"
                    style={{ color: cat.color }}
                  >
                    Ver más ↓
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-[#5C4A3A] leading-relaxed mb-1">{t.texto}</p>
                  <button
                    onClick={() => setExpandido(null)}
                    className="text-[10px] font-bold mt-auto text-left"
                    style={{ color: cat.color }}
                  >
                    Ver menos ↑
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
