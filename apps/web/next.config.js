/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  // Proxya /api/* hacia el backend desde el propio servidor de Next.js, así el navegador
  // siempre pide a su mismo origen (localhost:3000 o la IP de la LAN desde un celular) y
  // nunca necesita conocer el host/puerto real de la API — evita tener que reconstruir la
  // imagen cada vez que cambia la IP de la máquina que sirve la app.
  async rewrites() {
    const apiInternalUrl = process.env.API_INTERNAL_URL || 'http://localhost:3001/api';
    return [{ source: '/api/:path*', destination: `${apiInternalUrl}/:path*` }];
  },
};

module.exports = nextConfig;
