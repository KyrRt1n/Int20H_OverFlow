import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/orders': 'http://localhost:3000',
      '/tax':    'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/auth':   'http://localhost:3000',
    }
  }
})