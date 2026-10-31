/**
 * Two tabs on one exercise: the later save is refused rather than overwrite
 * the earlier, keeps what was typed, and saves over it only on purpose.
 *
 * decisions/f002-exercise-library.md
 * decisions/f010-exercise-saved-meanwhile.md
 */

import { expect, type Page, test } from "@playwright/test";
import { type Exercise, readExercise, valuesFrom } from "../../src/lib/exercises/rules.ts";
import { createExercise } from "../../src/lib/exercises/store.ts";
import { signInParent, unlockTrainer } from "./support/parent.ts";

const quiet = () => {};

/** An exercise saved through readExercise, as every write is; a fixture that fails it fails the test. */
const seed = async (userId: string, overrides: Partial<Exercise>) => {
  const reading = readExercise(
    valuesFrom({
      name: "Harjoite",
      instructions: "Tee näin.",
      videoUrl: null,
      amountKind: "count",
      amount: 10,
      durationMinutes: 5,
      level: 1,
      warmUp: false,
      labels: ["passing", "field", "ball"],
      ...overrides,
    })
  );
  if (!reading.ok) {
    throw new Error(`the fixture breaks a rule: ${JSON.stringify(reading.errors)}`);
  }
  const result = await createExercise(userId, reading.exercise, quiet);
  if (result.kind !== "saved") {
    throw new Error(`the fixture was not saved: ${result.kind}`);
  }
  return result.id;
};

const main = (page: Page) => page.getByRole("main");
const CHANGED =
  "Harjoitetta on muutettu muualla sen jälkeen, kun avasit sen. Tallennus ei korvannut muutosta.";

test("a save from a tab opened before another save is refused, keeps what was typed, and saves on purpose", async ({
  page,
  context,
}, info) => {
  const { userId } = await signInParent(page, info);
  const id = await seed(userId, { name: "Syöttö seinään" });
  await unlockTrainer(page);
  const address = `/valmentaja/harjoitteet/${id}`;

  const other = await context.newPage();
  await other.goto(address);
  await page.goto(address);

  // The first tab saves a new name.
  await page.getByLabel("Nimi", { exact: true }).fill("Syöttö seinään vasurilla");
  await page.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(main(page).getByRole("status")).toHaveText("Tallennettu.");

  // The second, opened before it, is refused, and keeps what was typed there.
  await other.getByLabel("Ohje", { exact: true }).fill("Kymmenen syöttöä kummallakin jalalla.");
  await other.getByRole("button", { name: "Tallenna", exact: true }).click();
  await expect(main(other).getByRole("status")).toHaveText(CHANGED);
  await expect(other.getByLabel("Ohje", { exact: true })).toHaveValue(
    "Kymmenen syöttöä kummallakin jalalla."
  );
  await expect(other.getByLabel("Nimi", { exact: true })).toHaveValue("Syöttö seinään");

  // Enter in a field saves with Tallenna, which is refused again, never with Tallenna silti.
  // The refusal is already shown, so the save is awaited by its answer.
  await Promise.all([
    other.waitForResponse((response) => response.request().method() === "POST"),
    other.getByLabel("Nimi", { exact: true }).press("Enter"),
  ]);
  await expect(main(other).getByRole("status")).toHaveText(CHANGED);
  await expect(main(other).getByRole("button", { name: "Tallenna silti" })).toBeVisible();

  // Näytä nykyinen shows the saved version in a new tab.
  const [current] = await Promise.all([
    context.waitForEvent("page"),
    main(other).getByRole("link", { name: "Näytä nykyinen" }).click(),
  ]);
  await expect(
    current.getByRole("heading", { level: 1, name: "Syöttö seinään vasurilla" })
  ).toBeVisible();
  await current.close();

  // Tallenna silti saves what was typed over it.
  await main(other).getByRole("button", { name: "Tallenna silti" }).click();
  await expect(main(other).getByRole("status")).toHaveText("Tallennettu.");
  await expect(main(other).getByRole("button", { name: "Tallenna silti" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Syöttö seinään" })).toBeVisible();
  await expect(page.getByLabel("Ohje", { exact: true })).toHaveValue(
    "Kymmenen syöttöä kummallakin jalalla."
  );
});

test("saving twice in one tab is not refused", async ({ page }, info) => {
  const { userId } = await signInParent(page, info);
  const id = await seed(userId, { name: "Pomputtelu" });
  await unlockTrainer(page);
  await page.goto(`/valmentaja/harjoitteet/${id}`);
  for (const instructions of ["Ensimmäinen ohje.", "Toinen ohje."]) {
    await page.getByLabel("Ohje", { exact: true }).fill(instructions);
    // The first save's message is still shown, so each save is awaited by its answer.
    await Promise.all([
      page.waitForResponse((response) => response.request().method() === "POST"),
      page.getByRole("button", { name: "Tallenna", exact: true }).click(),
    ]);
    await expect(main(page).getByRole("status")).toHaveText("Tallennettu.");
  }
  await page.reload();
  await expect(page.getByLabel("Ohje", { exact: true })).toHaveValue("Toinen ohje.");
});
