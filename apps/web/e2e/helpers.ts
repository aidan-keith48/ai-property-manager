import type { Page } from "@playwright/test";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Tenant *names* must be unique across test runs too, not just emails —
 * unlike Property/Unit (landlord-scoped), the Tenant list/dropdowns are
 * instance-wide by design (docs/engineering-plan.md §6), so repeated runs
 * against the same persistent dev DB accumulate same-named tenants and
 * break name-based locators. */
export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export async function signupLandlord(page: Page, email: string, name = "E2E Landlord") {
  await page.goto("/signup");
  await page.fill('input[placeholder="Name"]', name);
  await page.fill('input[placeholder="Email"]', email);
  await page.fill('input[placeholder="Password (min 8 characters)"]', "e2etestpass123");
  await page.click('button[type="submit"]');
  await page.waitForURL("/properties");
}

export async function createProperty(page: Page, name: string, address = "1 Test St") {
  await page.fill("form input >> nth=0", name);
  await page.fill("form input >> nth=1", address);
  await page.click('button:has-text("Add Property")');
  await page.waitForSelector(`text=${name}`);
}

export async function createUnit(page: Page, propertyName: string, unitLabel: string) {
  await page.click(`text=${propertyName}`);
  await page.waitForURL(/\/properties\/\d+/);
  await page.fill("form input >> nth=0", unitLabel);
  await page.click('button:has-text("Add Unit")');
  await page.waitForSelector(`text=${unitLabel}`);
}

export async function createTenant(page: Page, name: string, email: string) {
  await page.click('nav >> text=Tenants');
  await page.waitForURL("/tenants");
  await page.fill("form input >> nth=0", name);
  await page.fill("form input >> nth=1", email);
  await page.click('button:has-text("Add Tenant")');
  await page.waitForSelector(`text=${name}`);
}

export async function createLeaseFromPropertiesPage(
  page: Page,
  propertyName: string,
  unitLabel: string,
  tenantName: string,
  rent = "6000",
) {
  await page.click('nav >> text=Properties');
  await page.waitForURL("/properties");
  await page.click(`text=${propertyName}`);
  await page.waitForURL(/\/properties\/\d+/);
  await page.click(`text=${unitLabel}`);
  await page.waitForURL(/\/units\/\d+/);
  await page.selectOption("select", { label: tenantName });
  await page.locator('input[type="date"]').fill("2026-01-01");
  await page.fill('input[type="number"]', rent);
  await page.click('button:has-text("Create Lease")');
  await page.waitForSelector("text=Current Lease");
}

export async function requestAndFollowMagicLink(page: Page, tenantEmail: string) {
  await page.goto("/portal");
  await page.fill('input[type="email"]', tenantEmail);
  await page.click('button:has-text("Send me a link")');
  await page.waitForSelector("text=Continue to submission form");
  await page.click("text=Continue to submission form");
  await page.waitForURL("/portal/submit");
}
