'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'
import SelectorMascota from '@/components/SelectorMascota'
import { determinarMascotaActiva, guardarMascotaActivaId } from '@/utils/mascotaActiva'
import { iconoPorEspecie } from '@/utils/iconoEspecie'
import FechaSelector from '@/components/FechaSelector'

interface DetalleSub { titulo: string; opciones: { value: string; emoji: string; label: string }[] }
interface Opcion { value: string; emoji: string; label: string; detalle?: DetalleSub[] }
interface Categoria {
  id: string; nombre: string; icon: string; color: string
  opciones: Opcion[]
}

// SIGNOS DE ALERTA: eventos graves o de urgencia ocurridos durante el
// día. Es una sección OPCIONAL y de selección múltiple — si no ocurrió
// nada, el tutor simplemente no marca nada (igual que Cuidados).
// Si se marca al menos uno, el día queda automáticamente en ROJO en el
// calendario (ver calcEstado), y la información se reutiliza en
// Análisis y en la vista del veterinario (Posible motivo de consulta y
// Resumen clínico), sin interpretar clínicamente los eventos.
const SIGNOS_ALERTA: { value: string; emoji: string; label: string }[] = [
  { value: 'convulsiones', emoji: '🌀', label: 'Convulsiones' },
  { value: 'dificultad_respiratoria', emoji: '🫁', label: 'Dificultad respiratoria severa' },
  { value: 'perdida_conciencia', emoji: '😵', label: 'Pérdida de conciencia' },
  { value: 'sangrado_abundante', emoji: '🩸', label: 'Sangrado abundante' },
  { value: 'golpe_calor', emoji: '🥵', label: 'Golpe de calor' },
  { value: 'intoxicacion', emoji: '☠️', label: 'Intoxicación' },
  { value: 'trauma', emoji: '🚑', label: 'Trauma / accidente importante' },
  { value: 'paralisis', emoji: '🦽', label: 'Parálisis o no puede caminar' },
  { value: 'otro_signo', emoji: '❓', label: 'Otro' },
]

