import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmAction } from "@/components/confirm-action";

afterEach(() => {
  cleanup();
});

const show = (action = vi.fn().mockResolvedValue({ version: 1, error: null })) => {
  render(
    <ConfirmAction
      action={action}
      fields={{ id: "b1" }}
      label="Poista osio"
      question="Poistetaanko osio Kuljetus?"
    />
  );
  return action;
};

describe("ConfirmAction", () => {
  it("asks before acting, and Peruuta takes the question back", () => {
    const action = show();
    expect(screen.queryByText("Poistetaanko osio Kuljetus?")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Poista osio" }));
    expect(screen.getByText("Poistetaanko osio Kuljetus?")).toBeDefined();
    expect((document.querySelector('input[name="id"]') as HTMLInputElement).value).toBe("b1");
    fireEvent.click(screen.getByRole("button", { name: "Peruuta" }));
    expect(screen.queryByText("Poistetaanko osio Kuljetus?")).toBeNull();
    expect(screen.getByRole("button", { name: "Poista osio" })).toBeDefined();
    expect(action).not.toHaveBeenCalled();
  });

  it("acts on Poista, with its fields", async () => {
    const action = show();
    fireEvent.click(screen.getByRole("button", { name: "Poista osio" }));
    fireEvent.click(screen.getByRole("button", { name: "Poista" }));
    await waitFor(() => {
      expect(action).toHaveBeenCalledOnce();
    });
    expect((action.mock.calls[0] as [unknown, FormData])[1].get("id")).toBe("b1");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a refusal under the question, and still after Peruuta", async () => {
    show(vi.fn().mockResolvedValue({ version: 1, error: "Harjoite on käytössä." }));
    fireEvent.click(screen.getByRole("button", { name: "Poista osio" }));
    fireEvent.click(screen.getByRole("button", { name: "Poista" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Harjoite on käytössä.");
    });
    fireEvent.click(screen.getByRole("button", { name: "Peruuta" }));
    expect(screen.getByRole("alert").textContent).toBe("Harjoite on käytössä.");
  });
});
