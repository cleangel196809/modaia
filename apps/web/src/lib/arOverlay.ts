import type { NormalizedLandmark } from './bodyMeasurement';

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const MIN_VISIBILITY = 0.5;

export interface TorsoTransform {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  angleRad: number;
}

/**
 * Calcula dónde/qué tan grande/con qué rotación dibujar la foto de la prenda sobre el
 * cuadro de video, a partir de los landmarks de pose de ESE cuadro (hombros + cadera).
 * Es un ajuste de posición/tamaño en tiempo real, no un recorte de silueta de la prenda
 * ni una simulación de tela — la imagen del producto se dibuja como un rectángulo
 * semitransparente encajado al torso. Devuelve null si no hay suficiente confianza en
 * los landmarks clave (persona fuera de cuadro, de espaldas, etc.).
 */
export function computeTorsoTransform(
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
): TorsoTransform | null {
  const leftShoulder = landmarks[LEFT_SHOULDER];
  const rightShoulder = landmarks[RIGHT_SHOULDER];
  const leftHip = landmarks[LEFT_HIP];
  const rightHip = landmarks[RIGHT_HIP];

  const points = [leftShoulder, rightShoulder, leftHip, rightHip];
  if (points.some((p) => !p || (p.visibility !== undefined && p.visibility < MIN_VISIBILITY))) {
    return null;
  }

  const toPx = (p: NormalizedLandmark) => ({ x: p.x * canvasWidth, y: p.y * canvasHeight });
  const ls = toPx(leftShoulder);
  const rs = toPx(rightShoulder);
  const lh = toPx(leftHip);
  const rh = toPx(rightHip);

  const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };

  const shoulderWidthPx = Math.hypot(rs.x - ls.x, rs.y - ls.y);
  const torsoHeightPx = Math.hypot(hipMid.x - shoulderMid.x, hipMid.y - shoulderMid.y);
  if (shoulderWidthPx < 1 || torsoHeightPx < 1) return null;

  // OJO: el landmark 11 ("left_shoulder") es el hombro IZQUIERDO ANATÓMICO de la persona,
  // que de frente a la cámara aparece del lado DERECHO del cuadro (como en un espejo) — es
  // decir ls.x suele ser MAYOR que rs.x. atan2(≈0, negativo) da un ángulo cercano a ±180°,
  // no a 0°, para alguien parado derecho: eso dibujaba la prenda boca abajo. La línea
  // hombro-hombro es simétrica (da igual qué punto se tome primero), así que normalizamos
  // a [-90°, 90°] — un torso inclinado más de 90° no es un caso real a soportar.
  let angleRad = Math.atan2(rs.y - ls.y, rs.x - ls.x);
  if (angleRad > Math.PI / 2) angleRad -= Math.PI;
  if (angleRad < -Math.PI / 2) angleRad += Math.PI;

  return {
    centerX: (shoulderMid.x + hipMid.x) / 2,
    centerY: (shoulderMid.y + hipMid.y) / 2,
    // La prenda visualmente cubre más que el ancho "hueso a hueso" de los hombros y baja
    // un poco más allá de la cadera — factores aproximados para que se vea proporcionada.
    width: shoulderWidthPx * 1.9,
    height: torsoHeightPx * 1.65,
    angleRad,
  };
}
