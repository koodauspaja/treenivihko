import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createPeriodFromForm = vi.fn();
const savePeriodDates = vi.fn();
vi.mock("@/app/trainer/periods/actions", () => ({
  createPeriodFromForm: (...args: unknown[]) => createPeriodFromForm(...args),
  savePeriodDates: (...args: unknown[]) => savePeriodDates(...args),
}));

const { PeriodForm } = await import("@/components/period-form");

beforeEach(() => {
  createPeriodFromForm.mockReset();
  savePeriodDates.mockReset();
});

afterEach(() => {
  cleanup();
});

const start = () => screen.getByLabelText("Alkaa") as HTMLInputElement;
const weeks = () => screen.getByLabelText("Kesto") as HTMLSelectElement;
const INITIAL = { startsOn: "2026-11-03", weeks: "2" };

describe("PeriodForm", () => {
  it("offers a date and the four lengths, starting from what it is given", () => {
    render(<PeriodForm initial={INITIAL} />);
    expect(start().type).toBe("date");
    expect(start().value).toBe("2026-11-03");
    expect(weeks().value).toBe("2");
    expect([...weeks().options].map((each) => [each.value, each.textContent])).toEqual([
      ["1", "1 viikko"],
      ["2", "2 viikkoa"],
      ["3", "3 viikkoa"],
      ["4", "4 viikkoa"],
    ]);
    expect(document.querySelector('input[name="id"]')).toBeNull();
  });

  it("follows newer saved dates the page passes, such as after a save in another tab", () => {
    const { rerender } = render(<PeriodForm periodId="p1" initial={INITIAL} />);
    rerender(<PeriodForm periodId="p1" initial={{ startsOn: "2026-11-10", weeks: "3" }} />);
    expect(start().value).toBe("2026-11-10");
    expect(weeks().value).toBe("3");
  });

  it("creates a new period with Luo jakso", async () => {
    createPeriodFromForm.mockResolvedValue({
      version: 1,
      message: null,
      errors: {},
      values: INITIAL,
    });
    render(<PeriodForm initial={INITIAL} />);
    fireEvent.change(weeks(), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Luo jakso" }));
    await waitFor(() => {
      expect(createPeriodFromForm).toHaveBeenCalledOnce();
    });
    const sent = (createPeriodFromForm.mock.calls[0] as [unknown, FormData])[1];
    expect([sent.get("startsOn"), sent.get("weeks")]).toEqual(["2026-11-03", "3"]);
    expect(savePeriodDates).not.toHaveBeenCalled();
  });

  it("saves an existing period's dates with Tallenna, and says so", async () => {
    savePeriodDates.mockResolvedValue({
      version: 1,
      message: "Tallennettu.",
      errors: {},
      values: { startsOn: "2026-11-10", weeks: "1" },
    });
    const { rerender } = render(<PeriodForm periodId="p1" initial={INITIAL} />);
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }));
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Tallennettu.");
    });
    expect((savePeriodDates.mock.calls[0] as [unknown, FormData])[1].get("id")).toBe("p1");
    // The refreshed page passes the saved dates, which the form then shows.
    // decisions/f004-periods-and-sessions.md
    rerender(<PeriodForm periodId="p1" initial={{ startsOn: "2026-11-10", weeks: "1" }} />);
    expect(start().value).toBe("2026-11-10");
    expect(weeks().value).toBe("1");
  });

  it("drops a refusal and what was sent once the page brings newer saved dates", async () => {
    savePeriodDates.mockResolvedValue({
      version: 1,
      message: null,
      errors: { startsOn: "Anna alkamispäivä." },
      values: { startsOn: "", weeks: "4" },
    });
    const { rerender } = render(<PeriodForm periodId="p1" initial={INITIAL} />);
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
    rerender(<PeriodForm periodId="p1" initial={INITIAL} />);
    expect(weeks().value).toBe("4");
    rerender(<PeriodForm periodId="p1" initial={{ startsOn: "2026-11-10", weeks: "3" }} />);
    expect(start().value).toBe("2026-11-10");
    expect(weeks().value).toBe("3");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows each refusal beside its field, with what was sent", async () => {
    savePeriodDates.mockResolvedValue({
      version: 1,
      message: null,
      errors: { startsOn: "Anna alkamispäivä.", weeks: "Valitse kesto." },
      values: { startsOn: "", weeks: "4" },
    });
    render(<PeriodForm periodId="p1" initial={INITIAL} />);
    fireEvent.click(screen.getByRole("button", { name: "Tallenna" }));
    await waitFor(() => {
      expect(screen.getAllByRole("alert").map((each) => each.textContent)).toEqual([
        "Anna alkamispäivä.",
        "Valitse kesto.",
      ]);
    });
    expect(start().value).toBe("");
    expect(weeks().value).toBe("4");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
