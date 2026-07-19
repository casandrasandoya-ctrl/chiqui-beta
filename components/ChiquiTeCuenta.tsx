'use client'
import { useMemo, useState } from 'react'

// Bateria de tarjetas educativas filtradas por especie.
// Rotan diariamente — cada dia se muestra un set distinto de 4 tarjetas
// tomadas desde la lista segun el dia del año.

const TARJETAS_PERRO = [
  // GRUPO 0: Alimentación
  { emoji: '🍎', cat: 'alim', titulo: 'Frutas que sí puedo comer', pregunta: '¿Qué frutas son seguras para perros?', texto: 'Me encanta cuando compartimos un premio rico. Manzana, pera, sandía, melón y arándanos son seguros para mí. Solo acuérdate de quitar las semillas y la cáscara.' },
  { emoji: '🚫', cat: 'seg', titulo: 'Frutas que no debo comer', pregunta: '¿Qué frutas nunca debería comer un perro?', texto: 'Aunque te ponga ojitos, las uvas, las pasas y la palta pueden hacerme mucho daño e incluso afectar mis riñones. Mejor guárdalas solo para ti.' },
  { emoji: '🥦', cat: 'alim', titulo: 'Verduras seguras', pregunta: '¿Qué verduras puedo ofrecer como premio?', texto: 'La zanahoria, el pepino, el brócoli y el zapallo son una buena opción para mí. ¡La zanahoria cruda incluso ayuda a mantener mis dientes más limpios!' },
  { emoji: '🦴', cat: 'alim', titulo: 'Huesos', pregunta: '¿Todos los huesos son seguros para los perros?', texto: 'Los huesos cocidos pueden astillarse y hacerme daño. Si voy a comer uno, los huesos crudos de res o pollo son una opción más segura, siempre con supervisión.' },
  { emoji: '🧅', cat: 'seg', titulo: 'Alimentos muy peligrosos', pregunta: '¿Qué alimentos nunca debería darle?', texto: 'La cebolla, el ajo, el puerro y el ciboulette pueden intoxicarme, incluso cocidos. Mejor mantenlos siempre fuera de mi plato.' },

  // GRUPO 1: Ansiedad y enriquecimiento
  { emoji: '🧠', cat: 'comp', titulo: 'Juegos de olfato', pregunta: '¿Por qué los juegos de olfato cansan tanto?', texto: '¿Sabías que usar mi nariz también me cansa? Buscar premios durante 15 minutos puede cansarme más que una caminata de una hora.' },
  { emoji: '🧊', cat: 'bien', titulo: 'Kong congelado', pregunta: '¿Para qué sirve un Kong congelado?', texto: 'Un Kong con croquetas, puré de zapallo o yogur natural sin azúcar, bien congelado, puede mantenerme entretenido cerca de 30 minutos mientras espero que vuelvas.' },
  { emoji: '🫙', cat: 'alim', titulo: '¿Qué puedo poner en mi Kong?', pregunta: '¿Con qué puedo rellenar un Kong?', texto: 'Mantequilla de maní sin xilitol, plátano, zanahoria rallada, queso crema o zapallo son buenas opciones. ¡Si lo congelas, durará mucho más!' },
  { emoji: '🎯', cat: 'bien', titulo: 'Snuffle Mat', pregunta: '¿Qué es un Snuffle Mat y para qué sirve?', texto: 'Buscar mi comida con el olfato despierta mi instinto y me ayuda a relajarme. ¡También puedes hacer uno en casa con una alfombra y tiras de polar!' },
  { emoji: '👅', cat: 'bien', titulo: 'Lick Mat', pregunta: '¿Por qué un Lick Mat ayuda a reducir la ansiedad?', texto: 'Lamer me ayuda a relajarme porque libera serotonina. Un lick mat puede ser un gran compañero antes de quedarme solo un rato.' },

  // GRUPO 2: Salud y signos vitales
  { emoji: '🦷', cat: 'salud', titulo: 'Dientes sanos', pregunta: '¿Cada cuánto debería cepillarle los dientes?', texto: 'Si me ayudas a cepillar mis dientes 2 o 3 veces por semana, evitarás que el sarro me cause problemas que incluso pueden afectar mi corazón.' },
  { emoji: '🫀', cat: 'salud', titulo: 'Mi corazón', pregunta: '¿Cuál es la frecuencia cardíaca normal de un perro?', texto: 'Cuando estoy tranquilo, mi corazón suele latir entre 60 y 140 veces por minuto. Si soy de raza pequeña, es normal que lata un poquito más rápido.' },
  { emoji: '🌡️', cat: 'salud', titulo: 'Mi temperatura', pregunta: '¿Cuál es la temperatura normal de un perro?', texto: 'Mi temperatura normal está entre 38 °C y 39,2 °C. Si supera los 40 °C, necesito atención veterinaria.' },
  { emoji: '🐜', cat: 'salud', titulo: 'Antiparasitarios', pregunta: '¿Los antiparasitarios se usan solo en verano?', texto: 'Aunque no veas pulgas o garrapatas, necesito protección durante todo el año. En Chile lo recomendable es usar antiparasitarios cada mes o cada 3 meses, según indique mi veterinario.' },
  { emoji: '💧', cat: 'bien', titulo: '¿Cuánta agua necesito?', pregunta: '¿Cuánta agua necesita un perro al día?', texto: 'Lo normal es que tome cerca de 50 ml por cada kilo de peso al día. Si hace calor o jugué mucho, probablemente necesitaré un poco más.' },

  // GRUPO 3: Heces y digestión
  { emoji: '💩', cat: 'salud', titulo: 'El color de mis heces importa', pregunta: '¿Qué puede decir el color de las heces sobre su salud?', texto: 'Lo normal es que sean marrón chocolate. Si son verdes, amarillas, naranjas, blancas, grises, negras o con sangre roja, algo podría no andar bien. Anótalo en CHIQUI y consulta con mi veterinario si el cambio persiste o me notas decaído.' },
  { emoji: '💩', cat: 'salud', titulo: 'La forma y el tamaño también dicen mucho', pregunta: '¿Cómo deberían verse las heces normales de un perro?', texto: 'Lo ideal es que mis heces sean firmes, con forma definida y fáciles de recoger. Muy duras → podría necesitar más agua. Blandas → mi intestino podría estar irritado. Líquidas → es diarrea. Si además cambian mucho de tamaño durante varios días, también vale registrarlo.' },
  { emoji: '🟤', cat: 'salud', titulo: 'Heces blandas: ¿cuándo preocuparse?', pregunta: '¿Cuándo las heces blandas dejan de ser normales?', texto: 'Una vez puede pasar por algo que comí o por estrés. Pero si duran más de 48 horas, aparecen junto a vómitos, sangre o decaimiento, necesito que me revise un veterinario.' },
  { emoji: '⚫', cat: 'salud', titulo: 'Heces negras', pregunta: '¿Las heces negras son una urgencia?', texto: 'Si mis heces son negras y brillantes, como alquitrán, podrían contener sangre digerida proveniente del estómago o intestino. Es una señal importante y conviene consultar con mi veterinario ese mismo día.' },
  { emoji: '🤮', cat: 'salud', titulo: 'Vomité... ¿es normal?', pregunta: '¿Cuándo un vómito requiere atención veterinaria?', texto: 'Vomitar una vez puede ocurrir. Pero si vomito varias veces, hay sangre, dejo de comer o estoy muy decaído, necesito atención veterinaria. Tú me conoces mejor que nadie.' },

  // GRUPO 4: Comportamiento y bienestar
  { emoji: '🐾', cat: 'comp', titulo: 'Señales de estrés', pregunta: '¿Cómo saber si un perro está estresado?', texto: 'Si bostezo, me lamo los labios, desvío la mirada o muestro la barriga de repente, quizás estoy intentando decirte que algo me incomoda.' },
  { emoji: '☀️', cat: 'bien', titulo: 'Cuidado con el calor', pregunta: '¿Cómo reconocer un golpe de calor?', texto: 'Yo no sudo como tú. Solo jadeo y transpiro por mis patitas. Nunca me dejes dentro de un auto y evita caminar sobre asfalto muy caliente.' },
  { emoji: '😴', cat: 'comp', titulo: '¿Cuánto duermo?', pregunta: '¿Es normal que mi perro duerma tantas horas?', texto: 'Si soy adulto, dormir 12 a 14 horas es completamente normal. Si soy cachorro o senior, puedo descansar hasta 18 o 20 horas al día.' },
  { emoji: '🏃', cat: 'bien', titulo: 'Ejercicio según mi edad', pregunta: '¿Cuánto ejercicio necesita un perro según su edad?', texto: 'Si soy cachorro, necesito 5 minutos de ejercicio por cada mes de vida, dos veces al día. Si soy adulto, entre 30 y 60 minutos. Si ya soy senior, prefiero paseos más suaves.' },
  { emoji: '🌿', cat: 'seg', titulo: 'Plantas tóxicas', pregunta: '¿Qué plantas pueden ser tóxicas para perros?', texto: 'Si tienes azaleas, hortensias, lirios o áloe vera, mejor mantenlas lejos de mí. Aunque sean lindas, pueden ser peligrosas para mi salud.' },

  // GRUPO 5: Movimiento y articulaciones
  { emoji: '🦴', cat: 'mov', titulo: '¿Le cuesta levantarse?', pregunta: '¿Notas que tardo más en ponerme de pie?', texto: 'Después de dormir o descansar, si necesito unos segundos para levantarme o caminar, podría estar sintiendo rigidez o molestias articulares.' },
  { emoji: '🐾', cat: 'mov', titulo: '¿Cojea aunque sea un rato?', pregunta: '¿A veces apoyo menos una patita?', texto: 'Aunque solo ocurra por momentos, una cojera nunca es normal. Obsérvala y regístrala en CHIQUI para comentarla con mi veterinario.' },
  { emoji: '🛋️', cat: 'mov', titulo: '¿Ya no quiere saltar?', pregunta: '¿Evito subir al sillón, al auto o a la cama?', texto: 'Si antes lo hacía con facilidad y ahora dudo o necesito ayuda, podría estar sintiendo dolor o incomodidad al moverme.' },
  { emoji: '🚶', cat: 'mov', titulo: '¿Se cansa más rápido?', pregunta: '¿Mis paseos duran menos que antes?', texto: 'Si camino más lento, me detengo con frecuencia o pierdo energía antes de lo habitual, podría haber molestias en mis articulaciones.' },
  { emoji: '😔', cat: 'mov', titulo: '¿Está más irritable?', pregunta: '¿Ya no quiero jugar como antes?', texto: 'El dolor también puede cambiar mi ánimo. Si evito juegos, me aíslo o me molesto cuando me tocan, vale la pena que lo observes.' },

  // GRUPO 6: Peso saludable
  { emoji: '⚖️', cat: 'salud', titulo: '¿Todos los perros pesamos lo mismo?', pregunta: '¿Todos los perros deben pesar lo mismo?', texto: 'No todos pesamos lo mismo: mi peso saludable depende de mi tamaño, raza, edad y condición corporal. Como referencia general: muy pequeño menos de 5 kg, pequeño 5 a 10 kg, mediano 10 a 25 kg, grande 25 a 45 kg y gigante más de 45 kg. Son rangos orientativos y no reemplazan la evaluación de mi veterinario.' },
  { emoji: '🦴', cat: 'salud', titulo: 'Señales de bajo peso', pregunta: '¿Cómo saber si mi perro tiene bajo peso?', texto: 'Si mis costillas, columna o pelvis se ven demasiado, tengo muy poca grasa corporal, perdí masa muscular o mi abdomen se ve muy retraído, podría estar bajo mi peso. Si observas estos signos, agenda una evaluación con mi veterinario.' },
  { emoji: '💪', cat: 'bien', titulo: 'Mi peso saludable', pregunta: '¿Cómo reconocer un peso saludable?', texto: 'Generalmente estoy en un peso saludable cuando mi cintura se aprecia al mirarme desde arriba, mis costillas se palpan fácilmente sin verse demasiado marcadas, tengo buena masa muscular y me mantengo activo. Cada perro es diferente: mi peso ideal siempre se interpreta según mi tamaño y raza.' },
  { emoji: '🍔', cat: 'salud', titulo: 'Señales de sobrepeso', pregunta: '¿Cómo saber si mi perro tiene sobrepeso?', texto: 'Si mis costillas comienzan a ser difíciles de palpar, mi cintura ya no se aprecia, se acumula grasa en mi abdomen o tórax, o me canso más fácil en paseos y juegos, podría tener sobrepeso. Mantener un peso saludable previene enfermedades y mejora mi calidad de vida.' },
  { emoji: '❤️', cat: 'salud', titulo: 'Un cambio de peso es una señal', pregunta: '¿Cuándo el peso puede afectar la salud de mi perro?', texto: 'El exceso de peso puede aumentar mi riesgo de problemas articulares, diabetes, enfermedades cardíacas y dificultad para respirar. Un cambio importante de peso no siempre significa una enfermedad, pero sí es una señal de que algo podría estar ocurriendo. Llevar un registro periódico y consultar con mi veterinario permitirá actuar a tiempo y cuidar mejor mi salud.' },
  // GRUPO 7: Signos de alerta — orientación para reconocer y actuar
  { emoji: '🌀', cat: 'salud', titulo: 'Convulsión', pregunta: '¿Cómo reconozco una convulsión?', texto: 'Me sacudo sin control, no respondo y luego puedo quedar desorientado. HAZ ESTO: aleja los objetos cercanos y cronometra el episodio para contárselo al veterinario. EVITA: sujetarme o poner algo en mi boca. Después llévame de inmediato al veterinario.' },
  { emoji: '🌡️', cat: 'salud', titulo: 'Golpe de calor', pregunta: '¿Cómo reconozco un golpe de calor?', texto: 'Jadeo en exceso, estoy muy caliente o me cuesta moverme. HAZ ESTO: llévame a un lugar fresco y refréscame con agua fresca (no fría). EVITA: usar hielo directamente sobre mi cuerpo. Busca atención veterinaria de inmediato.' },
  { emoji: '☠️', cat: 'salud', titulo: 'Intoxicación', pregunta: '¿Qué hago si sospecho intoxicación?', texto: 'Si sospechas que comí o lamí algo peligroso, lleva el envase o una foto de la sustancia al veterinario. EVITA: hacerme vomitar sin indicación profesional; algunos tóxicos causan más daño al salir. Cada minuto cuenta.' },
  { emoji: '🚑', cat: 'salud', titulo: 'Accidente o golpe', pregunta: '¿Qué hago si sufrí un accidente?', texto: 'Si sufrí un accidente, muéveme lo menos posible y llévame al veterinario cuanto antes. EVITA: manipularme bruscamente si me ves muy adolorido. Puede haber lesiones internas que no se ven a simple vista.' },
  { emoji: '🫁', cat: 'salud', titulo: 'Dificultad respiratoria', pregunta: '¿Cómo reconozco dificultad para respirar?', texto: 'Respiro con mucho esfuerzo o muy rápido, mis encías se ven pálidas o azuladas. HAZ ESTO: manténme tranquilo y busca atención veterinaria de inmediato. EVITA: darme comida o agua, y no me hagas caminar.' },
]

