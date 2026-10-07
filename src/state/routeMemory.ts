/** "Your route" as the student last saw it on the Lộ trình map in this session (event ids). */
export const routeMemory: { seen: readonly string[] | null } = { seen: null };

/**
 * Called before a change made away from the map (onboarding, Mochi): when the map has not been
 * seen yet in this session, the route before the change becomes the starting point, so the
 * next visit draws the new stations arriving.
 */
export function rememberRouteBefore(ids: readonly string[]): void {
  routeMemory.seen ??= [...ids];
}
