import { test, expect } from "@playwright/test";

import {
  createLeaseFromPropertiesPage,
  createProperty,
  createTenant,
  createUnit,
  requestAndFollowMagicLink,
  signupLandlord,
  uniqueEmail,
  uniqueName,
} from "./helpers";

test("tenant submits an issue with a photo and sees a confirmation", async ({ browser }) => {
  const landlordContext = await browser.newContext();
  const landlordPage = await landlordContext.newPage();
  await signupLandlord(landlordPage, uniqueEmail("portal-landlord"));
  await createProperty(landlordPage, "Portal Building", "Addr");
  await createUnit(landlordPage, "Portal Building", "3C");

  const tenantEmail = uniqueEmail("portal-tenant");
  const tenantName = uniqueName("Portal Tenant");
  await createTenant(landlordPage, tenantName, tenantEmail);
  await createLeaseFromPropertiesPage(landlordPage, "Portal Building", "3C", tenantName);

  const tenantContext = await browser.newContext();
  const tenantPage = await tenantContext.newPage();
  await requestAndFollowMagicLink(tenantPage, tenantEmail);

  await tenantPage.fill("textarea", "Bathroom light doesn't turn on anymore.");
  await tenantPage.locator('input[type="file"]').setInputFiles({
    name: "light.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  });
  await tenantPage.click('button:has-text("Submit")');

  await expect(tenantPage.locator("text=Thanks — we've got it")).toBeVisible();
  await expect(tenantPage.locator("text=/Your submission \\(#\\d+\\)/")).toBeVisible();

  await landlordContext.close();
  await tenantContext.close();
});

test("navigating to /portal/submit without a session redirects to /portal", async ({ page }) => {
  await page.goto("/portal/submit");
  await page.waitForURL("/portal");
  await expect(page.locator("text=Report an issue")).toBeVisible();
});

test("a tenant with no active lease cannot submit (magic link still works)", async ({
  browser,
}) => {
  const landlordContext = await browser.newContext();
  const landlordPage = await landlordContext.newPage();
  await signupLandlord(landlordPage, uniqueEmail("unassigned-landlord"));

  const tenantEmail = uniqueEmail("unassigned-tenant");
  await createTenant(landlordPage, uniqueName("Unassigned Tenant"), tenantEmail);

  const tenantContext = await browser.newContext();
  const tenantPage = await tenantContext.newPage();
  await requestAndFollowMagicLink(tenantPage, tenantEmail);

  await tenantPage.fill("textarea", "Should fail — no unit assigned.");
  await tenantPage.click('button:has-text("Submit")');

  // The API rejects this with 409; the form surfaces the error instead of
  // showing the confirmation screen.
  await expect(tenantPage.locator("text=not currently assigned to a unit")).toBeVisible();
  await expect(tenantPage.locator("text=Thanks — we've got it")).toHaveCount(0);

  await landlordContext.close();
  await tenantContext.close();
});