// Construye las categorías de registro diario según la especie de la mascota.
// 'Perro' es el set base; cuando especie === 'Gato' se ajustan ciertas
// categorías (Pelaje, Conducta, Digestion) para reflejar señales felinas
// reales, y se agrega siempre (para ambas especies) la categoría Arenero.
function getCategorias(especie: string): Categoria[] {
  const esGato = especie === 'Gato'

  const energia: Categoria = { id:'energia', nombre:'Energía', icon:'⚡', color:'#F5C842',
    opciones:[
      {value:'muy_alta',emoji:'⚡⚡',label:'Muy alta'},
      {value:'alta',emoji:'⚡',label:'Alta'},
      {value:'normal',emoji:'😊',label:'Normal'},
      {value:'baja',emoji:'😴',label:'Baja'},
      {value:'muy_baja',emoji:'🛌',label:'Muy baja'},
      {value:'decaido',emoji:'😟',label:'Decaído'},
    ]}

  const animo: Categoria = { id:'animo', nombre:'Ánimo', icon:'😄', color:'#FFBD59',
    opciones:[
      {value:'muy_feliz',emoji:'🥳',label:'Muy feliz'},
      {value:'feliz',emoji:'😄',label:'Feliz'},
      {value:'normal',emoji:'😐',label:'Normal'},
      {value:'ansioso',emoji:'😰',label:'Ansioso'},
      {value:'triste',emoji:'😢',label:'Triste'},
      {value:'irritable',emoji:'😤',label:'Irritable'},
    ]}

  const apetito: Categoria = { id:'apetito', nombre:'Apetito', icon:'🍽', color:'#3DD6B5',
    opciones:[
      {value:'mas',emoji:'😋',label:'Comió más'},
      {value:'normal',emoji:'✅',label:'Normal'},
      {value:'menos',emoji:'🍽',label:'Comió menos'},
      {value:'nada',emoji:'❌',label:'No comió',detalle:[
        {titulo:'¿Cuántas comidas saltó?',opciones:[{value:'una',emoji:'1️⃣',label:'Una'},{value:'dos',emoji:'2️⃣',label:'Dos'},{value:'todo',emoji:'🚫',label:'Todo el día'}]}
      ]},
    ]}

  const agua: Categoria = { id:'agua', nombre:'Agua', icon:'💧', color:'#4AABDB',
    opciones:[
      {value:'mas',emoji:'💧💧',label:'Más de lo normal',detalle:[
        {titulo:'¿Cuándo notaste el cambio?',opciones:[{value:'hoy',emoji:'📅',label:'Hoy solo'},{value:'varios',emoji:'📆',label:'Varios días'},{value:'semanas',emoji:'🗓',label:'Hace semanas'}]}
      ]},
      {value:'normal',emoji:'💧',label:'Normal'},
      {value:'menos',emoji:'🏜',label:'Menos'},
      {value:'nada',emoji:'⚠️',label:'No tomó',detalle:[
        {titulo:'¿Cuándo notaste el cambio?',opciones:[{value:'hoy',emoji:'📅',label:'Hoy solo'},{value:'varios',emoji:'📆',label:'Varios días'},{value:'semanas',emoji:'🗓',label:'Hace semanas'}]}
      ]},
    ]}

  // Digestión: el único cambio por especie es agregar "Bola de pelo" como
  // tipo de vómito en gato, ya que es un tipo de vómito normal/frecuente
  // en felinos que no existe en perro.
  const tiposVomito = [
    {value:'espuma',emoji:'🫧',label:'Espuma'},
    {value:'bilis',emoji:'🟡',label:'Bilis'},
    {value:'comida',emoji:'🍖',label:'Comida'},
    ...(esGato
      ? [{value:'bola_pelo',emoji:'🧶',label:'Bola de pelo'}]
      : [{value:'pasto',emoji:'🌿',label:'Pasto'}]),
    {value:'sangre_vomito',emoji:'🔴',label:'Con sangre'},
    {value:'otro_vomito',emoji:'❓',label:'Otro'},
  ]

  const digestion: Categoria = { id:'digestion', nombre:'Digestión', icon:'🫃', color:'#F07A30',
    opciones:[
      {value:'normal',emoji:'✅',label:'Normal'},
      {value:'gases',emoji:'💨',label:'Gases'},
      {value:'nauseas',emoji:'🤢',label:'Náuseas'},
      {value:'vomito',emoji:'🤮',label:'Vómito',detalle:[
        {titulo:'¿Qué tipo de vómito?',opciones:tiposVomito},
        {titulo:'¿Cuántas veces?',opciones:[
          {value:'1_vez',emoji:'1️⃣',label:'1 vez'},
          {value:'2_veces',emoji:'2️⃣',label:'2 veces'},
          {value:'3_mas_veces',emoji:'⚠️',label:'+3 veces'},
        ]},
      ]},
    ]}

  // Heces / deposiciones: categoria propia, separada de Digestion, para
  // poder registrar vomito Y diarrea el mismo dia sin que se pisen entre
  // si (Digestion es de seleccion unica, asi que antes no se podian
  // marcar ambas a la vez).
  const heces: Categoria = { id:'heces', nombre:'Heces', icon:'💩', color:'#8C572F',
    opciones:[
      {value:'normal', emoji:'✅', label:'Normal'},
      {value:'blandas', emoji:'🟡', label:'Blandas', detalle:[
        {titulo:'¿Desde cuándo?', opciones:[
          {value:'hoy_solo', emoji:'📅', label:'Solo hoy'},
          {value:'varios_dias',emoji:'📆', label:'Varios días'},
        ]},
      ]},
      {value:'diarrea', emoji:'💩', label:'Diarrea', detalle:[
        {titulo:'¿Cómo son?', opciones:[
          {value:'liquidas', emoji:'💧', label:'Líquidas'},
          {value:'muy_seguido',emoji:'⏱️', label:'Muy seguido'},
        ]},
      ]},
      {value:'con_sangre', emoji:'🔴', label:'Con sangre'},
      {value:'estrenimiento',emoji:'😬',label:'Estreñimiento',detalle:[
        {titulo:'¿Cuántos días sin defecar?', opciones:[
          {value:'1_dia', emoji:'1️⃣', label:'1 día'},
          {value:'2_dias', emoji:'2️⃣', label:'2 días'},
          {value:'3_mas', emoji:'⚠️', label:'+3 días'},
        ]},
      ]},
      {value:'mucosidad', emoji:'🫧', label:'Con mucosidad'},
      {value:'color_raro', emoji:'🎨', label:'Color diferente', detalle:[
        {titulo:'¿De qué color?', opciones:[
          {value:'muy_oscura', emoji:'⚫', label:'Muy oscura / negra'},
          {value:'amarilla', emoji:'🟡', label:'Amarilla / naranja'},
          {value:'muy_clara', emoji:'⬜', label:'Muy clara / blanca'},
          {value:'verdosa', emoji:'🟢', label:'Verdosa'},
          {value:'rojiza', emoji:'🔴', label:'Con manchas rojas'},
        ]},
      ]},
    ]}

  // Arenero / Eliminación urinaria: categoría nueva, para AMBAS especies.
  // Es la señal más crítica que faltaba — en gato puede indicar una
  // obstrucción urinaria (emergencia real); en perro puede indicar
  // problemas renales, de próstata o infección urinaria.
  const arenero: Categoria = { id:'arenero', nombre: esGato ? 'Arenero' : 'Orina', icon:'🚽', color:'#8A6FD8',
    opciones:[
      {value:'normal',emoji:'✅',label:'Normal'},
      {value:'mas_orina',emoji:'💦',label:'Orinó más',detalle:[
        {titulo:'¿Desde cuándo?',opciones:[{value:'hoy',emoji:'📅',label:'Hoy solo'},{value:'varios',emoji:'📆',label:'Varios días'},{value:'semanas',emoji:'🗓',label:'Hace semanas'}]}
      ]},
      {value:'menos_costo',emoji:'😣',label: esGato ? 'Le costó / poca cantidad' : 'Le costó orinar',detalle:[
        {titulo:'¿Notaste sangre?',opciones:[{value:'si_sangre',emoji:'🔴',label:'Sí'},{value:'no_sangre',emoji:'⬜',label:'No'}]}
      ]},
      ...(esGato ? [{value:'fuera_arenero',emoji:'⚠️',label:'Fuera del arenero'} as Opcion] : [{value:'fuera_lugar',emoji:'⚠️',label:'Ensució dentro de casa'} as Opcion]),
      {value:'con_sangre',emoji:'🆘',label:'Con sangre'},
      {value:'no_orino',emoji:'🚨',label:'No orinó en todo el día'},
    ]}

  const tiposZonaCuerpo = [{value:'orejas',emoji:'👂',label:'Orejas'},{value:'patas',emoji:'🐾',label:'Patas'},{value:'barriga',emoji:'🫃',label:'Barriga'},{value:'lomo',emoji:'🐕',label:'Lomo'},{value:'cara',emoji:'🐶',label:'Cara'},{value:'general',emoji:'🔄',label:'General'}]

  // Pelaje y piel: en gato separamos "se lame en exceso" (acicalamiento
  // compulsivo, señal de estrés o dolor) de "se rasca" (más asociado a
  // picazón/parásitos), porque son conductas distintas y ambas relevantes.
  const pelajeOpciones: Opcion[] = [
    {value:'brillante',emoji:'✨',label:'Brillante'},
    {value:'normal',emoji:'😊',label:'Normal'},
    {value:'opaco',emoji:'😐',label:'Opaco'},
    {value:'caida_leve',emoji:'🍂',label:'Caída leve'},
    {value:'caida_excesiva',emoji:'🍂🍂',label:'Caída excesiva',detalle:[{titulo:'¿Dónde?',opciones:tiposZonaCuerpo}]},
    {value:'rasca',emoji:'🐾',label:'Se rasca',detalle:[{titulo:'¿Dónde?',opciones:tiposZonaCuerpo}]},
    {value:'lame_exceso',emoji:'👅',label:'Se lame en exceso',detalle:[{titulo:'¿Dónde?',opciones:tiposZonaCuerpo}]},
  ]
  const pelaje: Categoria = { id:'pelaje', nombre:'Pelaje y piel', icon:'✨', color:'#4CAF7D', opciones: pelajeOpciones }

  // Conducta: en gato, las causas de ansiedad/miedo cambian ("Otros gatos"
  // y "Visitas" en vez de "Perros"), y agregamos "Se esconde / se aísla",
  // la señal de malestar felino más citada y que antes no existía.
  const causasConducta = esGato
    ? [{value:'otros_gatos',emoji:'🐈',label:'Otros gatos'},{value:'personas',emoji:'🧍',label:'Personas'},{value:'ruidos',emoji:'🔊',label:'Ruidos'},{value:'visitas',emoji:'🚪',label:'Visitas en casa'},{value:'solo',emoji:'🏠',label:'Solo en casa'}]
    : [{value:'perros',emoji:'🐕',label:'Perros'},{value:'personas',emoji:'🧍',label:'Personas'},{value:'ruidos',emoji:'🔊',label:'Ruidos'},{value:'solo',emoji:'🏠',label:'Solo en casa'}]

  const conductaOpciones: Opcion[] = [
    {value:'normal',emoji:'😊',label:'Normal'},
    {value:'sociable',emoji:'🤩',label:'Muy sociable'},
    {value:'ansioso',emoji:'😰',label:'Ansioso',detalle:[{titulo:'¿Ante qué?',opciones:causasConducta}]},
    {value:'temeroso',emoji:'😨',label:'Temeroso',detalle:[{titulo:'¿Ante qué?',opciones:causasConducta}]},
    {value:'reactivo',emoji:'⚡',label:'Reactivo',detalle:[{titulo:'¿Ante qué?',opciones:causasConducta}]},
  ]
  if (esGato) {
    conductaOpciones.push({value:'esconde',emoji:'🙈',label:'Se esconde / se aísla',detalle:[
      {titulo:'¿Dónde se esconde?',opciones:[{value:'bajo_cama',emoji:'🛏',label:'Bajo la cama'},{value:'closet',emoji:'🚪',label:'Closet / mueble'},{value:'lugar_alto',emoji:'🔼',label:'Lugar alto'},{value:'otro_lugar',emoji:'❓',label:'Otro lugar'}]}
    ]})
  }
  const conducta: Categoria = { id:'conducta', nombre:'Conducta', icon:'🧠', color:'#E05252', opciones: conductaOpciones }

  const movilidad: Categoria = { id:'movilidad', nombre:'Movilidad', icon:'🦴', color:'#8A7560',
    opciones:[
      {value:'normal',emoji:'🏃',label:'Normal'},
      {value:'rigidez',emoji:'🦾',label:'Rigidez'},
      {value:'cojera_leve',emoji:'🩹',label:'Cojera leve',detalle:[
        {titulo:'¿Qué pata o zona?',opciones:[{value:'del_izq',emoji:'↖️',label:'Del. izq'},{value:'del_der',emoji:'↗️',label:'Del. der'},{value:'tras_izq',emoji:'↙️',label:'Tras. izq'},{value:'tras_der',emoji:'↘️',label:'Tras. der'},{value:'columna',emoji:'🦴',label:'Columna'}]}
      ]},
      {value:'cojera_marcada',emoji:'🚨',label:'Cojera marcada',detalle:[
        {titulo:'¿Qué pata o zona?',opciones:[{value:'del_izq',emoji:'↖️',label:'Del. izq'},{value:'del_der',emoji:'↗️',label:'Del. der'},{value:'tras_izq',emoji:'↙️',label:'Tras. izq'},{value:'tras_der',emoji:'↘️',label:'Tras. der'},{value:'columna',emoji:'🦴',label:'Columna'}]}
      ]},
      {value:'costo_levantarse',emoji:'😓',label:'Le costó levantarse'},
    ]}

  // Paseo: exclusivo de perros (los gatos y otras especies no suelen
  // salir de paseo con correa).
  const paseo: Categoria = { id:'paseo', nombre:'Paseo', icon:'🦮', color:'#3DD6B5',
    opciones:[
      {value:'no_paseo',emoji:'🚫',label:'No paseó'},
      {value:'10_30min',emoji:'🚶',label:'10 a 30 min'},
      {value:'30min_1h',emoji:'🐕',label:'30 min a 1 hora'},
      {value:'1_2h',emoji:'🏃',label:'1 a 2 horas'},
      {value:'2_4h',emoji:'🏞',label:'2 a 4 horas'},
      // Sexta opción: al seleccionarla se abre un input inline (h/min)
      // bajo el grid. Los minutos se guardan en la columna
      // paseo_minutos_exactos y el análisis usa ese valor cuando existe;
      // si no, cae al rango del label como hasta ahora.
      {value:'tiempo_exacto',emoji:'⏱️',label:'Registrar tiempo exacto'},
    ]}

  const categorias = [energia, animo, apetito, agua, digestion, heces, arenero, pelaje, conducta, movilidad]
  if (especie === 'Perro') categorias.push(paseo)
  return categorias
}

