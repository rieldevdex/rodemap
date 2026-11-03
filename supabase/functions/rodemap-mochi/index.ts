/** Entry point of the Supabase Edge Function "rodemap-mochi" (see handler.ts). */
import { handlevsmcclubsMochi } from './handler';

Deno.serve((request) => handlevsmcclubsMochi(request, (name) => Deno.env.get(name)));
