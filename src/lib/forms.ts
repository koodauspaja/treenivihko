/**
 * What the actions share about their forms: reading a field, and what an
 * action with one possible refusal answers.
 *
 * decisions/f004-periods-and-sessions.md
 */

/** A field's text as sent, or empty when it is missing or sent as a file. */
export const formText = (form: FormData, field: string) => {
  const value = form.get(field);
  return typeof value === "string" ? value : "";
};

/** A refusal to show, or none; `version` changes on every answer, so a form can start again. */
export type ActionState = { version: number; error: string | null };

export const NO_ANSWER: ActionState = { version: 0, error: null };
