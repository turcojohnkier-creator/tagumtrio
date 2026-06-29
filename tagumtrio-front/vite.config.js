import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'


export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['tagumtrio-logo.jpg'],
      manifest: {
        name: 'TriOPS',
        short_name: 'TriOPS',
        description: 'TriOPS workforce, production, and payroll management',
        start_url: '/',
        display: 'standalone',
        theme_color: '#059669',
        background_color: '#EAEAEA',
        icons: [
          {
            src: '/tagumtrio-logo.jpg',
            sizes: '1254x1254',
            type: 'image/jpeg',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Any request starting with /api will be routed to FastAPI
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})