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

export interface BodyMeasurements {
  heightCm: number;
  bustCm: number;
  waistCm: number;
  hipsCm: number;
  shoulderWidthCm: number;
  armLengthCm: number;
}

function pixelDistance(a: NormalizedLandmark, b: NormalizedLandmark, width: number, height: number): number {
  const dx = (a.x - b.x) * width;
  const dy = (a.y - b.y) * height;
  const dz = (a.z - b.z) * width; // z usa la misma escala que x en MediaPipe
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
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

  return {
    heightCm: userHeightCm,
    shoulderWidthCm: round1(shoulderWidthCm),
    armLengthCm: round1(armLengthCm),
    bustCm: round1(chestWidthCm * 2.9),
    waistCm: round1(waistWidthCm * 2.8),
    hipsCm: round1(hipWidthCm * 2.95),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
