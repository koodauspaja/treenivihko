/**
 * Every page's Finnish address and the English folder that serves it: one table,
 * read twice by `next.config.ts`. A rewrite serves the folder at the address,
 * and a redirect sends the folder's own path back to the address, so the
 * browser always shows the Finnish one.
 *
 * decisions/029-sign-in.md
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 * decisions/f003-exercise-import.md
 * decisions/f004-periods-and-sessions.md
 * decisions/f005-notebook-view.md
 * decisions/f006-session-marks.md
 */

export const ROUTES: ReadonlyArray<readonly [address: string, folder: string]> = [
  // The sign-in page.
  ["/kirjaudu", "/sign-in"],
  // The trainer side, and its lock page.
  ["/valmentaja", "/trainer"],
  ["/valmentaja/avaa", "/trainer/unlock"],
  // The nickname, and the exercise library: "uusi" and "tuonti" before an exercise's id, since order decides.
  ["/valmentaja/nimi", "/trainer/nickname"],
  ["/valmentaja/harjoitteet", "/trainer/exercises"],
  ["/valmentaja/harjoitteet/uusi", "/trainer/exercises/new"],
  ["/valmentaja/harjoitteet/tuonti", "/trainer/exercises/import"],
  ["/valmentaja/harjoitteet/:id", "/trainer/exercises/:id"],
  // The periods, "uusi" before a period's id; a session, and its exercise picker.
  ["/valmentaja/jaksot", "/trainer/periods"],
  ["/valmentaja/jaksot/uusi", "/trainer/periods/new"],
  ["/valmentaja/jaksot/:id", "/trainer/periods/:id"],
  ["/valmentaja/treenit/:id", "/trainer/sessions/:id"],
  ["/valmentaja/treenit/:id/lisaa/:blockId", "/trainer/sessions/:id/add/:blockId"],
  // The child's side: one exercise of the period shown.
  ["/harjoite/:id", "/exercise/:id"],
  // The child's side: marking a session.
  ["/treeni/:id", "/session/:id"],
];

/** Next's rewrites: each address served from its folder. */
export function routeRewrites() {
  return ROUTES.map(([address, folder]) => ({ source: address, destination: folder }));
}

/**
 * Next's redirects, which run before the rewrites: each folder's path to its
 * address. Permanent, so 308, which keeps the method; the query string carries over.
 */
export function routeRedirects() {
  return ROUTES.map(([address, folder]) => ({
    source: folder,
    destination: address,
    permanent: true,
  }));
}
