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

test("submission appears in the inbox with photo, and a reply persists", async ({ browser }) => {
  const landlordContext = await browser.newContext();
  const landlordPage = await landlordContext.newPage();
  await signupLandlord(landlordPage, uniqueEmail("inbox-landlord"));
  await createProperty(landlordPage, "Inbox E2E Building", "Addr");
  await createUnit(landlordPage, "Inbox E2E Building", "4D");

  const tenantEmail = uniqueEmail("inbox-e2e-tenant");
  const tenantName = uniqueName("Inbox E2E Tenant");
  await createTenant(landlordPage, tenantName, tenantEmail);
  await createLeaseFromPropertiesPage(landlordPage, "Inbox E2E Building", "4D", tenantName);

  const tenantContext = await browser.newContext();
  const tenantPage = await tenantContext.newPage();
  await requestAndFollowMagicLink(tenantPage, tenantEmail);
  await tenantPage.fill("textarea", "Fridge stopped cooling.");
  // A real (tiny, valid) 1x1 JPEG so the <img> actually decodes.
  const tinyJpeg = Buffer.from(
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
    "base64",
  );
  await tenantPage.locator('input[type="file"]').setInputFiles({
    name: "fridge.jpg",
    mimeType: "image/jpeg",
    buffer: tinyJpeg,
  });
  await tenantPage.click('button:has-text("Submit")');
  await expect(tenantPage.locator("text=Thanks — we've got it")).toBeVisible();

  await landlordPage.click('nav >> text=Inbox');
  await landlordPage.waitForURL("/inbox");
  const inboxCard = landlordPage.locator("a", { hasText: "Fridge stopped cooling." });
  await expect(inboxCard).toBeVisible();
  await expect(inboxCard).toContainText(tenantName);

  await landlordPage.click("text=Fridge stopped cooling.");
  await landlordPage.waitForURL(/\/inbox\/\d+/);

  const img = landlordPage.locator("img").first();
  await expect(img).toBeVisible();
  await expect
    .poll(async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);

  await expect(landlordPage.locator("text=received your submission")).toBeVisible();

  const replyMarker = `E2E_REPLY_${Date.now()}`;
  await landlordPage.fill("textarea", replyMarker);
  await landlordPage.click('button:has-text("Send Reply")');
  await expect(landlordPage.locator(`text=${replyMarker}`)).toBeVisible();

  // Verify the reply actually persisted server-side, not just optimistic
  // client state — reload from scratch and look again.
  await landlordPage.reload();
  await expect(landlordPage.locator(`text=${replyMarker}`)).toBeVisible();

  await landlordContext.close();
  await tenantContext.close();
});

test("inbox filters by property and by tenant", async ({ browser }) => {
  const landlordContext = await browser.newContext();
  const landlordPage = await landlordContext.newPage();
  await signupLandlord(landlordPage, uniqueEmail("inbox-filter-landlord"));

  await createProperty(landlordPage, "Filter Building A", "Addr");
  await createUnit(landlordPage, "Filter Building A", "1A");
  const tenantAEmail = uniqueEmail("filter-tenant-a");
  const tenantAName = uniqueName("Filter Tenant A");
  await createTenant(landlordPage, tenantAName, tenantAEmail);
  await createLeaseFromPropertiesPage(landlordPage, "Filter Building A", "1A", tenantAName);

  // createLeaseFromPropertiesPage leaves the page on /units/{id} — its form
  // is only for lease creation and no longer exists once a lease is
  // active, so createProperty needs a fresh /properties navigation first.
  await landlordPage.click('nav >> text=Properties');
  await landlordPage.waitForURL("/properties");
  await createProperty(landlordPage, "Filter Building B", "Addr");
  await createUnit(landlordPage, "Filter Building B", "1B");
  const tenantBEmail = uniqueEmail("filter-tenant-b");
  const tenantBName = uniqueName("Filter Tenant B");
  await createTenant(landlordPage, tenantBName, tenantBEmail);
  await createLeaseFromPropertiesPage(landlordPage, "Filter Building B", "1B", tenantBName);

  const tenantContext = await browser.newContext();
  const tenantPage = await tenantContext.newPage();
  await requestAndFollowMagicLink(tenantPage, tenantAEmail);
  await tenantPage.fill("textarea", "Issue from tenant A");
  await tenantPage.click('button:has-text("Submit")');
  await expect(tenantPage.locator("text=Thanks — we've got it")).toBeVisible();

  await landlordPage.click('nav >> text=Inbox');
  await landlordPage.waitForURL("/inbox");
  await expect(landlordPage.locator("text=Issue from tenant A")).toBeVisible();

  // Second combobox is the tenant filter (first is property).
  await landlordPage.getByRole("combobox").nth(1).click();
  await landlordPage.getByRole("option", { name: tenantBName }).click();
  await expect(landlordPage.locator("text=Issue from tenant A")).toHaveCount(0);

  await landlordContext.close();
  await tenantContext.close();
});
