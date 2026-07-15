'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  Stack,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import {
  useGetProductQuery,
  useUpdateProductMutation,
  useAdjustStockMutation,
  useGetProductMovementsQuery,
  useGetCategoriesQuery,
  useUploadImageMutation,
} from '@/store/api/apiSlice';

// eslint-disable-next-line @next/next/no-img-element
const Thumb = ({ src }: { src: string }) => <img src={src} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />;

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useGetProductQuery(id);
  const { data: movements } = useGetProductMovementsQuery(id);
  const { data: categories } = useGetCategoriesQuery();
  const [updateProduct] = useUpdateProductMutation();
  const [adjustStock, { isLoading: adjusting, error: adjustError }] = useAdjustStockMutation();
  const [uploadImage, { isLoading: uploading }] = useUploadImageMutation();

  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [material, setMaterial] = useState('');
  const [sizesText, setSizesText] = useState('');
  const [colorsText, setColorsText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [infoSaved, setInfoSaved] = useState(false);
  const [infoError, setInfoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setDescription(product.description ?? '');
    setCategoryId(product.categoryId);
    setMaterial(product.material ?? '');
    setSizesText(product.sizes.join(', '));
    setColorsText(product.colors.join(', '));
    setImages(product.images ?? []);
  }, [product]);

  if (isLoading || !product) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  async function handleSavePricing() {
    await updateProduct({
      id,
      body: {
        ...(price ? { price: Number(price) } : {}),
        ...(cost ? { cost: Number(cost) } : {}),
      },
    }).unwrap();
    setPrice('');
    setCost('');
  }

  async function handleSaveInfo() {
    setInfoSaved(false);
    setInfoError(false);
    try {
      await updateProduct({
        id,
        body: {
          name,
          description,
          categoryId,
          material,
          sizes: sizesText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          colors: colorsText
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean),
          images,
        },
      }).unwrap();
      setInfoSaved(true);
    } catch {
      setInfoError(true);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { url } = await uploadImage(file).unwrap();
      setImages((prev) => [...prev, url]);
    } catch {
      setInfoError(true);
    }
  }

  function handleRemoveImage(url: string) {
    setImages((prev) => prev.filter((img) => img !== url));
  }

  async function handleAdjustStock() {
    try {
      await adjustStock({ productId: id, type: movementType, quantity: Number(quantity), reason }).unwrap();
      setQuantity('');
      setReason('');
    } catch {
      // el error se muestra debajo del formulario
    }
  }

  return (
    <Box>
      <Button onClick={() => router.push('/admin/productos')} sx={{ mb: 2 }}>
        ← Volver al catálogo
      </Button>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {product.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        SKU {product.sku} · {product.category?.name}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Información del producto
            </Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
                <TextField
                  select
                  label="Categoría"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  fullWidth
                >
                  {categories?.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <TextField
                label="Descripción"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Material" value={material} onChange={(e) => setMaterial(e.target.value)} fullWidth />
                <TextField
                  label="Tallas (separadas por coma)"
                  value={sizesText}
                  onChange={(e) => setSizesText(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Colores (separados por coma)"
                  value={colorsText}
                  onChange={(e) => setColorsText(e.target.value)}
                  fullWidth
                />
              </Stack>

              <Typography variant="body2" fontWeight={600}>
                Imágenes
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
                {images.map((url) => (
                  <Box key={url} sx={{ position: 'relative' }}>
                    <Thumb src={url} />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveImage(url)}
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'error.light' },
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddPhotoAlternateOutlinedIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Subiendo...' : 'Agregar imagen'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={handleFileSelected}
                />
              </Stack>

              {infoSaved && <Alert severity="success">Cambios guardados.</Alert>}
              {infoError && <Alert severity="error">No se pudo guardar. Revisa los campos e intenta de nuevo.</Alert>}
              <Button variant="contained" onClick={handleSaveInfo} sx={{ alignSelf: 'flex-start' }}>
                Guardar información
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Precio y costo
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Actual: {currencyFormatter.format(product.price)} · Costo {currencyFormatter.format(product.cost)} ·
              Margen {product.marginPercentage}%
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Nuevo precio"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                fullWidth
              />
              <TextField
                label="Nuevo costo"
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                fullWidth
              />
            </Stack>
            <Button variant="contained" sx={{ mt: 2 }} onClick={handleSavePricing} disabled={!price && !cost}>
              Guardar
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Stock actual: {product.stock} unidades
            </Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                label="Tipo de movimiento"
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as typeof movementType)}
              >
                <MenuItem value="in">Entrada (reposición)</MenuItem>
                <MenuItem value="out">Salida (venta/daño)</MenuItem>
                <MenuItem value="adjustment">Ajuste manual</MenuItem>
              </TextField>
              <TextField
                label="Cantidad"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
              {adjustError && <Alert severity="error">No se pudo registrar el movimiento.</Alert>}
              <Button variant="contained" onClick={handleAdjustStock} disabled={adjusting || !quantity}>
                Registrar movimiento
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Historial de movimientos
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Stock resultante</TableCell>
                  <TableCell>Motivo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements?.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{new Date(movement.createdAt).toLocaleString('es-CO')}</TableCell>
                    <TableCell>{movement.type}</TableCell>
                    <TableCell align="right">{movement.quantity}</TableCell>
                    <TableCell align="right">{movement.stockAfter}</TableCell>
                    <TableCell>{movement.reason ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
