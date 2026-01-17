import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
            manifest: {
                name: 'Mirror Archive',
                short_name: 'Mirror Archive',
                description: 'Minimal indie lookbook with quiet vintage mood.',
                theme_color: '#f6f2eb',
                background_color: '#f6f2eb',
                display: 'standalone',
                start_url: '/',
                scope: '/',
                icons: [
                    { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
                    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
                ]
            },
            devOptions: { enabled: true }
        })
    ]
});
