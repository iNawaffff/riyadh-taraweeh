/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'أئمة التراويح - الرياض',
        short_name: 'تراويح الرياض',
        description: 'دليل أئمة التراويح في الرياض - تصفح المساجد واستمع للتلاوات لاختيار المسجد المناسب لك في رمضان',
        theme_color: '#0d4b33',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        dir: 'rtl',
        lang: 'ar',
        icons: [
          {
            src: '/static/images/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
          },
          {
            src: '/static/images/logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/static/images/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Only precache JS, CSS, and fonts from Vite build output.
        // Do NOT precache index.html — Flask injects SEO meta tags per route.
        globPatterns: ['**/*.{js,css,woff2}'],
        // Disable navigateFallback — Flask handles all navigation with SEO meta injection
        navigateFallback: null,
        // Safety net: backend routes must never be intercepted by SW
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/admin/,
          /^\/login/,
          /^\/static\//,
          /^\/report-error/,
        ],
        runtimeCaching: [
          {
            // Navigation requests: NetworkFirst so Flask serves fresh HTML with
            // SEO meta tags when online, cached version available offline
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/static\/images\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/static\/audio\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/imams-riyadh-audio\.s3\.[\w-]+\.amazonaws\.com\/audio\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 's3-audio-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/report-error': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Data fetching
          'query': ['@tanstack/react-query'],
          // Firebase Auth (lazy-loaded)
          'firebase-auth': ['firebase/auth'],
          'firebase-app': ['firebase/app'],
          // Sentry (only loaded in production)
          'sentry': ['@sentry/react'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
