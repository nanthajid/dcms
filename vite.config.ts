import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/dcms/',
  build: {
    outDir: 'public/dcms',
    emptyOutDir: true,
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/dcms/api': {
        // 127.0.0.1 (not "localhost") to avoid IPv6 ::1 ambiguity on Windows.
        target: 'http://127.0.0.1/ar2home/api',
        changeOrigin: true,
        // Apache's KeepAliveTimeout (5s) closes idle sockets; without this the
        // proxy reuses a stale keep-alive socket -> ECONNRESET -> intermittent 502.
        // Forcing "Connection: close" makes each proxied request open a fresh socket.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.setHeader('Connection', 'close'));
        },
        rewrite: (path) => path.replace(/^\/dcms\/api/, ''),
      },
    },
  },
})
