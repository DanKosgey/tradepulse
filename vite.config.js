import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-utils': ['date-fns', 'framer-motion', 'lucide-react'],
          'vendor-charts': ['recharts']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
