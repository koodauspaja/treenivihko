import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const unlockTrainer = vi.fn();
vi.mock("@/app/trainer/actions", () => ({
  unlockTrainer: (...args: unknown[]) => unlockTrainer(...args),
}));

const { UnlockForm } = await import("@/components/unlock-form");

beforeEach(() => {
  unlockTrainer.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("UnlockForm", () => {
  it("asks for the password, required, and shows nothing before a try", () => {
    render(<UnlockForm />);
    const field = screen.getByLabelText("Salasana") as HTMLInputElement;
    expect(field.type).toBe("password");
    expect(field.required).toBe(true);
    expect(screen.getByRole("button", { name: "Avaa" })).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("sends the password, and shows why it did not open", async () => {
    unlockTrainer.mockResolvedValue({ message: "Väärä salasana.", error: true });
    render(<UnlockForm />);
    fireEvent.change(screen.getByLabelText("Salasana"), { target: { value: "wrong one" } });
    fireEvent.click(screen.getByRole("button", { name: "Avaa" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Väärä salasana.");
    });
    const [, sent] = unlockTrainer.mock.calls[0] as [unknown, FormData];
    expect(sent.get("password")).toBe("wrong one");
  });
});
