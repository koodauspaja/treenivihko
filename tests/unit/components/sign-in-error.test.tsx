import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignInError } from "@/components/sign-in-error";

const rendered = async (query: Record<string, string | string[] | undefined>) =>
  SignInError({ searchParams: Promise.resolve(query) });

describe("SignInError", () => {
  it("shows the refusal in Finnish, as an alert", async () => {
    const shown = await rendered({ error: "sign_in_not_allowed" });
    expect(shown).not.toBeNull();
    render(shown as React.ReactElement);
    expect(screen.getByRole("alert").textContent).toBe(
      "Tällä Google-tilillä ei voi kirjautua Treenivihkoon."
    );
  });

  it("shows nothing when the address carries no error", async () => {
    expect(await rendered({})).toBeNull();
  });
});
