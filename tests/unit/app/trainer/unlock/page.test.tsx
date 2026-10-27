import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/lock-panel", () => ({ LockPanel: () => <p>the lock panel</p> }));

const { default: UnlockPage } = await import("@/app/trainer/unlock/page");

afterEach(() => {
  cleanup();
});

describe("the lock page", () => {
  it("is headed Valmentaja, with the lock panel and a way back to the child's side", () => {
    render(<UnlockPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Valmentaja" })).toBeDefined();
    expect(screen.getByText("the lock panel")).toBeDefined();
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe("/");
  });
});