const TARJETAS_GATO = [
  // GRUPO 0: Alimentación
  { emoji: '🐟', cat: 'alim', titulo: 'El pescado con moderación', pregunta: '¿Puede un gato comer pescado todos los días?', texto: 'Me encanta el pescado, pero el atún en lata es solo un gusto de vez en cuando porque tiene mucho sodio. Si quieres consentirme, mejor pescado fresco bien cocido.' },
  { emoji: '🥛', cat: 'alim', titulo: '¿Y la leche?', pregunta: '¿Los gatos pueden tomar leche?', texto: 'Aunque salga en las películas, la mayoría de nosotros somos intolerantes a la lactosa. Lo que más agradezco siempre será agua fresca.' },
  { emoji: '💧', cat: 'bien', titulo: 'Agua', pregunta: '¿Por qué los gatos toman tan poca agua?', texto: 'A veces no tomo toda el agua que necesito. Una fuente con agua en movimiento puede ayudarme a beber mucho más.' },
  { emoji: '🧅', cat: 'seg', titulo: 'Alimentos muy peligrosos', pregunta: '¿Qué alimentos son tóxicos para los gatos?', texto: 'La cebolla, el ajo, las uvas, el chocolate y el xilitol pueden hacerme mucho daño. Mejor mantén esos alimentos lejos de mi alcance.' },
  { emoji: '🌿', cat: 'seg', titulo: 'Plantas tóxicas', pregunta: '¿Qué plantas son peligrosas para gatos?', texto: 'Si tienes lirios, tulipanes, narcisos, pothos o áloe vera, mejor mantenlos lejos de mí. El lirio puede dañar gravemente mis riñones, incluso con muy poca exposición.' },

  // GRUPO 1: Comportamiento
  { emoji: '😴', cat: 'comp', titulo: '¿Cuánto duermo?', pregunta: '¿Es normal que mi gato duerma tantas horas?', texto: 'Dormir entre 12 y 16 horas es completamente normal para mí. Al amanecer y al atardecer es cuando normalmente tengo más energía.' },
  { emoji: '🐾', cat: 'comp', titulo: '¿Por qué amaso?', pregunta: '¿Por qué los gatos amasan con las patas?', texto: 'Cuando amaso con mis patitas, muchas veces te estoy diciendo que me siento seguro y feliz contigo. Es un comportamiento que conservé desde que era cachorro.' },
  { emoji: '🎯', cat: 'comp', titulo: 'Mi instinto de caza', pregunta: '¿Por qué un gato de interior necesita jugar tanto?', texto: 'Aunque viva dentro de casa, sigo siendo un cazador. Jugar conmigo 10 a 15 minutos al día me ayuda a mantenerme sano y reduce el estrés.' },
  { emoji: '🫀', cat: 'comp', titulo: 'Mi ronroneo', pregunta: '¿Ronronear siempre significa que está feliz?', texto: 'Me encanta ronronear cuando estoy feliz, pero también puedo hacerlo si siento dolor o estoy estresado. Siempre fíjate en el contexto.' },
  { emoji: '☀️', cat: 'salud', titulo: 'Cuidado con el sol', pregunta: '¿Los gatos pueden quemarse con el sol?', texto: 'Si tengo el pelaje claro, mis orejas y mi nariz pueden quemarse con el sol. Un poquito de sombra también es una forma de cuidarme.' },

  // GRUPO 2: Salud
  { emoji: '🦷', cat: 'salud', titulo: 'Salud dental', pregunta: '¿Cada cuánto necesita atención dental un gato?', texto: 'Cerca del 70% de nosotros desarrolla enfermedad periodontal antes de los 3 años. Un cepillado o snacks dentales pueden marcar una gran diferencia.' },
  { emoji: '🌡️', cat: 'salud', titulo: 'Mi temperatura', pregunta: '¿Cuál es la temperatura normal de un gato?', texto: 'Mi temperatura normal está entre 38 °C y 39,2 °C. Si baja de 37,5 °C o supera los 40 °C, necesito atención veterinaria.' },
  { emoji: '🧶', cat: 'salud', titulo: 'Bolas de pelo', pregunta: '¿Cómo reducir las bolas de pelo en casa?', texto: 'Si me cepillas 2 o 3 veces por semana, reducirás las bolas de pelo. Si tengo el pelaje largo, lo ideal es hacerlo todos los días.' },
  { emoji: '🐜', cat: 'salud', titulo: 'Antiparasitarios', pregunta: '¿Cada cuánto necesita antiparasitario un gato de interior?', texto: 'Si salgo al exterior o soy cazador, normalmente necesitaré antiparasitarios cada 3 meses. Si vivo solo dentro de casa, muchas veces bastará cada 6 meses, según indique mi veterinario.' },
  { emoji: '🏠', cat: 'bien', titulo: 'Enriquecimiento ambiental', pregunta: '¿Qué necesita un gato para estar feliz en casa?', texto: 'Me encanta tener rascadores, lugares altos, juguetes y una ventana para observar el mundo. Todo eso mantiene mi mente activa y feliz.' },

  // GRUPO 3: Enriquecimiento y juego
  { emoji: '🎣', cat: 'bien', titulo: 'Jugar antes de que salgas', pregunta: '¿Por qué jugar antes de salir ayuda a los gatos?', texto: 'Si juegas conmigo 10 minutos antes de irte, descargaré energía y será mucho más fácil que después me quede descansando tranquilo.' },
  { emoji: '🌿', cat: 'bien', titulo: 'Catnip y valeriana', pregunta: '¿El catnip y la valeriana son seguros para todos los gatos?', texto: 'El catnip y la valeriana pueden hacerme jugar un rato y luego ayudarme a relajarme. Son opciones seguras para la mayoría de nosotros.' },
  { emoji: '📦', cat: 'bien', titulo: 'Cajas y bolsas de papel', pregunta: '¿Por qué a los gatos les encantan las cajas?', texto: 'Una caja o una bolsa de papel pueden ser el mejor juguete del mundo. Si además cambias mis escondites de vez en cuando, evitarás que me aburra.' },
  { emoji: '🍽️', cat: 'bien', titulo: 'Comer también puede ser un juego', pregunta: '¿Puede la comida ser más entretenida para un gato?', texto: 'Si escondes mi comida o usas una pelota dispensadora, activarás mi instinto de caza mientras me alimento. ¡Es mucho más entretenido para mí!' },
  { emoji: '🪟', cat: 'bien', titulo: 'Mi televisión favorita', pregunta: '¿Por qué los gatos pasan horas mirando por la ventana?', texto: 'Para mí, una ventana es como tener televisión todo el día. Si además hay pajaritos afuera, créeme... podría pasar horas mirando.' },

  // GRUPO 4: Heces y digestión
  { emoji: '💩', cat: 'salud', titulo: 'Mis heces normales y lo que me dicen', pregunta: '¿Cómo deberían verse las heces de un gato sano?', texto: 'Lo normal es que sean marrones, firmes y con forma cilíndrica. Si son muy duras, probablemente necesito más agua. Si son blandas o sin forma, puede ser estrés o un problema digestivo. Si cambian de tamaño durante varios días, también vale registrarlo en CHIQUI.' },
  { emoji: '💩', cat: 'salud', titulo: 'La forma también importa', pregunta: '¿Qué forma deberían tener las heces de un gato?', texto: 'Mis heces deberían mantener su forma. Muy duras → podría necesitar más agua. Blandas → algo puede estar irritando mi intestino. Líquidas → si continúa durante el día o me siento mal, necesita que consultes con mi veterinario.' },
  { emoji: '⚫', cat: 'salud', titulo: 'Heces negras', pregunta: '¿Las heces negras en gatos son una urgencia?', texto: 'Si mis deposiciones son negras y pegajosas, podrían contener sangre digerida. Es una señal importante y conviene que un veterinario me evalúe pronto.' },
  { emoji: '🔴', cat: 'salud', titulo: 'Sangre en las heces', pregunta: '¿Qué hago si veo sangre en las heces de mi gato?', texto: 'Si ves sangre roja brillante, generalmente proviene de la parte final del intestino. Si la sangre es oscura o viene mezclada con las heces, el origen puede estar más arriba en el aparato digestivo. En ambos casos, avísale a mi veterinario.' },
  { emoji: '🤮', cat: 'salud', titulo: 'Vomité... ¿debo preocuparme?', pregunta: '¿Cuándo el vómito de un gato requiere atención veterinaria?', texto: 'A veces vomitamos por bolas de pelo. Pero si vomito varias veces en un día, hay sangre o dejo de comer por más de 24 horas, necesito que me vea un veterinario. No siempre es una bola de pelo.' },

  // GRUPO 5: Movimiento y articulaciones
  { emoji: '🛋️', cat: 'mov', titulo: '¿Ya no salta como antes?', pregunta: '¿Prefiero usar superficies más bajas?', texto: 'Si antes subía a muebles o ventanas con facilidad y ahora lo evito, podría estar sintiendo molestias articulares.' },
  { emoji: '⬇️', cat: 'mov', titulo: '¿Le cuesta bajar de los muebles?', pregunta: '¿Desciendo con más cuidado o dudo antes de hacerlo?', texto: 'Los gatos solemos ocultar el dolor. Cambios como este pueden ser una de las primeras señales.' },
  { emoji: '🐾', cat: 'mov', titulo: '¿Camina diferente?', pregunta: '¿Cojeo o apoyo menos una pata?', texto: 'Aunque sea muy sutil o aparezca solo a veces, una alteración en mi marcha merece ser observada.' },
  { emoji: '🧶', cat: 'mov', titulo: '¿Juega menos?', pregunta: '¿Ya no persigo juguetes como antes?', texto: 'Si duermo más de lo habitual, evito correr o pierdo interés por el juego, podría haber alguna molestia física.' },
  { emoji: '🙈', cat: 'mov', titulo: '¿Está más serio o evita el contacto?', pregunta: '¿Me escondo más o no quiero que me acaricien?', texto: 'Los gatos muchas veces expresamos el dolor cambiando nuestro comportamiento. Si notas un cambio importante, regístralo y coméntalo con mi veterinario.' },

  // GRUPO 6: Peso saludable
  { emoji: '⚖️', cat: 'salud', titulo: '¿Todos los gatos pesamos lo mismo?', pregunta: '¿Todos los gatos deben pesar lo mismo?', texto: 'Como referencia general: bajo peso es menos de 3,5 kg, el peso orientativo va de 3,5 a 5 kg, sobrepeso de 5 a 6 kg y obesidad sobre los 6 kg. Estos valores pueden variar según mi raza, edad y mis características individuales.' },
  { emoji: '🦴', cat: 'salud', titulo: 'Señales de bajo peso', pregunta: '¿Cómo saber si mi gato tiene bajo peso?', texto: 'Si mis costillas y columna se ven demasiado, tengo escasa masa muscular, muy poca grasa corporal o me veo más delgado de lo habitual, podría estar bajo mi peso. Si observas estos cambios, consulta con mi veterinario.' },
  { emoji: '💪', cat: 'bien', titulo: 'Mi peso saludable', pregunta: '¿Cómo reconocer un peso saludable?', texto: 'Generalmente estoy en un peso saludable cuando mis costillas se palpan sin exceso de grasa, se aprecia una ligera cintura, tengo buena masa muscular y me mantengo activo y con buen estado general.' },
  { emoji: '🍔', cat: 'salud', titulo: 'Señales de sobrepeso', pregunta: '¿Cómo saber si mi gato tiene sobrepeso?', texto: 'Si mis costillas son difíciles de palpar, mi abdomen se ve más redondeado, acumulo grasa o pierdo agilidad para saltar y jugar, podría tener sobrepeso. Mantener un peso saludable previene enfermedades y mejora mi bienestar.' },
  { emoji: '❤️', cat: 'salud', titulo: 'Un cambio de peso es una señal', pregunta: '¿Cuándo el peso puede afectar la salud de mi gato?', texto: 'El sobrepeso puede aumentar mi riesgo de diabetes, problemas articulares, enfermedades hepáticas y menor movilidad. Un cambio importante de peso no siempre significa una enfermedad, pero sí es una señal de que algo podría estar ocurriendo. Llevar un registro periódico y consultar con mi veterinario permitirá actuar a tiempo y cuidar mejor mi salud.' },
  // GRUPO 7: Signos de alerta — orientación para reconocer y actuar
  { emoji: '🫁', cat: 'salud', titulo: 'Dificultad respiratoria', pregunta: '¿Cómo reconozco dificultad para respirar?', texto: 'Respiro con la boca abierta o hago mucho esfuerzo para respirar (los gatos casi nunca respiramos por la boca en reposo). HAZ ESTO: manténme tranquilo y llévame al veterinario de inmediato. EVITA: hacer que me mueva o forzarme a un transportador si me estreso mucho.' },
  { emoji: '☠️', cat: 'salud', titulo: 'Intoxicación', pregunta: '¿Qué hago si sospecho intoxicación?', texto: 'Si sospechas que ingerí algo tóxico (lirios, chocolate, antipulgas de perro, medicamentos humanos), lleva toda la información posible al veterinario: envase, planta o foto. EVITA: darme remedios caseros o provocarme el vómito. Muchos productos comunes son muy peligrosos para nosotros.' },
  { emoji: '🌡️', cat: 'salud', titulo: 'Golpe de calor', pregunta: '¿Cómo reconozco un golpe de calor?', texto: 'Estoy muy decaído, jadeo (algo raro en gatos) o mi cuerpo está muy caliente. HAZ ESTO: refréscame con agua fresca (no fría) y busca atención veterinaria. EVITA: usar hielo directamente sobre mi cuerpo. Los gatos toleramos menos el calor de lo que parece.' },
  { emoji: '🚑', cat: 'salud', titulo: 'Caída o accidente', pregunta: '¿Qué hago si me caí o tuve un accidente?', texto: 'Si me caí desde altura o tuve un accidente, trasládame con mucho cuidado al veterinario, idealmente en una superficie plana o transportador. EVITA: manipularme más de lo necesario; puedo tener lesiones internas incluso si me veo bien.' },
  { emoji: '🌀', cat: 'salud', titulo: 'Convulsión', pregunta: '¿Cómo reconozco una convulsión?', texto: 'Me sacudo sin control y no respondo. HAZ ESTO: aleja los objetos cercanos y cronometra el episodio para contárselo al veterinario. EVITA: sujetarme o poner algo en mi boca. Después del episodio, llévame de inmediato al veterinario.' },
]

