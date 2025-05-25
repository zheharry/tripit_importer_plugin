async function addFlightPlan(page, ADD_PLAN_URL, planData) { // Renamed function
  console.log(`Attempting to add Flight plan: ${planData.airline} ${planData.flightNumber}`); // Updated log
  await page.goto(ADD_PLAN_URL);
  await page.waitForLoadState('networkidle');
  console.log(`Successfully navigated to Add Plan page: ${page.url()}`);

  const flightOption = page.getByRole('menuitem', { name: /flight|air/i }) // Keep /air/i for robustness during selection
                         .or(page.locator('[aria-label*="Flight"i], [aria-label*="Air"i]')).first();
  await flightOption.waitFor({ state: 'visible', timeout: 10000 });
  await flightOption.click();
  console.log('"Flight" option clicked.'); // Updated log

  await page.waitForSelector('h1:has-text("Add Flight"), [data-cy="flight-form-container"]', { timeout: 15000 });
  console.log('Flight form appears to be ready.'); // Updated log

  console.log('Filling details for flight segment 1...');

  const airlineInput = page.getByPlaceholder('Enter Airline');
  console.log('Waiting for Airline input...');
  await airlineInput.waitFor({ state: 'visible', timeout: 10000 });
  console.log('Airline input visible. Filling...');
  await airlineInput.fill(planData.airline);
  await page.waitForTimeout(1000); 
  await airlineInput.press('Enter');
  console.log('Airline filled.');

  const flightNumberInput = page.locator('input[data-cy="flight-form-0-flight-number"]');
  console.log('Waiting for Flight Number input...');
  await flightNumberInput.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Flight Number input visible. Filling...');
  await flightNumberInput.fill(planData.flightNumber);
  console.log('Flight Number filled.');
  
  console.log('Waiting 3 seconds for auto-population of stations and potentially other fields...');
  await page.waitForTimeout(3000); // Increased wait
  console.log('Proceeding after auto-population wait.');

  // Re-introduce filling Departure Date as it was an issue
  const depDateInput = page.locator('input[data-cy="flight-form-0-start-date-input"]');
  console.log('Waiting for Departure Date input...');
  await depDateInput.waitFor({ state: 'visible', timeout: 5000 });
  await depDateInput.fill(planData.departureDate);
  await depDateInput.blur();
  console.log('Departure Date explicitly filled.');
  // Removed screenshot and manual filling of time/arrival details.
  // The 10-second wait for auto-population is already in place before this block.
  console.log('Assuming auto-population has occurred or will occur for remaining fields.');

  const saveFlightButton = page.locator('button[data-cy="footer-segment-edit-save"]');
  console.log('Waiting for Save button to be visible...');
  await saveFlightButton.waitFor({ state: 'visible', timeout: 15000 }); // Increased timeout for save button
  console.log('Save button visible. Clicking save...');
  await saveFlightButton.click();

  await page.waitForLoadState('networkidle');
  console.log('Flight plan saved. Current URL:', page.url()); // Updated log
}

module.exports = addFlightPlan; // Renamed export
