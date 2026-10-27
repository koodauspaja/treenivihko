import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
const replace = vi.fn();
vi.mock("@/lib/auth/client", () => ({ authClient: { signOut } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const { SignOutButton } = await import("@/components/sign-out-button");

const button = () => screen.getByRole("button", { name: "Kirjaudu ulos" }) as HTMLButtonElement;

beforeEach(() => {
  signOut.mockReset();
  replace.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("SignOutButton", () => {
  it("signs out, then goes to the sign-in page", async () => {
    signOut.mockResolvedValue({ data: { success: true } });
    render(<SignOutButton />);
    fireEvent.click(button());
    expect(button().disabled).toBe(true);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/kirjaudu");
    });
  });

  it.each([
    ["an error answer", () => Promise.resolve({ error: { status: 500 } })],
    ["a thrown failure", () => Promise.reject(new Error("network down"))],
  ])("works again after %s, and says so in Finnish", async (_case, failure) => {
    signOut.mockImplementation(failure);
    render(<SignOutButton />);
    fireEvent.click(button());
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Jokin meni vikaan.");
    });
    expect(button().disabled).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });
});
