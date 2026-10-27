import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IMPORT_MAX_BYTES } from "@/lib/exercises/import";
import { IMPORT_PROMPT } from "@/lib/exercises/import-messages";

const importFromForm = vi.fn();
vi.mock("@/app/trainer/exercises/import/actions", () => ({
  importFromForm: (...args: unknown[]) => importFromForm(...args),
}));

const { ImportForm, ImportPrompt } = await import("@/components/import-form");

const ANSWER = { version: 1, message: null, refusal: null, failing: [], text: "" };

const text = () => screen.getByLabelText("Tai liitä teksti") as HTMLTextAreaElement;
const fileField = () => screen.getByLabelText("Tiedosto (.json)") as HTMLInputElement;
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Tuo" }));

const choose = (file: File) => {
  Object.defineProperty(fileField(), "files", { value: [file], configurable: true });
};

beforeEach(() => {
  importFromForm.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ImportPrompt", () => {
  const clipboard = (writeText: () => Promise<void>) =>
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn(writeText) } });

  it("shows the prompt, and copies it", async () => {
    clipboard(() => Promise.resolve());
    render(<ImportPrompt />);
    expect((screen.getByLabelText("Ohje tekoälylle") as HTMLTextAreaElement).value).toBe(
      IMPORT_PROMPT
    );
    fireEvent.click(screen.getByRole("button", { name: "Kopioi ohje" }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Kopioitu.");
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(IMPORT_PROMPT);
  });

  it("says so when copying fails, so the parent can copy it themself", async () => {
    clipboard(() => Promise.reject(new Error("denied")));
    render(<ImportPrompt />);
    fireEvent.click(screen.getByRole("button", { name: "Kopioi ohje" }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe(
        "Kopiointi ei onnistunut. Valitse teksti ja kopioi se itse."
      );
    });
  });
});

describe("ImportForm", () => {
  it("sends the file and the text, and says how many it imported", async () => {
    importFromForm.mockResolvedValue({ ...ANSWER, message: "Tuotu 3 harjoitetta." });
    render(<ImportForm />);
    fireEvent.change(text(), { target: { value: "[]" } });
    submit();
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Tuotu 3 harjoitetta.");
    });
    const sent = importFromForm.mock.calls[0]?.[1] as FormData;
    expect(sent.get("text")).toBe("[]");
    expect(sent.has("file")).toBe(true);
    expect(text().value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a refusal of the whole import, with the text kept", async () => {
    importFromForm.mockResolvedValue({
      ...ANSWER,
      refusal: "Tämä ei ole JSON-muotoa.",
      text: "[1,",
    });
    render(<ImportForm />);
    submit();
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Tämä ei ole JSON-muotoa.");
    });
    expect(text().value).toBe("[1,");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("lists each failing exercise with each of its reasons", async () => {
    importFromForm.mockResolvedValue({
      ...ANSWER,
      message: "2 harjoitetta ei kelpaa. Mitään ei tallennettu.",
      failing: [
        { heading: "Harjoite 1: Tikkaat", reasons: ["Valitse taso.", "Tuntematon taito: X."] },
        { heading: "Harjoite 3", reasons: ["Harjoite ei ole oikeaa muotoa."] },
      ],
      text: "[…]",
    });
    render(<ImportForm />);
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("2 harjoitetta ei kelpaa. Mitään ei tallennettu.");
    expect(screen.getByText("Harjoite 1: Tikkaat")).toBeDefined();
    expect(screen.getByText("Tuntematon taito: X.")).toBeDefined();
    expect(screen.getByText("Harjoite ei ole oikeaa muotoa.")).toBeDefined();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("refuses pasted text over the limit before sending it, counted in bytes", async () => {
    render(<ImportForm />);
    fireEvent.change(text(), { target: { value: "ä".repeat(IMPORT_MAX_BYTES / 2 + 1) } });
    submit();
    expect(screen.getByRole("alert").textContent).toBe("Tuonti on liian suuri: enintään 500 kt.");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(importFromForm).not.toHaveBeenCalled();
  });

  it("counts pasted line breaks as the form sends them, two bytes each", async () => {
    render(<ImportForm />);
    const lines = "\n".repeat(1000);
    fireEvent.change(text(), { target: { value: "x".repeat(IMPORT_MAX_BYTES - 1000) + lines } });
    submit();
    expect(screen.getByRole("alert").textContent).toBe("Tuonti on liian suuri: enintään 500 kt.");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(importFromForm).not.toHaveBeenCalled();
  });

  it("refuses a file and text that are over the limit together, each within it", async () => {
    render(<ImportForm />);
    choose(new File(["x".repeat(IMPORT_MAX_BYTES / 2)], "puolet.json"));
    fireEvent.change(text(), { target: { value: "x".repeat(IMPORT_MAX_BYTES / 2 + 1) } });
    submit();
    expect(screen.getByRole("alert").textContent).toBe("Tuonti on liian suuri: enintään 500 kt.");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(importFromForm).not.toHaveBeenCalled();
  });

  it("names the chosen file beside its Finnish button, and none when nothing is chosen", () => {
    render(<ImportForm />);
    expect(screen.getByText("Ei valittua tiedostoa.")).toBeDefined();
    expect(fileField().className).toContain("sr-only");
    fireEvent.change(fileField(), { target: { files: [new File(["[]"], "harjoitteet.json")] } });
    expect(screen.getByText("harjoitteet.json")).toBeDefined();
    fireEvent.change(fileField(), { target: { files: [] } });
    expect(screen.getByText("Ei valittua tiedostoa.")).toBeDefined();
  });

  it("refuses a file over the limit before sending it, and sends one within it", async () => {
    importFromForm.mockResolvedValue({ ...ANSWER, message: "Tuotu 1 harjoite." });
    render(<ImportForm />);
    choose(new File(["x".repeat(IMPORT_MAX_BYTES + 1)], "iso.json"));
    submit();
    expect(screen.getByRole("alert").textContent).toBe("Tuonti on liian suuri: enintään 500 kt.");
    // Long enough for a sent form to reach the action.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(importFromForm).not.toHaveBeenCalled();
    choose(new File(["x".repeat(IMPORT_MAX_BYTES)], "sopiva.json"));
    submit();
    await waitFor(() => {
      expect(importFromForm).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
