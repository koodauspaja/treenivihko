import { describe, expect, it } from "vitest";
import { formText, NO_ANSWER } from "@/lib/forms";

describe("formText", () => {
  it("reads a field's text as sent, untrimmed", () => {
    const form = new FormData();
    form.append("theme", " Kuljetus ");
    expect(formText(form, "theme")).toBe(" Kuljetus ");
  });

  it("reads a missing field, or one sent as a file, as empty", () => {
    const form = new FormData();
    form.append("theme", new Blob(["Kuljetus"]));
    expect(formText(form, "theme")).toBe("");
    expect(formText(form, "other")).toBe("");
  });
});

describe("NO_ANSWER", () => {
  it("is the first state, with no refusal", () => {
    expect(NO_ANSWER).toEqual({ version: 0, error: null });
  });
});
