'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
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
  IconButton,
  TextField,
  Button,
  Stack,
  Alert,
  Grid,
  Divider,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Navbar } from '@/components/Navbar';
import type { RootState } from '@/store/store';
import { updateQuantity, removeItem, clearCart } from '@/store/cartSlice';
import { useCreateOrderMutation } from '@/store/api/apiSlice';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const FREE_SHIPPING_THRESHOLD = 150_000;
const FLAT_SHIPPING_COST = 12_000;

export default function CartPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const items = useSelector((state: RootState) => state.cart.items);
  const user = useSelector((state: RootState) => state.auth.user);
  const [createOrder, { isLoading, error }] = useCreateOrderMutation();

  const [shippingFullName, setShippingFullName] = useState(user?.fullName ?? '');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = items.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST;
  const total = subtotal + shippingCost;

  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      const order = await createOrder({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        shippingFullName,
        shippingPhone,
        shippingAddress,
        shippingCity,
      }).unwrap();
      dispatch(clearCart());
      router.push(`/pedidos/${order.id}`);
    } catch {
      // el error se muestra debajo del formulario
    }
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Tu carrito
        </Typography>

        {items.length === 0 ? (
          <Alert severity="info">
            Tu carrito está vacío. <a href="/">Ver catálogo</a>.
          </Alert>
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell>Talla / Color</TableCell>
                    <TableCell align="right">Precio</TableCell>
                    <TableCell align="center">Cantidad</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={`${item.productId}-${item.size}-${item.color}`}>
                      <TableCell>
                        {item.name}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {item.sku}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.size} / {item.color}
                      </TableCell>
                      <TableCell align="right">{currencyFormatter.format(item.price)}</TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                          inputProps={{ min: 1, max: item.stock, style: { width: 50, textAlign: 'center' } }}
                          onChange={(e) =>
                            dispatch(
                              updateQuantity({
                                productId: item.productId,
                                size: item.size,
                                color: item.color,
                                quantity: Number(e.target.value),
                              }),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell align="right">{currencyFormatter.format(item.price * item.quantity)}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => dispatch(removeItem({ productId: item.productId, size: item.size, color: item.color }))}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Grid>

            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Resumen
                </Typography>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2">{currencyFormatter.format(subtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Envío</Typography>
                  <Typography variant="body2">
                    {shippingCost === 0 ? 'Gratis' : currencyFormatter.format(shippingCost)}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={700}>
                    Total
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                    {currencyFormatter.format(total)}
                  </Typography>
                </Stack>

                <Box component="form" onSubmit={handleCheckout} sx={{ mt: 3 }}>
                  <Stack spacing={2}>
                    <Typography variant="subtitle2">Datos de envío</Typography>
                    <TextField
                      label="Nombre completo"
                      value={shippingFullName}
                      onChange={(e) => setShippingFullName(e.target.value)}
                      required
                      size="small"
                    />
                    <TextField
                      label="Teléfono"
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      required
                      size="small"
                    />
                    <TextField
                      label="Dirección"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      required
                      size="small"
                    />
                    <TextField
                      label="Ciudad"
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      required
                      size="small"
                    />

                    {!user && <Alert severity="info">Debes ingresar para completar la compra.</Alert>}
                    {error && <Alert severity="error">No se pudo crear el pedido. Verifica el stock disponible.</Alert>}

                    <Button type="submit" variant="contained" size="large" disabled={isLoading}>
                      {user ? 'Ir a pagar' : 'Ingresar para pagar'}
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </>
  );
}
