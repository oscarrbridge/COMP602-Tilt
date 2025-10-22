import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@backend': path.resolve(__dirname, 'Backend'),
      '@myfirebase': path.resolve(__dirname, 'Backend/firebase'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: [fileURLToPath(new URL('./src/test/setup.ts', import.meta.url))],
    reporters: ['default'],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    globals: true,
    environmentOptions: { jsdom: { url: 'http://localhost' } },
    include: ['__tests__/**/*.ts?(x)', 'src/**/*.test.ts?(x)'],
    exclude: ['node_modules/**', 'dist/**', '**/Blackjack multiplayer/**/*.test.*'],
  },
});
