/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // libsodium (~530 kB) is part of the popup bundle; extensions load it from disk.
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      input: {
        popup: resolve(import.meta.dirname, 'popup.html'),
        background: resolve(import.meta.dirname, 'src/background.ts'),
      },
      output: {
        // manifest.json refers to background.js by name.
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
