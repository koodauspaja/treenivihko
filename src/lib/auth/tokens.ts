/**
 * Google's tokens are never stored. Nothing here calls Google after sign-in,
 * and the ID token holds the parent's name, address and picture, which the
 * user row already has what it needs of. decisions/029-sign-in.md
 */

/** The account columns Better Auth fills from Google's token response. */
export const TOKEN_FIELDS = [
  "accessToken",
  "refreshToken",
  "idToken",
  "accessTokenExpiresAt",
  "refreshTokenExpiresAt",
] as const;

/** An account row as it is about to be written, with every token field it carries emptied. */
export function withoutTokens<Row extends Record<string, unknown>>(row: Row): Row {
  const kept: Record<string, unknown> = { ...row };
  for (const field of TOKEN_FIELDS) {
    if (field in kept) {
      kept[field] = null;
    }
  }
  return kept as Row;
}
