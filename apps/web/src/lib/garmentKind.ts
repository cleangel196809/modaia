import type { Product } from '@/store/api/apiSlice';

export type GarmentKind = 'falda' | 'blusa' | 'chaqueta' | 'conjunto';

/**
 * No hay un campo dedicado de "tipo de prenda" en el modelo de datos (solo categoría
 * libre + nombre), y la categoría real de los productos de prueba es inconsistente
 * (ej. "Falda artesanal Andina" está categorizada como "Conjuntos"). Por eso se infiere
 * primero por palabras clave en el NOMBRE del producto (más confiable) y solo si no hay
 * coincidencia se cae a la categoría.
 */
export function inferGarmentKind(product: Pick<Product, 'name' | 'category'>): GarmentKind {
  const text = product.name.toLowerCase();

  if (/falda|skirt/.test(text)) return 'falda';
  if (/chaqueta|blazer|abrigo|saco/.test(text)) return 'chaqueta';
  if (/conjunto|vestido|set\b/.test(text)) return 'conjunto';
  if (/blusa|camisa|top\b/.test(text)) return 'blusa';

  const category = product.category?.name?.toLowerCase() ?? '';
  if (category.includes('chaqueta')) return 'chaqueta';
  if (category.includes('conjunto')) return 'conjunto';
  if (category.includes('blusa')) return 'blusa';

  return 'blusa';
}
