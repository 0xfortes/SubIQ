import { expect, test } from "@playwright/test";

const UNIQUE = `E2E Sub ${Date.now()}`;

test.describe.configure({ mode: "serial" });

test("create, edit, archive, and restore a subscription", async ({ page }) => {
  await page.goto("/subscriptions");
  await expect(
    page.getByRole("heading", { name: /Subscriptions/ }),
  ).toBeVisible();

  // Create
  await page.getByRole("link", { name: "Add subscription" }).click();
  await page.getByLabel("Service").fill(UNIQUE);
  await page.getByLabel("Cost").fill("9.99");
  await page.getByRole("button", { name: "Add subscription" }).click();
  const row = page.getByRole("row", { name: new RegExp(UNIQUE) });
  await expect(row).toBeVisible();
  await expect(row.getByText("$9.99")).toBeVisible();

  // Edit
  await row.getByRole("button", { name: `Actions for ${UNIQUE}` }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByLabel("Cost").fill("19.99");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(row.getByText("$19.99")).toBeVisible();

  // Favorite (optimistic)
  await row.getByRole("button", { name: `Add ${UNIQUE} to favorites` }).click();
  await expect(
    row.getByRole("button", { name: `Remove ${UNIQUE} from favorites` }),
  ).toBeVisible();

  // Search filters down and empty state names the filter
  await page.getByLabel("Search subscriptions").fill("zzz-no-match");
  await expect(page.getByText(/No subscriptions matching/)).toBeVisible();
  await page.getByLabel("Search subscriptions").clear();

  // Archive with undo
  await row.getByRole("button", { name: `Actions for ${UNIQUE}` }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await expect(row).toBeHidden();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(
    page.getByRole("row", { name: new RegExp(UNIQUE) }),
  ).toBeVisible();

  // Clean up: archive for real. Wait for the toast — it appears only after
  // the server action resolves, so the archive is persisted before the
  // page (and its in-flight fetch) is torn down.
  const restored = page.getByRole("row", { name: new RegExp(UNIQUE) });
  await restored.getByRole("button", { name: `Actions for ${UNIQUE}` }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await expect(restored).toBeHidden();
  await expect(page.getByText(`Archived ${UNIQUE}`)).toBeVisible();
});

test("archived view lists the row and restore brings it back", async ({
  page,
}) => {
  // The previous test left UNIQUE archived.
  await page.goto("/subscriptions");
  await page.getByRole("button", { name: "Archived" }).click();
  await expect(page).toHaveURL(/status=archived/);

  const row = page.getByRole("row", { name: new RegExp(UNIQUE) });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: `Restore ${UNIQUE}` }).click();
  await expect(row).toBeHidden();

  await page.getByRole("button", { name: "All" }).click();
  await expect(
    page.getByRole("row", { name: new RegExp(UNIQUE) }),
  ).toBeVisible();
});

test("sort control drives the sort URL param and row order", async ({
  page,
}) => {
  await page.goto("/subscriptions");
  await page.getByRole("combobox", { name: "Sort subscriptions" }).click();
  await page.getByRole("option", { name: "Name" }).click();
  await expect(page).toHaveURL(/sort=name/);

  // .truncate targets the name span only (the avatar is also .font-medium).
  const names = await page
    .locator("tbody tr td:nth-child(2) .truncate.font-medium")
    .allInnerTexts();
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  expect(names).toEqual(sorted);

  // Default sort (cost) removes the param.
  await page.getByRole("combobox", { name: "Sort subscriptions" }).click();
  await page.getByRole("option", { name: "Cost" }).click();
  await expect(page).not.toHaveURL(/sort=/);
});

test("bulk selection archives multiple rows with undo", async ({ page }) => {
  await page.goto("/subscriptions");
  // Scope to tbody — the header "Select all" checkbox must not match.
  const checkboxes = page.locator("tbody").getByRole("checkbox");
  await checkboxes.nth(0).click();
  await checkboxes.nth(1).click();
  await expect(page.getByText("2 selected")).toBeVisible();

  const rowCount = await page.locator("tbody tr").count();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(rowCount - 2);
  await expect(page.getByText(/selected/)).toBeHidden();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(rowCount);
});

test("delete permanently removes a subscription for good", async ({ page }) => {
  const name = `E2E Sub ${Date.now()}-del`;
  await page.goto("/subscriptions");

  await page.getByRole("link", { name: "Add subscription" }).click();
  await page.getByLabel("Service").fill(name);
  await page.getByLabel("Cost").fill("5.00");
  await page.getByRole("button", { name: "Add subscription" }).click();
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toBeVisible();

  // Delete needs an explicit confirm (irreversible — no undo toast).
  await row.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: "Delete permanently" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete permanently" })
    .click();
  await expect(row).toBeHidden();
  await expect(page.getByText(`Deleted ${name}`)).toBeVisible();

  // Hard delete, not archive: it is absent from the archived view too.
  await page.getByRole("button", { name: "Archived" }).click();
  await expect(page.getByRole("row", { name: new RegExp(name) })).toBeHidden();
});

test('"Other" creates a custom category and reuses it afterwards', async ({
  page,
}) => {
  // A FIXED category name on purpose: the first run creates it, every later
  // run must reuse the same row rather than piling up near-duplicates.
  const CATEGORY = "E2E Custom";
  const name = `E2E Sub ${Date.now()}-cat`;

  async function addWithCustomCategory(subName: string) {
    await page.goto("/subscriptions");
    await page.getByRole("link", { name: "Add subscription" }).click();
    await page.getByLabel("Service").fill(subName);
    await page.getByLabel("Cost").fill("7.00");
    await page.getByRole("combobox", { name: "Category" }).click();
    await page.getByRole("option", { name: "Other…" }).click();
    await page.getByLabel("New category").fill(CATEGORY);
    await page.getByRole("button", { name: "Add subscription" }).click();
    const row = page.getByRole("row", { name: new RegExp(subName) });
    await expect(row).toBeVisible();
    await expect(row.getByText(CATEGORY)).toBeVisible();
    return row;
  }

  await addWithCustomCategory(name);

  // The category is real: it scopes the list through the URL like any other.
  const slug = "e2e-custom";
  await page.goto(`/subscriptions?category=${slug}`);
  await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();

  // Naming it again reuses the category — the picker must not grow a second
  // "E2E Custom" entry.
  const second = `${name}-2`;
  await addWithCustomCategory(second);

  await page.getByRole("link", { name: "Add subscription" }).click();
  const categoryPicker = page.getByRole("combobox", { name: "Category" });
  await expect(categoryPicker).toHaveText("None");
  await categoryPicker.click();
  await expect(page.getByRole("option", { name: CATEGORY })).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  // Longest name first: `name` is a prefix of `second`, so its row regex
  // would match both rows while the second one still exists.
  for (const subName of [second, name]) {
    await page.goto("/subscriptions");
    const row = page.getByRole("row", { name: new RegExp(subName) });
    await row
      .getByRole("button", { name: `Actions for ${subName}`, exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Delete permanently" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete permanently" })
      .click();
    await expect(row).toBeHidden();
  }
});

test("unauthenticated users are redirected to login", async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto("/subscriptions");
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});
