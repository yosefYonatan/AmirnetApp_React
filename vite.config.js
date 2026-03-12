import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // ── Progressive Web App ────────────────────────────────────────
    // VitePWA generates a Service Worker that caches the entire app
    // bundle on first load. After that, the app works 100% offline —
    // even with no internet connection, including the dictionary.
    //
    // registerType: 'autoUpdate' — silently installs new versions in
    // the background and activates on the next page reload.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],

      // Web App Manifest — controls how the app appears when installed
      // on a phone's home screen (name, icon, splash screen colour).
      manifest: {
        name: 'Amirnet TV Learner',
        short_name: 'Amirnet TV',
        description: 'לומד מילים לפסיכומטרי תוך כדי צפייה בסדרות',
        theme_color: '#0f172a',        // matches the app's dark header
        background_color: '#0f172a',  // splash screen background
        display: 'standalone',        // hides the browser address bar
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'he',
        dir: 'rtl',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',            // SVG scales to all sizes
            type: 'image/svg+xml',
            purpose: 'any',          // standard home screen icon
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',     // Android adaptive icon (safe zone)
          },
        ],
      },

      // Workbox (the Service Worker engine) configuration.
      // globPatterns tells Workbox which files to pre-cache on install.
      // Everything listed here works offline after the first visit.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],

  // Define the globals that were previously injected by the hosting platform.
  // In production (Firebase Hosting / Canvas), these are replaced by real values.
  // In local dev, we use safe empty defaults so the app loads without crashing.
  define: {
    __firebase_config:    JSON.stringify('{}'),
    __app_id:             JSON.stringify('amirnet-dev'),
    __initial_auth_token: JSON.stringify(''),
  },
})
