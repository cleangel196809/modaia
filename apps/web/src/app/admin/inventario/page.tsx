'use client';

import Link from 'next/link';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Alert } from '@mui/material';
import { useGetLowStockAlertsQuery } from '@/store/api/apiSlice';

export default function AdminInventoryPage() {
  const { data: alerts, isLoading } = useGetLowStockAlertsQuery();

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Alertas de stock bajo
      </Typography>

      {!isLoading && alerts?.length === 0 && <Alert severity="success">Todo el inventario está por encima del umbral mínimo.</Alert>}

      {alerts && alerts.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="right">Umbral mínimo</TableCell>
              <TableCell align="right">Tiempo de entrega</TableCell>
              <TableCell>Fecha de reposición</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>{product.sku}</TableCell>
                <TableCell>
                  <Link href={`/admin/productos/${product.id}`}>{product.name}</Link>
                </TableCell>
                <TableCell align="right">
                  <Chip label={product.stock} color="warning" size="small" />
                </TableCell>
                <TableCell align="right">{product.lowStockThreshold}</TableCell>
                <TableCell align="right">{product.leadTimeDays} días</TableCell>
                <TableCell>{product.restockDate ?? 'Sin definir'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
