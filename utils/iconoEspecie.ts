// Mapeo de especie -> emoji, usado en cualquier pantalla que muestre un
// avatar o icono representando a una mascota (dashboard, perfil, selector,
// etc.), para que el icono corresponda a la especie real en vez de mostrar
// siempre el mismo perrito sin importar si es un gato, conejo, o ave.

export const ICONO_ESPECIE: Record<string, string> = {
  Perro: '🐕',
  Gato: '🐈',
  Conejo: '🐇',
  Ave: '🐦',
}

// Devuelve el emoji correspondiente a la especie, o la huella genérica
// 🐾 como respaldo para "Otro" o cualquier valor no contemplado.
export function iconoPorEspecie(especie?: string | null): string {
  if (!especie) return '🐾'
  return ICONO_ESPECIE[especie] || '🐾'
}
