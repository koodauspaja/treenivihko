import { expect, type Page, test } from "@playwright/test";
import { signInParent, TRAINER_PASSWORD } from "./support/parent.ts";

const unlock = async (page: Page, password = TRAINER_PASSWORD) => {
  await page.getByLabel("Salasana").fill(password);
  await page.getByRole("button", { name: "Avaa" }).click();
};

// React empties the form when its action answers; typing before then would be lost.
const tryWrong = async (page: Page) => {
  await unlock(page, "wrong password");
  await expect(page.getByLabel("Salasana")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Avaa" })).toBeEnabled();
};

test("a signed-out visit to the trainer side lands on sign-in", async ({ page }) => {
  await page.goto("/valmentaja");
  await expect(page).toHaveURL(/\/kirjaudu$/);
  await page.goto("/valmentaja/avaa");
  await expect(page).toHaveURL(/\/kirjaudu$/);
});

test("the child's side greets the child, and its link asks for the trainer password", async ({
  page,
}, info) => {
  await signInParent(page, info);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: "Hei!" })).toBeVisible();
  await page.getByRole("link", { name: "Valmentaja" }).click();
  await expect(page).toHaveURL(/\/valmentaja\/avaa$/);
  await expect(page.getByLabel("Salasana")).toBeVisible();
});

test("with no password set, the lock page says so and offers no field", async ({ page }, info) => {
  await signInParent(page, info, { withPassword: false });
  await page.goto("/valmentaja/avaa");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Valmentajan salasanaa ei ole vielä asetettu."
  );
  await expect(page.getByLabel("Salasana")).toHaveCount(0);
});

test("a wrong password is refused, and the 5th locks it for 15 minutes", async ({ page }, info) => {
  await signInParent(page, info);
  await page.goto("/valmentaja/avaa");
  await tryWrong(page);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Väärä salasana.");
  for (let i = 0; i < 3; i++) {
    await tryWrong(page);
  }
  await unlock(page, "wrong password");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Liian monta yritystä. Yritä uudelleen 15 minuutin päästä."
  );
  await page.goto("/valmentaja/avaa");
  await expect(page.getByLabel("Salasana")).toHaveCount(0);
  await page.goto("/valmentaja");
  await expect(page).toHaveURL(/\/valmentaja\/avaa$/);
});

test("the right password opens the trainer menu, and the nickname is saved on its page", async ({
  page,
}, info) => {
  await signInParent(page, info);
  await page.goto("/valmentaja");
  await expect(page).toHaveURL(/\/valmentaja\/avaa$/);
  await unlock(page);
  await expect(page).toHaveURL(/\/valmentaja$/);
  await page.getByRole("link", { name: "Lapsen nimi" }).click();
  await expect(page).toHaveURL(/\/valmentaja\/nimi$/);
  await page.getByLabel("Lapsen nimi").fill("x".repeat(21));
  await page.getByRole("button", { name: "Tallenna" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Nimessä on oltava 1–20 merkkiä."
  );
  await page.getByLabel("Lapsen nimi").fill("  Testi ");
  await page.getByRole("button", { name: "Tallenna" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText("Tallennettu.");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: "Hei, Testi!" })).toBeVisible();
});

test("Lukitse ja palaa returns to the child's side, and the trainer side then asks again", async ({
  page,
}, info) => {
  await signInParent(page, info);
  await page.goto("/valmentaja/avaa");
  await unlock(page);
  await page.getByRole("button", { name: "Lukitse ja palaa" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/valmentaja");
  await expect(page).toHaveURL(/\/valmentaja\/avaa$/);
});

test("an open trainer page goes to the child's side when its 15 minutes run out", async ({
  page,
}, info) => {
  await signInParent(page, info);
  await page.clock.install();
  await page.goto("/valmentaja/avaa");
  await unlock(page);
  await expect(page).toHaveURL(/\/valmentaja$/);
  // Margins either side: the server's 15 minutes started a moment after the browser's clock did.
  await page.clock.fastForward("14:30");
  await expect(page).toHaveURL(/\/valmentaja$/);
  await page.clock.fastForward("01:00");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 2, name: "Hei!" })).toBeVisible();
});

test("Kirjaudu ulos signs out, and the child's side then needs sign-in", async ({ page }, info) => {
  await signInParent(page, info);
  await page.goto("/valmentaja/avaa");
  await unlock(page);
  await page.getByRole("button", { name: "Kirjaudu ulos" }).click();
  await expect(page).toHaveURL(/\/kirjaudu$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/kirjaudu$/);
});
