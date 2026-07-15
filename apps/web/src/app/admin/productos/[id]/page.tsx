'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  Stack,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  useGetProductQuery,
  useUpdateProductMutation,
  useAdjustStockMutation,
  useGetProductMovementsQuery,
} from '@/store/api/apiSlice';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useGetProductQuery(id);
  const { data: movements } = useGetProductMovementsQuery(id);
  const [updateProduct] = useUpdateProductMutation();
  const [adjustStock, { isLoading: adjusting, error: adjustError }] = useAdjustStockMutation();

  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  if (isLoading || !product) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  async function handleSavePricing() {
    await updateProduct({
      id,
      body: {
        ...(price ? { price: Number(price) } : {}),
        ...(cost ? { cost: Number(cost) } : {}),
      },
    }).unwrap();
    setPrice('');
    setCost('');
  }

  async function handleAdjustStock() {
    try {
      await adjustStock({ productId: id, type: movementType, quantity: Number(quantity), reason }).unwrap();
      setQuantity('');
      setReason('');
    } catch {
      // el error se muestra debajo del formulario
    }
  }

  return (
    <Box>
      <Button onClick={() => router.push('/admin/productos')} sx={{ mb: 2 }}>
        ← Volver al catálogo
      </Button>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {product.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        SKU {product.sku} · {product.category?.name}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Precio y costo
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Actual: {currencyFormatter.format(product.price)} · Costo {currencyFormatter.format(product.cost)} ·
              Margen {product.marginPercentage}%
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Nuevo precio"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                fullWidth
              />
              <TextField
                label="Nuevo costo"
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                fullWidth
              />
            </Stack>
            <Button variant="contained" sx={{ mt: 2 }} onClick={handleSavePricing} disabled={!price && !cost}>
              Guardar
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Stock actual: {product.stock} unidades
            </Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                label="Tipo de movimiento"
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as typeof movementType)}
              >
                <MenuItem value="in">Entrada (reposición)</MenuItem>
                <MenuItem value="out">Salida (venta/daño)</MenuItem>
                <MenuItem value="adjustment">Ajuste manual</MenuItem>
              </TextField>
              <TextField
                label="Cantidad"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
              {adjustError && <Alert severity="error">No se pudo registrar el movimiento.</Alert>}
              <Button variant="contained" onClick={handleAdjustStock} disabled={adjusting || !quantity}>
                Registrar movimiento
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Historial de movimientos
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Stock resultante</TableCell>
                  <TableCell>Motivo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements?.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{new Date(movement.createdAt).toLocaleString('es-CO')}</TableCell>
                    <TableCell>{movement.type}</TableCell>
                    <TableCell align="right">{movement.quantity}</TableCell>
                    <TableCell align="right">{movement.stockAfter}</TableCell>
                    <TableCell>{movement.reason ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
