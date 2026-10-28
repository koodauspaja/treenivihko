import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveSessionSettings = vi.fn();
vi.mock("@/app/trainer/sessions/actions", () => ({
  saveSessionSettings: (...args: unknown[]) => saveSessionSettings(...args),
}));

const { SessionSettingsForm } = await import("@/components/session-settings-form");

beforeEach(() => {
  saveSessionSettings.mockReset();
});

afterEach(() => {
  cleanup();
});

const box = (name: string) => screen.getByLabelText(name, { exact: true }) as HTMLInputElement;
const target = () => screen.getByLabelText("Tavoitekesto (min)") as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole("button", { name: "Tallenna" }));

const show = () =>
  render(
    <SessionSettingsForm
      sessionId="t1"
      place="field"
      equipment={["ball", "cones"]}
      targetMinutes={45}
    />
  );

describe("SessionSettingsForm", () => {
  it("shows the session's place, its equipment and its target", () => {
    show();
    expect(screen.getByText("Paikka")).toBeDefined();
    expect(screen.getByText("Välineet käytössä")).toBeDefined();
    expect(box("Kenttä").checked).toBe(true);
    expect(box("Sisällä").checked).toBe(false);
    expect(box("Kuntosali").checked).toBe(false);
    expect(box("Pallo").checked).toBe(true);
    expect(box("Kartiot").checked).toBe(true);
    expect(box("Tikkaat").checked).toBe(false);
    expect(target().value).toBe("45");
  });

  it("follows newer saved choices the page passes, such as after a save in another tab", () => {
    const { rerender } = show();
    rerender(
      <SessionSettingsForm sessionId="t1" place="gym" equipment={["ladder"]} targetMinutes={60} />
    );
    expect(box("Kuntosali").checked).toBe(true);
    expect(box("Kenttä").checked).toBe(false);
    expect(box("Tikkaat").checked).toBe(true);
    expect(box("Pallo").checked).toBe(false);
    expect(target().value).toBe("60");
  });

  it("sends the choices, and says they were saved", async () => {
    saveSessionSettings.mockResolvedValue({ version: 1, message: "Tallennettu.", errors: {} });
    show();
    fireEvent.click(box("Sisällä"));
    fireEvent.click(box("Pallo"));
    fireEvent.change(target(), { target: { value: "30" } });
    save();
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Tallennettu.");
    });
    const sent = (saveSessionSettings.mock.calls[0] as [unknown, FormData])[1];
    expect(sent.get("id")).toBe("t1");
    expect(sent.get("place")).toBe("indoors");
    expect(sent.getAll("equipment")).toEqual(["cones"]);
    expect(sent.get("targetMinutes")).toBe("30");
  });

  it("shows each refusal beside its field, keeping what was chosen", async () => {
    saveSessionSettings.mockResolvedValue({
      version: 1,
      message: null,
      errors: {
        place: "Valitse paikka.",
        target: "Tavoitekeston on oltava 5–120 minuuttia, 5 minuutin välein.",
      },
    });
    show();
    fireEvent.click(box("Kuntosali"));
    fireEvent.click(box("Tikkaat"));
    fireEvent.change(target(), { target: { value: "7" } });
    save();
    await waitFor(() => {
      expect(screen.getAllByRole("alert").map((each) => each.textContent)).toEqual([
        "Valitse paikka.",
        "Tavoitekeston on oltava 5–120 minuuttia, 5 minuutin välein.",
      ]);
    });
    expect(box("Kuntosali").checked).toBe(true);
    expect(box("Tikkaat").checked).toBe(true);
    expect(box("Pallo").checked).toBe(true);
    expect(target().value).toBe("7");
  });

  it("keeps no place chosen when none was sent", async () => {
    saveSessionSettings.mockResolvedValue({
      version: 1,
      message: null,
      errors: { place: "Valitse paikka." },
    });
    render(
      <SessionSettingsForm sessionId="t1" place={"" as never} equipment={[]} targetMinutes={45} />
    );
    save();
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Valitse paikka.");
    });
    expect((saveSessionSettings.mock.calls[0] as [unknown, FormData])[1].get("place")).toBeNull();
    expect(box("Kenttä").checked).toBe(false);
  });
});
