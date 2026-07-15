'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import { Navbar } from '@/components/Navbar';
import { BodySilhouette } from '@/components/BodySilhouette';
import type { RootState } from '@/store/store';
import { useCreateBodyProfileMutation, useGetMyBodyProfileQuery } from '@/store/api/apiSlice';
import { getPoseLandmarker } from '@/lib/poseLandmarker';
import { computeMeasurements, type BodyMeasurements, type NormalizedLandmark } from '@/lib/bodyMeasurement';

const CONNECTIONS: [number, number][] = [
  [11, 12], // hombros
  [11, 13],
  [13, 15], // brazo izq
  [12, 14],
  [14, 16], // brazo der
  [23, 24], // cadera
  [11, 23],
  [12, 24], // torso
];

export default function BodyMeasurementPage() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: savedProfile } = useGetMyBodyProfileQuery(undefined, { skip: !user });
  const [createBodyProfile, { isLoading: saving, isSuccess: saved }] = useCreateBodyProfileMutation();

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('165');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<BodyMeasurements | null>(null);

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    }
  }, [user, router]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
    setMeasurements(null);
    setError(null);
  }

  async function handleAnalyze() {
    if (!imgRef.current) return;
    const height = Number(heightCm);
    if (!height || height < 100 || height > 220) {
      setError('Ingresa una estatura válida en centímetros.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    try {
      const landmarker = await getPoseLandmarker();
      const image = imgRef.current;
      await image.decode();

      const result = landmarker.detect(image);
      const landmarks = result.landmarks?.[0] as NormalizedLandmark[] | undefined;

      if (!landmarks) {
        setError('No pudimos detectar tu cuerpo en la foto. Usa una foto de cuerpo completo, de frente y bien iluminada.');
        setAnalyzing(false);
        return;
      }

      const computed = computeMeasurements(landmarks, image.naturalWidth, image.naturalHeight, height);
      setMeasurements(computed);
      drawOverlay(landmarks, image);
    } catch (err) {
      setError('Ocurrió un error analizando la foto. Intenta de nuevo.');
    } finally {
      setAnalyzing(false);
    }
  }

  function drawOverlay(landmarks: NormalizedLandmark[], image: HTMLImageElement) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    for (const [a, b] of CONNECTIONS) {
      const pa = landmarks[a];
      const pb = landmarks[b];
      ctx.beginPath();
      ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
      ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
      ctx.stroke();
    }
    ctx.fillStyle = '#111111';
    for (const idx of [0, 11, 12, 13, 14, 15, 16, 23, 24, 27, 28]) {
      const p = landmarks[idx];
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  async function handleSave() {
    if (!measurements) return;
    await createBodyProfile({ ...measurements, source: 'mediapipe-estimate' }).unwrap();
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Medición corporal con IA
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          El análisis corre en tu navegador (MediaPipe) a partir de una foto y tu estatura — es una{' '}
          <strong>estimación</strong> (margen de error ~5-10%), útil para recomendarte talla, no un reemplazo de una
          medición profesional.
        </Alert>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <TextField
                  label="Tu estatura (cm)"
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  size="small"
                />
                <Button variant="outlined" component="label">
                  Subir foto de cuerpo completo
                  <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                </Button>

                {photoUrl && (
                  <Box sx={{ position: 'relative', maxWidth: '100%' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imgRef}
                      src={photoUrl}
                      alt="Foto para medición"
                      crossOrigin="anonymous"
                      style={{ maxWidth: '100%', display: 'block' }}
                    />
                    <canvas
                      ref={canvasRef}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    />
                  </Box>
                )}

                {error && <Alert severity="error">{error}</Alert>}

                <Button variant="contained" onClick={handleAnalyze} disabled={!photoUrl || analyzing}>
                  {analyzing ? <CircularProgress size={20} /> : 'Analizar foto'}
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              {measurements ? (
                <>
                  <BodySilhouette
                    shoulderWidthCm={measurements.shoulderWidthCm}
                    waistCm={measurements.waistCm}
                    hipsCm={measurements.hipsCm}
                  />
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={0.5} sx={{ textAlign: 'left' }}>
                    <Typography variant="body2">Busto: <strong>{measurements.bustCm} cm</strong></Typography>
                    <Typography variant="body2">Cintura: <strong>{measurements.waistCm} cm</strong></Typography>
                    <Typography variant="body2">Cadera: <strong>{measurements.hipsCm} cm</strong></Typography>
                    <Typography variant="body2">Hombros: <strong>{measurements.shoulderWidthCm} cm</strong></Typography>
                    <Typography variant="body2">Largo de brazo: <strong>{measurements.armLengthCm} cm</strong></Typography>
                  </Stack>
                  <Button variant="contained" color="success" fullWidth sx={{ mt: 2 }} onClick={handleSave} disabled={saving}>
                    Guardar medición
                  </Button>
                  {saved && <Alert severity="success" sx={{ mt: 2 }}>Medición guardada.</Alert>}
                </>
              ) : savedProfile ? (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Última medición guardada
                  </Typography>
                  <BodySilhouette
                    shoulderWidthCm={savedProfile.shoulderWidthCm}
                    waistCm={savedProfile.waistCm}
                    hipsCm={savedProfile.hipsCm}
                  />
                  <Stack spacing={0.5} sx={{ textAlign: 'left', mt: 2 }}>
                    <Typography variant="body2">Busto: <strong>{savedProfile.bustCm} cm</strong></Typography>
                    <Typography variant="body2">Cintura: <strong>{savedProfile.waistCm} cm</strong></Typography>
                    <Typography variant="body2">Cadera: <strong>{savedProfile.hipsCm} cm</strong></Typography>
                  </Stack>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sube una foto y analízala para ver tu silueta y medidas estimadas.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
