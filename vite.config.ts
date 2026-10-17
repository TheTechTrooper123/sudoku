import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { loadEnv } from 'vite';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';
import { defineConfig } from 'vitest/config';
import type { IncomingMessage, ServerResponse } from 'node:http';

type ApiHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/**
 * Mirrors Vercel's `cleanUrls` setting locally: static pages in `public/` are
 * reachable without the `.html` suffix (`/privacy` instead of `/privacy.html`).
 */
function cleanUrlsPlugin(): Plugin {
  const rewrite = (req: IncomingMessage): void => {
    const url = req.url ?? '';
    const [path, query] = url.split('?');
    if (!path || path === '/' || path.includes('.') || path.startsWith('/@')) return;
    if (!existsSync(`public${path.replace(/\/$/, '')}.html`)) return;
    req.url = `${path.replace(/\/$/, '')}.html${query ? `?${query}` : ''}`;
  };

  return {
    name: 'sudoku-clean-urls',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
  };
}

/**
 * Serves `api/puzzle.ts` during `vite dev` and `vite preview`, so the local
 * setup behaves exactly like the deployed Vercel function.
 */
function apiPlugin(handler: ApiHandler): Plugin {
  const middleware =
    (label: string) =>
    (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void): void => {
      void handler(req, res).catch((error: unknown) => {
        console.error(`[${label}] request failed`, error);
        next(error);
      });
    };

  return {
    name: 'sudoku-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/puzzle', middleware('api/puzzle'));
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use('/api/puzzle', middleware('api/puzzle'));
    },
  };
}

export default defineConfig(async ({ mode }) => {
  // `.env` values must be visible to the API handler as well - on Vercel they
  // come from the project settings, locally from `.env`.
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = String(value);
  }

  const { default: handler } = await import('./api/puzzle.ts');

  return {
    plugins: [cleanUrlsPlugin(), apiPlugin(handler)],
    build: {
      target: 'es2022',
      outDir: 'dist',
      sourcemap: false,
      cssCodeSplit: true,
    },
    server: {
      port: 5173,
      host: true,
    },
    preview: {
      port: 4173,
      host: true,
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      testTimeout: 20_000,
      hookTimeout: 20_000,
    },
  };
});
