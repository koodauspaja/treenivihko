/**
 * Text as a person counts it, shared by every rule on typed text and by the
 * database's checks: one form of each character, a line break as one, and the
 * whitespace trimmed from the ends taken from one list both sides use.
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 * decisions/f003-exercise-import.md
 */

/**
 * Every character `trim` removes from the ends of typed text, listed so the
 * database's checks refuse the same set; a test holds the two equal.
 */
export const WHITESPACE = [
  "\t",
  "\n",
  "\v",
  "\f",
  "\r",
  " ",
  "\u00a0",
  "\u1680",
  "\u2000",
  "\u2001",
  "\u2002",
  "\u2003",
  "\u2004",
  "\u2005",
  "\u2006",
  "\u2007",
  "\u2008",
  "\u2009",
  "\u200a",
  "\u2028",
  "\u2029",
  "\u202f",
  "\u205f",
  "\u3000",
  "\ufeff",
] as const;

/** The text with line breaks as `\n`, trimmed, and in one form of each character. */
export const tidy = (text: string) => text.replace(/\r\n?/g, "\n").trim().normalize("NFC");

/** How many characters a person sees in `text`, as Postgres's `char_length` counts it once tidied. */
export const characterCount = (text: string) => [...text.normalize("NFC")].length;

/** The characters `text` holds exactly as it is, as Postgres's `char_length` counts what is stored. */
export const storedLength = (text: string) => [...text].length;

/**
 * Whether `text` holds what Postgres cannot keep as typed: U+0000, which it
 * refuses, or a lone surrogate, which it would save as U+FFFD.
 */
export const unstorable = (text: string) => text.includes("\u0000") || /\p{Cs}/u.test(text);

/** `WHITESPACE` as a Postgres escape-string literal, for a check written in SQL. */
export const WHITESPACE_SQL = `E'${WHITESPACE.map(
  (character) => String.raw`\u` + (character.codePointAt(0) as number).toString(16).padStart(4, "0")
).join("")}'`;
