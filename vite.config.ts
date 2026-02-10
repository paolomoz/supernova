import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load all env vars (empty prefix = no filtering)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      crx({ manifest }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/panel'),
      },
    },
    define: {
      // Inject selected .env values as build-time constants for the service worker
      '__ENV_DEFAULTS__': JSON.stringify({
        ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY || '',
        BEDROCK_TOKEN: env.ANTHROPIC_AWS_BEARER_TOKEN_BEDROCK || '',
        USE_BEDROCK: env.USE_BEDROCK || '',
        AWS_REGION: env.AWS_REGION || '',
        DA_CLIENT_ID: env.DA_CLIENT_ID || '',
        DA_CLIENT_SECRET: env.DA_CLIENT_SECRET || '',
        DA_SERVICE_TOKEN: env.DA_SERVICE_TOKEN || '',
      }),
    },
    build: {
      rollupOptions: {
        input: {
          panel: resolve(__dirname, 'src/panel/index.html'),
        },
      },
    },
  };
});
