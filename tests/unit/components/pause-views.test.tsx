/**
 * The pauses' list, behind the unlock, with each pause's deletion and the
 * form for a new one, a week from today in Finland.
 *
 * decisions/f008-streaks-and-accomplishments.md
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireTrainer = vi.fn();
const listPauses = vi.fn();
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/streaks/store", () => ({
  listPauses: (...args: unknown[]) => listPauses(...args),
}));
vi.mock("@/app/trainer/pauses/actions", () => ({ removePause: vi.fn() }));
vi.mock("@/components/trainer-timeout", () => ({
  TrainerTimeout: ({ expiresAt }: { expiresAt: string }) => <p>timeout {expiresAt}</p>,
}));
vi.mock("@/components/pause-form", () => ({
  PauseForm: ({ initial }: { initial: { startsOn: string; endsOn: string } }) => (
    <p>
      form {initial.startsOn} {initial.endsOn}
    </p>
  ),
}));
vi.mock("@/components/confirm-action", () => ({
  ConfirmAction: ({
    fields,
    label,
    question,
  }: {
    fields: Record<string, string>;
    label: string;
    question: string;
  }) => (
    <p>
      confirm {label} {question} {JSON.stringify(fields)}
    </p>
  ),
}));

const { PauseList } = await import("@/components/pause-views");

const END = new Date("2026-11-05T12:15:00.000Z");

beforeAll(() => {
  // 5 November 2026 in Finland, though 4 November in UTC.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-04T22:30:00Z") });
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  requireTrainer.mockReset().mockResolvedValue({
    user: { id: "u1", name: "Test Parent", sessionId: "s1" },
    expiresAt: END,
  });
  listPauses.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("PauseList", () => {
  it("lists the pauses as given, each with its deletion, then the form for a week from today", async () => {
    listPauses.mockResolvedValue([
      { id: "pa2", startsOn: "2026-12-01", endsOn: "2026-12-01" },
      { id: "pa1", startsOn: "2026-11-03", endsOn: "2026-11-09" },
    ]);
    render(await PauseList());
    expect(listPauses).toHaveBeenCalledWith("u1");
    expect(screen.getAllByRole("listitem").map((each) => each.textContent)).toEqual([
      '1.12.2026confirm Poista Poistetaanko tauko 1.12.2026? {"id":"pa2"}',
      '3.11.–9.11.2026confirm Poista Poistetaanko tauko 3.11.–9.11.2026? {"id":"pa1"}',
    ]);
    expect(screen.getByText("form 2026-11-05 2026-11-11")).toBeDefined();
    expect(screen.getByText(`timeout ${END.toISOString()}`)).toBeDefined();
  });

  it("says there are no pauses", async () => {
    listPauses.mockResolvedValue([]);
    render(await PauseList());
    expect(screen.getByText("Taukoja ei ole.")).toBeDefined();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows nothing without an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(PauseList()).rejects.toThrow("redirect");
    expect(listPauses).not.toHaveBeenCalled();
  });
});
