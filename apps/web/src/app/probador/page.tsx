'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Navbar } from '@/components/Navbar';

type ViewMode = 'front' | 'side' | 'back';
type GarmentKind = 'blusa' | 'chaqueta' | 'vestido';

export default function VirtualTryOnPage() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mannequinRef = useRef<THREE.Group | null>(null);
  const clothRef = useRef<THREE.Mesh | null>(null);
  const targetRotationRef = useRef(0);

  const [viewMode, setViewMode] = useState<ViewMode>('front');
  const [garmentKind, setGarmentKind] = useState<GarmentKind>('blusa');
  const [clothColor, setClothColor] = useState('#d4af37');
  const [animateBody, setAnimateBody] = useState(true);
  const [xrSupported, setXrSupported] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      const xrNavigator = navigator as Navigator & { xr?: { isSessionSupported: (mode: string) => Promise<boolean> } };
      xrNavigator.xr
        ?.isSessionSupported('immersive-ar')
        .then((supported) => {
          if (mounted) setXrSupported(supported);
        })
        .catch(() => {
          if (mounted) setXrSupported(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f7f6f2');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

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
    floor.position.y = -1.15;
    floor.receiveShadow = true;
    scene.add(floor);

    const mannequin = new THREE.Group();

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 1.05, 8, 16),
      new THREE.MeshStandardMaterial({ color: '#f1d4c5', roughness: 0.85 }),
    );
    torso.castShadow = true;
    mannequin.add(torso);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 28, 28),
      new THREE.MeshStandardMaterial({ color: '#f1d4c5', roughness: 0.85 }),
    );
    head.position.y = 0.95;
    head.castShadow = true;
    mannequin.add(head);

    const leftArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.1, 0.65, 6, 14),
      new THREE.MeshStandardMaterial({ color: '#f1d4c5', roughness: 0.85 }),
    );
    leftArm.position.set(-0.56, 0.1, 0);
    leftArm.rotation.z = Math.PI / 9;
    leftArm.castShadow = true;
    mannequin.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = 0.56;
    rightArm.rotation.z = -Math.PI / 9;
    mannequin.add(rightArm);

    const leftLeg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.88, 6, 14),
      new THREE.MeshStandardMaterial({ color: '#f1d4c5', roughness: 0.85 }),
    );
    leftLeg.position.set(-0.2, -0.95, 0);
    leftLeg.castShadow = true;
    mannequin.add(leftLeg);

    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.2;
    mannequin.add(rightLeg);

    const cloth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.58, 1.15, 32, 8, true),
      new THREE.MeshStandardMaterial({
        color: clothColor,
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.05,
      }),
    );
    cloth.position.y = -0.05;
    cloth.castShadow = true;
    mannequin.add(cloth);

    scene.add(mannequin);

    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      if (!rendererRef.current) return;
      requestAnimationFrame(animate);

      if (mannequinRef.current) {
        const current = mannequinRef.current.rotation.y;
        mannequinRef.current.rotation.y += (targetRotationRef.current - current) * 0.08;
        if (animateBody) {
          mannequinRef.current.position.y = Math.sin(elapsed * 1.4) * 0.03;
        } else {
          mannequinRef.current.position.y += (0 - mannequinRef.current.position.y) * 0.15;
        }
      }

      renderer.render(scene, camera);
    };

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    mannequinRef.current = mannequin;
    clothRef.current = cloth;

    animate();

    const onResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = 520;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
      rendererRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
      mannequinRef.current = null;
      clothRef.current = null;
    };
  }, [animateBody, clothColor]);

  useEffect(() => {
    if (!clothRef.current) return;
    const material = clothRef.current.material;
    if (!(material instanceof THREE.MeshStandardMaterial)) return;

    let geometry: THREE.BufferGeometry;
    if (garmentKind === 'chaqueta') {
      geometry = new THREE.CylinderGeometry(0.66, 0.62, 1.2, 32, 8, true);
      clothRef.current.position.y = -0.02;
    } else if (garmentKind === 'vestido') {
      geometry = new THREE.CylinderGeometry(0.55, 0.86, 1.55, 32, 8, true);
      clothRef.current.position.y = -0.35;
    } else {
      geometry = new THREE.CylinderGeometry(0.62, 0.58, 1.15, 32, 8, true);
      clothRef.current.position.y = -0.05;
    }

    clothRef.current.geometry.dispose();
    clothRef.current.geometry = geometry;
  }, [garmentKind]);

  useEffect(() => {
    if (!clothRef.current) return;
    const material = clothRef.current.material;
    if (material instanceof THREE.MeshStandardMaterial) {
      material.color = new THREE.Color(clothColor);
      material.needsUpdate = true;
    }
  }, [clothColor]);

  useEffect(() => {
    if (viewMode === 'front') targetRotationRef.current = 0;
    if (viewMode === 'side') targetRotationRef.current = Math.PI / 2;
    if (viewMode === 'back') targetRotationRef.current = Math.PI;
  }, [viewMode]);

  const xrLabel = useMemo(() => {
    return xrSupported ? 'WebXR disponible en este navegador' : 'WebXR no disponible aqui (usa Android Chrome con soporte ARCore)';
  }, [xrSupported]);

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Probador virtual 3D (MVP Fase 2)
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Visualiza la prenda en avatar 3D, cambia vista frontal/lateral/posterior y simula movimiento base.
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          {xrLabel}
        </Alert>

        <Stack spacing={3}>
          <Paper sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                select
                label="Tipo de prenda"
                value={garmentKind}
                onChange={(e) => setGarmentKind(e.target.value as GarmentKind)}
                size="small"
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="blusa">Blusa</MenuItem>
                <MenuItem value="chaqueta">Chaqueta</MenuItem>
                <MenuItem value="vestido">Vestido</MenuItem>
              </TextField>

              <TextField
                label="Color de tela"
                type="color"
                value={clothColor}
                onChange={(e) => setClothColor(e.target.value)}
                size="small"
                sx={{ width: 120 }}
              />

              <ButtonGroup variant="outlined" aria-label="vista del avatar">
                <Button onClick={() => setViewMode('front')}>Frontal</Button>
                <Button onClick={() => setViewMode('side')}>Lateral</Button>
                <Button onClick={() => setViewMode('back')}>Posterior</Button>
              </ButtonGroup>

              <Button variant={animateBody ? 'contained' : 'outlined'} onClick={() => setAnimateBody((prev) => !prev)}>
                {animateBody ? 'Movimiento activo' : 'Activar movimiento'}
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Box ref={mountRef} sx={{ width: '100%', minHeight: 520, borderRadius: 2, overflow: 'hidden' }} />
          </Paper>
        </Stack>
      </Container>
    </>
  );
}
