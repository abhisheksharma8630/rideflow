import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FFC107',
          dark: '#F0A500',
        },
        charcoal: '#1A1A1A',
        ink: '#2B2B2B',
        surface: '#FFFFFF',
        muted: '#8A8F98',
        softgrey: '#F4F5F7',
        success: '#1DB954',
        danger: '#E53935',
      },
      borderRadius: {
        xl: '16px',
      },
    },
  },
  plugins: [],
};

export default config;
