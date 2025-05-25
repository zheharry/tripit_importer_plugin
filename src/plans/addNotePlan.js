async function addNotePlan(page, ADD_PLAN_URL, planData) {
  console.log(`Attempting to add Note plan (To-do): ${planData.title}`);
  await page.goto(ADD_PLAN_URL);
  await page.waitForLoadState('networkidle');
  console.log(`Successfully navigated to Add Plan page: ${page.url()}`);

  // Select "Note" plan type - guessing selector
  const noteOption = page.getByRole('menuitem', { name: /note|to-do/i })
                         .or(page.locator('[aria-label*="Note"i], [aria-label*="To-do"i]')).first();
  await noteOption.waitFor({ state: 'visible', timeout: 10000 });
  await noteOption.click();
  console.log('"Note/To-do" option clicked.');

  // Wait for Note form to load
  await page.waitForSelector('h1[data-cy="segment-edit-title"]:has-text("Add Note")', { timeout: 15000 });
  console.log('Note form appears to be ready.');

  // Fill in Note form
  const noteTitleInput = page.locator('input[data-cy="note-title-input"]');
  await noteTitleInput.waitFor({ state: 'visible', timeout: 5000 });
  await noteTitleInput.fill(planData.title);

  const noteDetailsInput = page.locator('textarea[data-cy="note-input"]');
  await noteDetailsInput.waitFor({ state: 'visible', timeout: 5000 });
  await noteDetailsInput.fill(typeof planData.details === 'string' ? planData.details : '');

  // Date for the note/to-do (e.g., when it should be done or relevant)
  const noteDateInput = page.locator('input[data-cy="date-input-input"]');
  await noteDateInput.waitFor({ state: 'visible', timeout: 5000 });
  const dateToFill = typeof planData.date === 'string' ? planData.date : '';
  await noteDateInput.fill(dateToFill);
  if (dateToFill) { // Only blur if a non-empty date was filled
    await noteDateInput.blur();
  }
  
  // Optional: Time for the note
  // const noteTimeInput = page.locator('input[data-cy="time-input-input"]');
  // await noteTimeInput.waitFor({ state: 'visible', timeout: 5000 });
  // await noteTimeInput.fill('09:00');
  // await noteTimeInput.blur();

  const saveNoteButton = page.locator('button[data-cy="footer-segment-edit-save"]');
  await saveNoteButton.waitFor({ state: 'visible', timeout: 5000 });
  await saveNoteButton.click();

  await page.waitForLoadState('networkidle');
  console.log('Note plan saved. Current URL:', page.url());
}

module.exports = addNotePlan;
