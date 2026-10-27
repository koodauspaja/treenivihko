/**
 * The ids the stores make: random UUIDs. Anything else, such as a crafted
 * address holding U+0000, which Postgres cannot even compare, is no row of
 * anyone's, so it is refused before any query.
 *
 * decisions/f002-exercise-library.md
 * decisions/f004-periods-and-sessions.md
 */

/** Whether `id` is one a store could have made. */
export const isRowId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
