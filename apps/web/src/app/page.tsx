'use client';

import { useState } from 'react';
import { Box, Container, Grid, MenuItem, TextField, Typography, CircularProgress, Alert } from '@mui/material';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { useGetCategoriesQuery, useGetProductsQuery } from '@/store/api/apiSlice';

export default function HomePage() {
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');

  const { data: categories } = useGetCategoriesQuery();
  const {
    data: products,
    isLoading,
    isError,
  } = useGetProductsQuery({ categoryId: categoryId || undefined, search: search || undefined });

  return (
    <>
      <Navbar />

      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" fontWeight={700}>
            Moda colombiana, hecha a tu medida
          </Typography>
          <Typography variant="h6" sx={{ mt: 1, opacity: 0.9 }}>
            Medicion corporal IA, motor de tallas y probador virtual 3D activos en Fase 2.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <TextField
            select
            label="Categoría"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            sx={{ minWidth: 220 }}
            size="small"
          >
            <MenuItem value="">Todas</MenuItem>
            {categories?.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Buscar por nombre o SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
            size="small"
          />
        </Box>

        {isLoading && <CircularProgress />}
        {isError && <Alert severity="error">No se pudo cargar el catálogo. Verifica que el backend esté activo.</Alert>}

        {products && products.items.length === 0 && (
          <Alert severity="info">No hay productos que coincidan con la búsqueda.</Alert>
        )}

        <Grid container spacing={3}>
          {products?.items.map((product) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
}
