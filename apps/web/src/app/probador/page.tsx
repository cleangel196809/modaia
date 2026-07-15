'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Navbar } from '@/components/Navbar';
import type { RootState } from '@/store/store';
import {
  useCreateBodyProfileMutation,
  useGetMyBodyProfileQuery,
  useGetProductQuery,
  useGetProductsQuery,
} from '@/store/api/apiSlice';
import { getPoseLandmarker } from '@/lib/poseLandmarker';
import { computeMeasurements, UnreliablePhotoError, type BodyMeasurements, type NormalizedLandmark } from '@/lib/bodyMeasurement';
import { inferGarmentKind } from '@/lib/garmentKind';
import { colorNameToHex } from '@/lib/colorNames';

// Valores de referencia usados para construir el maniquí "genérico" original — las
// medidas reales de la usuaria se expresan como proporción respecto a esto.
const REFERENCE = { shoulderCm: 40, hipCm: 95, heightCm: 165 };
const BASE_LAYER_COLOR = '#f1e9dd'; // "blusa" neutra que se ve debajo de una chaqueta

interface BodyScale {
  width: number; // ancho general del maniquí (hombros/cintura/cadera promediados)
  shoulder: number; // específico para el ancho de blusas/chaquetas
  hip: number; // específico para el ancho de faldas
  height: number;
}

function scaleFromMeasurements(m: { shoulderWidthCm: number; hipsCm: number; heightCm: number } | undefined): BodyScale {
  if (!m) return { width: 1, shoulder: 1, hip: 1, height: 1 };
  const shoulder = m.shoulderWidthCm / REFERENCE.shoulderCm;
  // hipsCm es circunferencia estimada, no ancho frontal — /2.8 aproxima de vuelta al ancho
  // frontal con el mismo factor elíptico usado al calcularla en bodyMeasurement.ts.
  const hip = m.hipsCm / 2.8 / (REFERENCE.hipCm / 2.8);
  const height = m.heightCm / REFERENCE.heightCm;
  return { width: (shoulder + hip) / 2, shoulder, hip, height };
}

export default function VirtualTryOnPage() {
  return (
    <Suspense fallback={null}>
      <VirtualTryOnPageInner />
    </Suspense>
  );
}

function VirtualTryOnPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSelector((state: RootState) => state.auth.user);

  const { data: productsPage } = useGetProductsQuery({ limit: 100 });
  const [productId, setProductId] = useState(searchParams.get('producto') ?? '');
  useEffect(() => {
    if (!productId && productsPage?.items?.length) setProductId(productsPage.items[0].id);
  }, [productId, productsPage]);

  const { data: product } = useGetProductQuery(productId, { skip: !productId });
  const garmentKind = useMemo(() => (product ? inferGarmentKind(product) : 'blusa'), [product]);

  const [colorName, setColorName] = useState('');
  useEffect(() => {
    if (product?.colors?.length) setColorName(product.colors[0]);
  }, [product]);
  const colorHex = colorNameToHex(colorName);

  const { data: savedProfile } = useGetMyBodyProfileQuery(undefined, { skip: !user });
  const [createBodyProfile, { isLoading: savingProfile, isSuccess: profileSaved }] = useCreateBodyProfileMutation();
  const [localMeasurements, setLocalMeasurements] = useState<BodyMeasurements | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [heightCm, setHeightCm] = useState('165');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const activeMeasurements = localMeasurements ?? savedProfile ?? undefined;
  const bodyScale = useMemo(() => scaleFromMeasurements(activeMeasurements), [activeMeasurements]);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bodyGroupRef = useRef<THREE.Group | null>(null);
  const garmentGroupRef = useRef<THREE.Group | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
    setLocalMeasurements(null);
    setPhotoError(null);
  }

  async function handleAnalyze() {
    if (!imgRef.current) return;
    const height = Number(heightCm);
    if (!height || height < 100 || height > 220) {
      setPhotoError('Ingresa una estatura válida en centímetros.');
      return;
    }
    setAnalyzing(true);
    setPhotoError(null);
    try {
      const landmarker = await getPoseLandmarker();
      const image = imgRef.current;
      await image.decode();
      const result = landmarker.detect(image);
      const landmarks = result.landmarks?.[0] as NormalizedLandmark[] | undefined;
      if (!landmarks) {
        setPhotoError('No pudimos detectar tu cuerpo en la foto. Usa una foto de cuerpo completo, de frente y bien iluminada.');
        return;
      }
      const computed = computeMeasurements(landmarks, image.naturalWidth, image.naturalHeight, height);
      setLocalMeasurements(computed);
    } catch (err) {
      setPhotoError(err instanceof UnreliablePhotoError ? err.message : 'Ocurrió un error analizando la foto. Intenta de nuevo.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSaveProfile() {
    if (!localMeasurements) return;
    await createBodyProfile({ ...localMeasurements, source: 'mediapipe-estimate' }).unwrap();
  }

  // --- Escena Three.js: se crea una sola vez ---
  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = 560;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f7f6f2');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.2;
    controls.maxDistance = 7;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minPolarAngle = Math.PI * 0.15;
    controls.enablePan = false;

    const hemi = new THREE.HemisphereLight('#ffffff', '#9f8f84', 1.1);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight('#ffffff', 1.5);
    keyLight.position.set(3, 5, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3, 48),
      new THREE.MeshStandardMaterial({ color: '#e8e4da', roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.4;
    floor.receiveShadow = true;
    scene.add(floor);

    const bodyGroup = new THREE.Group();
    const garmentGroup = new THREE.Group();
    scene.add(bodyGroup);
    scene.add(garmentGroup);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    bodyGroupRef.current = bodyGroup;
    garmentGroupRef.current = garmentGroup;

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      controls.dispose();
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // --- Cuerpo del maniquí: se reconstruye cuando cambia la escala corporal ---
  useEffect(() => {
    const group = bodyGroupRef.current;
    if (!group) return;
    disposeGroupChildren(group);

    const skinMaterial = new THREE.MeshStandardMaterial({ color: '#f1d4c5', roughness: 0.85 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.05, 8, 16), skinMaterial);
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 28, 28), skinMaterial);
    head.position.y = 0.95;
    head.castShadow = true;
    group.add(head);

    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.65, 6, 14), skinMaterial);
    leftArm.position.set(-0.56, 0.1, 0);
    leftArm.rotation.z = Math.PI / 9;
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = 0.56;
    rightArm.rotation.z = -Math.PI / 9;
    group.add(rightArm);

    const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.88, 6, 14), skinMaterial);
    leftLeg.position.set(-0.2, -0.95, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.2;
    group.add(rightLeg);

    group.scale.set(bodyScale.width, bodyScale.height, bodyScale.width);
  }, [bodyScale]);

  // --- Prendas: se reconstruyen cuando cambia el producto/color/tipo o la escala ---
  useEffect(() => {
    const group = garmentGroupRef.current;
    if (!group) return;
    disposeGroupChildren(group);

    const makeCloth = (
      topRadius: number,
      bottomRadius: number,
      clothHeight: number,
      centerY: number,
      color: string,
      widthScale: number,
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius * widthScale, bottomRadius * widthScale, clothHeight, 32, 8, true),
        new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.05 }),
      );
      mesh.position.y = centerY * bodyScale.height;
      mesh.castShadow = true;
      return mesh;
    };

    // Constantes calcadas de las dimensiones originales del maniquí (torso/piernas de arriba)
    // para que cada prenda quede pegada al cuerpo real, no a números inventados sueltos.
    if (garmentKind === 'blusa') {
      group.add(makeCloth(0.62, 0.58, 1.15, -0.05, colorHex, bodyScale.shoulder));
    } else if (garmentKind === 'chaqueta') {
      // Se ve la blusa base (color neutro) asomando, y la chaqueta encima con el color real.
      group.add(makeCloth(0.62, 0.58, 1.15, -0.05, BASE_LAYER_COLOR, bodyScale.shoulder));
      group.add(makeCloth(0.7, 0.66, 1.2, -0.03, colorHex, bodyScale.shoulder));
    } else if (garmentKind === 'falda') {
      group.add(makeCloth(0.5, 0.66, 0.55, -0.78, colorHex, bodyScale.hip));
    } else if (garmentKind === 'conjunto') {
      group.add(makeCloth(0.62, 0.58, 1.0, -0.1, colorHex, bodyScale.shoulder));
      group.add(makeCloth(0.5, 0.66, 0.55, -0.78, colorHex, bodyScale.hip));
    }
  }, [garmentKind, colorHex, bodyScale]);

  if (!user) {
    return (
      <>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="info">
            Inicia sesión para ver el probador 3D con tu silueta personalizada.{' '}
            <Button onClick={() => router.push('/login')}>Iniciar sesión</Button>
          </Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Probador virtual 3D
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Maniquí a escala de tu silueta real, vestido con la prenda y el color elegidos. Arrastra con el mouse o el
          dedo para rotar 360°, y usa la rueda / pellizco para acercar.
        </Typography>

        <Stack spacing={3}>
          <Paper sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                select
                label="Prenda"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                size="small"
                sx={{ minWidth: 240 }}
              >
                {productsPage?.items.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>

              {product && product.colors.length > 0 && (
                <TextField
                  select
                  label="Color"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  size="small"
                  sx={{ minWidth: 160 }}
                >
                  {product.colors.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {product && (
                <Chip
                  label={
                    { blusa: 'Blusa · de la cintura hacia arriba', falda: 'Falda · de la cadera hacia abajo', chaqueta: 'Chaqueta · sobre una blusa base', conjunto: 'Conjunto · cuerpo completo' }[
                      garmentKind
                    ]
                  }
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Paper>

          {!activeMeasurements && (
            <Alert severity="info">
              Sin una medición corporal, el maniquí usa una silueta genérica. Sube una foto para verlo con tu forma
              real.
            </Alert>
          )}
          {activeMeasurements && !showUploader && (
            <Alert
              severity="success"
              action={
                <Button size="small" onClick={() => setShowUploader(true)}>
                  Actualizar medición
                </Button>
              }
            >
              Mostrando el maniquí con {localMeasurements ? 'la medición que acabas de analizar' : 'tu última medición guardada'}.
            </Alert>
          )}

          {(showUploader || !activeMeasurements) && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Subir foto para personalizar el maniquí
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <TextField
                  label="Tu estatura (cm)"
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  size="small"
                  sx={{ maxWidth: 160 }}
                />
                <Button variant="outlined" component="label" size="small">
                  Subir foto
                  <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                </Button>
                <Button variant="contained" size="small" onClick={handleAnalyze} disabled={!photoUrl || analyzing}>
                  {analyzing ? <CircularProgress size={18} /> : 'Analizar y aplicar'}
                </Button>
                {localMeasurements && (
                  <Button variant="text" size="small" onClick={handleSaveProfile} disabled={savingProfile}>
                    Guardar medición
                  </Button>
                )}
              </Stack>
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img ref={imgRef} src={photoUrl} alt="Foto para medición" style={{ display: 'none' }} />
              )}
              {photoError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {photoError}
                </Alert>
              )}
              {profileSaved && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  Medición guardada.
                </Alert>
              )}
            </Paper>
          )}

          <Paper sx={{ p: 2 }}>
            <Box ref={mountRef} sx={{ width: '100%', minHeight: 560, borderRadius: 2, overflow: 'hidden' }} />
          </Paper>
        </Stack>
      </Container>
    </>
  );
}

function disposeGroupChildren(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else child.material.dispose();
    }
  }
}
