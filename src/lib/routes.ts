/**
 * Every page's Finnish address and the English folder that serves it: one table,
 * read twice by `next.config.ts`. A rewrite serves the folder at the address,
 * and a redirect sends the folder's own path back to the address, so the
 * browser always shows the Finnish one. decisions/029-sign-in.md
 */

export const ROUTES: ReadonlyArray<readonly [address: string, folder: string]> = [
  // The sign-in page.
  ["/kirjaudu", "/sign-in"],
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
