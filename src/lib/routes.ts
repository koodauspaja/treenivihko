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
