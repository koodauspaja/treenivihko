import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldForm } from "@/components/field-form";

afterEach(() => {
  cleanup();
});

const field = () => screen.getByLabelText("Osio") as HTMLInputElement;
const answer = (version: number, message: string | null, errors = {}) => ({
  version,
  message,
  errors,
});

describe("FieldForm", () => {
  it("starts from its value, and sends it with its fields", async () => {
    const action = vi.fn().mockResolvedValue(answer(1, "Tallennettu."));
    render(
      <FieldForm
        action={action}
        fields={{ id: "b1" }}
        name="theme"
        label="Osio"
        initial="Kuljetus"
      />
    );
    expect(field().value).toBe("Kuljetus");
    expect(field().id).toBe("theme-b1");
    fireEvent.change(field(), { target: { value: "Laukaus" } });
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Tallennettu.");
    });
    const sent = (action.mock.calls[0] as [unknown, FormData])[1];
    expect([sent.get("id"), sent.get("theme")]).toEqual(["b1", "Laukaus"]);
    expect(field().value).toBe("Kuljetus");
  });

  it("shows a refusal beside the field, keeping what was typed", async () => {
    const action = vi
      .fn()
      .mockResolvedValue(answer(1, null, { theme: "Osion nimessä on oltava 1–30 merkkiä." }));
    render(
      <FieldForm action={action} fields={{ id: "b1" }} name="theme" label="Osio" initial="A" />
    );
    fireEvent.change(field(), { target: { value: "x".repeat(31) } });
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Osion nimessä on oltava 1–30 merkkiä.");
    });
    expect(field().value).toBe("x".repeat(31));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows the page's value again after adding, with its own button", async () => {
    const action = vi.fn().mockResolvedValue(answer(1, null));
    render(
      <FieldForm
        action={action}
        fields={{ sessionId: "t1" }}
        name="theme"
        label="Osio"
        initial=""
        button="Lisää osio"
      />
    );
    fireEvent.change(field(), { target: { value: "Kuljetus" } });
    fireEvent.click(screen.getByRole("button", { name: "Lisää osio" }));
    await waitFor(() => {
      expect(action).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(field().value).toBe("");
    });
  });

  it("keeps the saved value after saving, and asks for numbers when told", async () => {
    const action = vi.fn().mockResolvedValue(answer(1, null));
    render(
      <FieldForm
        action={action}
        fields={{ id: "x1" }}
        name="amount"
        label="Kertoja"
        initial="10"
        inputMode="numeric"
      />
    );
    const amount = screen.getByLabelText("Kertoja") as HTMLInputElement;
    expect(amount.inputMode).toBe("numeric");
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }));
    await waitFor(() => {
      expect(action).toHaveBeenCalledOnce();
    });
    expect((screen.getByLabelText("Kertoja") as HTMLInputElement).value).toBe("10");
  });

  it("shows a message that is not a save, such as not found, and keeps the saved value", async () => {
    const action = vi.fn().mockResolvedValue(answer(1, "Sivua ei löytynyt."));
    render(
      <FieldForm
        action={action}
        fields={{ sessionId: "t1" }}
        name="theme"
        label="Osio"
        initial=""
      />
    );
    fireEvent.change(field(), { target: { value: "Kuljetus" } });
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Sivua ei löytynyt.");
    });
  });
});
