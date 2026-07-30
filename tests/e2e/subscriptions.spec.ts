import { expect, test } from "@playwright/test";

const UNIQUE = `E2E Sub ${Date.now()}`;

test.describe.configure({ mode: "serial" });

test("create, edit, archive, and restore a subscription", async ({ page }) => {
  await page.goto("/subscriptions");
  await expect(
    page.getByRole("heading", { name: /Subscriptions/ }),
  ).toBeVisible();

  // Create
  await page.getByRole("button", { name: "Add subscription" }).click();
  await page.getByLabel("Service").fill(UNIQUE);
  await page.getByLabel("Cost").fill("9.99");
  await page.getByRole("button", { name: "Add subscription" }).last().click();
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

  await page.getByRole("button", { name: "Add subscription" }).click();
  await page.getByLabel("Service").fill(name);
  await page.getByLabel("Cost").fill("5.00");
  await page.getByRole("button", { name: "Add subscription" }).last().click();
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

test("unauthenticated users are redirected to sign-in", async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto("/subscriptions");
  await expect(page).toHaveURL(/\/signin/);
  await context.close();
});
