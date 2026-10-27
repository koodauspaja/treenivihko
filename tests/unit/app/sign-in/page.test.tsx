import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const received: unknown[] = [];
vi.mock("@/components/sign-in-error", () => ({
  SignInError: ({ searchParams }: { searchParams: unknown }) => {
    received.push(searchParams);
    return <p>the error, if any</p>;
  },
}));
vi.mock("@/components/sign-in-button", () => ({
  SignInButton: () => <button type="button">the button</button>,
}));

const { default: SignInPage } = await import("@/app/sign-in/page");

describe("the sign-in page", () => {
  it("names the app, asks to sign in in Finnish, and hands the address's query to the error", () => {
    const searchParams = Promise.resolve({ error: "sign_in_not_allowed" });
    render(<SignInPage params={Promise.resolve({})} searchParams={searchParams} />);
    expect(screen.getByRole("heading", { level: 1, name: "Treenivihko" })).toBeDefined();
    expect(screen.getByText("Kirjaudu sisään jatkaaksesi.")).toBeDefined();
    expect(screen.getByText("the error, if any")).toBeDefined();
    expect(screen.getByRole("button", { name: "the button" })).toBeDefined();
    expect(received).toContain(searchParams);
  });
});
