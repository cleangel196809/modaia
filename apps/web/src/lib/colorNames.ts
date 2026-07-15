/** Nombres de color en español (tal como los cargan admin/proveedores) → hex aproximado para Three.js. */
const COLOR_NAME_TO_HEX: Record<string, string> = {
  negro: '#1c1c1c',
  blanco: '#f5f5f0',
  marfil: '#f1e9dd',
  beige: '#e3d5b8',
  gris: '#8c8c8c',
  'gris claro': '#c4c4c4',
  azul: '#2f5aa8',
  'azul oscuro': '#1c3a66',
  rojo: '#b23b3b',
  rosa: '#d98ba3',
  verde: '#4f6f52',
  'verde oliva': '#6b7a4f',
  terracota: '#c1633f',
  dorado: '#c9a24b',
  amarillo: '#d9b93c',
  naranja: '#d47a3b',
  morado: '#6b4f8a',
  vino: '#722f37',
  multicolor: '#a68a64',
};

const DEFAULT_HEX = '#a68a64';

export function colorNameToHex(name: string | undefined): string {
  if (!name) return DEFAULT_HEX;
  return COLOR_NAME_TO_HEX[name.trim().toLowerCase()] ?? DEFAULT_HEX;
}
