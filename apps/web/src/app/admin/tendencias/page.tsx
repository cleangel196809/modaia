'use client';

import { Box, Typography, Paper, Grid, LinearProgress, Stack, Alert, CircularProgress } from '@mui/material';
import { useGetTrendsQuery, type TrendItem } from '@/store/api/apiSlice';

function TrendList({ title, items }: { title: string; items: TrendItem[] }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <Stack spacing={1.5}>
        {items.map((item) => (
          <Box key={item.label}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">{item.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.score}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={item.score} sx={{ height: 6, borderRadius: 3 }} />
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

export default function TrendsPage() {
  const { data: trends, isLoading } = useGetTrendsQuery();

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        IA de tendencias
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        {trends?.disclaimer ??
          'Datos de ejemplo — no hay una cuenta de Instagram/TikTok/Pinterest/Google Trends conectada todavía.'}{' '}
        Esta pantalla muestra un dataset fijo para dejar armado el contrato de API y la interfaz; conectar las
        fuentes reales es un cambio de un solo servicio en el backend (`TrendsService`).
      </Alert>

      {isLoading && <CircularProgress />}

      {trends && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TrendList title="Colores" items={trends.colors} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TrendList title="Estilos" items={trends.styles} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TrendList title="Hashtags" items={trends.hashtags} />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
