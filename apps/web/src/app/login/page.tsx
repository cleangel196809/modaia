'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { Box, Button, Container, Paper, Stack, TextField, Typography, Alert, Tabs, Tab } from '@mui/material';
import { Navbar } from '@/components/Navbar';
import { setCredentials } from '@/store/authSlice';
import { useLoginMutation, useRegisterMutation } from '@/store/api/apiSlice';

export default function LoginPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [login, { isLoading: loggingIn, error: loginError }] = useLoginMutation();
  const [register, { isLoading: registering, error: registerError }] = useRegisterMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const result =
        tab === 'login'
          ? await login({ email, password }).unwrap()
          : await register({ fullName, email, password }).unwrap();
      dispatch(setCredentials(result));
      router.push('/');
    } catch {
      // el error se muestra debajo del formulario
    }
  }

  const error = tab === 'login' ? loginError : registerError;
  const loading = tab === 'login' ? loggingIn : registering;

  return (
    <>
      <Navbar />
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/icon-gold.svg" alt="ModaIA Closet" height={72} />
        </Box>
        <Paper sx={{ p: 4 }}>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }} variant="fullWidth">
            <Tab label="Ingresar" value="login" />
            <Tab label="Crear cuenta" value="register" />
          </Tabs>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {tab === 'register' && (
                <TextField
                  label="Nombre completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  fullWidth
                />
              )}
              <TextField
                label="Correo"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                helperText={tab === 'register' ? 'Mínimo 8 caracteres' : undefined}
              />

              {error && <Alert severity="error">Revisa tus credenciales e inténtalo de nuevo.</Alert>}

              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {tab === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </Button>

              {tab === 'login' && (
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  Demo admin: admin@modaia.co / Admin123!
                </Typography>
              )}
            </Stack>
          </Box>
        </Paper>
      </Container>
    </>
  );
}
