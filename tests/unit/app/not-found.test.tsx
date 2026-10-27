import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";

afterEach(() => {
  cleanup();
});

describe("the not-found page", () => {
  it("says so in Finnish, with a way to the start", () => {
    render(<NotFound />);
    expect(screen.getByText("Sivua ei löytynyt.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Etusivulle" }).getAttribute("href")).toBe("/");
  });
});
