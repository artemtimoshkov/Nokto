import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Nokto',
        short_name: 'Nokto',
        description: 'Your North Star goals and everyday to-dos.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      // Precache the whole app (Circle's lazy chunk and the icons too) so it opens with no connection.
      workbox: { navigateFallbackDenylist: [/^\/auth/], globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'] }
    })
  ],
  test: { environment: 'node' }
} as any)
