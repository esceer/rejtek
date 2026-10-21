/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // libsodium (~530 kB) is loaded on demand in its own chunk.
  build: { chunkSizeWarningLimit: 600 },
  server: {
    // Run the C# server with `dotnet run` (http://localhost:5080) during development.
    proxy: { '/api': 'http://localhost:5080' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
