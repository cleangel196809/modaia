'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import type { RootState } from '@/store/store';
import { useGetAllOrdersQuery, type OrderStatus } from '@/store/api/apiSlice';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const STATUS_TABS: (OrderStatus | 'all')[] = ['all', 'pending_payment', 'paid', 'failed', 'cancelled'];

const STATUS_LABEL: Record<string, string> = {
  all: 'Todos',
  pending_payment: 'Pendientes',
  paid: 'Pagados',
  failed: 'Fallidos',
  cancelled: 'Cancelados',
};

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  pending_payment: 'warning',
  paid: 'success',
  failed: 'error',
  cancelled: 'default',
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const [tab, setTab] = useState<OrderStatus | 'all'>('all');
  const { data: orders, isLoading } = useGetAllOrdersQuery(tab === 'all' ? undefined : { status: tab });

  if (user?.role !== 'admin') {
    return <Alert severity="error">Solo un administrador puede ver todos los pedidos.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Pedidos
      </Typography>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        {STATUS_TABS.map((status) => (
          <Tab key={status} value={status} label={STATUS_LABEL[status]} />
        ))}
      </Tabs>

      {isLoading && <CircularProgress />}
      {!isLoading && orders?.length === 0 && <Alert severity="info">No hay pedidos en este estado.</Alert>}

      {orders && orders.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Ciudad</TableCell>
              <TableCell align="right">Prendas</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} hover sx={{ cursor: 'pointer' }} onClick={() => router.push(`/pedidos/${order.id}`)}>
                <TableCell>{new Date(order.createdAt).toLocaleDateString('es-CO')}</TableCell>
                <TableCell>{order.shippingFullName}</TableCell>
                <TableCell>{order.shippingCity}</TableCell>
                <TableCell align="right">{order.items.length}</TableCell>
                <TableCell align="right">{currencyFormatter.format(order.total)}</TableCell>
                <TableCell align="right">
                  <Chip label={STATUS_LABEL[order.status]} color={STATUS_COLOR[order.status]} size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
