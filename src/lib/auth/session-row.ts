/**
 * What Better Auth would keep of a session that is never stored: the client's
 * address. It reads the address for rate limiting, and nothing needs it after.
 * decisions/f001-trainer-side.md
 */

/** A session row as it is about to be written, without the client's address if it carries one. */
export function withoutAddress<Row extends Record<string, unknown>>(row: Row): Row {
  return "ipAddress" in row ? { ...row, ipAddress: null } : row;
}
