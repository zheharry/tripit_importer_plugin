async function addRestaurantPlan(page, ADD_PLAN_URL, planData) {
  console.log(`Attempting to add Restaurant plan: ${planData.restaurantName}`);
  await page.goto(ADD_PLAN_URL);
  await page.waitForLoadState('networkidle');
  console.log(`Successfully navigated to Add Plan page: ${page.url()}`);

  // Select "Restaurant" plan type - guessing selector
  const restaurantOption = page.getByRole('menuitem', { name: /restaurant/i })
                             .or(page.locator('[aria-label*="Restaurant"i]')).first();
  await restaurantOption.waitFor({ state: 'visible', timeout: 10000 });
  await restaurantOption.click();
  console.log('"Restaurant" option clicked.');

  // Wait for Restaurant form to load
  await page.waitForSelector('h1[data-cy="segment-edit-title"]:has-text("Add Restaurant")', { timeout: 15000 });
  console.log('Restaurant form appears to be ready.');

  // Fill in Restaurant form using selectors from provided HTML
  console.log('Filling Restaurant form...');
  
  const restaurantNameInput = page.getByPlaceholder('Enter Restaurant'); 
  await restaurantNameInput.waitFor({ state: 'visible', timeout: 5000 });
  await restaurantNameInput.fill(planData.restaurantName);
  await page.waitForTimeout(500); 
  await restaurantNameInput.press('Enter');

  const addressInput = page.getByPlaceholder('Enter Address');
  await addressInput.waitFor({ state: 'visible', timeout: 5000 });
  await addressInput.fill(planData.address);
  await page.waitForTimeout(500);
  await addressInput.press('Enter');

  const dateInput = page.locator('input[data-cy="date-input-input"]'); 
  await dateInput.waitFor({ state: 'visible', timeout: 5000 });
  await dateInput.fill(planData.date); 
  await dateInput.blur();

  const timeInput = page.locator('input[data-cy="time-input-input"]'); 
  await timeInput.waitFor({ state: 'visible', timeout: 5000 });
  await timeInput.fill(planData.time);
  await timeInput.blur();

  const saveRestaurantButton = page.locator('button[data-cy="footer-segment-edit-save"]');
  await saveRestaurantButton.waitFor({ state: 'visible', timeout: 5000 });
  await saveRestaurantButton.click();

  await page.waitForLoadState('networkidle');
  console.log('Restaurant plan saved. Current URL:', page.url());
}

module.exports = addRestaurantPlan;
