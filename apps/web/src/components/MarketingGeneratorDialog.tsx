'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useGenerateMarketingPostMutation } from '@/store/api/apiSlice';

interface Props {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export function MarketingGeneratorDialog({ open, onClose, productId, productName }: Props) {
  const [generatePost, { data, isLoading, error }] = useGenerateMarketingPostMutation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setCopied(false);
      generatePost({ productId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  function handleCopy() {
    if (!data) return;
    const text = `${data.caption}\n\n${data.hashtags.join(' ')}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Contenido para redes — {productName}</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {data?.disclaimer ?? 'Generado con plantillas, no con IA generativa real.'}
        </Alert>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error">No se pudo generar el contenido.</Alert>}

        {data && (
          <Stack spacing={2}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {data.caption}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
              {data.hashtags.map((tag) => (
                <Chip key={tag} label={tag} size="small" />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Sugerido para: {data.suggestedPlatforms.join(', ')}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        <Button onClick={() => generatePost({ productId })} disabled={isLoading}>
          Generar otra versión
        </Button>
        <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={handleCopy} disabled={!data}>
          {copied ? '¡Copiado!' : 'Copiar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
