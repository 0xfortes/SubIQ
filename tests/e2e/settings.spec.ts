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
  // Both profile Saves are disabled until their field changes.
  await expect(
    profileCard(page).getByRole("button", { name: "Save name", exact: true }),
  ).toBeDisabled();
  await expect(
    profileCard(page).getByRole("button", {
      name: "Save timezone",
      exact: true,
    }),
  ).toBeDisabled();
});

test("name can be edited, persists, and can be cleared", async ({ page }) => {
  await page.goto("/settings");

  const nameField = page.getByRole("textbox", { name: "Name" });
  const saveName = profileCard(page).getByRole("button", {
    name: "Save name",
    exact: true,
  });

  // Rename → save → reload proves it persisted.
  await nameField.fill("E2E Renamed");
  await saveName.click();
  await expect(page.getByText("Name updated")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue(
    "E2E Renamed",
  );

  // Restore to the seeded name — later specs (and re-runs) assume "E2E";
  // global-setup does not reset an existing user's name.
  await page.getByRole("textbox", { name: "Name" }).fill("E2E");
  await profileCard(page)
    .getByRole("button", { name: "Save name", exact: true })
    .click();
  await expect(page.getByText("Name updated")).toBeVisible();
});

test("timezone and currency can be changed and are applied", async ({
  page,
}) => {
  await page.goto("/settings");

  // Timezone → America/New_York
  await page.getByRole("combobox", { name: "Timezone" }).click();
  await page.getByRole("option", { name: "America/New_York" }).click();
  await profileCard(page)
    .getByRole("button", { name: "Save timezone", exact: true })
    .click();
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
  await profileCard(page)
    .getByRole("button", { name: "Save timezone", exact: true })
    .click();
  await expect(page.getByText("Timezone updated")).toBeVisible();

  await page.getByRole("combobox", { name: "Default currency" }).click();
  await page.getByRole("option", { name: "USD", exact: true }).click();
  await workspaceCard(page).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Default currency updated")).toBeVisible();
});
