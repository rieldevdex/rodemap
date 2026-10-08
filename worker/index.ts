/**
 * Cloudflare Worker entry for Rodemap. The Vite build in dist/ is served as static assets
 * (wrangler.toml [assets], with the single-page fallback); only /api/* requests reach this code.
 */
import { handleMochi, type Env } from './mochi';

export default {
  fetch(request: Request, env: Env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/mochi') {
      if (request.method === 'POST') return handleMochi(request, env);
      return new Response(null, { status: 405, headers: { allow: 'POST' } });
    }
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
