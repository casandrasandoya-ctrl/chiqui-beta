// Utilidad para manejar cual es la "mascota activa" cuando el usuario
// tiene mas de una. Se guarda en localStorage (vive en el dispositivo,
// no en la base de datos) para que cambiar de mascota sea instantaneo
// y se recuerde la eleccion entre sesiones, tal como se definio.

const CLAVE_STORAGE = 'chiqui_mascota_activa_id'

// Devuelve el id guardado, o null si nunca se eligio ninguna
// (ej. primera vez que el usuario entra, o localStorage no disponible
// como en renderizado de servidor).
export function obtenerMascotaActivaId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(CLAVE_STORAGE)
  } catch {
    return null
  }
}

// Guarda el id de la mascota que el usuario eligio como activa.
export function guardarMascotaActivaId(mascotaId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CLAVE_STORAGE, mascotaId)
  } catch {
    // Si localStorage no esta disponible (ej. modo privado en algunos
    // navegadores), simplemente no persiste. La app sigue funcionando,
    // solo no recuerda la eleccion entre sesiones.
  }
}

// Dada la lista completa de mascotas del usuario, determina cual deberia
// ser la activa: la guardada en localStorage si todavia existe en la
// lista (pudo haber sido eliminada), o si no hay ninguna guardada o ya
// no existe, la primera mascota de la lista como respaldo.
export function determinarMascotaActiva<T extends { id: string }>(
  mascotas: T[]
): T | null {
  if (mascotas.length === 0) return null

  const idGuardado = obtenerMascotaActivaId()
  if (idGuardado) {
    const encontrada = mascotas.find(m => m.id === idGuardado)
    if (encontrada) return encontrada
  }

  return mascotas[0]
}
