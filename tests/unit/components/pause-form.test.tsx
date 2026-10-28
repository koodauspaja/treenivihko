import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createPauseFromForm = vi.fn();
vi.mock("@/app/trainer/pauses/actions", () => ({
  createPauseFromForm: (...args: unknown[]) => createPauseFromForm(...args),
}));

const { PauseForm } = await import("@/components/pause-form");

beforeEach(() => {
  createPauseFromForm.mockReset();
});

afterEach(() => {
  cleanup();
});

const start = () => screen.getByLabelText("Alkaa") as HTMLInputElement;
const end = () => screen.getByLabelText("Päättyy") as HTMLInputElement;
const INITIAL = { startsOn: "2026-11-05", endsOn: "2026-11-11" };

describe("PauseForm", () => {
  it("offers two dates, starting from what it is given", () => {
    render(<PauseForm initial={INITIAL} />);
    expect([start().type, start().value]).toEqual(["date", "2026-11-05"]);
    expect([end().type, end().value]).toEqual(["date", "2026-11-11"]);
  });

  it("sends the days with Lisää tauko, and starts again from the page's days after an add", async () => {
    createPauseFromForm.mockResolvedValue({
      version: 1,
      errors: {},
      values: { startsOn: "2026-12-01", endsOn: "2026-12-02" },
    });
    render(<PauseForm initial={INITIAL} />);
    fireEvent.change(start(), { target: { value: "2026-12-01" } });
    fireEvent.change(end(), { target: { value: "2026-12-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Lisää tauko" }));
    await waitFor(() => {
      expect(createPauseFromForm).toHaveBeenCalledOnce();
    });
    const sent = (createPauseFromForm.mock.calls[0] as [unknown, FormData])[1];
    expect([sent.get("startsOn"), sent.get("endsOn")]).toEqual(["2026-12-01", "2026-12-02"]);
    await waitFor(() => {
      expect(start().value).toBe("2026-11-05");
    });
    expect(end().value).toBe("2026-11-11");
  });

  it("shows each refusal beside its field, keeping what was sent", async () => {
    const sent = { startsOn: "", endsOn: "2026-11-01" };
    createPauseFromForm.mockResolvedValue({
      version: 1,
      errors: { startsOn: "Anna alkamispäivä.", endsOn: "Tauko voi olla enintään 26 viikkoa." },
      values: sent,
    });
    render(<PauseForm initial={INITIAL} />);
    fireEvent.click(screen.getByRole("button", { name: "Lisää tauko" }));
    await waitFor(() => {
      expect(screen.getByText("Anna alkamispäivä.")).toBeDefined();
    });
    expect(screen.getByText("Tauko voi olla enintään 26 viikkoa.")).toBeDefined();
    expect([start().value, end().value]).toEqual(["", "2026-11-01"]);
  });
});
