async function addCarRentalPlan(page, ADD_PLAN_URL, planData) {
  console.log(`Attempting to add Car Rental plan for: ${planData.rentalAgency} - ${planData.pickupLocation}`);
  await page.goto(ADD_PLAN_URL);
  await page.waitForLoadState('networkidle');
  console.log(`Successfully navigated to Add Plan page: ${page.url()}`);

  // Click on the "Car Rental" or "Ground Transportation" option
  // The regex should cover variations like "Car", "Rental", "Ground transport", etc.
  const carRentalOption = page.getByRole('menuitem', { name: /car rental|ground transportation|car/i })
    .or(page.locator('[aria-label*="Car"i], [aria-label*="Rental"i], [aria-label*="Ground"i]')).first();
  await carRentalOption.waitFor({ state: 'visible', timeout: 10000 });
  await carRentalOption.click();
  console.log('"Car Rental" or "Ground Transportation" option clicked.');

  // Wait for the "Add Car Rental" page to load
  await page.waitForSelector('h1:has-text("Add Car Rental")', { timeout: 15000 });
  console.log('Car Rental form appears to be ready.');

  console.log('Filling details for Car Rental...');

  // Rental Agency
  if (planData.rentalAgency) {
    const rentalAgencyInput = page.locator('input[data-cy="rental-agency-input"]');
    await rentalAgencyInput.waitFor({ state: 'visible', timeout: 5000 });
    await rentalAgencyInput.fill(planData.rentalAgency);
    console.log('Rental Agency filled.');
  }

  // Pickup Date
  if (planData.pickupDate) {
    const pickupDateInput = page.locator('input[data-cy="pickup-date-input-input"]');
    await pickupDateInput.waitFor({ state: 'visible', timeout: 5000 });
    await pickupDateInput.fill(planData.pickupDate);
    await pickupDateInput.blur(); // To ensure date picker closes and value registers
    console.log('Pickup Date filled.');
  }

  // Pickup Time
  if (planData.pickupTime) {
    const pickupTimeInput = page.locator('input[data-cy="pickup-time-input-input"]');
    await pickupTimeInput.waitFor({ state: 'visible', timeout: 5000 });
    await pickupTimeInput.fill(planData.pickupTime);
    await pickupTimeInput.blur();
    console.log('Pickup Time filled.');
  }

  // Pickup Location
  if (planData.pickupLocation) {
    const pickupLocationInput = page.locator('input[name="pickup-location-input-input"]');
    await pickupLocationInput.waitFor({ state: 'visible', timeout: 5000 });
    await pickupLocationInput.fill(planData.pickupLocation);
    // Add a small delay and press Enter or Tab if there's an autosuggest list
    await page.waitForTimeout(1000);
    // await pickupLocationInput.press('Enter'); // Or 'Tab'
    console.log('Pickup Location filled.');
  }
  
  // Drop-off Date
  if (planData.dropoffDate) {
    const dropoffDateInput = page.locator('input[data-cy="dropoff-date-input-input"]');
    await dropoffDateInput.waitFor({ state: 'visible', timeout: 5000 });
    await dropoffDateInput.fill(planData.dropoffDate);
    await dropoffDateInput.blur();
    console.log('Drop-off Date filled.');
  }

  // Drop-off Time
  if (planData.dropoffTime) {
    const dropoffTimeInput = page.locator('input[data-cy="dropoff-time-input-input"]');
    await dropoffTimeInput.waitFor({ state: 'visible', timeout: 5000 });
    await dropoffTimeInput.fill(planData.dropoffTime);
    await dropoffTimeInput.blur();
    console.log('Drop-off Time filled.');
  }

  // Drop-off Location (if different from pickup)
  // Check if the "Same as Pickup Location" checkbox needs to be unchecked
  if (planData.dropoffLocation && planData.dropoffLocation !== planData.pickupLocation) {
    const sameLocationCheckboxInput = page.locator('input[data-cy="end-same-location-checkbox"]');
    if (await sameLocationCheckboxInput.isChecked()) {
      const checkboxId = await sameLocationCheckboxInput.getAttribute('id');
      const associatedLabel = page.locator(`label[for="${checkboxId}"]`);
      await associatedLabel.click();
      console.log('"Same as Pickup Location" checkbox toggled via label (to uncheck).');
    }
    const dropoffLocationInput = page.locator('input[name="dropoff-location-input-input"]'); // Assuming similar naming
    await dropoffLocationInput.waitFor({ state: 'visible', timeout: 5000 });
    await dropoffLocationInput.fill(planData.dropoffLocation);
    await page.waitForTimeout(1000);
    // await dropoffLocationInput.press('Enter');
    console.log('Drop-off Location filled.');
  } else if (planData.dropoffLocation && planData.dropoffLocation === planData.pickupLocation) {
    const sameLocationCheckboxInput = page.locator('input[data-cy="end-same-location-checkbox"]');
    if (!await sameLocationCheckboxInput.isChecked()) {
      const checkboxId = await sameLocationCheckboxInput.getAttribute('id');
      const associatedLabel = page.locator(`label[for="${checkboxId}"]`);
      await associatedLabel.click();
      console.log('"Same as Pickup Location" checkbox toggled via label (to check).');
    }
  }


  // Confirmation Number
  if (planData.confirmationNumber) {
    const confirmationInput = page.locator('input[data-cy="confirmation-input"]');
    await confirmationInput.waitFor({ state: 'visible', timeout: 5000 });
    await confirmationInput.fill(planData.confirmationNumber);
    console.log('Confirmation Number filled.');
  }

  // Car Type
  if (planData.carType) {
    const carTypeInput = page.locator('input[data-cy="car-type-input"]');
    await carTypeInput.waitFor({ state: 'visible', timeout: 5000 });
    await carTypeInput.fill(planData.carType);
    console.log('Car Type filled.');
  }
  
  // Add other fields as needed from planData, e.g.:
  // pickupAddress, pickupPhone, dropoffAddress, dropoffPhone, website, email, mileageCharges, carDetails

  const saveButton = page.locator('button[data-cy="footer-segment-edit-save"]');
  console.log('Waiting for Save button to be visible...');
  await saveButton.waitFor({ state: 'visible', timeout: 15000 });
  console.log('Save button visible. Clicking save...');
  await saveButton.click();

  await page.waitForLoadState('networkidle', { timeout: 20000 }); // Increased timeout for saving
  console.log('Car Rental plan saved. Current URL:', page.url());
}

module.exports = addCarRentalPlan;
