import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/**
 * Corre 100% en el navegador (WASM) — no requiere API key ni backend de IA.
 * El modelo (.task) y el runtime WASM se descargan una vez desde el CDN de Google
 * la primera vez que se usa, y quedan cacheados por el navegador.
 */
export function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm',
      );
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        numPoses: 1,
      });
    })();
  }
  return landmarkerPromise;
}
