import { test, expect } from "@playwright/test";

import { createProperty, createUnit, signupLandlord, uniqueEmail } from "./helpers";

test("property activity feed shows property and unit events; unit feed is a subset", async ({
  page,
}) => {
  await signupLandlord(page, uniqueEmail("activity-e2e-landlord"));
  await createProperty(page, "Activity E2E Building", "1 Activity Ave");
  await createUnit(page, "Activity E2E Building", "5E");

  await page.reload();
  await expect(page.locator("text=Property created")).toBeVisible();
  await expect(page.locator("text=Unit added")).toBeVisible();

  await page.click("text=5E");
  await page.waitForURL(/\/units\/\d+/);
  await expect(page.locator("text=Unit added")).toBeVisible();
  await expect(page.locator("text=Property created")).toHaveCount(0);
});
