'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Navbar } from '@/components/Navbar';
import type { RootState } from '@/store/store';
import { useGetMyBodyProfileQuery, useRecommendSizeMutation } from '@/store/api/apiSlice';

type FitStyle = 'comfort' | 'regular' | 'slim';

export default function SizeAdvisorPage() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: profile, isError: profileError } = useGetMyBodyProfileQuery(undefined, { skip: !user });
  const [recommendSize, { data: recommendation, isLoading, error }] = useRecommendSizeMutation();

  const [productId, setProductId] = useState('');
  const [stylePreference, setStylePreference] = useState<FitStyle>('regular');
  const [bustCm, setBustCm] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [hipsCm, setHipsCm] = useState('');

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (!profile) return;
    setBustCm(String(profile.bustCm));
    setWaistCm(String(profile.waistCm));
    setHipsCm(String(profile.hipsCm));
  }, [profile]);

  const canSubmit = useMemo(() => {
    return bustCm.trim().length > 0 && waistCm.trim().length > 0 && hipsCm.trim().length > 0;
  }, [bustCm, waistCm, hipsCm]);

  if (!user) return null;

  async function handleRecommend() {
    await recommendSize({
      productId: productId.trim() || undefined,
      stylePreference,
      bustCm: Number(bustCm),
      waistCm: Number(waistCm),
      hipsCm: Number(hipsCm),
    }).unwrap();
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Motor IA de tallas
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Calcula talla ideal, compatibilidad y riesgo de devolucion usando tu perfil corporal.
        </Typography>

        {profileError && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No hay mediciones guardadas. Puedes diligenciar medidas manuales o ir a "Mis medidas".
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <TextField
                  label="ID del producto (opcional)"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  size="small"
                  helperText="Si lo envias, el motor recomienda solo entre tallas disponibles en ese producto"
                />
                <TextField
                  select
                  label="Preferencia de ajuste"
                  size="small"
                  value={stylePreference}
                  onChange={(e) => setStylePreference(e.target.value as FitStyle)}
                >
                  <MenuItem value="comfort">Comodo</MenuItem>
                  <MenuItem value="regular">Regular</MenuItem>
                  <MenuItem value="slim">Slim</MenuItem>
                </TextField>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="Busto (cm)"
                      value={bustCm}
                      onChange={(e) => setBustCm(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="Cintura (cm)"
                      value={waistCm}
                      onChange={(e) => setWaistCm(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="Cadera (cm)"
                      value={hipsCm}
                      onChange={(e) => setHipsCm(e.target.value)}
                    />
                  </Grid>
                </Grid>
                <Button variant="contained" onClick={handleRecommend} disabled={!canSubmit || isLoading}>
                  {isLoading ? 'Calculando...' : 'Calcular talla ideal'}
                </Button>
                {error && <Alert severity="error">No fue posible generar la recomendacion.</Alert>}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, minHeight: 320 }}>
              {!recommendation ? (
                <Typography color="text.secondary">Aun no hay recomendacion. Completa el formulario y calcula.</Typography>
              ) : (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Talla sugerida
                    </Typography>
                    <Typography variant="h3" fontWeight={700}>
                      {recommendation.recommendedSize}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip label={`Compatibilidad ${recommendation.compatibilityPercent}%`} color="primary" />
                    <Chip label={`Ajuste ${recommendation.fit}`} variant="outlined" />
                    <Chip
                      label={`Riesgo devolucion ${recommendation.returnRisk}`}
                      color={recommendation.returnRisk === 'low' ? 'success' : recommendation.returnRisk === 'medium' ? 'warning' : 'error'}
                    />
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    {recommendation.message}
                  </Typography>

                  {recommendation.product && (
                    <Alert severity="info">Evaluado sobre: {recommendation.product.name} ({recommendation.product.sku})</Alert>
                  )}

                  <Divider />
                  <Typography variant="subtitle2">Alternativas</Typography>
                  <Stack spacing={1}>
                    {recommendation.alternatives.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No hay alternativas cercanas.
                      </Typography>
                    )}
                    {recommendation.alternatives.map((option) => (
                      <Box key={option.size} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Talla {option.size}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.compatibilityPercent}% · {option.fit}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
