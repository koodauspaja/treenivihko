import { expect, type Page, test } from "@playwright/test";
import { IMPORT_PROMPT } from "../../src/lib/exercises/import-messages.ts";
import { signInParent, unlockTrainer } from "./support/parent.ts";

const main = (page: Page) => page.getByRole("main");

const EXERCISES = [
  {
    nimi: "Tikkaat: perusaskel",
    ohje: "Kaksi askelta sisään, yksi ulos.",
    videolinkki: "https://example.com/tikkaat",
    kertaa: 10,
    kesto_min: 5,
    taso: 1,
    lammittely: true,
    taidot: ["Jalkatyö"],
    paikat: ["Kenttä", "kuntosali"],
    valineet: ["Tikkaat"],
  },
  {
    nimi: "Lähdöt",
    ohje: "Kuusi lyhyttä lähtöä.",
    sekuntia: 90,
    kesto_min: 4,
    taso: 2,
    taidot: ["Nopeus"],
    paikat: ["Kenttä"],
  },
  {
    nimi: "Seinäsyötöt",
    ohje: "Syötä seinään ja ota vastaan.",
    kertaa: 30,
    kesto_min: 10,
    taso: 3,
    taidot: ["Syöttö", "Pallonhallinta"],
    paikat: ["Kenttä"],
    valineet: ["Pallo", "Seinä"],
  },
];

test("the library links to the import, whose prompt is copied", async ({ page, context }, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signInParent(page, info);
  await unlockTrainer(page);
  await page.goto("/valmentaja/harjoitteet");
  await page.getByRole("link", { name: "Tuo harjoitteita" }).click();
  await expect(page).toHaveURL(/\/valmentaja\/harjoitteet\/tuonti$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tuo harjoitteita");
  await expect(page.getByLabel("Ohje tekoälylle")).toHaveValue(IMPORT_PROMPT);
  await page.getByRole("button", { name: "Kopioi ohje" }).click();
  await expect(main(page).getByRole("status")).toHaveText("Kopioitu.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(IMPORT_PROMPT);
});

test("a file of three exercises is imported, every field and label as it gave them", async ({
  page,
}, info) => {
  await signInParent(page, info);
  await unlockTrainer(page);
  await page.goto("/valmentaja/harjoitteet/tuonti");
  await page.getByLabel("Tiedosto (.json)").setInputFiles({
    name: "harjoitteet.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(EXERCISES)),
  });
  await page.getByRole("button", { name: "Tuo" }).click();
  await expect(main(page).getByRole("status")).toHaveText("Tuotu 3 harjoitetta.");

  await page.goto("/valmentaja/harjoitteet");
  await expect(main(page).getByText("3 harjoitetta")).toBeVisible();
  await expect(main(page).getByText("Taso Keskitaso, 1 min 30 s, 4 min")).toBeVisible();
  await page.getByRole("link", { name: "Tikkaat: perusaskel" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tikkaat: perusaskel");
  await expect(page.getByRole("link", { name: "Katso video" })).toHaveAttribute(
    "href",
    "https://example.com/tikkaat"
  );
  await expect(page.getByLabel("Ohje")).toHaveValue("Kaksi askelta sisään, yksi ulos.");
  await expect(page.getByLabel("Kertoja")).toHaveValue("10");
  await expect(page.getByLabel("Kesto (min)")).toHaveValue("5");
  await expect(page.getByRole("radio", { name: "Helppo", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Sopii lämmittelyyn" })).toBeChecked();
  // By role, as the library's filters, with the same names, stay in the page hidden.
  for (const label of ["Jalkatyö", "Kenttä", "Kuntosali", "Tikkaat"]) {
    await expect(page.getByRole("checkbox", { name: label, exact: true })).toBeChecked();
  }
  await expect(page.getByRole("checkbox", { name: "Pallo", exact: true })).not.toBeChecked();
});

test("pasted text is imported the same way, and a failing exercise saves nothing", async ({
  page,
}, info) => {
  await signInParent(page, info);
  await unlockTrainer(page);
  await page.goto("/valmentaja/harjoitteet/tuonti");

  const broken = [EXERCISES[0], { ...EXERCISES[1], taso: 4, taidot: ["Tikkaat"] }];
  await page.getByLabel("Tai liitä teksti").fill(JSON.stringify(broken));
  await page.getByRole("button", { name: "Tuo" }).click();
  const refusal = main(page).getByRole("alert");
  await expect(refusal).toContainText("1 harjoite ei kelpaa. Mitään ei tallennettu.");
  await expect(refusal).toContainText("Harjoite 2: Lähdöt");
  await expect(refusal).toContainText("Valitse taso.");
  await expect(refusal).toContainText("Tuntematon taito: Tikkaat.");
  await expect(page.getByLabel("Tai liitä teksti")).toHaveValue(JSON.stringify(broken));

  await page.getByLabel("Tai liitä teksti").fill("ei json");
  await page.getByRole("button", { name: "Tuo" }).click();
  await expect(main(page).getByRole("alert")).toHaveText("Tämä ei ole JSON-muotoa.");

  await page.goto("/valmentaja/harjoitteet");
  await expect(main(page).getByText("Kirjastossa ei ole vielä harjoitteita.")).toBeVisible();

  await page.goto("/valmentaja/harjoitteet/tuonti");
  await page.getByLabel("Tai liitä teksti").fill(JSON.stringify(EXERCISES));
  await page.getByRole("button", { name: "Tuo" }).click();
  await expect(main(page).getByRole("status")).toHaveText("Tuotu 3 harjoitetta.");
  await expect(page.getByLabel("Tai liitä teksti")).toHaveValue("");

  await page.getByLabel("Tai liitä teksti").fill(JSON.stringify([EXERCISES[0]]));
  await page.getByRole("button", { name: "Tuo" }).click();
  await expect(main(page).getByRole("alert")).toContainText(
    "Samanniminen harjoite on jo kirjastossa."
  );
});

test("the import page needs an unlock", async ({ page }, info) => {
  await signInParent(page, info);
  await page.goto("/valmentaja/harjoitteet/tuonti");
  await expect(page).toHaveURL(/\/valmentaja\/avaa$/);
});
