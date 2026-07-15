'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Box, Container, List, ListItemButton, ListItemText, Typography, CircularProgress } from '@mui/material';
import { Navbar } from '@/components/Navbar';
import type { RootState } from '@/store/store';

const NAV_ITEMS = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/productos', label: 'Catálogo' },
  { href: '/admin/inventario', label: 'Inventario' },
  { href: '/admin/proveedores', label: 'Proveedores', adminOnly: true },
  { href: '/admin/pedidos', label: 'Pedidos', adminOnly: true },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'admin' && user.role !== 'provider') {
      router.replace('/');
    }
  }, [user, router]);

  if (!user || (user.role !== 'admin' && user.role !== 'provider')) {
    return (
      <>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', gap: 4 }}>
        <Box sx={{ width: 220, flexShrink: 0 }}>
          <Typography variant="overline" color="text.secondary">
            Panel admin
          </Typography>
          <List>
            {NAV_ITEMS.filter((item) => !item.adminOnly || user.role === 'admin').map((item) => (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={pathname === item.href}
                sx={{ borderRadius: 1 }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
      </Container>
    </>
  );
}
