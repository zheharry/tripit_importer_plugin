async function addActivityPlan(page, ADD_PLAN_URL, planData) {
  console.log(`Attempting to add Activity plan: ${planData.eventName}`);
  await page.goto(ADD_PLAN_URL);
  await page.waitForLoadState('networkidle');
  console.log(`Successfully navigated to Add Plan page: ${page.url()}`);

  // Select "Activity" plan type - guessing selector
  const activityOption = page.getByRole('menuitem', { name: /activity|event|attraction/i })
                             .or(page.locator('[aria-label*="Activity"i], [aria-label*="Event"i], [aria-label*="Attraction"i]')).first();
  await activityOption.waitFor({ state: 'visible', timeout: 10000 });
  await activityOption.click();
  console.log('"Activity" option clicked.');

  // Wait for Activity form to load
  await page.waitForSelector('h1[data-cy="segment-edit-title"]:has-text("Add Activity")', { timeout: 15000 });
  console.log('Activity form appears to be ready.');

  // Fill in Activity form
  console.log('Filling Activity form...');
  
  const eventNameInput = page.locator('input[data-cy="event-name-input"]');
  await eventNameInput.waitFor({ state: 'visible', timeout: 5000 });
  await eventNameInput.fill(planData.eventName);

  const startDateInput = page.locator('input[data-cy="start-date-input-input"]');
  await startDateInput.waitFor({ state: 'visible', timeout: 5000 });
  await startDateInput.fill(planData.startDate); 
  await startDateInput.blur();

  const startTimeInput = page.locator('input[data-cy="start-time-input-input"]');
  await startTimeInput.waitFor({ state: 'visible', timeout: 5000 });
  const timeToFill = typeof planData.startTime === 'string' ? planData.startTime : '';
  await startTimeInput.fill(timeToFill);
  if (timeToFill) { // Only blur if a non-empty time was filled
    await startTimeInput.blur();
  }

  // Optional: End date/time
  // const endDateInput = page.locator('input[data-cy="end-date-input-input"]');
  // await endDateInput.fill('29/06/2025');
  // await endDateInput.blur();
  // const endTimeInput = page.locator('input[data-cy="end-time-input-input"]');
  // await endTimeInput.fill(planData.endTime);
  // await endTimeInput.blur();

  const venueInput = page.getByPlaceholder('Enter Venue');
  await venueInput.waitFor({ state: 'visible', timeout: 5000 });
  const venueToFill = typeof planData.venue === 'string' ? planData.venue : '';
  await venueInput.fill(venueToFill);
  if (venueToFill) { // Only interact further if a venue was actually provided
    await page.waitForTimeout(500); // For potential autocomplete
    await venueInput.press('Enter'); // Assuming Enter is for selection/confirmation
  }
  
  const addressInput = page.getByPlaceholder('Enter Address');
  await addressInput.waitFor({ state: 'visible', timeout: 5000 });
  const addressToFill = typeof planData.address === 'string' ? planData.address : '';
  await addressInput.fill(addressToFill);
  if (addressToFill) { // Only interact further if an address was actually provided
    await page.waitForTimeout(500); // For potential autocomplete
    await addressInput.press('Enter'); // Assuming Enter is for selection/confirmation
  }

  const saveActivityButton = page.locator('button[data-cy="footer-segment-edit-save"]');
  await saveActivityButton.waitFor({ state: 'visible', timeout: 5000 });
  await saveActivityButton.click();

  await page.waitForLoadState('networkidle');
  console.log('Activity plan saved. Current URL:', page.url());
}

module.exports = addActivityPlan;
