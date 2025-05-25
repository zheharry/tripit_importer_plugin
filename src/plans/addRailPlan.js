async function addRailPlan(page, ADD_PLAN_URL, planData) {
  console.log(`Attempting to add Rail plan: ${planData.carrierName} ${planData.trainNumber}`);
  await page.goto(ADD_PLAN_URL);
  await page.waitForLoadState('networkidle');
  console.log(`Successfully navigated to Add Plan page: ${page.url()}`);

  // Select "Rail" plan type - guessing selector
  const railOption = page.getByRole('menuitem', { name: /rail|train/i })
                         .or(page.locator('[aria-label*="Rail"i], [aria-label*="Train"i]')).first();
  await railOption.waitFor({ state: 'visible', timeout: 10000 });
  await railOption.click();
  console.log('"Rail/Train" option clicked.');

  // Wait for Rail form to load
  await page.waitForSelector('h1[data-cy="segment-edit-title"]:has-text("Add Rail")', { timeout: 15000 });
  console.log('Rail form appears to be ready.');

  // Fill in Rail form (Segment 1)
  console.log('Filling details for rail segment 1...');
  
  const carrierNameInput = page.locator('input[data-cy="rail-form-0-carrier-name-input"]');
  await carrierNameInput.waitFor({ state: 'visible', timeout: 5000 });
  await carrierNameInput.fill(planData.carrierName);

  const trainNumberInput = page.locator('input[data-cy="rail-form-0-train-number-input"]');
  await trainNumberInput.waitFor({ state: 'visible', timeout: 5000 });
  await trainNumberInput.fill(planData.trainNumber);

  const depStationInput = page.getByPlaceholder('Enter Departure Station').first(); 
  await depStationInput.waitFor({ state: 'visible', timeout: 5000 });
  await depStationInput.fill(planData.departureStation);
  await page.waitForTimeout(500);
  await depStationInput.press('Enter');

  const depDateInput = page.locator('input[data-cy="rail-form-0-departure-date-input-input"]');
  await depDateInput.waitFor({ state: 'visible', timeout: 5000 });
  await depDateInput.fill(planData.departureDate); 
  await depDateInput.blur();

  const depTimeInput = page.locator('input[data-cy="rail-form-0-departure-time-input-input"]');
  await depTimeInput.waitFor({ state: 'visible', timeout: 5000 });
  await depTimeInput.fill(planData.departureTime);
  await depTimeInput.blur();
  
  const arrStationInput = page.getByPlaceholder('Enter Arrival Station').last(); 
  await arrStationInput.waitFor({ state: 'visible', timeout: 5000 });
  await arrStationInput.fill(planData.arrivalStation);
  await page.waitForTimeout(500);
  await arrStationInput.press('Enter');
  
  const arrDateInput = page.locator('input[data-cy="rail-form-0-arrival-date-input-input"]');
  await arrDateInput.waitFor({ state: 'visible', timeout: 5000 });
  await arrDateInput.fill(planData.arrivalDate);
  await arrDateInput.blur();

  const arrTimeInput = page.locator('input[data-cy="rail-form-0-arrival-time-input-input"]');
  await arrTimeInput.waitFor({ state: 'visible', timeout: 5000 });
  await arrTimeInput.fill(planData.arrivalTime);
  await arrTimeInput.blur();

  // TODO: Handle adding more segments

  const saveRailButton = page.locator('button[data-cy="footer-segment-edit-save"]');
  await saveRailButton.waitFor({ state: 'visible', timeout: 5000 });
  await saveRailButton.click();

  await page.waitForLoadState('networkidle');
  console.log('Rail plan saved. Current URL:', page.url());
}

module.exports = addRailPlan;
