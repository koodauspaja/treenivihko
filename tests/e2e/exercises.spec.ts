import { expect, type Page, test } from "@playwright/test";
import { type Exercise, readExercise, valuesFrom } from "../../src/lib/exercises/rules.ts";
import { createExercise } from "../../src/lib/exercises/store.ts";
import { signInParent, unlockTrainer } from "./support/parent.ts";

const quiet = () => {};

/**
 * An exercise saved through readExercise, as every write is; a fixture that fails it fails the test.
 * decisions/f002-exercise-library.md
 */
const seed = (userId: string, overrides: Partial<Exercise>) => {
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
      labels: ["dribbling", "field"],
      ...overrides,
    })
  );
  if (!reading.ok) {
    throw new Error(`the fixture breaks a rule: ${JSON.stringify(reading.errors)}`);
  }
  return createExercise(userId, reading.exercise, quiet);
};

const main = (page: Page) => page.getByRole("main");

test("the trainer menu leads to the library, and Lukitse ja palaa back to the child's side", async ({
  page,
}, info) => {
  await signInParent(page, info);
  await unlockTrainer(page);
  await page.getByRole("link", { name: "Harjoitteet" }).click();
  await expect(page).toHaveURL(/\/valmentaja\/harjoitteet$/);
  await expect(main(page).getByText("Kirjastossa ei ole vielä harjoitteita.")).toBeVisible();
  await page.getByRole("link", { name: "Takaisin" }).click();
  await page.getByRole("button", { name: "Lukitse ja palaa" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/valmentaja/harjoitteet");
  await expect(page).toHaveURL(/\/valmentaja\/avaa$/);
});

test("an exercise is added, refused while wrong, edited and deleted", async ({ page }, info) => {
  await signInParent(page, info);
  await unlockTrainer(page);
  await page.goto("/valmentaja/harjoitteet/uusi");

  await page.getByLabel("Videolinkki").fill("example.com");
  await page.getByRole("button", { name: "Tallenna" }).click();
  await expect(main(page).getByText("Nimessä on oltava 1–40 merkkiä.")).toBeVisible();
  await expect(main(page).getByText("Videolinkin on oltava https-osoite.")).toBeVisible();
  await expect(main(page).getByText("Valitse vähintään yksi taito.")).toBeVisible();

  await page.getByLabel("Nimi").fill("Tikkaat: sisään-sisään-ulos");
  await page.getByLabel("Ohje").fill("Kaksi askelta sisään, yksi ulos.");
  await page.getByLabel("Videolinkki").fill("https://example.com/video");
  await page.getByLabel("Aika", { exact: true }).check();
  await page.getByLabel("Sekuntia").fill("30");
  await page.getByLabel("Kesto (min)").fill("5");
  await page.getByLabel("Keskitaso", { exact: true }).check();
  await page.getByLabel("Sopii lämmittelyyn").check();
  await page.getByLabel("Jalkatyö", { exact: true }).check();
  await page.getByLabel("Kenttä", { exact: true }).check();
  await page.getByLabel("Tikkaat", { exact: true }).check();
  await page.getByRole("button", { name: "Tallenna" }).click();
  await expect(main(page).getByRole("status")).toHaveText("Lisätty: Tikkaat: sisään-sisään-ulos.");
  await expect(page.getByLabel("Nimi")).toHaveValue("");

  await page.getByLabel("Nimi").fill("tikkaat: SISÄÄN-sisään-ulos");
  await page.getByLabel("Ohje").fill("Sama.");
  await page.getByLabel("Kertoja").fill("3");
  await page.getByLabel("Kesto (min)").fill("2");
  await page.getByLabel("Helppo", { exact: true }).check();
  await page.getByLabel("Jalkatyö", { exact: true }).check();
  await page.getByLabel("Sisällä", { exact: true }).check();
  await page.getByRole("button", { name: "Tallenna" }).click();
  await expect(main(page).getByText("Samanniminen harjoite on jo kirjastossa.")).toBeVisible();
  await expect(page.getByLabel("Nimi")).toHaveValue("tikkaat: SISÄÄN-sisään-ulos");

  await page.goto("/valmentaja/harjoitteet");
  await expect(main(page).getByText("1 harjoite")).toBeVisible();
  await expect(main(page).getByText("Taso Keskitaso, 30 s, 5 min, Lämmittely")).toBeVisible();
  await page.getByRole("link", { name: "Tikkaat: sisään-sisään-ulos" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tikkaat: sisään-sisään-ulos");
  const video = page.getByRole("link", { name: "Katso video" });
  await expect(video).toHaveAttribute("href", "https://example.com/video");
  await expect(video).toHaveAttribute("target", "_blank");

  await page.getByLabel("Nimi").fill("Tikkaat: perusaskel");
  await page.getByRole("button", { name: "Tallenna" }).click();
  await expect(main(page).getByRole("status")).toHaveText("Tallennettu.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tikkaat: perusaskel");

  await page.getByRole("button", { name: "Poista harjoite" }).click();
  await expect(main(page).getByText("Poistetaanko harjoite Tikkaat: perusaskel?")).toBeVisible();
  await page.getByRole("button", { name: "Peruuta" }).click();
  await page.getByRole("button", { name: "Poista harjoite" }).click();
  await page.getByRole("button", { name: "Poista", exact: true }).click();
  await expect(page).toHaveURL(/\/valmentaja\/harjoitteet$/);
  await expect(main(page).getByText("Kirjastossa ei ole vielä harjoitteita.")).toBeVisible();
});

test("the filters pass exactly the exercises that fit, and stay in the address", async ({
  page,
}, info) => {
  const { userId } = await signInParent(page, info);
  await seed(userId, { name: "Ärrä", labels: ["dribbling", "gym", "ball"] });
  await seed(userId, { name: "Ankka", labels: ["shooting", "field", "ball", "goal"] });
  await seed(userId, { name: "Zeta", labels: ["dribbling", "field"] });
  await unlockTrainer(page);
  await page.goto("/valmentaja/harjoitteet");
  await expect(main(page).getByText("3 harjoitetta")).toBeVisible();
  await expect(main(page).getByRole("listitem").getByRole("link")).toHaveText([
    "Ankka",
    "Zeta",
    "Ärrä",
  ]);

  await page.getByLabel("Kuljetus", { exact: true }).check();
  await page.getByLabel("Kuntosali", { exact: true }).check();
  await page.getByLabel("Maali", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Näytä" }).click();
  await expect(main(page).getByRole("listitem").getByRole("link")).toHaveText(["Ärrä"]);
  await expect(page).toHaveURL(/taito=dribbling/);

  await page.reload();
  await expect(page.getByLabel("Maali", { exact: true })).not.toBeChecked();
  await page.getByLabel("Kuntosali", { exact: true }).uncheck();
  await page.getByLabel("Pallo", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Näytä" }).click();
  await expect(main(page).getByRole("listitem").getByRole("link")).toHaveText(["Zeta"]);

  for (const name of ["Pallo", "Tikkaat", "Aidat", "Kartiot", "Seinä", "Hyppynaru"]) {
    await page.getByLabel(name, { exact: true }).uncheck();
  }
  await page.getByLabel("Kuljetus", { exact: true }).uncheck();
  await page.getByLabel("Kenttä", { exact: true }).check();
  await page.getByLabel("Laukaus", { exact: true }).check();
  await page.getByRole("button", { name: "Näytä" }).click();
  await expect(main(page).getByText("Yksikään harjoite ei sovi valintoihin.")).toBeVisible();
});

test("an address that does not exist, and another parent's exercise, are not found", async ({
  page,
}, info) => {
  await signInParent(page, info);
  await unlockTrainer(page);
  await page.goto("/ei-tallaista");
  await expect(main(page).getByText("Sivua ei löytynyt.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Etusivulle" })).toHaveAttribute("href", "/");
  await page.goto("/valmentaja/harjoitteet/not-an-exercise");
  await expect(main(page).getByText("Sivua ei löytynyt.")).toBeVisible();
});
