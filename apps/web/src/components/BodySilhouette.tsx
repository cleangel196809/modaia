'use client';

interface Props {
  shoulderWidthCm: number;
  waistCm: number;
  hipsCm: number;
}

// Referencias promedio usadas solo para escalar el dibujo — no representan una talla "estándar".
const REF_SHOULDER = 40;
const REF_WAIST = 75;
const REF_HIPS = 95;

/**
 * Silueta proporcional a las medidas, no un modelo 3D fotorrealista — ver
 * docs/ARCHITECTURE.md sobre el alcance real del módulo de medición corporal.
 */
export function BodySilhouette({ shoulderWidthCm, waistCm, hipsCm }: Props) {
  const shoulderHalf = 55 * (shoulderWidthCm / REF_SHOULDER);
  const waistHalf = 38 * (waistCm / REF_WAIST);
  const hipHalf = 50 * (hipsCm / REF_HIPS);
  const cx = 150;

  const path = `
    M ${cx - shoulderHalf * 0.4},40
    Q ${cx - shoulderHalf},60 ${cx - shoulderHalf},95
    Q ${cx - waistHalf * 1.1},170 ${cx - waistHalf},250
    Q ${cx - hipHalf * 1.05},290 ${cx - hipHalf},340
    L ${cx - hipHalf * 0.9},420
    L ${cx + hipHalf * 0.9},420
    L ${cx + hipHalf},340
    Q ${cx + hipHalf * 1.05},290 ${cx + waistHalf},250
    Q ${cx + waistHalf * 1.1},170 ${cx + shoulderHalf},95
    Q ${cx + shoulderHalf},60 ${cx + shoulderHalf * 0.4},40
    Q ${cx},20 ${cx - shoulderHalf * 0.4},40
    Z
  `;

  return (
    <svg viewBox="0 0 300 460" width="100%" height="360" role="img" aria-label="Silueta proporcional a tus medidas">
      <circle cx={cx} cy="18" r="16" fill="#D4AF37" opacity="0.9" />
      <path d={path} fill="#F1ECE1" stroke="#D4AF37" strokeWidth="2.5" />
      <line x1={cx - shoulderHalf} y1="95" x2={cx + shoulderHalf} y2="95" stroke="#6B6455" strokeDasharray="4 3" strokeWidth="1" />
      <line x1={cx - waistHalf} y1="250" x2={cx + waistHalf} y2="250" stroke="#6B6455" strokeDasharray="4 3" strokeWidth="1" />
      <line x1={cx - hipHalf} y1="340" x2={cx + hipHalf} y2="340" stroke="#6B6455" strokeDasharray="4 3" strokeWidth="1" />
    </svg>
  );
}
