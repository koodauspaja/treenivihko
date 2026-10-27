import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionButton } from "@/components/action-button";

afterEach(() => {
  cleanup();
});

describe("ActionButton", () => {
  it("sends its fields, and shows nothing more when the action has no refusal", async () => {
    const action = vi.fn().mockResolvedValue({ version: 1, error: null });
    render(<ActionButton action={action} fields={{ periodId: "p1" }} label="Lisää treeni" />);
    fireEvent.click(screen.getByRole("button", { name: "Lisää treeni" }));
    await waitFor(() => {
      expect(action).toHaveBeenCalledOnce();
    });
    const [previous, sent] = action.mock.calls[0] as [unknown, FormData];
    expect(previous).toEqual({ version: 0, error: null });
    expect(sent.get("periodId")).toBe("p1");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the action's refusal beside it", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ version: 1, error: "Jaksossa voi olla enintään 20 treeniä." });
    render(<ActionButton action={action} fields={{ periodId: "p1" }} label="Lisää treeni" />);
    fireEvent.click(screen.getByRole("button", { name: "Lisää treeni" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Jaksossa voi olla enintään 20 treeniä.");
    });
  });
});
