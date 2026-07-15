'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Navbar } from '@/components/Navbar';
import type { RootState } from '@/store/store';
import { useGetOrderQuery, useLazyGetCheckoutLinkQuery, useSimulatePaymentMutation } from '@/store/api/apiSlice';

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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: order, isLoading, refetch } = useGetOrderQuery(id, { skip: !user });
  const [getCheckoutLink, { isFetching: loadingLink }] = useLazyGetCheckoutLinkQuery();
  const [simulatePayment, { isLoading: simulating }] = useSimulatePaymentMutation();

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    }
  }, [user, router]);

  async function handlePayWithWompi() {
    const result = await getCheckoutLink(id).unwrap();
    window.location.href = result.checkoutUrl;
  }

  async function handleSimulate(approve: boolean) {
    await simulatePayment({ orderId: id, approve }).unwrap();
    refetch();
  }

  if (!user || isLoading || !order) {
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
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            Pedido
          </Typography>
          <Chip label={STATUS_LABEL[order.status]} color={STATUS_COLOR[order.status]} />
        </Stack>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Prenda</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.productName}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {item.sku}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{currencyFormatter.format(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Divider sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Subtotal</Typography>
            <Typography variant="body2">{currencyFormatter.format(order.subtotal)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Envío</Typography>
            <Typography variant="body2">
              {order.shippingCost === 0 ? 'Gratis' : currencyFormatter.format(order.shippingCost)}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Total
            </Typography>
            <Typography variant="subtitle1" fontWeight={700} color="primary.main">
              {currencyFormatter.format(order.total)}
            </Typography>
          </Stack>

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Envío a {order.shippingFullName} · {order.shippingAddress}, {order.shippingCity} · {order.shippingPhone}
          </Typography>
        </Paper>

        {order.status === 'pending_payment' && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Completar pago
            </Typography>
            <Button variant="contained" size="large" fullWidth onClick={handlePayWithWompi} disabled={loadingLink} sx={{ mb: 2 }}>
              Pagar con Wompi
            </Button>

            <Alert severity="info" sx={{ mb: 2 }}>
              Esta demo no tiene una cuenta real de Wompi conectada. Usa el simulador de pago para probar el flujo
              completo (confirmación, descuento de stock, notificación).
            </Alert>
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" color="success" fullWidth disabled={simulating} onClick={() => handleSimulate(true)}>
                Simular pago aprobado
              </Button>
              <Button variant="outlined" color="error" fullWidth disabled={simulating} onClick={() => handleSimulate(false)}>
                Simular pago rechazado
              </Button>
            </Stack>
          </Paper>
        )}

        {order.status === 'paid' && (
          <Alert severity="success">
            ¡Gracias por tu compra! Te enviamos la confirmación a tu correo y WhatsApp.
          </Alert>
        )}
        {order.status === 'failed' && (
          <Alert severity="error">El pago no se pudo confirmar. Puedes volver al catálogo e intentarlo de nuevo.</Alert>
        )}
      </Container>
    </>
  );
}
