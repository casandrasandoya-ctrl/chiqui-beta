// Calcula la etapa de vida de una mascota segun su fecha de nacimiento
// y especie. Las etapas y recomendaciones son iguales para perros y
// gatos en esta version (punto de partida validado con veterinario).
//
// Retorna null si no hay fecha de nacimiento disponible.

export interface EtapaVida {
  nombre: string        // ej. "Adulto Maduro"
  emoji: string         // ej. "🟡"
  color: string         // color hex para la etiqueta
  anos: number          // edad exacta en anos
  recomendacion: string // texto de recomendacion de chequeo
  alertaChequeo: boolean // true si la etapa requiere chequeo mas frecuente
}

export function calcularEtapaVida(
  fechaNacimiento: string | null | undefined,
  especie: string = 'Perro'
): EtapaVida | null {
  if (!fechaNacimiento) return null

  const nacimiento = new Date(fechaNacimiento + 'T00:00:00')
  const hoy = new Date()
  const msAno = 1000 * 60 * 60 * 24 * 365.25
  const anos = (hoy.getTime() - nacimiento.getTime()) / msAno

  if (anos < 0) return null

  const icono = especie === 'Gato' ? '🐱' : '🐶'

  if (anos < 1) return {
    nombre: 'Cachorro',
    emoji: '🟢',
    color: '#4CAF7D',
    anos: Math.floor(anos * 12) / 10, // meses
    recomendacion: `Período clave: vacunación completa y desparasitación frecuente. Consultar con el veterinario el calendario de vacunas.`,
    alertaChequeo: false,
  }

  if (anos < 3) return {
    nombre: 'Joven',
    emoji: '🟢',
    color: '#4CAF7D',
    anos: Math.floor(anos * 10) / 10,
    recomendacion: `Chequeo anual de rutina recomendado. Buen momento para establecer hábitos de salud preventiva.`,
    alertaChequeo: false,
  }

  if (anos < 7) return {
    nombre: 'Adulto',
    emoji: '🔵',
    color: '#4AABDB',
    anos: Math.floor(anos * 10) / 10,
    recomendacion: `Chequeo anual recomendado. Prestar atención al peso, la dentadura y el nivel de actividad.`,
    alertaChequeo: false,
  }

  if (anos < 10) return {
    nombre: 'Adulto Maduro',
    emoji: '🟡',
    color: '#F5C842',
    anos: Math.floor(anos * 10) / 10,
    recomendacion: `Chequeo preventivo cada 6-12 meses recomendado. Incluir exámenes de sangre anuales para detección temprana.`,
    alertaChequeo: true,
  }

  return {
    nombre: 'Senior',
    emoji: '🟠',
    color: '#F07A30',
    anos: Math.floor(anos * 10) / 10,
    recomendacion: `Chequeo preventivo cada 6 meses recomendado. Exámenes completos anuales (sangre, orina, presión arterial).`,
    alertaChequeo: true,
  }
}

export function formatearEdad(etapa: EtapaVida): string {
  if (etapa.nombre === 'Cachorro') {
    const meses = Math.round(etapa.anos * 10)
    return meses <= 1 ? '1 mes' : `${meses} meses`
  }
  const anos = Math.floor(etapa.anos)
  return anos === 1 ? '1 año' : `${anos} años`
}
