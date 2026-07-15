'use client';

import Link from 'next/link';
import { AppBar, Toolbar, Button, Box, Avatar, IconButton, Badge } from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store/store';
import { logout } from '@/store/authSlice';

export function Navbar() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const cartCount = useSelector((state: RootState) => state.cart.items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid #eee' }}>
      <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
        <Box component={Link} href="/" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/horizontal-lockup.svg" alt="ModaIA Closet" height={36} />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button component={Link} href="/" color="inherit">
            Catálogo
          </Button>

          {user && (
            <>
              <Button component={Link} href="/medidas" color="inherit">
                Mis medidas
              </Button>
              <Button component={Link} href="/tallas" color="inherit">
                Tallas IA
              </Button>
              <Button component={Link} href="/probador" color="inherit">
                Probador 3D
              </Button>
              <Button component={Link} href="/pedidos" color="inherit">
                Mis pedidos
              </Button>
            </>
          )}

          <IconButton component={Link} href="/carrito" color="inherit">
            <Badge badgeContent={cartCount} color="primary">
              <ShoppingCartOutlinedIcon />
            </Badge>
          </IconButton>

          {user ? (
            <>
              {user.role === 'admin' && (
                <Button component={Link} href="/admin" color="inherit">
                  Panel admin
                </Button>
              )}
              {user.role === 'provider' && (
                <Button component={Link} href="/proveedor" color="inherit">
                  Panel proveedor
                </Button>
              )}
              {user.role === 'customer' && (
                <Button component={Link} href="/proveedor" color="inherit">
                  Vender en ModaIA
                </Button>
              )}
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                {user.fullName.charAt(0).toUpperCase()}
              </Avatar>
              <Button onClick={() => dispatch(logout())} color="inherit">
                Salir
              </Button>
            </>
          ) : (
            <Button component={Link} href="/login" variant="contained" color="primary">
              Ingresar
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
