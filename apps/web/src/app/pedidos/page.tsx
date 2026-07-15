'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Box, Container, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Alert, CircularProgress } from '@mui/material';
import { Navbar } from '@/components/Navbar';
import type { RootState } from '@/store/store';
import { useGetMyOrdersQuery } from '@/store/api/apiSlice';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  failed: 'Pago fallido',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  pending_payment: 'warning',
  paid: 'success',
  failed: 'error',
  cancelled: 'default',
};

export default function MyOrdersPage() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: orders, isLoading } = useGetMyOrdersQuery(undefined, { skip: !user });

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user || isLoading) {
    return (
      <>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Mis pedidos
        </Typography>

        {orders?.length === 0 && (
          <Alert severity="info">
            Todavía no has hecho ningún pedido. <a href="/">Ver catálogo</a>.
          </Alert>
        )}

        {orders && orders.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Prendas</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  hover
                  onClick={() => router.push(`/pedidos/${order.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{new Date(order.createdAt).toLocaleDateString('es-CO')}</TableCell>
                  <TableCell>{order.items.length} prenda(s)</TableCell>
                  <TableCell align="right">{currencyFormatter.format(order.total)}</TableCell>
                  <TableCell align="right">
                    <Chip label={STATUS_LABEL[order.status]} color={STATUS_COLOR[order.status]} size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Container>
    </>
  );
}
