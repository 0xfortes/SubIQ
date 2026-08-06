import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

function saveButton(page: Page) {
  return page.getByRole("button", { name: "Save changes" });
}

test("settings page shows profile and workspace in one form", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workspace" })).toBeVisible();
  // The sidebar shows the email too — assert on the settings card only.
  await expect(
    page.getByRole("main").getByText("e2e@subiq.local"),
  ).toBeVisible();
  // One Save for the whole page, disabled until something changes.
  await expect(saveButton(page)).toHaveCount(1);
  await expect(saveButton(page)).toBeDisabled();
});

test("name can be edited, persists, and can be cleared", async ({ page }) => {
  await page.goto("/settings");

  await page.getByRole("textbox", { name: "Name" }).fill("E2E Renamed");
  await expect(saveButton(page)).toBeEnabled();
  await saveButton(page).click();
  await expect(page.getByText("Settings saved")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue(
    "E2E Renamed",
  );

  // Restore to the seeded name — later specs (and re-runs) assume "E2E";
  // global-setup does not reset an existing user's name.
  await page.getByRole("textbox", { name: "Name" }).fill("E2E");
  await saveButton(page).click();
  await expect(page.getByText("Settings saved")).toBeVisible();
});

test("timezone and currency save together and are applied", async ({
  page,
}) => {
  await page.goto("/settings");

  // Both fields change, then ONE save writes them together.
  await page.getByRole("combobox", { name: "Timezone" }).click();
  await page.getByRole("option", { name: "America/New_York" }).click();
  await page.getByRole("combobox", { name: "Default currency" }).click();
  await page.getByRole("option", { name: "EUR", exact: true }).click();
  await saveButton(page).click();
  await expect(page.getByText("Settings saved")).toBeVisible();
  await expect(saveButton(page)).toBeDisabled();

  await page.reload();
  await expect(page.getByRole("combobox", { name: "Timezone" })).toHaveText(
    "America/New_York",
  );
  await expect(
    page.getByRole("combobox", { name: "Default currency" }),
  ).toHaveText("EUR");

  // New-subscription dialog now defaults to the workspace currency.
  await page.goto("/subscriptions");
  await page.getByRole("link", { name: "Add subscription" }).click();
  await expect(page.getByRole("combobox", { name: "Currency" })).toHaveText(
    "EUR",
  );
  await page.keyboard.press("Escape");

  // Restore defaults — later specs assume USD/UTC (state persists in the
  // seeded workspace; global-setup also normalizes on the next run).
  await page.goto("/settings");
  await page.getByRole("combobox", { name: "Timezone" }).click();
  await page.getByRole("option", { name: "UTC", exact: true }).click();
  await page.getByRole("combobox", { name: "Default currency" }).click();
  await page.getByRole("option", { name: "USD", exact: true }).click();
  await saveButton(page).click();
  await expect(page.getByText("Settings saved")).toBeVisible();
});