// Grupos de "Cuidados de hoy", según especie. Orden: Veterinario y
// salud → Prevención → Alimentación → Higiene y bienestar → Arenero
// (este último solo en gatos).
// "Cuidados básicos" y "Eventos importantes" se fusionaron en
// "Veterinario y salud"; "Compré alimento" vive en Alimentación; el
// grupo "Arenero" tiene 3 rutinas de frecuencias distintas (limpiar es
// ~diario, cambiar la arena es ~semanal, comprar es ~mensual) —
// separadas para que el cálculo de "cada cuánto" en Análisis sea útil,
// incluyendo estimar cuándo toca volver a comprar arena o alimento.
interface GrupoCuidados { titulo: string; img: string; items: { value: string; emoji: string; label: string }[] }
function getGruposCuidados(especie: string): GrupoCuidados[] {
  const esGato = especie === 'Gato'
  const grupos: GrupoCuidados[] = [
    { titulo: 'Veterinario y salud', img: '/chiqui/chiqui_doctor.png', items: [
      { value: 'vet', emoji: '🩺', label: 'Fue al veterinario' },
      { value: 'control_peso', emoji: '⚖️', label: 'Control de peso' },
      { value: 'procedimiento_cirugia', emoji: '🏥', label: 'Procedimiento o cirugía' },
      { value: 'seguimiento_lesion', emoji: '📸', label: 'Seguimiento de lesión o recuperación' },
    ]},
    { titulo: 'Prevención', img: '/chiqui/chiqui_medicamentos.png', items: [
      { value: 'medicamento_hoy', emoji: '💊', label: 'Recibió medicamento' },
      { value: 'vacuna_hoy', emoji: '💉', label: 'Vacuna aplicada' },
      { value: 'anti_hoy', emoji: '🪱', label: 'Antiparasitario aplicado' },
    ]},
    { titulo: 'Alimentación', img: '/chiqui/chiqui_chef.png', items: [
      { value: 'alimente_hoy', emoji: '🥘', label: 'Alimenté a mi mascota' },
      { value: 'alimento', emoji: '🍖', label: 'Compré alimento' },
      { value: 'cambio_alimento', emoji: '🥣', label: 'Cambio de alimento' },
      { value: 'probo_alimento_nuevo', emoji: '🎁', label: 'Probó un alimento nuevo' },
      { value: 'cargo_dispensador', emoji: '🤖', label: 'Cargué el dispensador de comida/agua' },
    ]},
    { titulo: 'Higiene y bienestar', img: '/chiqui/chiqui_grooming.png', items: [
      { value: 'bano', emoji: '🛁', label: 'Se bañó' },
      { value: 'unas', emoji: '✂️', label: 'Corte de uñas' },
      { value: 'limpieza_dental', emoji: '🦷', label: 'Limpieza dental' },
      { value: 'limpieza_oidos', emoji: '👂', label: 'Limpieza de oídos' },
      { value: 'tratamiento_dermatologico', emoji: '🧴', label: 'Tratamiento dermatológico' },
      { value: 'peino', emoji: '💇', label: 'Lo peiné' },
      { value: 'shampoo_seco', emoji: '🧼', label: 'Shampoo en seco' },
    ]},
  ]
  if (esGato) {
    grupos.push({ titulo: 'Arenero', img: '/chiqui/chiqui_caca.png', items: [
      { value: 'limpie_arenero', emoji: '🧹', label: 'Limpié el arenero' },
      { value: 'cambie_arena', emoji: '🔄', label: 'Cambié la arena' },
      { value: 'compre_arena', emoji: '🛒', label: 'Compré arena' },
    ]})
  }
  return grupos
}

// Calcula el color del día para el calendario. Si hay al menos un signo
// de alerta registrado, el día es ROJO automáticamente (evento grave),
// por encima de cualquier otra señal del día.
function calcEstado(sel: Record<string,string>, signos: Set<string>): string {
  if (signos.size > 0) return 'rojo'
  const vals = Object.values(sel)
  const alertas = ['vomito','diarrea','nada','muy_baja','decaido','cojera_marcada','con_sangre','no_orino','sangre_heces','rojiza','muy_oscura']
  const observar = ['menos','gases','nauseas','baja','ansioso','temeroso','cojera_leve','blandas','mucosidad','amarilla','muy_clara','verdosa','color_raro','caida_excesiva','rasca','triste','irritable','rigidez','opaco','mas_orina','menos_costo','fuera_arenero','fuera_lugar','esconde','lame_exceso']
  if (vals.some(v => alertas.includes(v))) return 'naranjo'
  if (vals.some(v => observar.includes(v))) return 'amarillo'
  return 'verde'
}

