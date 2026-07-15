'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Box, Container, Paper, Stack, TextField, Button, Typography, Alert } from '@mui/material';
import { Navbar } from '@/components/Navbar';
import type { RootState } from '@/store/store';
import { useApplyProviderMutation } from '@/store/api/apiSlice';

export default function ApplyProviderPage() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const [applyProvider, { isLoading, error, isSuccess }] = useApplyProviderMutation();

  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    }
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await applyProvider({ businessName, taxId, phone, city, description: description || undefined }).unwrap();
    } catch {
      // el error se muestra debajo del formulario
    }
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Vende en ModaIA Closet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Cuéntanos sobre tu taller o marca. Un administrador revisará tu solicitud antes de habilitar tu panel de
          proveedor.
        </Typography>

        {isSuccess ? (
          <Alert severity="success">
            Solicitud enviada. Te avisaremos cuando sea aprobada — puedes revisar el estado en{' '}
            <a href="/proveedor">tu panel de proveedor</a>.
          </Alert>
        ) : (
          <Paper sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Nombre del negocio"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
                <TextField label="NIT" value={taxId} onChange={(e) => setTaxId(e.target.value)} required />
                <TextField label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <TextField label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} required />
                <TextField
                  label="Cuéntanos sobre tu taller (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  minRows={3}
                />

                {error && (
                  <Alert severity="error">
                    No se pudo enviar la solicitud. Es posible que ya tengas una registrada.
                  </Alert>
                )}

                <Button type="submit" variant="contained" size="large" disabled={isLoading}>
                  Enviar solicitud
                </Button>
              </Stack>
            </Box>
          </Paper>
        )}
      </Container>
    </>
  );
}
