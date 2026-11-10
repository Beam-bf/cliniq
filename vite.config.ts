import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: { ignored: ['**/.browser-qa/**', '**/.npm-cache/**', '**/.knowledge/**'] },
    proxy: { '/api/policy': { target: 'http://127.0.0.1:8788', changeOrigin: true }, '/api/chat': { target: 'http://127.0.0.1:8788', changeOrigin: false } },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
