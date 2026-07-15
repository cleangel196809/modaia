'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Typography,
  IconButton,
  TextField,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import { useDeleteProductMutation, useGetMyProductsQuery } from '@/store/api/apiSlice';
import { ProductFormDialog } from '@/components/ProductFormDialog';
import { MarketingGeneratorDialog } from '@/components/MarketingGeneratorDialog';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export default function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: products, isLoading } = useGetMyProductsQuery({ search: search || undefined, limit: 50 });
  const [deleteProduct] = useDeleteProductMutation();
  const [marketingTarget, setMarketingTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Catálogo
        </Typography>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          + Nuevo producto
        </Button>
      </Box>

      <TextField
        label="Buscar"
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, width: 300 }}
      />

      {!isLoading && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell align="right">Margen</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products?.items.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>{product.sku}</TableCell>
                <TableCell>
                  <Link href={`/admin/productos/${product.id}`}>{product.name}</Link>
                </TableCell>
                <TableCell>{product.category?.name}</TableCell>
                <TableCell align="right">{currencyFormatter.format(product.price)}</TableCell>
                <TableCell align="right">{product.marginPercentage ?? 0}%</TableCell>
                <TableCell align="right">
                  {product.stock}
                  {product.stock <= product.lowStockThreshold && (
                    <Chip label="bajo" color="warning" size="small" sx={{ ml: 1 }} />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    title="Generar contenido para redes"
                    onClick={() => setMarketingTarget({ id: product.id, name: product.name })}
                  >
                    <CampaignOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => deleteProduct(product.id)} title="Desactivar">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ProductFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      {marketingTarget && (
        <MarketingGeneratorDialog
          open={!!marketingTarget}
          onClose={() => setMarketingTarget(null)}
          productId={marketingTarget.id}
          productName={marketingTarget.name}
        />
      )}
    </Box>
  );
}
