import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        butterfly: resolve(import.meta.dirname, 'projects/butterfly.html'),
        obstacle: resolve(import.meta.dirname, 'projects/obstacle-robot.html'),
        handling: resolve(import.meta.dirname, 'projects/material-handling-robot.html'),
      },
    },
  },
});