// Tarjetas generales (para otras especies)
const TARJETAS_GENERAL = [
  { emoji: '💧', titulo: 'Agua siempre fresca', pregunta: '¿Sabías esto sobre agua siempre fresca?', texto: 'El agua limpia y fresca es lo más importante para cualquier mascota. Cámbiala al menos una vez al día y limpia el recipiente regularmente.' },
  { emoji: '🌡️', titulo: 'Conoce la temperatura normal', pregunta: '¿Sabías esto sobre conoce la temperatura normal?', texto: 'Saber la temperatura normal de tu mascota te ayuda a detectar fiebre a tiempo. Pregúntale a tu vet cuál es el rango normal para su especie.' },
  { emoji: '🐾', titulo: 'Observar es cuidar', pregunta: '¿Sabías esto sobre observar es cuidar?', texto: 'Conocer el comportamiento habitual de tu mascota es la mejor herramienta para detectar cambios. Lo que notas tú en casa es información valiosa para el vet.' },
]


// Nota: las tarjetas ya no muestran chip ni colores de subcategoría
// (generaban desorden visual al mezclar subcategorías dentro de un
// mismo grupo temático). El campo `cat` de cada tarjeta se conserva en
// los datos por si se necesita a futuro, pero no pinta nada en la UI.
// La categoría visible del grupo la comunica el selector "Hoy te tocó".

