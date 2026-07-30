import { expect, test } from "@playwright/test";

// The landing page is public — run without the authenticated storage state.
test.use({ storageState: { cookies: [], origins: [] } });

test("landing page renders the hero and product story", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Every subscription you pay for/ }),
  ).toBeVisible();
  await expect(page.getByText("Next 30 days", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Every renewal, on one timeline." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Log in" }).first(),
  ).toBeVisible();
});

test("landing CTAs lead to register and login", async ({ page }) => {
  await page.goto("/");
  // Primary acquisition CTA → registration.
  await page.getByRole("link", { name: "Create your account" }).click();
  await expect(page).toHaveURL(/\/register/);
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  // The register↔login cross-link switches to the login page.
  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: "Log in to SubIQ" }),
  ).toBeVisible();
});