function RegistroContenido() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fechaUrl = searchParams.get('fecha')
  const supabase = createClient()
  const [mascotas, setMascotas] = useState<any[]>([])
  const [mascotaId, setMascotaId] = useState('')
  const [mascotaNombre, setMascotaNombre] = useState('')
  const [especie, setEspecie] = useState('')
  const [sel, setSel] = useState<Record<string,string>>({})
  const [det, setDet] = useState<Record<string,string[]>>({})
  // Minutos exactos de paseo cuando el usuario elige "⏱️ Registrar
  // tiempo exacto". Se guarda en columna paseo_minutos_exactos.
  const [paseoMinutos, setPaseoMinutos] = useState<number | null>(null)
  const [fechaRegistro, setFechaRegistro] = useState('')
  const [nota, setNota] = useState('')
  const [cuidados, setCuidados] = useState<Set<string>>(new Set())
  const [signos, setSignos] = useState<Set<string>>(new Set())
  const [signoOtroTexto, setSignoOtroTexto] = useState('')
  const [signosAbierto, setSignosAbierto] = useState(false)
  const [miniModal, setMiniModal] = useState<'vacuna' | 'anti' | 'medicamento' | null>(null)
  // Medicamentos activos de la mascota (para elegir en el mini-modal
  // en vez de crear duplicados). Se carga al elegir mascota.
  const [medsActivos, setMedsActivos] = useState<{ id: string; nombre: string; frecuencia: string | null }[]>([])
  // En el mini-modal de medicamento: id del elegido para "cumplimiento"
  // o null si va a crear uno nuevo.
  const [medElegidoId, setMedElegidoId] = useState<string | null>(null)
  // Modo del mini-modal: 'lista' muestra los activos + botón nuevo;
  // 'nuevo' muestra el formulario para crear tratamiento nuevo.
  const [medModo, setMedModo] = useState<'lista' | 'nuevo'>('lista')
  const [miniForm, setMiniForm] = useState<{ nombre: string; proxima_fecha: string; tipo: string }>({ nombre: '', proxima_fecha: '', tipo: 'interno' })
  const [miniError, setMiniError] = useState('')
  const [miniGuardando, setMiniGuardando] = useState(false)
  const [abierto, setAbierto] = useState('energia')
  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')
  const [cargando, setCargando] = useState(true)
  const [yaRegistro, setYaRegistro] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: todasMascotas } = await supabase.from('mascotas').select('id,nombre,especie,raza,foto_url,sexo,castrado,seguimiento_reproductivo').order('created_at', { ascending: true })
      if (!todasMascotas || !todasMascotas.length) { router.push('/mascota/nueva'); return }
      setMascotas(todasMascotas)
      const m = determinarMascotaActiva(todasMascotas)!
      setMascotaId(m.id)
      setMascotaNombre(m.nombre)
      setEspecie(m.especie || '')
      const hoy = fechaUrl || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
      setFechaRegistro(hoy)
      const { data: r } = await supabase.from('registros_diarios').select('*').eq('mascota_id', m.id).eq('fecha', hoy).maybeSingle()
      if (r) {
        setYaRegistro(true)
        cargarRegistroExistente(r)
      }
      setCargando(false)
    }
    init()
  }, [fechaUrl])

  // Reconstruye el estado del formulario (sel, det, nota, cuidados,
  // signos de alerta) a partir de un registro ya guardado, para poder
  // EDITARLO en vez de solo bloquear la pantalla. El mapeo es el
  // inverso exacto de como se guarda en guardar().
  function cargarRegistroExistente(r: any) {
    const nuevoSel: Record<string, string> = {}
    const nuevoDet: Record<string, string[]> = {}
    const campos = ['energia', 'animo', 'apetito', 'agua', 'digestion', 'heces', 'arenero', 'pelaje', 'conducta', 'movilidad', 'paseo']
    campos.forEach(campo => {
      if (r[campo]) nuevoSel[campo] = r[campo]
      const detalleCampo = `${campo}_detalle`
      if (r[detalleCampo]) nuevoDet[campo] = String(r[detalleCampo]).split(', ').filter(Boolean)
    })
    setSel(nuevoSel)
    setDet(nuevoDet)
    setNota(r.nota || '')
    // Signos de alerta guardados como texto "a, b, c" en signos_alerta
    if (r.signos_alerta) {
      const listaSignos = String(r.signos_alerta).split(', ').filter(Boolean)
      setSignos(new Set(listaSignos))
      setSignosAbierto(listaSignos.length > 0)
    } else {
      setSignos(new Set())
    }
    setSignoOtroTexto(r.signos_alerta_otro || '')
    const cuidadosExistentes = new Set<string>()
    const mapaCuidados: Record<string, string> = {
      fue_al_vet: 'vet', se_bano: 'bano', corte_unas: 'unas', compro_alimento: 'alimento',
      vacuna_hoy: 'vacuna_hoy', anti_hoy: 'anti_hoy', medicamento_hoy: 'medicamento_hoy',
      limpieza_dental: 'limpieza_dental', limpieza_oidos: 'limpieza_oidos',
      tratamiento_dermatologico: 'tratamiento_dermatologico',
      cambio_alimento: 'cambio_alimento', probo_alimento_nuevo: 'probo_alimento_nuevo', cargo_dispensador: 'cargo_dispensador',
      alimente_hoy: 'alimente_hoy',
      control_peso: 'control_peso', procedimiento_cirugia: 'procedimiento_cirugia',
      seguimiento_lesion: 'seguimiento_lesion',
      peino: 'peino', shampoo_seco: 'shampoo_seco',
      limpie_arenero: 'limpie_arenero', cambie_arena: 'cambie_arena', compre_arena: 'compre_arena',
    }
    Object.entries(mapaCuidados).forEach(([columna, valor]) => {
      if (r[columna]) cuidadosExistentes.add(valor)
    })
    setCuidados(cuidadosExistentes)
  }

  async function cambiarMascota(nueva: any) {
    setCargando(true)
    guardarMascotaActivaId(nueva.id)
    setMascotaId(nueva.id)
    setMascotaNombre(nueva.nombre)
    setEspecie(nueva.especie || '')
    // Limpiamos el progreso del formulario para no mezclar sintomas de
    // una mascota con el envio hacia otra.
    setSel({})
    setDet({})
    setNota('')
    setCuidados(new Set())
    setSignos(new Set())
    setSignoOtroTexto('')
    setSignosAbierto(false)
    setMiniModal(null)
    setAbierto('energia')
    setGruposAbiertos(new Set())
    const hoy = fechaUrl || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
    const { data: r } = await supabase.from('registros_diarios').select('*').eq('mascota_id', nueva.id).eq('fecha', hoy).maybeSingle()
    if (r) {
      setYaRegistro(true)
      cargarRegistroExistente(r)
    } else {
      setYaRegistro(false)
    }
    setCargando(false)
  }

  const CATS = getCategorias(especie)

  // Marca todas las categorias de sintomas (CATS) como "normal" de una
  // sola vez, EXCEPTO Paseo (que no tiene una opcion "normal", son rangos
  // de duracion) y Cuidados (que es multi-seleccion aparte, no tiene
  // sentido marcarla como "normal"). Despues de tocar este boton, las
  // categorias individuales siguen siendo editables por si algo si
  // cambio ese dia.
  function marcarTodoNormal() {
    const nuevoSel: Record<string, string> = { ...sel }
    CATS.forEach(cat => {
      if (cat.id === 'paseo') return
      nuevoSel[cat.id] = 'normal'
    })
    setSel(nuevoSel)
  }

  function toggleGrupoCuidados(titulo: string) {
    setGruposAbiertos(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(titulo)) nuevo.delete(titulo)
      else nuevo.add(titulo)
      return nuevo
    })
  }

  function toggleSigno(valor: string) {
    setSignos(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(valor)) nuevo.delete(valor)
      else nuevo.add(valor)
      return nuevo
    })
  }

  async function toggleCuidado(valor: string) {
    // Vacuna, antiparasitario y medicamento necesitan datos adicionales
    // (nombre, tipo) antes de poder marcarse, asi que en vez de marcar
    // directo, abren un mini-formulario. Si ya estaban marcados,
    // desmarcar es directo (no hay necesidad de pedir nada para quitar
    // la marca).
    const necesitaMiniModal = valor === 'vacuna_hoy' || valor === 'anti_hoy' || valor === 'medicamento_hoy'
    if (necesitaMiniModal && !cuidados.has(valor)) {
      // Al abrir el mini-modal de medicamento, cargar los activos de
      // la mascota para poder elegir "cumplimiento" en lugar de crear
      // duplicados. Si no hay ninguno activo, salta directo a "nuevo".
      if (valor === 'medicamento_hoy' && mascotaId) {
        const hoyStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
        const { data: medsRaw } = await supabase
          .from('medicamentos')
          .select('id,nombre,frecuencia,fecha_fin,estado')
          .eq('mascota_id', mascotaId)
          .eq('estado', 'activo')
        const activos = (medsRaw || [])
          .filter((md: any) => !md.fecha_fin || md.fecha_fin >= hoyStr)
          .map((md: any) => ({ id: md.id as string, nombre: md.nombre as string, frecuencia: (md.frecuencia || null) as string | null }))
        setMedsActivos(activos)
        setMedElegidoId(activos.length > 0 ? activos[0].id : null)
        setMedModo(activos.length > 0 ? 'lista' : 'nuevo')
      }
      setMiniModal(valor === 'vacuna_hoy' ? 'vacuna' : valor === 'anti_hoy' ? 'anti' : 'medicamento')
      setMiniForm({ nombre: '', proxima_fecha: '', tipo: 'interno' })
      setMiniError('')
      return
    }
    setCuidados(prev => {
      const nuevo = new Set(prev)
      if (nuevo.has(valor)) nuevo.delete(valor)
      else nuevo.add(valor)
      return nuevo
    })
  }

  async function confirmarMiniModal() {
    if (!miniForm.nombre.trim()) {
      setMiniError('Escribe el nombre para continuar.')
      return
    }
    setMiniGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMiniGuardando(false); return }
    // Rama especial de medicamento: distinguir cumplimiento vs. crear
    // tratamiento nuevo. Vacunas y antiparasitarios siguen igual (esos
    // eventos SÍ son puntuales por definición, no se repiten diario).
    if (miniModal === 'medicamento') {
      if (medModo === 'lista' && medElegidoId) {
        // CUMPLIMIENTO: inserta una toma del día, sin duplicar el
        // tratamiento. UNIQUE(medicamento_id, fecha) previene toma
        // repetida si el usuario toca dos veces por accidente.
        const { error: errToma } = await supabase.from('medicamento_tomas').upsert({
          user_id: user.id,
          mascota_id: mascotaId,
          medicamento_id: medElegidoId,
          fecha: fechaRegistro,
        }, { onConflict: 'medicamento_id,fecha' })
        setMiniGuardando(false)
        if (errToma) {
          setMiniError('No se pudo registrar la toma. Intenta de nuevo.')
          return
        }
        setCuidados(prev => new Set(prev).add('medicamento_hoy'))
        setMiniModal(null)
        return
      }
      // TRATAMIENTO NUEVO: crea el medicamento y su primera toma.
      const { data: nuevoMed, error: errMed } = await supabase.from('medicamentos').insert({
        mascota_id: mascotaId,
        user_id: user.id,
        nombre: miniForm.nombre.trim(),
        fecha_inicio: fechaRegistro,
        proximo_control: miniForm.proxima_fecha || null,
        estado: 'activo',
      }).select('id').single()
      if (errMed || !nuevoMed) {
        setMiniGuardando(false)
        setMiniError('No se pudo guardar el medicamento. Intenta de nuevo.')
        return
      }
      // Primera toma del tratamiento en la fecha del registro.
      await supabase.from('medicamento_tomas').upsert({
        user_id: user.id,
        mascota_id: mascotaId,
        medicamento_id: nuevoMed.id,
        fecha: fechaRegistro,
      }, { onConflict: 'medicamento_id,fecha' })
      setMiniGuardando(false)
      setCuidados(prev => new Set(prev).add('medicamento_hoy'))
      setMiniModal(null)
      return
    }

    const tabla = miniModal === 'vacuna' ? 'vacunas' : 'antiparasitarios'
    const datos: any = {
      mascota_id: mascotaId,
      user_id: user.id,
      nombre: miniForm.nombre.trim(),
      fecha_aplicacion: fechaRegistro,
      proxima_fecha: miniForm.proxima_fecha || null,
    }
    if (miniModal === 'anti') datos.tipo = miniForm.tipo
    const { error } = await supabase.from(tabla).insert(datos)
    setMiniGuardando(false)
    if (error) {
      setMiniError('No se pudo guardar. Intenta de nuevo.')
      return
    }
    const columnaCuidado = miniModal === 'vacuna' ? 'vacuna_hoy' : miniModal === 'anti' ? 'anti_hoy' : 'medicamento_hoy'
    setCuidados(prev => new Set(prev).add(columnaCuidado))
    setMiniModal(null)
  }

  function cancelarMiniModal() {
    // Si se cancela, el check correspondiente no queda marcado (no se
    // creo nada en Prevencion).
    setMiniModal(null)
  }

  async function guardar() {
    // Se puede guardar si hay al menos una categoría marcada O al menos
    // un signo de alerta (un tutor en una urgencia puede querer registrar
    // solo el evento grave, sin completar el resto del día).
    if (!Object.keys(sel).length && signos.size === 0) return
    setLoading(true)
    setErrorGuardado('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { error } = await supabase.from('registros_diarios').upsert({
      mascota_id: mascotaId, user_id: user.id, fecha: fechaRegistro,
      estado_dia: calcEstado(sel, signos), nota: nota || null,
      energia: sel.energia || null, animo: sel.animo || null,
      apetito: sel.apetito || null, apetito_detalle: det.apetito?.join(', ') || null,
      agua: sel.agua || null, agua_detalle: det.agua?.join(', ') || null,
      digestion: sel.digestion || null, digestion_detalle: det.digestion?.join(', ') || null,
      heces: sel.heces || null, heces_detalle: det.heces?.join(', ') || null,
      arenero: sel.arenero || null, arenero_detalle: det.arenero?.join(', ') || null,
      pelaje: sel.pelaje || null, pelaje_detalle: det.pelaje?.join(', ') || null,
      conducta: sel.conducta || null, conducta_detalle: det.conducta?.join(', ') || null,
      movilidad: sel.movilidad || null, movilidad_detalle: det.movilidad?.join(', ') || null,
      paseo: sel.paseo || null,
      paseo_minutos_exactos: sel.paseo === 'tiempo_exacto' ? paseoMinutos : null,
      signos_alerta: signos.size > 0 ? Array.from(signos).join(', ') : null,
      signos_alerta_otro: signos.has('otro_signo') && signoOtroTexto.trim() ? signoOtroTexto.trim() : null,
      fue_al_vet: cuidados.has('vet'), se_bano: cuidados.has('bano'),
      corte_unas: cuidados.has('unas'), compro_alimento: cuidados.has('alimento'),
      vacuna_hoy: cuidados.has('vacuna_hoy'), anti_hoy: cuidados.has('anti_hoy'),
      medicamento_hoy: cuidados.has('medicamento_hoy'),
      limpieza_dental: cuidados.has('limpieza_dental'), limpieza_oidos: cuidados.has('limpieza_oidos'),
      tratamiento_dermatologico: cuidados.has('tratamiento_dermatologico'),
      cambio_alimento: cuidados.has('cambio_alimento'), probo_alimento_nuevo: cuidados.has('probo_alimento_nuevo'), cargo_dispensador: cuidados.has('cargo_dispensador'),
      alimente_hoy: cuidados.has('alimente_hoy'),
      control_peso: cuidados.has('control_peso'), procedimiento_cirugia: cuidados.has('procedimiento_cirugia'),
      seguimiento_lesion: cuidados.has('seguimiento_lesion'),
      peino: cuidados.has('peino'), shampoo_seco: cuidados.has('shampoo_seco'),
      limpie_arenero: cuidados.has('limpie_arenero'), cambie_arena: cuidados.has('cambie_arena'), compre_arena: cuidados.has('compre_arena'),
    }, { onConflict: 'mascota_id,fecha' })
    if (error) {
      console.error('Error guardando registro diario:', error)
      setErrorGuardado('No se pudo guardar. Revisa tu conexión e intenta de nuevo.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  if (cargando) return <div className="min-h-screen flex items-center justify-center text-[#8A7560]">Cargando...</div>

  const completadas = Object.keys(sel).length
  const puedeGuardar = completadas > 0 || signos.size > 0

  return (
    <div className="min-h-screen pb-24 fade-in">
      <div className="px-5 pt-6 pb-3 sticky top-0 bg-[#F5EDE3] z-10 border-b border-[#EEE2D4]">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[#FFFCF8] flex items-center justify-center text-lg flex-shrink-0">←</button>
          <div className="flex-1">
            <p className="text-xs text-[#8A7560] capitalize">
              {fechaRegistro && new Date(fechaRegistro + 'T00:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}
              {yaRegistro && ' · editando'}
            </p>
            <h1 className="font-heading text-base font-extrabold">¿Cómo estuvo {mascotaNombre}?</h1>
          </div>
          <button onClick={guardar} disabled={loading || !puedeGuardar}
            className="bg-[#FFBD59] text-[#1A1200] text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-40 flex-shrink-0">
            {loading ? '...' : yaRegistro ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-1 bg-[#FBEAD9] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{width:`${(completadas/CATS.length)*100}%`, background: 'linear-gradient(90deg, #3DD6B5, #4CAF7D)'}}/>
          </div>
          <span className="text-[11px] text-[#8A7560] whitespace-nowrap">{completadas}/{CATS.length}</span>
        </div>
      </div>
      {/* Selector de mascota */}
      {mascotas.length > 0 && (
        <SelectorMascota
          mascotas={mascotas}
          mascotaActiva={mascotas.find(m => m.id === mascotaId) || mascotas[0]}
          onCambiar={cambiarMascota}
        />
      )}
      <div className="mx-4 mt-3 mb-1 bg-[#FBEAD9] border border-[#3DD6B5]/15 rounded-xl p-3 flex gap-2.5">
        <span className="text-lg flex-shrink-0">{iconoPorEspecie(especie)}</span>
        <p className="text-xs text-[#3D2B1F] leading-relaxed">
          Toca las categorías que apliquen hoy. Si algo fue distinto, aparecerán más opciones. No necesitas registrar todo.
        </p>
      </div>
      {/* Atajo: marcar todas las categorias de sintomas como normal de
          una vez (no incluye Paseo ni Cuidados). Despues de tocarlo, se
          puede seguir ajustando categorias individuales si algo cambio. */}
      <button
        onClick={marcarTodoNormal}
        className="mx-4 mt-2 mb-1 w-[calc(100%-2rem)] bg-[#FFBD59] rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left"
      >
        <img src="/chiqui/chiqui_ladeado.png" alt="Chiqui" className="w-10 h-10 object-contain flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-[#1A1200]">¿Hoy no notaste nada raro?</p>
          <p className="text-[11px] text-[#1A1200]/70">Marca todo como normal en un toque</p>
        </div>
        <div className="bg-[#1A1200]/10 rounded-full px-3 py-2 flex items-center gap-1 flex-shrink-0">
          <span className="text-[#1A1200] text-xs font-bold">Todo normal</span>
          <span className="text-[#1A1200] text-sm">✓</span>
        </div>
      </button>
      <div className="space-y-0 mt-2">
        {CATS.map(cat => {
          const selVal = sel[cat.id]
          const opSel = cat.opciones.find(o => o.value === selVal)
          const open = abierto === cat.id
          return (
            <div key={cat.id} className="mx-4">
              <button onClick={() => setAbierto(open ? '' : cat.id)} className="w-full flex items-center gap-3 py-3 text-left">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{background:`${cat.color}20`}}>
                  {cat.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{cat.nombre}</p>
                  {selVal && (
                    <p className="text-xs mt-0.5" style={{color:cat.color}}>
                      {opSel?.emoji} {opSel?.label}{(det[cat.id]?.filter(Boolean).length) ? ` · ${det[cat.id].filter(Boolean).join(', ')}` : ''}
                    </p>
                  )}
                </div>
                <span className="text-[#8A7560] text-sm">{open ? '▾' : '›'}</span>
              </button>
              {open && (
                <div className="pb-3">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {cat.opciones.map(op => (
                      <button key={op.value}
                        onClick={() => {
                          setSel(p => {
                            if (p[cat.id] === op.value) { const n={...p}; delete n[cat.id]; return n }
                            return {...p, [cat.id]: op.value}
                          })
                          if (!op.detalle) setDet(p => { const n={...p}; delete n[cat.id]; return n })
                          // Al cambiar a otra opción de paseo (o
                          // deseleccionar), los minutos exactos ya no
                          // aplican.
                          if (cat.id === 'paseo' && op.value !== 'tiempo_exacto') setPaseoMinutos(null)
                        }}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all"
                        style={selVal===op.value ? {borderColor:cat.color,background:'rgba(61,214,181,0.08)',borderWidth:'1.5px'} : {background:'#FFFCF8',borderColor:'#EEE2D4',borderWidth:'1.5px'}}>
                        <span className="text-xl">{op.emoji}</span>
                        <span className="text-[10px] text-[#8A7560] leading-tight text-center">{op.label}</span>
                      </button>
                    ))}
                  </div>
                  {/* Input inline de tiempo exacto: aparece bajo el
                      grid cuando el usuario elige ⏱️ en paseo. Sin
                      cronómetro: dos selects rápidos de horas y
                      minutos. Se guarda como minutos totales en
                      paseo_minutos_exactos. */}
                  {cat.id === 'paseo' && selVal === 'tiempo_exacto' && (
                    <div className="bg-[#FBEAD9] rounded-xl p-3 border border-[#EEE2D4] mb-2">
                      <p className="text-xs text-[#8A7560] uppercase tracking-wider font-semibold mb-2">¿Cuánto duró el paseo?</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-[#8A7560]">Horas</label>
                          <select
                            value={Math.floor((paseoMinutos ?? 0) / 60)}
                            onChange={e => {
                              const h = Number(e.target.value)
                              const min = (paseoMinutos ?? 0) % 60
                              setPaseoMinutos(h * 60 + min)
                            }}
                            className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-lg px-2 py-2 text-sm text-[#3D2B1F]"
                          >
                            {Array.from({length: 13}, (_, i) => (
                              <option key={i} value={i}>{i} h</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-[#8A7560]">Minutos</label>
                          <select
                            value={(paseoMinutos ?? 0) % 60}
                            onChange={e => {
                              const min = Number(e.target.value)
                              const h = Math.floor((paseoMinutos ?? 0) / 60)
                              setPaseoMinutos(h * 60 + min)
                            }}
                            className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-lg px-2 py-2 text-sm text-[#3D2B1F]"
                          >
                            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                              <option key={m} value={m}>{m} min</option>
                            ))}
                          </select>
                        </div>
                        <div className="pt-4">
                          <p className="text-xs font-bold text-[#8C572F]">
                            = {paseoMinutos ?? 0} min
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {selVal && opSel?.detalle && (
                    <div className="bg-[#FBEAD9] rounded-xl p-3 border border-[#EEE2D4] space-y-3">
                      {opSel.detalle.map((sub, subIdx) => (
                        <div key={subIdx}>
                          <p className="text-xs text-[#8A7560] uppercase tracking-wider font-semibold mb-2">{sub.titulo}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {sub.opciones.map(op2 => {
                              const seleccionadoSub = (det[cat.id] || [])[subIdx] === op2.value
                              return (
                                <button key={op2.value}
                                  onClick={() => setDet(p => {
                                    const arr = [...(p[cat.id] || [])]
                                    arr[subIdx] = arr[subIdx] === op2.value ? '' : op2.value
                                    return {...p, [cat.id]: arr}
                                  })}
                                  className="flex flex-col items-center gap-1 p-2 rounded-lg border transition-all"
                                  style={seleccionadoSub ? {borderColor:'#F07A30',background:'#F07A3015'} : {background:'#FFFCF8',borderColor:'#EEE2D4'}}>
                                  <span className="text-base">{op2.emoji}</span>
                                  <span className="text-[10px] text-[#8A7560] leading-tight text-center">{op2.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="h-px bg-[#EEE2D4]"/>
            </div>
          )
        })}
      </div>
      {/* SIGNOS DE ALERTA — eventos graves del día. Opcional, colapsado
          por defecto, selección múltiple. Si se marca al menos uno, el
          día queda en rojo en el calendario. */}
      <div className="mx-4 mt-4">
        <label className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2 block">
          ¿Ocurrió algo grave hoy? · opcional
        </label>
        <div className="rounded-xl border overflow-hidden bg-[#FFFCF8]" style={{ borderColor: signos.size > 0 ? '#E05252' : '#EEE2D4', borderWidth: '1.5px' }}>
          <button
            type="button"
            onClick={() => setSignosAbierto(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
          >
            <span className="text-lg flex-shrink-0">🚨</span>
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-[#E05252]">Signos de alerta</p>
              <p className="text-[10px] text-[#8A7560]">Convulsiones, intoxicación, accidentes y otras urgencias</p>
            </div>
            {signos.size > 0 && (
              <span className="text-[10px] font-bold text-white bg-[#E05252] rounded-full px-2 py-0.5">
                {signos.size}
              </span>
            )}
            <span className="text-[#8A7560] text-sm">{signosAbierto ? '▾' : '›'}</span>
          </button>
          {signosAbierto && (
            <div className="px-3 pb-3 pt-1">
              <div className="grid grid-cols-2 gap-2">
                {SIGNOS_ALERTA.map(s => {
                  const activo = signos.has(s.value)
                  return (
                    <button
                      key={s.value}
                      onClick={() => toggleSigno(s.value)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 border text-left"
                      style={activo
                        ? { background: '#E0525215', borderColor: '#E05252', borderWidth: '1.5px' }
                        : { background: '#FFFCF8', borderColor: '#EEE2D4', borderWidth: '1.5px' }}
                    >
                      <span className="text-base flex-shrink-0">{s.emoji}</span>
                      <span className="text-xs font-medium text-[#3D2B1F]">{s.label}</span>
                    </button>
                  )
                })}
              </div>
              {signos.has('otro_signo') && (
                <input
                  className="w-full mt-2 bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none"
                  placeholder="Describe brevemente qué pasó"
                  value={signoOtroTexto}
                  onChange={e => setSignoOtroTexto(e.target.value)}
                  maxLength={120}
                />
              )}
              {signos.size > 0 && (
                <p className="text-[10px] text-[#E05252] mt-2 leading-relaxed">
                  Este día quedará marcado en rojo en el calendario y tu veterinario lo verá destacado.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      {/* CUIDADOS — organizados en 5 grupos, cada uno desplegable */}
      <div className="mx-4 mt-4">
        <label className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2 block">
          Cuidados de hoy · opcional, puedes marcar varios
        </label>
        {getGruposCuidados(especie).map(grupo => {
          const abiertoGrupo = gruposAbiertos.has(grupo.titulo)
          const marcadosEnGrupo = grupo.items.filter(c => cuidados.has(c.value)).length
          return (
            <div key={grupo.titulo} className="mb-2 last:mb-0 rounded-xl border border-[#EEE2D4] overflow-hidden bg-[#FFFCF8]">
              <button
                type="button"
                onClick={() => toggleGrupoCuidados(grupo.titulo)}
                className="w-full flex items-center gap-1.5 px-3 py-2.5 text-left"
              >
                <img src={grupo.img} alt="" className="w-5 h-5 object-contain" />
                <p className="flex-1 text-[11px] font-semibold text-[#CD7421]">{grupo.titulo}</p>
                {marcadosEnGrupo > 0 && (
                  <span className="text-[10px] font-bold text-[#1A1200] bg-[#FFBD59] rounded-full px-2 py-0.5">
                    {marcadosEnGrupo}
                  </span>
                )}
                <span className="text-[#8A7560] text-sm">{abiertoGrupo ? '▾' : '›'}</span>
              </button>
              {abiertoGrupo && (
                <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-2">
                  {grupo.items.map(c => {
                    const activo = cuidados.has(c.value)
                    return (
                      <button
                        key={c.value}
                        onClick={() => toggleCuidado(c.value)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 border text-left"
                        style={activo
                          ? { background: '#FFBD5920', borderColor: '#FFBD59', borderWidth: '1.5px' }
                          : { background: '#FFFCF8', borderColor: '#EEE2D4', borderWidth: '1.5px' }}
                      >
                        <span className="text-base flex-shrink-0">{c.emoji}</span>
                        <span className="text-xs font-medium text-[#3D2B1F]">{c.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mx-4 mt-4">
        <label className="text-xs font-semibold text-[#8A7560] uppercase tracking-wider mb-2 block">
          Nota del día · opcional
        </label>
        <textarea value={nota} onChange={e => setNota(e.target.value)}
          placeholder="¿Algo que quieras recordar de hoy?" rows={3}
          className="w-full bg-[#FFFCF8] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none resize-none"/>
      </div>
      <div className="mx-4 mt-4">
        {errorGuardado && (
          <p className="text-center text-xs text-[#E05252] mb-2 bg-[#E05252]/10 rounded-xl py-2 px-3">{errorGuardado}</p>
        )}
        <button onClick={guardar} disabled={loading || !puedeGuardar}
          className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-4 rounded-xl text-base disabled:opacity-40">
          {loading ? 'Guardando...' : yaRegistro ? 'Guardar cambios ✓' : 'Guardar registro de hoy ✓'}
        </button>
        {!puedeGuardar && <p className="text-center text-xs text-[#8A7560] mt-2">Selecciona al menos una categoría para guardar</p>}
      </div>
      {/* Mini-modal para vacuna/antiparasitario aplicado hoy */}
      {miniModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={cancelarMiniModal}>
          <div className="w-full max-w-[420px] bg-[#FFFCF8] rounded-t-2xl p-5 space-y-3.5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-base">
                {miniModal === 'vacuna' ? '💉 Vacuna de hoy' : miniModal === 'anti' ? '🪱 Antiparasitario de hoy' : '💊 Medicamento de hoy'}
              </h2>
              <button onClick={cancelarMiniModal} className="text-[#8A7560] text-xl">✕</button>
            </div>
            {/* Rama especial: medicamento con activos → elegir uno o
                crear nuevo tratamiento. Nunca más duplicados por
                marcar cumplimiento diario. */}
            {miniModal === 'medicamento' && medModo === 'lista' && medsActivos.length > 0 ? (
              <>
                <p className="text-xs text-[#8A7560] -mt-2">¿Cuál medicamento le diste hoy?</p>
                <div className="space-y-1.5">
                  {medsActivos.map(md => (
                    <button
                      key={md.id}
                      onClick={() => setMedElegidoId(md.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                      style={medElegidoId === md.id
                        ? { borderColor: '#4AABDB', background: '#4AABDB14', borderWidth: '1.5px' }
                        : { borderColor: '#EEE2D4', background: '#FBEAD9', borderWidth: '1.5px' }}
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={medElegidoId === md.id ? { background: '#4AABDB', color: 'white' } : { border: '1.5px solid #EEE2D4' }}>
                        {medElegidoId === md.id && <span className="text-[10px] font-bold">✓</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#3D2B1F]">{md.nombre}</p>
                        {md.frecuencia && <p className="text-[10px] text-[#8A7560]">{md.frecuencia}</p>}
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setMedModo('nuevo'); setMedElegidoId(null); setMiniForm(p => ({ ...p, nombre: '' })) }}
                  className="w-full text-xs font-bold text-[#CD7421] py-2 text-left"
                >
                  ＋ Es un medicamento nuevo
                </button>
                {miniError && <p className="text-xs text-[#E05252]">{miniError}</p>}
                <button
                  onClick={confirmarMiniModal}
                  disabled={miniGuardando || !medElegidoId}
                  className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-3.5 rounded-xl text-sm disabled:opacity-50"
                >
                  {miniGuardando ? 'Guardando...' : 'Confirmar toma de hoy'}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-[#8A7560] -mt-2">
                  {miniModal === 'medicamento' && medModo === 'nuevo' && medsActivos.length > 0
                    ? 'Nuevo tratamiento — se guarda en Prevención.'
                    : 'Esto se guarda automáticamente en Prevención.'}
                </p>
                <div>
                  <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">
                    {miniModal === 'vacuna' ? 'Nombre de la vacuna *' : miniModal === 'anti' ? 'Nombre del producto *' : 'Nombre del medicamento *'}
                  </label>
                  <input
                    className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm placeholder-[#8A7560] focus:outline-none"
                    placeholder={miniModal === 'vacuna' ? 'ej. Séxtuple, Antirrábica...' : miniModal === 'anti' ? 'ej. Bravecto, Simparica...' : 'ej. Amoxicilina'}
                    value={miniForm.nombre}
                    onChange={e => setMiniForm(p => ({ ...p, nombre: e.target.value }))}
                    autoFocus
                  />
                </div>
                {miniModal === 'anti' && (
                  <div>
                    <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">Tipo</label>
                    <select
                      className="w-full bg-[#FBEAD9] border border-[#EEE2D4] rounded-xl px-4 py-3 text-[#3D2B1F] text-sm focus:outline-none appearance-none"
                      value={miniForm.tipo}
                      onChange={e => setMiniForm(p => ({ ...p, tipo: e.target.value }))}
                    >
                      <option value="interno">Interno</option>
                      <option value="externo">Externo</option>
                      <option value="ambos">Ambos</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-[#8A7560] uppercase tracking-wider mb-1.5 block">
                    {miniModal === 'vacuna' ? 'Próxima vacunación · opcional' : miniModal === 'anti' ? 'Próxima dosis · opcional' : 'Próximo control · opcional'}
                  </label>
                  {/* FechaSelector siempre reemplaza el input date nativo (regla #7) */}
                  <FechaSelector
                    value={miniForm.proxima_fecha}
                    onChange={v => setMiniForm(p => ({ ...p, proxima_fecha: v }))}
                    opcional
                  />
                </div>
                {miniModal === 'medicamento' && medsActivos.length > 0 && medModo === 'nuevo' && (
                  <button
                    onClick={() => { setMedModo('lista'); setMedElegidoId(medsActivos[0].id) }}
                    className="w-full text-xs font-bold text-[#CD7421] py-1 text-left"
                  >
                    ← Volver a elegir uno existente
                  </button>
                )}
                {miniError && <p className="text-xs text-[#E05252]">{miniError}</p>}
                <button
                  onClick={confirmarMiniModal}
                  disabled={miniGuardando}
                  className="w-full bg-[#FFBD59] text-[#1A1200] font-bold py-3.5 rounded-xl text-sm disabled:opacity-50"
                >
                  {miniGuardando ? 'Guardando...' : 'Guardar y marcar'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#8A7560]">Cargando...</div>}>
      <RegistroContenido />
    </Suspense>
  )
}
