import { expect, test } from "@playwright/test";

// This spec drives the real register/login UI, so it must start logged out
// (not the shared authenticated storage state). Serial: the login tests reuse
// the account the first test registers. global-setup deletes this account at
// the start of every run, so registration stays idempotent.
test.describe.configure({ mode: "serial" });
test.use({ storageState: { cookies: [], origins: [] } });

const EMAIL = "e2e-auth@subiq.local";
const PASSWORD = "e2e-password-123";
const NAME = "Auth Tester";

test("register logs the user in, greets them, and can log out", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Name").fill(NAME);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  // Auto-logged-in into the app.
  await expect(page).toHaveURL(/\/dashboard/);

  // The name flows through to the personalized greeting on `/` (proves the
  // database-session self-sync still works). A fresh account has no
  // subscriptions, so the greeting is "Welcome, <name>" (not "Welcome back").
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Welcome(?: back)?, Auth/ }),
  ).toBeVisible();

  // Log out from the app sidebar → back to /login.
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("existing user can log in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("wrong password is rejected without leaking anything", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
