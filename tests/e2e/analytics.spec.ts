import { expect, test } from "@playwright/test";

// Seed data ("E2E Seed Streaming" $12.99/mo, "E2E Seed Music" $9.99/mo)
// comes from global-setup. Other specs create/archive rows concurrently, so
// assert seed-row presence and ordering only — never exact totals or counts.

test("analytics page renders all three sections", async ({ page }) => {
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "12-month projection" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "By category" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Top subscriptions" }),
  ).toBeVisible();

  // Summary strip shows a mono dollar figure for the annual run-rate.
  await expect(page.getByText("Annual run-rate")).toBeVisible();
  const strip = page
    .locator("div")
    .filter({ hasText: /^Annual run-rate/ })
    .first();
  await expect(strip.getByText(/\$\d/).first()).toBeVisible();
});

test("leaderboard ranks the pricier seed subscription first", async ({
  page,
}) => {
  await page.goto("/analytics");
  const leaderboard = page.getByRole("region", {
    name: "Most expensive subscriptions",
  });
  await expect(leaderboard.getByText("E2E Seed Streaming")).toBeVisible();
  await expect(leaderboard.getByText("E2E Seed Music")).toBeVisible();
  await expect(leaderboard.getByText("$12.99").first()).toBeVisible();

  const names = await leaderboard.locator("li p.truncate").allInnerTexts();
  expect(names.indexOf("E2E Seed Streaming")).toBeLessThan(
    names.indexOf("E2E Seed Music"),
  );
});
