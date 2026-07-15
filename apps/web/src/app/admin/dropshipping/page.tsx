'use client';

import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import type { RootState } from '@/store/store';
import { useGetTopSellingQuery, useGetRestockAlertsQuery, useGetCategoryDemandQuery } from '@/store/api/apiSlice';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export default function DropshippingPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'admin';

  const { data: topSelling, isLoading: loadingTop } = useGetTopSellingQuery({ days: 30, limit: 10 });
  const { data: restockAlerts, isLoading: loadingRestock } = useGetRestockAlertsQuery({ days: 30 });
  const { data: categoryDemand, isLoading: loadingCategory } = useGetCategoryDemandQuery({ days: 30 }, { skip: !isAdmin });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Dropshipping inteligente
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Análisis en vivo de las ventas e inventario reales de {isAdmin ? 'toda la plataforma' : 'tus prendas'} —
        últimos 30 días. Nada de esto es un mock: sale de tus pedidos pagados.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={isAdmin ? 6 : 12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Productos con más ventas
            </Typography>
            {loadingTop && <CircularProgress size={24} />}
            {!loadingTop && topSelling?.length === 0 && (
              <Alert severity="info">Todavía no hay ventas pagadas en esta ventana de tiempo.</Alert>
            )}
            {topSelling && topSelling.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Prenda</TableCell>
                    <TableCell align="right">Unidades</TableCell>
                    <TableCell align="right">Ingresos</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topSelling.map((item) => (
                    <TableRow key={item.productId} hover>
                      <TableCell>
                        {item.name} <Typography variant="caption" color="text.secondary">({item.sku})</Typography>
                      </TableCell>
                      <TableCell align="right">{item.unitsSold}</TableCell>
                      <TableCell align="right">{currencyFormatter.format(item.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Alertas de reposición urgente
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Prendas que se agotarían antes de que llegue un nuevo pedido al proveedor (stock actual ÷ velocidad de
              venta {'<'} tiempo de entrega).
            </Typography>
            {loadingRestock && <CircularProgress size={24} />}
            {!loadingRestock && restockAlerts?.length === 0 && (
              <Alert severity="success">Ninguna prenda con ventas activas está en riesgo de agotarse antes de reponerse.</Alert>
            )}
            {restockAlerts && restockAlerts.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Prenda</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Ventas/día</TableCell>
                    <TableCell align="right">Días de stock</TableCell>
                    <TableCell align="right">Entrega</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {restockAlerts.map((item) => (
                    <TableRow key={item.productId} hover>
                      <TableCell>
                        {item.name} <Typography variant="caption" color="text.secondary">({item.sku})</Typography>
                      </TableCell>
                      <TableCell align="right">{item.stock}</TableCell>
                      <TableCell align="right">{item.dailyVelocity}</TableCell>
                      <TableCell align="right">
                        <Chip label={`${item.daysOfStockLeft} días`} color="warning" size="small" />
                      </TableCell>
                      <TableCell align="right">{item.leadTimeDays} días</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        {isAdmin && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Demanda por categoría
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Unidades vendidas ÷ prendas activas en la categoría — alto = pocas prendas cubriendo mucha demanda,
                candidata a sumar más catálogo.
              </Typography>
              {loadingCategory && <CircularProgress size={24} />}
              {categoryDemand && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="right">Prendas activas</TableCell>
                      <TableCell align="right">Vendidas</TableCell>
                      <TableCell align="right">Demanda/prenda</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryDemand.map((cat) => (
                      <TableRow key={cat.categoryId} hover>
                        <TableCell>{cat.categoryName}</TableCell>
                        <TableCell align="right">{cat.activeProducts}</TableCell>
                        <TableCell align="right">{cat.unitsSold}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={cat.demandPerProduct}
                            color={cat.demandPerProduct > 0 ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
