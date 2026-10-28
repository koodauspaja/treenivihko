/**
 * The marking form: its choices as a first mark and as a saved one, what
 * En tehnyt hides, and what it keeps beside a refusal.
 *
 * decisions/f004-periods-and-sessions.md
 * decisions/f006-session-marks.md
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mark } from "@/lib/marks/rules";

const saveMarkFromForm = vi.fn();
vi.mock("@/app/session/actions", () => ({
  saveMarkFromForm: (...args: unknown[]) => saveMarkFromForm(...args),
}));

const { MarkForm } = await import("@/components/mark-form");

beforeEach(() => {
  saveMarkFromForm.mockReset();
});

afterEach(() => {
  cleanup();
});

const EXERCISES = [
  { exerciseId: "e1", name: "Tikkaat: perusaskel" },
  { exerciseId: "e2", name: "Lähdöt" },
];
const MARK: Mark = {
  status: "partly",
  trainedOn: "2026-11-04",
  feeling: 2,
  picks: { likedBest: "e2", likedLeast: "e1", easiest: null, hardest: "e2" },
};

const show = (mark: Mark | null = null, exercises = EXERCISES) =>
  render(<MarkForm sessionId="t1" today="2026-11-05" exercises={exercises} mark={mark} />);

const radio = (name: string) => screen.getByLabelText(name, { exact: true }) as HTMLInputElement;
const group = (legend: string) => screen.getByRole("group", { name: legend });
const chosen = (legend: string) =>
  (
    within(group(legend))
      .getAllByRole("radio")
      .find((each) => (each as HTMLInputElement).checked) as HTMLInputElement | undefined
  )?.value;
const day = () => screen.getByLabelText("Milloin?") as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole("button", { name: "Tallenna" }));
/** Every refusal's text, in the page's order. */
const alerts = () =>
  [...document.querySelectorAll('[role="alert"]')].map((each) => each.textContent);
const sent = () => (saveMarkFromForm.mock.calls[0] as [unknown, FormData])[1];

