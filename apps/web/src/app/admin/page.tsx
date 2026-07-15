'use client';

import { Grid, Paper, Typography, Box } from '@mui/material';
import { useGetProductsQuery, useGetLowStockAlertsQuery, useGetCategoriesQuery } from '@/store/api/apiSlice';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700}>
        {value}
      </Typography>
    </Paper>
  );
}

export default function AdminDashboardPage() {
  const { data: products } = useGetProductsQuery({ limit: 1 });
  const { data: lowStock } = useGetLowStockAlertsQuery();
  const { data: categories } = useGetCategoriesQuery();

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Resumen
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <StatCard label="Productos activos" value={products?.total ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Categorías" value={categories?.length ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard label="Alertas de stock bajo" value={lowStock?.length ?? '—'} />
        </Grid>
      </Grid>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        Este es el módulo core (auth, catálogo, inventario). Los módulos de medición corporal IA, probador
        virtual 3D, marketplace de proveedores y marketing automatizado se construyen sobre esta base — ver
        docs/ROADMAP.md.
      </Typography>
    </Box>
  );
}
