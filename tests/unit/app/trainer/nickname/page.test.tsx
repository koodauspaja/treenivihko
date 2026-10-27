import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/nickname-panel", () => ({ NicknamePanel: () => <p>the nickname panel</p> }));

const { default: NicknamePage } = await import("@/app/trainer/nickname/page");

afterEach(() => {
  cleanup();
});

describe("the nickname page", () => {
  it("is headed Lapsen nimi, with the panel and a way back to the menu", () => {
    render(<NicknamePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Lapsen nimi" })).toBeDefined();
    expect(screen.getByText("the nickname panel")).toBeDefined();
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe("/valmentaja");
  });
});
