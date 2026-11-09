import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

function studio(label: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    name: "Mara Ellison",
    email: `${label}.${stamp}@northline.studio`,
    password: "Northline9",
    workspace: `Northline ${label}`,
  };
}

async function register(page: import("@playwright/test").Page, account: ReturnType<typeof studio>) {
  await page.goto("/register");
  await page.getByLabel("Your name").fill(account.name);
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByLabel("Workspace name").fill(account.workspace);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(account.workspace).first()).toBeVisible();
}

test("a new workspace opens on the dashboard", async ({ page }) => {
  const account = studio("desk");
  await register(page, account);
  await expect(page.getByText("Paid this month")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pipeline" })).toBeVisible();
});

test("a client keeps a note", async ({ page }) => {
  const account = studio("client");
  await register(page, account);
  await page.getByRole("link", { name: "Clients" }).click();
  await page.getByRole("button", { name: "New client" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Linden Bakery");
  await dialog.getByLabel("Email").fill("elena@lindenbakery.com");
  await dialog.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { name: "Linden Bakery" })).toBeVisible();
  await page.getByLabel("Note").fill("Elena wants the seasonal menu live before the holidays.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(
    page.getByText("Elena wants the seasonal menu live before the holidays."),
  ).toBeVisible();
});

test("a deal and an invoice move through the desk", async ({ page }) => {
  const account = studio("billing");
  await register(page, account);

  await page.getByRole("link", { name: "Clients" }).click();
  await page.getByRole("button", { name: "New client" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Calder Architects");
  await dialog.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { name: "Calder Architects" })).toBeVisible();

  await page.getByRole("link", { name: "Pipeline" }).click();
  await page.getByRole("button", { name: "New deal" }).click();
  const deal = page.getByRole("dialog");
  await deal.getByLabel("Title").fill("Practice site and project index");
  await deal.getByLabel("Client").selectOption({ label: "Calder Architects" });
  await deal.getByLabel("Value").fill("32000");
  await deal.getByRole("button", { name: "Open deal" }).click();
  await expect(
    page.getByRole("heading", { name: "Practice site and project index" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Invoices" }).click();
  await page.getByRole("link", { name: "New invoice" }).click();
  await page.getByLabel("Client").selectOption({ label: "Calder Architects" });
  await page.getByLabel("Description").fill("Project index, progress");
  await page.getByLabel("Quantity").fill("1");
  await page.getByLabel("Rate").fill("8000");
  await expect(page.getByText("$8,000.00").first()).toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("button", { name: "Mark sent" })).toBeVisible();
  await page.getByRole("button", { name: "Mark sent" }).click();
  await expect(page.getByText("Sent", { exact: true })).toBeVisible();
});
