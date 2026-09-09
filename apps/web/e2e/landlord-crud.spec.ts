import { test, expect } from "@playwright/test";

import {
  createProperty,
  createUnit,
  selectTenant,
  signupLandlord,
  uniqueEmail,
  uniqueName,
} from "./helpers";

test.describe("Landlord property/unit/tenant CRUD", () => {
  test("signup, create property and unit, see them listed", async ({ page }) => {
    const email = uniqueEmail("crud-landlord");
    await signupLandlord(page, email);

    await createProperty(page, "CRUD Test Building", "1 CRUD St");
    await createUnit(page, "CRUD Test Building", "1A");

    await expect(page.locator("text=1A")).toBeVisible();
  });

  test("editing a property updates it in place", async ({ page }) => {
    const email = uniqueEmail("crud-landlord-edit");
    await signupLandlord(page, email);
    await createProperty(page, "Original Name", "Addr");
    await page.click("text=Original Name");
    await page.waitForURL(/\/properties\/\d+/);

    // Property page has no inline edit form in the UI yet (Phase 1 keeps it
    // minimal) — verify via the API directly that PATCH works, since that's
    // the actual capability under test here.
    const propertyId = page.url().split("/").pop();
    const token = await page.evaluate(() => localStorage.getItem("apm_token"));
    const response = await page.request.patch(
      `http://localhost:8000/properties/${propertyId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: "Renamed via PATCH" },
      },
    );
    expect(response.ok()).toBe(true);

    await page.reload();
    await expect(page.locator("text=Renamed via PATCH")).toBeVisible();
  });

  test("a landlord cannot see another landlord's property", async ({ browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signupLandlord(pageA, uniqueEmail("isolation-a"));
    await createProperty(pageA, "A's Private Building", "Addr");
    await pageA.click("text=A's Private Building");
    await pageA.waitForURL(/\/properties\/\d+/);
    const propertyUrl = pageA.url();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signupLandlord(pageB, uniqueEmail("isolation-b"));
    await pageB.goto(propertyUrl);

    // Navigating directly to a property B doesn't own shows a clear
    // "not found" message instead of an infinite spinner (the API 404s;
    // the page must handle that rather than let the fetch reject silently).
    await expect(pageB.locator("text=/don.t have access/")).toBeVisible();

    // Not owned by B — the properties list should not include A's building.
    await pageB.goto("/properties");
    await expect(pageB.locator("text=A's Private Building")).toHaveCount(0);

    await contextA.close();
    await contextB.close();
  });
});

test.describe("Tenant and lease lifecycle", () => {
  test("creating a lease assigns the tenant, ending it unassigns them", async ({ page }) => {
    const email = uniqueEmail("lease-landlord");
    await signupLandlord(page, email);
    await createProperty(page, "Lease Test Building", "Addr");
    await createUnit(page, "Lease Test Building", "2B");

    await page.click('nav >> text=Tenants');
    await page.waitForURL("/tenants");
    const tenantEmail = uniqueEmail("lease-tenant");
    const tenantName = uniqueName("Lease Test Tenant");
    await page.fill("form input >> nth=0", tenantName);
    await page.fill("form input >> nth=1", tenantEmail);
    await page.click('button:has-text("Add Tenant")');
    await page.waitForSelector(`text=${tenantName}`);
    // Scoped to this tenant's own card — the instance-wide tenant list
    // (app/(dashboard)/tenants/page.tsx) legitimately shows every tenant on
    // this dev DB, so "No active lease" appears on other cards too.
    const tenantCard = page.locator("a", { hasText: tenantName });
    await expect(tenantCard).toContainText("Unassigned");

    await page.click('nav >> text=Properties');
    await page.click("text=Lease Test Building");
    await page.waitForURL(/\/properties\/\d+/);
    await page.click("text=2B");
    await page.waitForURL(/\/units\/\d+/);
    await selectTenant(page, tenantName);
    await page.locator('input[type="date"]').fill("2026-01-01");
    await page.fill('input[type="number"]', "6500");
    await page.click('button:has-text("Create Lease")');
    await expect(page.locator("text=Current lease")).toBeVisible();

    // Destructive actions confirm through an AlertDialog now, not window.confirm.
    await page.getByRole("button", { name: "End lease" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "End lease" }).click();
    await expect(page.locator("text=Assign a tenant")).toBeVisible();

    await page.click('nav >> text=Tenants');
    await page.click(`text=${tenantName}`);
    await page.waitForURL(/\/tenants\/\d+/);
    await expect(page.locator("text=No active lease")).toBeVisible();
  });
});
