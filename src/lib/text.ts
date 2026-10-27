/**
 * Text as a person counts it, shared by every rule on a typed length: one form
 * of each character (NFC), counted by code point, so "Äijä" is 4 whichever way
 * it was typed and an emoji is 1, as Postgres's `char_length` counts it.
 *
 * decisions/f001-trainer-side.md
 * decisions/f002-exercise-library.md
 */

/** The text trimmed and in one form of each character. */
export const tidy = (text: string) => text.trim().normalize("NFC");

/** How many characters a person sees in `text`. */
export const characterCount = (text: string) => [...text.normalize("NFC")].length;
