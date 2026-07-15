'use client';

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#b02757' },
    secondary: { main: '#1a1a2e' },
    background: { default: '#fffaf9' },
  },
  typography: {
    fontFamily: 'var(--font-inter), Arial, sans-serif',
  },
  shape: {
    borderRadius: 10,
  },
});
