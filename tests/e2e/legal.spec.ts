import { expect, test } from "@playwright/test";

// Legal pages are public — run without the authenticated storage state.
test.use({ storageState: { cookies: [], origins: [] } });

test("privacy and terms pages render", async ({ page }) => {
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacy Policy", level: 1 }),
  ).toBeVisible();

  await page.goto("/terms");
  await expect(
    page.getByRole("heading", { name: "Terms of Service", level: 1 }),
  ).toBeVisible();
});

test("footer links resolve to the legal pages", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");

  await footer.getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(
    page.getByRole("heading", { name: "Privacy Policy", level: 1 }),
  ).toBeVisible();

  await page.goto("/");
  await footer.getByRole("link", { name: "Terms" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(
    page.getByRole("heading", { name: "Terms of Service", level: 1 }),
  ).toBeVisible();
});
