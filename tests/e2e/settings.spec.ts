import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

function profileCard(page: Page) {
  return page.locator("section").filter({ hasText: "Profile" });
}

function workspaceCard(page: Page) {
  return page.locator("section").filter({ hasText: "Workspace" });
}

test("settings page shows profile and workspace cards", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workspace" })).toBeVisible();
  // The sidebar shows the email too — assert on the settings card only.
  await expect(
    page.getByRole("main").getByText("e2e@subiq.local"),
  ).toBeVisible();
  // Save is disabled until something changes.
  await expect(
    profileCard(page).getByRole("button", { name: "Save" }),
  ).toBeDisabled();
});

test("timezone and currency can be changed and are applied", async ({
  page,
}) => {
  await page.goto("/settings");

  // Timezone → America/New_York
  await page.getByRole("combobox", { name: "Timezone" }).click();
  await page.getByRole("option", { name: "America/New_York" }).click();
  await profileCard(page).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Timezone updated")).toBeVisible();

  // Currency → EUR
  await page.getByRole("combobox", { name: "Default currency" }).click();
  await page.getByRole("option", { name: "EUR", exact: true }).click();
  await workspaceCard(page).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Default currency updated")).toBeVisible();

  // New-subscription dialog now defaults to the workspace currency.
  await page.goto("/subscriptions");
  await page.getByRole("button", { name: "Add subscription" }).click();
  await expect(page.getByRole("combobox", { name: "Currency" })).toHaveText(
    "EUR",
  );
  await page.keyboard.press("Escape");

  // Restore defaults — later specs assume USD/UTC (state persists in the
  // seeded workspace; global-setup also normalizes on the next run).
  await page.goto("/settings");
  await page.getByRole("combobox", { name: "Timezone" }).click();
  await page.getByRole("option", { name: "UTC", exact: true }).click();
  await profileCard(page).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Timezone updated")).toBeVisible();

  await page.getByRole("combobox", { name: "Default currency" }).click();
  await page.getByRole("option", { name: "USD", exact: true }).click();
  await workspaceCard(page).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Default currency updated")).toBeVisible();
});
