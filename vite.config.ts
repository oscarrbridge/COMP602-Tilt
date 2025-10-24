import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@backend': path.resolve(__dirname, 'Backend'),
      '@myfirebase': path.resolve(__dirname, 'Backend/firebase'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
  },
});
