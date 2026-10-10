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
        bitBlockout: resolve(import.meta.dirname, 'projects/bit-center-blockout.html'),
        pointcloudTest: resolve(import.meta.dirname, 'pointcloud-test/index.html'),
        hivePointcloudTest: resolve(import.meta.dirname, 'pointcloud-hive-test/index.html'),
        pointcloudSwitchTest: resolve(import.meta.dirname, 'pointcloud-switch-test/index.html'),
        pointcloudSwitchReference: resolve(import.meta.dirname, 'pointcloud-switch-test/reference/index.html'),
        wireframeDualPreview: resolve(import.meta.dirname, 'wireframe-dual-preview/index.html'),
        wireframeTransitionTest: resolve(import.meta.dirname, 'wireframe-transition-test/index.html'),
      },
    },
  },
});
