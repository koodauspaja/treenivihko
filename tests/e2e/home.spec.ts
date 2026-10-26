import { expect, test } from "@playwright/test";

test("the home page is in Finnish and names the app", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fi");
  await expect(page.getByRole("heading", { level: 1, name: "Treenivihko" })).toBeVisible();
  await expect(page).toHaveTitle("Treenivihko");
});
