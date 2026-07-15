import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f8',
          100: '#fce7f3',
          400: '#e879a3',
          500: '#d6336c',
          600: '#b02757',
          700: '#8a1f45',
        },
      },
    },
  },
  plugins: [],
};

export default config;
