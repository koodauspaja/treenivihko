import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireTrainer = vi.fn();
const getSession = vi.fn();
const listExercises = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("not found");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/lib/trainer/access", () => ({ requireTrainer: () => requireTrainer() }));
vi.mock("@/lib/periods/store", () => ({
  getSession: (...args: unknown[]) => getSession(...args),
}));
vi.mock("@/lib/exercises/store", () => ({
  listExercises: (...args: unknown[]) => listExercises(...args),
}));
vi.mock("@/app/trainer/sessions/actions", () => ({
  addBlockExerciseFromForm: vi.fn(),
  addBlockFromForm: vi.fn(),
  moveBlockExerciseFromForm: vi.fn(),
  moveBlockFromForm: vi.fn(),
  removeBlock: vi.fn(),
  removeBlockExercise: vi.fn(),
  removeSession: vi.fn(),
  saveBlockAmount: vi.fn(),
  saveBlockTheme: vi.fn(),
}));
vi.mock("@/components/trainer-timeout", () => ({
  TrainerTimeout: ({ expiresAt }: { expiresAt: string }) => <p>timeout {expiresAt}</p>,
}));
vi.mock("@/components/session-settings-form", () => ({
  SessionSettingsForm: (props: Record<string, unknown>) => <p>settings {JSON.stringify(props)}</p>,
}));
vi.mock("@/components/field-form", () => ({
  FieldForm: ({
    fields,
    name,
    label,
    initial,
    button,
  }: {
    fields: Record<string, string>;
    name: string;
    label: string;
    initial: string;
    button?: string;
  }) => (
    <p>
      field {name} {label} [{initial}] {String(button)} {JSON.stringify(fields)}
    </p>
  ),
}));
vi.mock("@/components/action-button", () => ({
  ActionButton: ({ fields, label }: { fields: Record<string, string>; label: string }) => (
    <p>
      button {label} {JSON.stringify(fields)}
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

const { ExercisePicker, SessionView } = await import("@/components/session-views");

const END = new Date("2026-11-05T12:15:00.000Z");

const blockExercise = (id: string, name: string, extra = {}) => ({
  id,
  position: 1,
  exerciseId: `e-${id}`,
  name,
  amountKind: "count",
  amount: 10,
  durationMinutes: 5,
  labels: ["passing", "field", "ball"],
  ...extra,
});

const SESSION = {
  id: "t1",
  position: 2,
  place: "field",
  equipment: ["ball", "cones"],
  targetMinutes: 45,
  period: { id: "p1", startsOn: "2026-11-03", weeks: 2 },
  blocks: [
    {
      id: "b1",
      position: 1,
      theme: "Lämmittely",
      exercises: [
        blockExercise("x1", "Ankka"),
        blockExercise("x2", "Hyppy", {
          position: 2,
          amountKind: "time",
          amount: 30,
          durationMinutes: 40,
          labels: ["agility", "gym"],
        }),
        blockExercise("x3", "Zeta", { position: 3, durationMinutes: 10 }),
      ],
    },
    { id: "b2", position: 2, theme: "Laukaus", exercises: [] },
  ],
};

beforeEach(() => {
  requireTrainer.mockReset().mockResolvedValue({
    user: { id: "u1", name: "Test Parent", sessionId: "s1" },
    expiresAt: END,
  });
  getSession.mockReset();
  listExercises.mockReset();
  notFound.mockClear();
});

afterEach(() => {
  cleanup();
});

const section = (theme: string) => screen.getByRole("region", { name: theme });

describe("SessionView", () => {
  it("heads the session with its number and its period's span as a link", async () => {
    getSession.mockResolvedValue(SESSION);
    render(await SessionView({ id: Promise.resolve("t1") }));
    expect(getSession).toHaveBeenCalledWith("u1", "t1");
    expect(screen.getByRole("heading", { level: 1, name: "Treeni 2" })).toBeDefined();
    expect(screen.getByRole("link", { name: "3.11.–16.11.2026" }).getAttribute("href")).toBe(
      "/valmentaja/jaksot/p1"
    );
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe(
      "/valmentaja/jaksot/p1"
    );
    expect(
      screen.getByText(
        'settings {"sessionId":"t1","place":"field","equipment":["ball","cones"],"targetMinutes":45}'
      )
    ).toBeDefined();
    expect(screen.getByText(`timeout ${END.toISOString()}`)).toBeDefined();
  });

  it("adds the exercises' durations against the target, and says how far over", async () => {
    getSession.mockResolvedValue(SESSION);
    render(await SessionView({ id: Promise.resolve("t1") }));
    expect(screen.getByText("Yhteensä 55 min, tavoite 45 min")).toBeDefined();
    expect(screen.getByText("Yli tavoitteen 10 min.")).toBeDefined();
  });

  it("says nothing about the target when within it", async () => {
    getSession.mockResolvedValue({ ...SESSION, targetMinutes: 55 });
    render(await SessionView({ id: Promise.resolve("t1") }));
    expect(screen.getByText("Yhteensä 55 min, tavoite 55 min")).toBeDefined();
    expect(screen.queryByText(/Yli tavoitteen/)).toBeNull();
  });

  it("shows each block's theme, its exercises in order with their amounts, and its buttons", async () => {
    getSession.mockResolvedValue(SESSION);
    render(await SessionView({ id: Promise.resolve("t1") }));
    const first = section("Lämmittely");
    expect(
      within(first)
        .getAllByRole("listitem")
        .map((row) => row.firstChild?.textContent)
    ).toEqual(["Ankka", "Hyppy", "Zeta"]);
    expect(within(first).getByText(/field amount Kertoja \[10\].*"id":"x1"/)).toBeDefined();
    expect(within(first).getByText(/field amount Sekuntia \[30\].*"id":"x2"/)).toBeDefined();
    expect(within(first).getByRole("link", { name: "Lisää harjoite" }).getAttribute("href")).toBe(
      "/valmentaja/treenit/t1/lisaa/b1"
    );
    expect(
      within(first).getByText('confirm Poista osio Poistetaanko osio Lämmittely? {"id":"b1"}')
    ).toBeDefined();
    expect(
      within(section("Laukaus")).getByText("Osiossa ei ole vielä harjoitteita.")
    ).toBeDefined();
  });

  it("marks an exercise that no longer fits the place or the equipment", async () => {
    getSession.mockResolvedValue(SESSION);
    render(await SessionView({ id: Promise.resolve("t1") }));
    const rows = within(section("Lämmittely")).getAllByRole("listitem");
    const marked = rows.map((row) =>
      within(row).queryByText("Ei sovi paikkaan tai välineisiin.") === null ? "fits" : "marked"
    );
    expect(marked).toEqual(["fits", "marked", "fits"]);
  });

  it("offers Ylös and Alas except past either end, for exercises and for blocks", async () => {
    getSession.mockResolvedValue(SESSION);
    render(await SessionView({ id: Promise.resolve("t1") }));
    const rows = within(section("Lämmittely")).getAllByRole("listitem");
    const buttons = (row: HTMLElement) =>
      within(row)
        .getAllByRole("button")
        .map((each) => each.textContent);
    expect(rows.map((row) => buttons(row))).toEqual([
      ["Alas", "Poista"],
      ["Ylös", "Alas", "Poista"],
      ["Ylös", "Poista"],
    ]);
    const moves = (theme: string) =>
      within(section(theme))
        .getAllByRole("button")
        .map((each) => each.textContent)
        .filter((text) => text === "Ylös" || text === "Alas");
    expect(moves("Laukaus")).toEqual(["Ylös"]);
    const sent = (button: HTMLElement) =>
      Object.fromEntries(
        [...(button.closest("form") as HTMLFormElement).querySelectorAll("input")].map((input) => [
          input.name,
          input.value,
        ])
      );
    expect(sent(within(rows[1] as HTMLElement).getByRole("button", { name: "Ylös" }))).toEqual({
      id: "x2",
      direction: "up",
    });
    expect(sent(within(rows[1] as HTMLElement).getByRole("button", { name: "Poista" }))).toEqual({
      id: "x2",
    });
    expect(sent(within(section("Laukaus")).getByRole("button", { name: "Ylös" }))).toEqual({
      id: "b2",
      direction: "up",
    });
  });

  it("adds a block with an empty field, and asks before deleting the session", async () => {
    getSession.mockResolvedValue(SESSION);
    render(await SessionView({ id: Promise.resolve("t1") }));
    expect(screen.getByText('field theme Osio [] Lisää osio {"sessionId":"t1"}')).toBeDefined();
    expect(
      screen.getByText('confirm Poista treeni Poistetaanko treeni 2? {"id":"t1"}')
    ).toBeDefined();
  });

  it("says a session has no blocks", async () => {
    getSession.mockResolvedValue({ ...SESSION, blocks: [] });
    render(await SessionView({ id: Promise.resolve("t1") }));
    expect(screen.getByText("Treenissä ei ole vielä osioita.")).toBeDefined();
    expect(screen.getByText("Yhteensä 0 min, tavoite 45 min")).toBeDefined();
  });

  it("is not found when the session is not the parent's", async () => {
    getSession.mockResolvedValue(null);
    await expect(SessionView({ id: Promise.resolve("other") })).rejects.toThrow("not found");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("shows nothing without an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(SessionView({ id: Promise.resolve("t1") })).rejects.toThrow("redirect");
    expect(getSession).not.toHaveBeenCalled();
  });
});

const exercise = (id: string, name: string, labels: string[], extra = {}) => ({
  id,
  name,
  instructions: "Tee näin.",
  videoUrl: null,
  amountKind: "count",
  amount: 10,
  durationMinutes: 5,
  level: 1,
  warmUp: false,
  labels,
  ...extra,
});

const pick = (blockId = "b1") =>
  ExercisePicker({ sessionId: Promise.resolve("t1"), blockId: Promise.resolve(blockId) });

describe("ExercisePicker", () => {
  it("lists only the exercises that fit, in Finnish order, each to add to the block", async () => {
    getSession.mockResolvedValue(SESSION);
    listExercises.mockResolvedValue([
      exercise("e3", "Ärrä", ["passing", "field", "cones"], { amountKind: "time", amount: 90 }),
      exercise("e1", "Ankka", ["passing", "field", "ball"], { level: 2 }),
      exercise("e2", "Maalipeli", ["shooting", "field", "goal"]),
      exercise("e4", "Sali", ["strength", "gym"]),
    ]);
    render(await pick());
    expect(listExercises).toHaveBeenCalledWith("u1");
    expect(
      screen.getByRole("heading", { level: 1, name: "Lisää harjoite osioon Lämmittely" })
    ).toBeDefined();
    expect(screen.getByText("Paikka: Kenttä. Välineet: Pallo, Kartiot.")).toBeDefined();
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((row) => row.firstChild?.textContent)).toEqual(["Ankka", "Ärrä"]);
    expect(
      within(rows[0] as HTMLElement).getByText("Taso Keskitaso, 10 kertaa, 5 min")
    ).toBeDefined();
    expect(
      within(rows[1] as HTMLElement).getByText("Taso Helppo, 1 min 30 s, 5 min")
    ).toBeDefined();
    expect(
      within(rows[0] as HTMLElement).getByText('button Lisää {"blockId":"b1","exerciseId":"e1"}')
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Takaisin" }).getAttribute("href")).toBe(
      "/valmentaja/treenit/t1"
    );
  });

  it("says when nothing fits, and names no equipment when none is at hand", async () => {
    getSession.mockResolvedValue({ ...SESSION, place: "indoors", equipment: [] });
    listExercises.mockResolvedValue([exercise("e1", "Ankka", ["passing", "field", "ball"])]);
    render(await pick("b2"));
    expect(screen.getByText("Paikka: Sisällä. Välineet: ei välineitä.")).toBeDefined();
    expect(
      screen.getByText("Yksikään harjoite ei sovi tämän treenin paikkaan ja välineisiin.")
    ).toBeDefined();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("is not found for a session not the parent's, or a block not in the session", async () => {
    getSession.mockResolvedValue(null);
    await expect(pick()).rejects.toThrow("not found");
    getSession.mockResolvedValue(SESSION);
    await expect(pick("elsewhere")).rejects.toThrow("not found");
    expect(notFound).toHaveBeenCalledTimes(2);
    expect(listExercises).not.toHaveBeenCalled();
  });

  it("shows nothing without an unlock", async () => {
    requireTrainer.mockRejectedValue(new Error("redirect /valmentaja/avaa"));
    await expect(pick()).rejects.toThrow("redirect");
    expect(getSession).not.toHaveBeenCalled();
  });
});
