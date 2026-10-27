import { expect, test } from "@playwright/test";

test("a signed-out visit to the child's side lands on the Finnish sign-in page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/kirjaudu$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fi");
  await expect(page).toHaveTitle("Treenivihko");
  await expect(page.getByRole("heading", { level: 1, name: "Treenivihko" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kirjaudu Google-tilillä" })).toBeVisible();
});

test("a refused sign-in comes back with the Finnish reason", async ({ page }) => {
  await page.goto("/kirjaudu?error=sign_in_not_allowed");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Tällä Google-tilillä ei voi kirjautua Treenivihkoon."
  );
});

test("the English folder's path redirects to the Finnish address", async ({ page }) => {
  const response = await page.request.get("/sign-in?error=x", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/kirjaudu?error=x");
});
