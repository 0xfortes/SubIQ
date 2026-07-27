import { expect, test, type Page } from "@playwright/test";

// Seed subscriptions ("E2E Seed Streaming", "E2E Seed Music") come from
// global-setup; other specs may add rows, so assert presence, not counts.

/** Press ⌘K until the palette opens — the global keydown listener only
 * exists after hydration, which `goto` does not wait for. */
async function openWithChord(page: Page) {
  await expect(async () => {
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByPlaceholder("Search or jump to…")).toBeVisible({
      timeout: 1000,
    });
  }).toPass({ timeout: 15000 });
}

test("⌘K opens the palette, filters, and jumps to a subscription", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await openWithChord(page);

  const input = page.getByPlaceholder("Search or jump to…");
  await expect(input).toBeFocused();

  await input.fill("streaming");
  await expect(
    page.getByRole("option", { name: "E2E Seed Streaming" }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "E2E Seed Music" }),
  ).toBeHidden();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    /\/subscriptions\?q=E2E(%20|\+)Seed(%20|\+)Streaming/,
  );
  await expect(
    page.getByRole("row", { name: /E2E Seed Streaming/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Search subscriptions")).toHaveValue(
    "E2E Seed Streaming",
  );
});

test("trigger button opens the palette and navigates to a section", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open command palette" }).click();

  const input = page.getByPlaceholder("Search or jump to…");
  await input.fill("analytics");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/analytics$/);
});

test("Escape closes the palette and returns focus to the trigger", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await openWithChord(page);

  await page.keyboard.press("Escape");
  await expect(page.getByPlaceholder("Search or jump to…")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Open command palette" }),
  ).toBeFocused();
});

test("selecting a category scopes the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await openWithChord(page);

  const input = page.getByPlaceholder("Search or jump to…");
  await input.fill("design");
  const option = page.getByRole("option", { name: "Design" });
  await expect(option).toBeVisible();
  await option.click();
  await expect(page).toHaveURL(/\/dashboard\?category=design/);
});
