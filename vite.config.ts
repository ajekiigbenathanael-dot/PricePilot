import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { apiDevServer } from './vite/api-dev-plugin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), apiDevServer(mode)],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
}));
