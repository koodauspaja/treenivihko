import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const social = vi.fn();
vi.mock("@/lib/auth/client", () => ({ authClient: { signIn: { social } } }));

const { SignInButton } = await import("@/components/sign-in-button");

const button = () => screen.getByRole("button", { name: "Kirjaudu Google-tilillä" });

beforeEach(() => {
  social.mockReset();
});

// Vitest's globals are off, so Testing Library does not unmount between tests by itself.
afterEach(() => {
  cleanup();
});

describe("SignInButton", () => {
  it("starts Google's sign-in, back to the child's side or, refused, to the sign-in page", () => {
    social.mockReturnValue(new Promise(() => {}));
    render(<SignInButton />);
    fireEvent.click(button());
    expect(social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/kirjaudu",
    });
    expect((button() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    ["an error answer", () => Promise.resolve({ error: { status: 500 } })],
    ["a thrown failure", () => Promise.reject(new Error("network down"))],
  ])("works again after %s, and says sign-in failed in Finnish", async (_case, failure) => {
    social.mockImplementation(failure);
    render(<SignInButton />);
    fireEvent.click(button());
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        "Kirjautuminen ei onnistunut. Yritä uudelleen."
      );
    });
    expect((button() as HTMLButtonElement).disabled).toBe(false);
  });

  it("stays disabled on success, while the browser goes to Google", async () => {
    social.mockResolvedValue({ data: { url: "https://accounts.google.com/" } });
    render(<SignInButton />);
    fireEvent.click(button());
    await waitFor(() => expect(social).toHaveBeenCalledOnce());
    expect((button() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
