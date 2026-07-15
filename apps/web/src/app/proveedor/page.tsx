'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  Button,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
} from '@mui/material';
import { Navbar } from '@/components/Navbar';
import { ProductFormDialog } from '@/components/ProductFormDialog';
import type { RootState } from '@/store/store';
import { useGetMyProviderProfileQuery, useGetMyProductsQuery, useGetProviderOrderItemsQuery } from '@/store/api/apiSlice';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export default function ProviderDashboardPage() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: profile, isLoading, error } = useGetMyProviderProfileQuery(undefined, { skip: !user });
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const notApplied = (error as any)?.status === 404;

  if (notApplied) {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Todavía no eres proveedor
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Aplica como confeccionista para publicar tus prendas en ModaIA Closet.
            </Typography>
            <Button component={Link} href="/proveedor/aplicar" variant="contained">
              Aplicar como proveedor
            </Button>
          </Paper>
        </Container>
      </>
    );
  }

  if (profile?.status === 'pending') {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="info">
            Tu solicitud para <strong>{profile.businessName}</strong> está en revisión. Te avisaremos cuando un
            administrador la apruebe.
          </Alert>
        </Container>
      </>
    );
  }

  if (profile?.status === 'rejected') {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="error">
            Tu solicitud para <strong>{profile.businessName}</strong> fue rechazada.
            {profile.rejectionReason && <> Motivo: {profile.rejectionReason}</>}
          </Alert>
        </Container>
      </>
    );
  }

  if (profile?.status === 'suspended') {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="warning">
            Tu cuenta de proveedor <strong>{profile.businessName}</strong> está suspendida. Contacta a soporte.
          </Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {profile?.businessName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Panel de proveedor · {profile?.city}
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            + Publicar prenda
          </Button>
        </Box>

        <MyProducts />

        <Typography variant="h6" fontWeight={700} sx={{ mt: 5, mb: 2 }}>
          Pedidos recibidos
        </Typography>
        <MyOrderItems />

        <ProductFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </Container>
    </>
  );
}

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

function MyOrderItems() {
  const { data: items, isLoading } = useGetProviderOrderItemsQuery();

  if (isLoading) return <CircularProgress />;

  if (!items || items.length === 0) {
    return <Alert severity="info">Todavía no has recibido pedidos.</Alert>;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Fecha</TableCell>
          <TableCell>Prenda</TableCell>
          <TableCell align="right">Cantidad</TableCell>
          <TableCell align="right">Subtotal</TableCell>
          <TableCell>Enviar a</TableCell>
          <TableCell align="right">Estado</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id} hover>
            <TableCell>{item.order && new Date(item.order.createdAt).toLocaleDateString('es-CO')}</TableCell>
            <TableCell>
              {item.productName} <Typography variant="caption" color="text.secondary">({item.sku})</Typography>
            </TableCell>
            <TableCell align="right">{item.quantity}</TableCell>
            <TableCell align="right">{currencyFormatter.format(item.subtotal)}</TableCell>
            <TableCell>{item.order?.shippingCity}</TableCell>
            <TableCell align="right">
              {item.order && <Chip label={STATUS_LABEL[item.order.status]} color={STATUS_COLOR[item.order.status]} size="small" />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MyProducts() {
  const { data, isLoading } = useGetMyProductsQuery({ includeInactive: true, limit: 50 });

  if (isLoading) return <CircularProgress />;

  if (!data || data.items.length === 0) {
    return <Alert severity="info">Todavía no has publicado ninguna prenda.</Alert>;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>SKU</TableCell>
          <TableCell>Nombre</TableCell>
          <TableCell>Categoría</TableCell>
          <TableCell align="right">Precio</TableCell>
          <TableCell align="right">Stock</TableCell>
          <TableCell align="right">Estado</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.items.map((product) => (
          <TableRow key={product.id} hover>
            <TableCell>{product.sku}</TableCell>
            <TableCell>
              <Link href={`/admin/productos/${product.id}`}>{product.name}</Link>
            </TableCell>
            <TableCell>{product.category?.name}</TableCell>
            <TableCell align="right">{currencyFormatter.format(product.price)}</TableCell>
            <TableCell align="right">
              {product.stock}
              {product.stock <= product.lowStockThreshold && (
                <Chip label="bajo" color="warning" size="small" sx={{ ml: 1 }} />
              )}
            </TableCell>
            <TableCell align="right">
              {product.isActive ? (
                <Chip label="activa" color="success" size="small" />
              ) : (
                <Chip label="desactivada" size="small" />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
