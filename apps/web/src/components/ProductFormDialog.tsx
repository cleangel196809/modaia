'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import { useCreateProductMutation, useGetCategoriesQuery, type Product } from '@/store/api/apiSlice';

interface Props {
  open: boolean;
  onClose: () => void;
}

const emptyForm = {
  sku: '',
  name: '',
  description: '',
  categoryId: '',
  price: '',
  cost: '',
  stock: '',
  sizes: '',
  colors: '',
  material: '',
};

export function ProductFormDialog({ open, onClose }: Props) {
  const { data: categories } = useGetCategoriesQuery();
  const [createProduct, { isLoading, error }] = useCreateProductMutation();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) setForm(emptyForm);
  }, [open]);

  function setField<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    try {
      await createProduct({
        sku: form.sku,
        name: form.name,
        description: form.description || undefined,
        categoryId: form.categoryId,
        price: Number(form.price),
        cost: Number(form.cost),
        stock: Number(form.stock),
        sizes: form.sizes.split(',').map((s) => s.trim()).filter(Boolean),
        colors: form.colors.split(',').map((c) => c.trim()).filter(Boolean),
        material: form.material || undefined,
      } as Partial<Product>).unwrap();
      onClose();
    } catch {
      // el error se muestra en el diálogo
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nuevo producto</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="SKU" value={form.sku} onChange={(e) => setField('sku', e.target.value)} required />
          <TextField label="Nombre" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
          <TextField
            label="Descripción"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            multiline
            minRows={2}
          />
          <TextField
            select
            label="Categoría"
            value={form.categoryId}
            onChange={(e) => setField('categoryId', e.target.value)}
            required
          >
            {categories?.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Precio (COP)"
              type="number"
              value={form.price}
              onChange={(e) => setField('price', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Costo (COP)"
              type="number"
              value={form.cost}
              onChange={(e) => setField('cost', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Stock inicial"
              type="number"
              value={form.stock}
              onChange={(e) => setField('stock', e.target.value)}
              required
              fullWidth
            />
          </Stack>
          <TextField
            label="Tallas (separadas por coma)"
            placeholder="XS, S, M, L"
            value={form.sizes}
            onChange={(e) => setField('sizes', e.target.value)}
            required
          />
          <TextField
            label="Colores (separados por coma)"
            placeholder="Negro, Blanco"
            value={form.colors}
            onChange={(e) => setField('colors', e.target.value)}
            required
          />
          <TextField label="Material" value={form.material} onChange={(e) => setField('material', e.target.value)} />

          {error && <Alert severity="error">No se pudo crear el producto. Verifica que el SKU no esté repetido.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isLoading}>
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
}
