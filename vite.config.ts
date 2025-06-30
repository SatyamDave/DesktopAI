import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      external: ['electron', 'fs', 'path', 'os', 'crypto', 'child_process', 'util']
    }
  },
  server: {
    port: 3000
  },
  optimizeDeps: {
    exclude: ['electron', 'fs', 'path', 'os', 'crypto', 'child_process', 'util']
  },
  define: {
    'process.env.NODE_ENV': '"development"'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer')
    }
  }
}) 