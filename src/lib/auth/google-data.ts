/**
 * What Google sends that is never stored: its tokens and the profile picture.
 * Nothing here calls Google after sign-in, the ID token holds the parent's name,
 * address and picture, and nothing shows a picture. decisions/029-sign-in.md
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

/** A user row as it is about to be written, without Google's picture if it carries one. */
export function withoutPicture<Row extends Record<string, unknown>>(row: Row): Row {
  return "image" in row ? { ...row, image: null } : row;
}
