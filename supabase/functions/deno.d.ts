/** The parts of the Deno runtime the Edge Functions use (type checking only; Supabase provides the runtime). */
declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
  env: { get(name: string): string | undefined };
};
