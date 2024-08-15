import { expect, test } from "@playwright/test";
// from fixtures in case we are loading chrome extensions
// import { expect, test } from "../playwright.fixtures";

test("has title", async ({ page }) => {
  await page.goto("/");

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Staking Dashboard/);
});

test("should connect the wallet", async ({ page }) => {
  await page.goto("/");

  // Click the "Connect to BTC" button.
  await page.getByRole("button", { name: "Connect to BTC" }).click();

  // Accept the terms and conditions.
  await page
    .locator("label")
    .filter({ hasText: "I certify that I have read" })
    .click();
  await page
    .locator("label")
    .filter({ hasText: "I certify that there are no" })
    .click();

  // Select the OKX wallet.
  await page.locator("a").filter({ hasText: "OKX" }).click();
  // await page
  //   .getByTestId("modal")
  //   .getByRole("button", { name: "Connect to BTC" })
  //   .click();
});