describe("MarkForm", () => {
  it("starts a first mark with no status, today, and every face and pick skipped", () => {
    show();
    expect(chosen("Teitkö treenin?")).toBeUndefined();
    expect(
      within(group("Teitkö treenin?"))
        .getAllByRole("radio")
        .map((each) => (each.parentElement as HTMLElement).textContent)
    ).toEqual(["Tein kaiken", "Tein osan", "En tehnyt"]);
    expect(day().value).toBe("2026-11-05");
    expect(chosen("Miltä treeni tuntui?")).toBe("");
    for (const question of [
      "Mikä oli kivoin?",
      "Mikä oli tylsin?",
      "Mikä oli helpoin?",
      "Mikä oli vaikein?",
    ]) {
      expect(
        within(group(question))
          .getAllByRole("radio")
          .map((each) => (each.parentElement as HTMLElement).textContent)
      ).toEqual(["Tikkaat: perusaskel", "Lähdöt", "Ohita"]);
      expect(chosen(question)).toBe("");
    }
  });

  it("names each face for a screen reader, happiest first", () => {
    show();
    expect(
      within(group("Miltä treeni tuntui?"))
        .getAllByRole("radio")
        .map((each) => each.getAttribute("aria-label") ?? "Ohita")
    ).toEqual(["Tosi hyvä", "Hyvä", "Ihan ok", "Huono", "Tosi huono", "Ohita"]);
    expect(screen.getByText("😄").getAttribute("aria-hidden")).toBe("true");
  });

  it("opens a saved mark with its choices, and a pick whose exercise has left as skipped", () => {
    show(MARK, [EXERCISES[0] as (typeof EXERCISES)[0]]);
    expect(chosen("Teitkö treenin?")).toBe("partly");
    expect(day().value).toBe("2026-11-04");
    expect(chosen("Miltä treeni tuntui?")).toBe("2");
    expect(chosen("Mikä oli kivoin?")).toBe("");
    expect(chosen("Mikä oli tylsin?")).toBe("e1");
    expect(chosen("Mikä oli helpoin?")).toBe("");
  });

  it("hides the day, the face and the picks once En tehnyt is chosen, and shows them again", () => {
    show();
    fireEvent.click(radio("En tehnyt"));
    expect(day().closest("[hidden]")).not.toBeNull();
    fireEvent.click(radio("Tein osan"));
    expect(day().closest("[hidden]")).toBeNull();
  });

  it("opens a session not done with the rest hidden", () => {
    show({ status: "not_done", trainedOn: null, feeling: null, picks: MARK.picks });
    expect(day().closest("[hidden]")).not.toBeNull();
    expect(day().value).toBe("2026-11-05");
  });

  it("asks no picks of a session with no exercises", () => {
    show(null, []);
    expect(screen.queryByRole("group", { name: "Mikä oli kivoin?" })).toBeNull();
    expect(screen.getByRole("group", { name: "Miltä treeni tuntui?" })).toBeDefined();
  });

  it("sends the choices", async () => {
    saveMarkFromForm.mockResolvedValue({ version: 1, message: null, errors: {} });
    show();
    fireEvent.click(radio("Tein kaiken"));
    fireEvent.change(day(), { target: { value: "2026-11-03" } });
    fireEvent.click(radio("Tosi hyvä"));
    fireEvent.click(within(group("Mikä oli kivoin?")).getByLabelText("Lähdöt"));
    fireEvent.click(within(group("Mikä oli tylsin?")).getByLabelText("Lähdöt"));
    save();
    await waitFor(() => {
      expect(saveMarkFromForm).toHaveBeenCalledOnce();
    });
    expect(sent().get("id")).toBe("t1");
    expect(sent().get("status")).toBe("done");
    expect(sent().get("trainedOn")).toBe("2026-11-03");
    expect(sent().get("feeling")).toBe("5");
    expect(sent().get("likedBest")).toBe("e2");
    expect(sent().get("likedLeast")).toBe("e2");
    expect(sent().get("easiest")).toBe("");
    expect(sent().get("hardest")).toBe("");
  });

  it("keeps what was chosen beside a refusal", async () => {
    saveMarkFromForm.mockResolvedValue({
      version: 1,
      message: null,
      errors: { trainedOn: "Valitse päivä jakson alusta tähän päivään." },
    });
    show();
    fireEvent.click(radio("Tein osan"));
    fireEvent.change(day(), { target: { value: "2026-10-01" } });
    fireEvent.click(radio("Huono"));
    fireEvent.click(within(group("Mikä oli vaikein?")).getByLabelText("Lähdöt"));
    save();
    await waitFor(() => {
      expect(alerts()).toEqual(["Valitse päivä jakson alusta tähän päivään."]);
    });
    expect(chosen("Teitkö treenin?")).toBe("partly");
    expect(day().value).toBe("2026-10-01");
    expect(chosen("Miltä treeni tuntui?")).toBe("2");
    expect(chosen("Mikä oli vaikein?")).toBe("e2");
  });

  it("shows the status's refusal, and the picks' when the session has changed", async () => {
    saveMarkFromForm.mockResolvedValue({
      version: 1,
      message: null,
      errors: {
        status: "Valitse, teitkö treenin.",
        picks: "Treeni on muuttunut. Valitse uudelleen.",
      },
    });
    show();
    save();
    await waitFor(() => {
      expect(alerts()).toEqual([
        "Valitse, teitkö treenin.",
        "Treeni on muuttunut. Valitse uudelleen.",
      ]);
    });
  });

  it("drops a refusal and what was chosen once the page brings a newer saved mark", async () => {
    saveMarkFromForm.mockResolvedValue({
      version: 1,
      message: null,
      errors: { status: "Valitse, teitkö treenin." },
    });
    const { rerender } = show();
    save();
    await waitFor(() => {
      expect(alerts()).toHaveLength(1);
    });
    rerender(<MarkForm sessionId="t1" today="2026-11-05" exercises={EXERCISES} mark={MARK} />);
    expect(alerts()).toEqual([]);
    expect(chosen("Teitkö treenin?")).toBe("partly");
  });

  it("says a session that is gone is not found", async () => {
    saveMarkFromForm.mockResolvedValue({ version: 1, message: "Sivua ei löytynyt.", errors: {} });
    show(MARK);
    save();
    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("Sivua ei löytynyt.");
    });
  });
});
