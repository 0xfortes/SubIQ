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

test("landing CTA submits an email and lands on check-email", async ({
  page,
}) => {
  await page.goto("/");
  const email = `landing-${Date.now()}@subiq.local`;
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByText("Check your email")).toBeVisible();
});
