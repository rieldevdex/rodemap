/** Entry point of the Supabase Edge Function "rodemap-mochi" (see handler.ts). */
import { handleMochiRelay } from './handler';

Deno.serve((request) => handleMochiRelay(request, (name) => Deno.env.get(name)));
