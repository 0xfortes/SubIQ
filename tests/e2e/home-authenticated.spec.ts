import { expect, test } from "@playwright/test";

// Uses the default authenticated storage state (global-setup seeds the "E2E"
// user with two active subscriptions), so `/` renders the returning-user
// overview, not the marketing landing.

test("authenticated home shows a welcome overview, not marketing copy", async ({
  page,
}) => {
  await page.goto("/");

  // Personalized greeting + the primary CTA back into the product. ("Open
  // dashboard" also appears in the persistent nav, so scope to the main body.)
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Open dashboard" }),
  ).toBeVisible();

  // Real dashboard widgets are reused (Renewal Ruler header always renders).
  await expect(page.getByText("Next 30 days", { exact: true })).toBeVisible();

  // Acquisition messaging is gone for logged-in users.
  await expect(page.getByRole("link", { name: "Start free" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Create your account" }),
  ).toHaveCount(0);
});