interface Props {
  especie: string
}

// Labels cortos de los 7 grupos temáticos, en el MISMO orden que los
// grupos de tarjetas (el índice del chip es el índice del grupo).
const CHIPS_PERRO = ['🍖 Alimentación', '🧸 Ansiedad', '🩺 Signos vitales', '💩 Digestión', '🐕 Bienestar', '🦴 Movimiento', '⚖️ Peso', '🚨 Signos de alerta']
const CHIPS_GATO = ['🍖 Alimentación', '🐈 Conducta', '🩺 Salud', '🎾 Juego', '💩 Digestión', '🦴 Movimiento', '⚖️ Peso', '🚨 Signos de alerta']

export default function ChiquiTeCuenta({ especie }: Props) {
  // Seleccionar 5 tarjetas del dia — rotan segun dia del año
  // Cada grupo de 5 tarjetas en el array trata UN solo tema.
  // grupoAleatorio elige cuál de los 7 grupos mostrar — rota al azar
  // cada vez que se monta el componente (al entrar a la app). Ese
  // efecto sorpresa es SIEMPRE el comportamiento por defecto.
  // grupoElegido solo existe mientras el usuario tenga un chip de
  // categoría seleccionado; al refrescar o volver a entrar, el
  // componente se monta de nuevo y vuelve a null — el filtro se
  // elimina solo y regresa el azar, tal como debe ser.
  const [grupoAleatorio] = useState(() => Math.floor(Math.random() * 8))
  const [grupoElegido, setGrupoElegido] = useState<number | null>(null)
  const grupoIndex = grupoElegido !== null ? grupoElegido : grupoAleatorio

  const tarjetasHoy = useMemo(() => {
    const lista = especie === 'Perro' ? TARJETAS_PERRO
      : especie === 'Gato' ? TARJETAS_GATO
      : TARJETAS_GENERAL

    if (lista.length < 30) return lista.slice(0, 5) // fallback TARJETAS_GENERAL

    const inicio = grupoIndex * 5
    const grupo = lista.slice(inicio, inicio + 5)
    // Si la categoría fue elegida desde los chips, sus tarjetas se
    // muestran en orden aleatorio dentro de ella.
    if (grupoElegido !== null) {
      return grupo.slice().sort(() => Math.random() - 0.5)
    }
    return grupo
  }, [especie, grupoIndex, grupoElegido])

  const [expandido, setExpandido] = useState<number | null>(null)
  // Menú flotante del selector de categoría (popover que se superpone
  // al contenido sin desplazarlo).
  const [menuCategorias, setMenuCategorias] = useState(false)

  // Sexta tarjeta — una por cada uno de los 7 grupos temáticos.
  // Definida por especie porque el grupo 1, 2, 4 difieren entre perro y gato.
  const GRUPOS_PERRO = [
    { img: '/chiqui/chiqui_chef.png', titulo: '¿Sabes qué puede comer tu mascota?', texto: 'Lee los tips de Chiqui y descubre qué sí y qué no puede comer.' },
    { img: '/chiqui/chiqui_juguetes.png', titulo: '¿Quieres ayudarlo con la ansiedad?', texto: 'Lee los tips de Chiqui y descubre cómo el juego olfativo y el Kong pueden calmarlo.' },
    { img: '/chiqui/chiqui_doctor.png', titulo: '¿Sabes cuáles son sus signos vitales normales?', texto: 'Lee los tips de Chiqui y aprende a reconocerlos en casa.' },
    { img: '/chiqui/chiqui_caca.png', titulo: '¿Sabes leer las heces de tu mascota?', texto: 'Lee los tips de Chiqui y descubre qué te dice cada color y forma.' },
    { img: '/chiqui/chiqui_paseo.png', titulo: '¿Conoces sus señales de bienestar?', texto: 'Lee los tips de Chiqui sobre comportamiento, ejercicio y cuidado diario.' },
    { img: '/chiqui/chiqui_tranquilo.png', titulo: '¿Conoces las señales de molestias articulares?', texto: 'Lee los tips de Chiqui y aprende a detectar cambios en su movimiento.' },
    { img: '/chiqui/chiqui_ejercicio.png', titulo: '¿Tu compañero tiene un peso saludable?', texto: 'Lee los tips de Chiqui y aprende a reconocer las señales de bajo peso, peso saludable y sobrepeso.' },
    { img: '/chiqui/chiqui_alerta.png', titulo: '¿Sabes reconocer signos de alerta?', texto: 'Lee los tips de Chiqui para saber qué hacer (y qué evitar) ante convulsiones, golpe de calor, intoxicación, accidentes o dificultad para respirar.' },
  ]
  const GRUPOS_GATO = [
    { img: '/chiqui/chiqui_chef.png', titulo: '¿Sabes qué puede comer tu mascota?', texto: 'Lee los tips de Chiqui y descubre qué sí y qué no puede comer.' },
    { img: '/chiqui/chiqui_pregunta.png', titulo: '¿Entiendes el comportamiento de tu gato?', texto: 'Lee los tips de Chiqui y descubre qué te está diciendo.' },
    { img: '/chiqui/chiqui_doctor.png', titulo: '¿Sabes cuáles son sus signos de salud?', texto: 'Lee los tips de Chiqui y aprende a reconocerlos en casa.' },
    { img: '/chiqui/chiqui_juguetes.png', titulo: '¿Sabes cómo enriquecer su día a día?', texto: 'Lee los tips de Chiqui sobre juego y enriquecimiento ambiental.' },
    { img: '/chiqui/chiqui_caca.png', titulo: '¿Sabes leer las heces de tu mascota?', texto: 'Lee los tips de Chiqui y descubre qué te dice cada color y forma.' },
    { img: '/chiqui/chiqui_tranquilo.png', titulo: '¿Sabes reconocer molestias articulares en tu gato?', texto: 'Lee los tips de Chiqui y aprende a detectar cambios sutiles en su movimiento.' },
    { img: '/chiqui/chiqui_ejercicio.png', titulo: '¿Tu compañero tiene un peso saludable?', texto: 'Lee los tips de Chiqui y aprende a reconocer las señales de bajo peso, peso saludable y sobrepeso.' },
    { img: '/chiqui/chiqui_alerta.png', titulo: '¿Sabes reconocer signos de alerta?', texto: 'Lee los tips de Chiqui para saber qué hacer (y qué evitar) ante convulsiones, intoxicación, golpe de calor, caídas o dificultad para respirar.' },
  ]
  const sextaTarjeta = useMemo(() => {
    const grupos = especie === 'Gato' ? GRUPOS_GATO : GRUPOS_PERRO
    return grupos[grupoIndex] || grupos[0]
  }, [especie, grupoIndex])

  return (
    <div className="mb-4 px-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <img src="/chiqui/chiqui_leyendo.png" alt="Chiqui" className="w-8 h-8 object-contain" />
        <span className="font-bold text-sm text-[#3D2B1F]">Chiqui Tips</span>
      </div>
      <p className="text-xs text-[#8A7560] mb-2 ml-9">Tips y curiosidades para cuidarte mejor 🐾</p>

      {/* Selector de categoría en UNA sola línea: muestra qué grupo
          tocó al azar hoy (el azar sigue mandando por defecto). Al
          tocarlo se abre un menú FLOTANTE sobre las tarjetas -- no
          empuja el contenido. Elegir una categoría filtra los tips a
          ella; al refrescar o volver a entrar, la selección manual
          desaparece sola y regresa el azar. */}
      {(especie === 'Perro' || especie === 'Gato') && (() => {
        const categorias = especie === 'Gato' ? CHIPS_GATO : CHIPS_PERRO
        return (
          <div className="relative ml-9 mb-2.5">
            <button
              onClick={() => setMenuCategorias(v => !v)}
              className="inline-flex items-center gap-1.5 bg-[#FFFCF8] border border-[#EEE2D4] rounded-full px-3 py-1.5"
            >
              <span className="text-[11px] text-[#8A7560]">
                {grupoElegido !== null ? '📌 Estás viendo:' : '🎲 Hoy te tocó:'}
              </span>
              <span className="text-[11px] font-bold text-[#8C572F]">{categorias[grupoIndex]}</span>
              <span className={`text-[#8A7560] text-[10px] transition-transform ${menuCategorias ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {menuCategorias && (
              <>
                {/* Capa invisible: cierra el menú al tocar fuera */}
                <div className="fixed inset-0 z-30" onClick={() => setMenuCategorias(false)} />
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-[#FFFCF8] border border-[#EEE2D4] rounded-2xl overflow-hidden z-40 shadow-md">
                  {categorias.map((label, i) => {
                    const activo = grupoIndex === i
                    return (
                      <button
                        key={label}
                        onClick={() => { setGrupoElegido(i); setMenuCategorias(false); setExpandido(null) }}
                        className="w-full px-3 py-2.5 flex items-center justify-between text-left border-b border-[#F5EDE3] last:border-0"
                        style={activo ? { background: '#FBEAD9' } : {}}
                      >
                        <span className={`text-xs ${activo ? 'font-bold text-[#8C572F]' : 'font-medium text-[#3D2B1F]'}`}>{label}</span>
                        {activo && <span className="w-4 h-4 rounded-full bg-[#4CAF7D] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )
      })()}

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
          const abierto = expandido === i
          return (
            <div
              key={i}
              className="rounded-2xl p-3 flex flex-col"
              style={{ background: '#FFFCF8', border: '1.5px solid #EEE2D4' }}
            >
              {/* Sin chip de subcategoría: la categoría ya la comunica
                  el selector de arriba, y las subcategorías mezcladas
                  dentro de un mismo grupo generaban desorden visual.
                  El emoji es el diferenciador visual de cada tarjeta y
                  el TÍTULO es el protagonista. */}
              <div className="mb-1.5">
                <span className="text-xl">{t.emoji}</span>
              </div>

              {/* Título — lo primero que debe llamar la atención */}
              <p className="font-bold text-xs leading-snug mb-1 text-[#3D2B1F]">{t.titulo}</p>

              {/* Pregunta corta o texto expandido */}
              {!abierto ? (
                <>
                  <p className="text-[10px] text-[#8A7560] leading-relaxed mb-1 font-medium">
                    {(t as any).pregunta}
                  </p>
                  <button
                    onClick={() => setExpandido(i)}
                    className="text-[10px] font-bold mt-auto text-left text-[#CD7421]"
                  >
                    Ver más ↓
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-[#5C4A3A] leading-relaxed mb-1">{t.texto}</p>
                  <button
                    onClick={() => setExpandido(null)}
                    className="text-[10px] font-bold mt-auto text-left text-[#CD7421]"
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
