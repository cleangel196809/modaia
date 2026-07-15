'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Alert, Box, Button, ButtonGroup, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import { Navbar } from '@/components/Navbar';
import { useGetProductQuery } from '@/store/api/apiSlice';
import { getVideoPoseLandmarker } from '@/lib/poseLandmarker';
import { computeTorsoTransform } from '@/lib/arOverlay';

type CameraStatus = 'idle' | 'requesting' | 'running' | 'denied' | 'error';

export default function CameraTryOnPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useGetProductQuery(id);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const garmentImgRef = useRef<HTMLImageElement | null>(null);
  const runIdRef = useRef(0);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [personDetected, setPersonDetected] = useState(false);

  useEffect(() => {
    const url = product?.images?.[0];
    if (!url) return;
    const img = new Image();
    img.src = url;
    garmentImgRef.current = img;
  }, [product]);

  function stopCamera() {
    runIdRef.current += 1;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStatus('idle');
    setPersonDetected(false);
  }

  async function startCamera() {
    setStatus('requesting');
    const myRunId = ++runIdRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      if (myRunId !== runIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setStatus('running');
      runDetectionLoop(myRunId);
    } catch (err) {
      setStatus(err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'error');
    }
  }

  async function runDetectionLoop(myRunId: number) {
    const landmarker = await getVideoPoseLandmarker();

    const loop = () => {
      if (myRunId !== runIdRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const result = landmarker.detectForVideo(video, performance.now());
      const landmarks = result.landmarks?.[0];
      const garment = garmentImgRef.current;

      let detected = false;
      if (landmarks && garment?.complete && garment.naturalWidth > 0) {
        const transform = computeTorsoTransform(landmarks, canvas.width, canvas.height);
        if (transform) {
          detected = true;
          // "Cover" en vez de estirar la foto completa al cuadro del torso: si se estira
          // el ancho y el alto por separado (como antes) la foto queda deformada, y como
          // es una foto de modelo (no un recorte plano de la prenda) se ve peor todavía.
          // Con cover se respeta la proporción real de la imagen y se recorta el sobrante.
          const imgRatio = garment.naturalWidth / garment.naturalHeight;
          const boxRatio = transform.width / transform.height;
          const drawWidth = imgRatio > boxRatio ? transform.height * imgRatio : transform.width;
          const drawHeight = imgRatio > boxRatio ? transform.height : transform.width / imgRatio;

          ctx.save();
          ctx.globalAlpha = 0.88;
          ctx.translate(transform.centerX, transform.centerY);
          ctx.rotate(transform.angleRad);
          ctx.beginPath();
          ctx.rect(-transform.width / 2, -transform.height / 2, transform.width, transform.height);
          ctx.clip();
          ctx.drawImage(garment, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
          ctx.restore();
        }
      }
      setPersonDetected(detected);

      rafRef.current = requestAnimationFrame(loop);
    };

    loop();
  }

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'running') {
      stopCamera();
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  if (isLoading || !product) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button onClick={() => router.back()} sx={{ mb: 2 }}>
          ← Volver
        </Button>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Probar &ldquo;{product.name}&rdquo; con tu cámara
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          Superposición en tiempo real ajustada a la posición y tamaño de tus hombros y torso — seguimiento corporal
          real (MediaPipe), 100% en tu navegador, sin subir video a ningún servidor. No es un recorte de silueta de
          la prenda ni una simulación física de tela. Ubícate de frente a la cámara, a media distancia, con buena luz.
        </Alert>

        {status === 'denied' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Bloqueaste el acceso a la cámara. Habilítalo en los permisos del sitio de tu navegador y vuelve a
            intentar.
          </Alert>
        )}
        {status === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No se pudo acceder a la cámara. Verifica que ningún otro programa la esté usando y que tu navegador
            tenga permiso de cámara para este sitio.
          </Alert>
        )}
        {status === 'running' && !personDetected && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            No detectamos tu torso todavía — ubícate de frente a la cámara, a media distancia, con hombros y cadera
            visibles.
          </Alert>
        )}

        <Paper sx={{ p: 2 }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4 / 3',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'grey.900',
            }}
          >
            <video ref={videoRef} playsInline muted style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />
            {status !== 'running' && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CameraAltOutlinedIcon />}
                  onClick={startCamera}
                  disabled={status === 'requesting'}
                >
                  {status === 'requesting' ? 'Solicitando cámara...' : 'Activar cámara'}
                </Button>
              </Box>
            )}
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }} justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <ButtonGroup variant="outlined" size="small" aria-label="cámara a usar">
              <Button variant={facingMode === 'user' ? 'contained' : 'outlined'} onClick={() => setFacingMode('user')}>
                Cámara frontal
              </Button>
              <Button
                variant={facingMode === 'environment' ? 'contained' : 'outlined'}
                onClick={() => setFacingMode('environment')}
              >
                Cámara trasera
              </Button>
            </ButtonGroup>
            {status === 'running' && (
              <Button color="error" onClick={stopCamera}>
                Detener cámara
              </Button>
            )}
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
