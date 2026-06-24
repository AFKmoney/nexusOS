import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    },
    preview: {
      port: 4173,
      strictPort: true,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    },
    plugins: [react()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          // App-level code is split on demand via React.lazy in the app registry
          // (see appRegistry.ts), which is the safe, high-impact win. We keep the
          // vendor grouping minimal and deliberately do NOT further split the
          // core index chunk: extracting lucide-react / kernel / services into
          // separate chunks reorders module evaluation and triggers a runtime
          // "Cannot set properties of undefined" crash from circular init order.
          //
          // Vite 8 (rolldown) requires manualChunks to be a function, not an
          // object map. We match by module id so behavior is identical to the
          // previous object form.
          manualChunks(id) {
            if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) {
              return 'vendor';
            }
            if (id.includes('node_modules/lucide-react/') || id.includes('node_modules/zustand/')) {
              return 'ui';
            }
            if (id.includes('node_modules/date-fns/') || id.includes('node_modules/dompurify/')) {
              return 'utils';
            }
            return undefined;
          }
        }
      },
      chunkSizeWarningLimit: 700
    }
  };
});
