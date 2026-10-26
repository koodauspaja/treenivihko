import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("the home page", () => {
  it("shows the app's name as its heading, and a Finnish placeholder", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Treenivihko" })).toBeDefined();
    expect(screen.getByText("Sovellusta rakennetaan. Treenit tulevat tänne pian.")).toBeDefined();
  });
});
