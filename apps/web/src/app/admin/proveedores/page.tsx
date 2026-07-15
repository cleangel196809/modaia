'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import type { RootState } from '@/store/store';
import {
  useGetProvidersQuery,
  useApproveProviderMutation,
  useRejectProviderMutation,
  type ProviderStatus,
} from '@/store/api/apiSlice';

const STATUS_LABEL: Record<ProviderStatus, string> = {
  pending: 'Pendientes',
  approved: 'Aprobados',
  rejected: 'Rechazados',
  suspended: 'Suspendidos',
};

const STATUS_COLOR: Record<ProviderStatus, 'warning' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  suspended: 'default',
};

export default function AdminProvidersPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [status, setStatus] = useState<ProviderStatus>('pending');
  const { data: providers, isLoading } = useGetProvidersQuery({ status });
  const [approveProvider] = useApproveProviderMutation();
  const [rejectProvider] = useRejectProviderMutation();

  if (user?.role !== 'admin') {
    return <Alert severity="error">Solo un administrador puede gestionar proveedores.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Proveedores
      </Typography>

      <Tabs value={status} onChange={(_, value) => setStatus(value)} sx={{ mb: 2 }}>
        {(Object.keys(STATUS_LABEL) as ProviderStatus[]).map((key) => (
          <Tab key={key} value={key} label={STATUS_LABEL[key]} />
        ))}
      </Tabs>

      {!isLoading && providers?.length === 0 && (
        <Alert severity="info">No hay solicitudes en estado &quot;{STATUS_LABEL[status]}&quot;.</Alert>
      )}

      {providers && providers.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Negocio</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell>NIT</TableCell>
              <TableCell>Ciudad</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {providers.map((provider) => (
              <TableRow key={provider.id} hover>
                <TableCell>{provider.businessName}</TableCell>
                <TableCell>
                  {provider.user?.fullName}
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    {provider.user?.email}
                  </Typography>
                </TableCell>
                <TableCell>{provider.taxId}</TableCell>
                <TableCell>{provider.city}</TableCell>
                <TableCell>
                  <Chip label={STATUS_LABEL[provider.status]} color={STATUS_COLOR[provider.status]} size="small" />
                </TableCell>
                <TableCell align="right">
                  {provider.status === 'pending' && (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="contained" onClick={() => approveProvider(provider.id)}>
                        Aprobar
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => rejectProvider({ id: provider.id, reason: 'No cumple requisitos' })}
                      >
                        Rechazar
                      </Button>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
