export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// Índices del modelo BlazePose (33 puntos) que usa MediaPipe Pose Landmarker.
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;
const NOSE = 0;

const MIN_VISIBILITY = 0.6;

export interface BodyMeasurements {
  heightCm: number;
  bustCm: number;
  waistCm: number;
  hipsCm: number;
  shoulderWidthCm: number;
  armLengthCm: number;
}

/** Se lanza cuando la foto no permite una calibración confiable (ver computeMeasurements). */
export class UnreliablePhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnreliablePhotoError';
  }
}

function pixelDistance(a: NormalizedLandmark, b: NormalizedLandmark, width: number, height: number): number {
  const dx = (a.x - b.x) * width;
  const dy = (a.y - b.y) * height;
  const dz = (a.z - b.z) * width; // z usa la misma escala que x en MediaPipe
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function assertVisible(landmark: NormalizedLandmark, label: string): void {
  if (landmark.visibility !== undefined && landmark.visibility < MIN_VISIBILITY) {
    throw new UnreliablePhotoError(
      `No se detectó "${label}" con suficiente confianza. Usa una foto de cuerpo completo, de pie, de frente, donde se vean tus pies.`,
    );
  }
}

/**
 * Estima medidas corporales a partir de landmarks 2D de pose (frontal, de pie) y la
 * estatura real ingresada por la usuaria (se usa como referencia de calibración
 * píxel→cm, ya que una sola foto 2D no tiene escala absoluta).
 *
 * Esto es una ESTIMACIÓN HEURÍSTICA, no una medición clínica: las circunferencias
 * (busto/cintura/cadera) se derivan del ancho frontal detectado multiplicado por un
 * factor de corrección elíptica típico en antropometría 2D-a-3D. El margen de error
 * esperado es de ~5-10%, suficiente para recomendar una talla pero no para confección
 * a medida. Ver docs/ARCHITECTURE.md.
 *
 * Lanza UnreliablePhotoError si algún punto clave usado para calibrar (nariz, tobillos,
 * hombros, cadera) tiene baja confianza — MediaPipe igual devuelve una posición "adivinada"
 * para puntos fuera de cuadro, y usarla sin filtrar produce medidas absurdas en vez de
 * fallar de forma honesta.
 */
export function computeMeasurements(
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number,
  userHeightCm: number,
): BodyMeasurements {
  const nose = landmarks[NOSE];
  const leftAnkle = landmarks[LEFT_ANKLE];
  const rightAnkle = landmarks[RIGHT_ANKLE];
  const leftShoulder = landmarks[LEFT_SHOULDER];
  const rightShoulder = landmarks[RIGHT_SHOULDER];
  const leftHip = landmarks[LEFT_HIP];
  const rightHip = landmarks[RIGHT_HIP];
  const leftElbow = landmarks[LEFT_ELBOW];
  const rightElbow = landmarks[RIGHT_ELBOW];
  const leftWrist = landmarks[LEFT_WRIST];
  const rightWrist = landmarks[RIGHT_WRIST];

  assertVisible(nose, 'tu cabeza');
  assertVisible(leftAnkle, 'tu tobillo izquierdo');
  assertVisible(rightAnkle, 'tu tobillo derecho');
  assertVisible(leftShoulder, 'tu hombro izquierdo');
  assertVisible(rightShoulder, 'tu hombro derecho');
  assertVisible(leftHip, 'tu cadera izquierda');
  assertVisible(rightHip, 'tu cadera derecha');

  const ankleY = ((leftAnkle.y + rightAnkle.y) / 2) * imageHeight;
  const noseY = nose.y * imageHeight;
  // De nariz a tobillo falta la parte superior de la cabeza y el pie bajo el tobillo;
  // 1.15 es un factor de corrección estándar usado en estimación de estatura por pose.
  const pixelHeight = (ankleY - noseY) * 1.15;
  const pixelsPerCm = pixelHeight / userHeightCm;

  const shoulderWidthPx = pixelDistance(leftShoulder, rightShoulder, imageWidth, imageHeight);
  const hipWidthPx = pixelDistance(leftHip, rightHip, imageWidth, imageHeight);
  const armLengthPx =
    (pixelDistance(leftShoulder, leftElbow, imageWidth, imageHeight) +
      pixelDistance(leftElbow, leftWrist, imageWidth, imageHeight) +
      pixelDistance(rightShoulder, rightElbow, imageWidth, imageHeight) +
      pixelDistance(rightElbow, rightWrist, imageWidth, imageHeight)) /
    2;

  const shoulderWidthCm = shoulderWidthPx / pixelsPerCm;
  const hipWidthCm = hipWidthPx / pixelsPerCm;
  const armLengthCm = armLengthPx / pixelsPerCm;

  const chestWidthCm = shoulderWidthCm * 0.85;
  const waistWidthCm = hipWidthCm * 0.82;

  const measurements: BodyMeasurements = {
    heightCm: userHeightCm,
    shoulderWidthCm: round1(shoulderWidthCm),
    armLengthCm: round1(armLengthCm),
    bustCm: round1(chestWidthCm * 2.9),
    waistCm: round1(waistWidthCm * 2.8),
    hipsCm: round1(hipWidthCm * 2.95),
  };

  assertPlausible(measurements);
  return measurements;
}

/**
 * Red de seguridad final: aunque la visibilidad de cada landmark sea alta, una pose no
 * frontal (girada, inclinada) puede seguir produciendo una calibración mala. Si el
 * resultado cae fuera de rangos humanos razonables, es más honesto fallar y pedir otra
 * foto que mostrar un número absurdo con apariencia de medición real.
 */
function assertPlausible(m: BodyMeasurements): void {
  const inRange = (value: number, min: number, max: number) => value >= min && value <= max;
  const ok =
    inRange(m.shoulderWidthCm, 25, 55) &&
    inRange(m.armLengthCm, 35, 75) &&
    inRange(m.bustCm, 60, 140) &&
    inRange(m.waistCm, 50, 130) &&
    inRange(m.hipsCm, 60, 150);

  if (!ok) {
    throw new UnreliablePhotoError(
      'No pudimos calcular medidas confiables con esta foto. Usa una foto de cuerpo completo, de pie, de frente, con buena luz y los brazos ligeramente separados del cuerpo.',
    );
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
