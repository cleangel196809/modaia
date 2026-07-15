'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Card,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Typography,
  MenuItem,
  TextField,
  Button,
} from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import type { Product } from '@/store/api/apiSlice';
import { addItem } from '@/store/cartSlice';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function ProductCard({ product }: { product: Product }) {
  const dispatch = useDispatch();
  const image = product.images?.[0];
  const [size, setSize] = useState(product.sizes?.[0] ?? '');
  const [color, setColor] = useState(product.colors?.[0] ?? '');
  const [added, setAdded] = useState(false);

  function handleAddToCart() {
    dispatch(
      addItem({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        image,
        size,
        color,
        stock: product.stock,
      }),
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="div"
        sx={{
          height: 220,
          bgcolor: 'grey.100',
          backgroundImage: image ? `url(${image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'grey.400',
        }}
      >
        {!image && <Typography variant="body2">Sin imagen</Typography>}
      </CardMedia>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="caption" color="text.secondary">
          {product.category?.name} · {product.sku}
        </Typography>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {product.name}
        </Typography>
        <Typography variant="h6" color="primary.main">
          {currencyFormatter.format(product.price)}
        </Typography>

        {product.stock <= product.lowStockThreshold && product.stock > 0 && (
          <Chip label="Últimas unidades" color="warning" size="small" sx={{ mt: 1, alignSelf: 'flex-start' }} />
        )}
        {product.stock === 0 && (
          <Chip label="Agotado" size="small" sx={{ mt: 1, alignSelf: 'flex-start' }} />
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          {product.sizes?.length > 0 && (
            <TextField select size="small" label="Talla" value={size} onChange={(e) => setSize(e.target.value)} sx={{ minWidth: 80 }}>
              {product.sizes.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          )}
          {product.colors?.length > 0 && (
            <TextField
              select
              size="small"
              label="Color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              sx={{ minWidth: 100 }}
            >
              {product.colors.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>

        <Button
          variant={added ? 'outlined' : 'contained'}
          color={added ? 'success' : 'primary'}
          startIcon={<ShoppingCartOutlinedIcon />}
          sx={{ mt: 2 }}
          disabled={product.stock === 0}
          onClick={handleAddToCart}
        >
          {added ? 'Agregado' : 'Agregar al carrito'}
        </Button>
      </CardContent>
    </Card>
  );
}
