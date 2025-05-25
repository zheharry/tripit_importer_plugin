// const { chromium } = require('playwright'); // Not needed here

async function addLodgingPlan(page, ADD_PLAN_URL, planData) {
  console.log(`Attempting to add Lodging plan: ${planData.hotelName}`);
  await page.goto(ADD_PLAN_URL);
  await page.waitForLoadState('networkidle');
  console.log(`Successfully navigated to Add Plan page: ${page.url()}`);

  const lodgingOption = page.getByRole('menuitem', { name: /lodging/i })
                             .or(page.locator('[aria-label*="Lodging"i]')).first();
  await lodgingOption.waitFor({ state: 'visible', timeout: 10000 });
  await lodgingOption.click();
  console.log('"Lodging" option clicked.');

  await page.waitForSelector('h1[data-cy="segment-edit-title"]:has-text("Add Lodging")', { timeout: 15000 });
  console.log('Lodging form appears to be ready.');

  const hotelNameInput = page.getByPlaceholder('Enter Lodging Name');
  await hotelNameInput.waitFor({ state: 'visible', timeout: 5000 });
  await hotelNameInput.fill(planData.hotelName);

  const addressInput = page.getByPlaceholder('Enter Address');
  await addressInput.waitFor({ state: 'visible', timeout: 5000 });
  await addressInput.fill(planData.address);
  // For lodging, address might not need Enter if it's not an autocomplete search like for stations

  const checkInDateInput = page.locator('input[data-cy="start-date-input-input"]');
  await checkInDateInput.waitFor({ state: 'visible', timeout: 5000 });
  await checkInDateInput.fill(planData.checkInDate);
  await checkInDateInput.blur();

  const checkOutDateInput = page.locator('input[data-cy="end-date-input-input"]');
  await checkOutDateInput.waitFor({ state: 'visible', timeout: 5000 });
  await checkOutDateInput.fill(planData.checkOutDate);
  await checkOutDateInput.blur();

  const saveLodgingButton = page.locator('button[data-cy="footer-segment-edit-save"]');
  await saveLodgingButton.waitFor({ state: 'visible', timeout: 5000 });
  await saveLodgingButton.click();

  await page.waitForLoadState('networkidle');
  console.log('Lodging plan saved. Current URL:', page.url());
}

module.exports = addLodgingPlan;
