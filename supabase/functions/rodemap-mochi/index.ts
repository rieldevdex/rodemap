/** Entry point of the Supabase Edge Function "rodemap-mochi" (see handler.ts). */
import { handleRodemapMochi } from './handler';

Deno.serve((request) => handleRodemapMochi(request, (name) => Deno.env.get(name)));
