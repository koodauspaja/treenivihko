/**
 * Next's configuration. Public addresses are Finnish and App Router folders
 * English; `src/lib/routes.ts` is the one table between them.
 *
 * decisions/012-project-init.md
 * decisions/029-sign-in.md
 */

import type { NextConfig } from "next";
import { routeRedirects, routeRewrites } from "./src/lib/routes.ts";

const nextConfig: NextConfig = {
  rewrites: async () => routeRewrites(),
  // Checked before the rewrites, which is what makes the pair safe.
  redirects: async () => routeRedirects(),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
