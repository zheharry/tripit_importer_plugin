const fs = require('fs').promises;
const { chromium } = require('playwright');
const login = require('./login');

async function deleteFirstPlanOnPage(page) {
  // Selectors based on HTML provided in TODO.md for the trip summary page
  const planItemSelector = 'div[data-cy="trip-timeline-segment"]';
  const planItems = page.locator(planItemSelector);

  if (await planItems.count() === 0) {
    console.log('No more plan items (div[data-cy="trip-timeline-segment"]) found on the page.');
    return false; // No items to delete
  }

  const firstPlanItem = planItems.first();
  console.log('Found a plan item (div[data-cy="trip-timeline-segment"]). Attempting to delete...');

  // Selector for the button that opens the actions dropdown menu
  const optionsButtonOpener = firstPlanItem.locator('[data-cy="timeline-actions-button"] button#timeline-actions-button__BV_toggle_');
  
  if (await optionsButtonOpener.count() > 0) {
    console.log('Found actions menu button. Clicking to open menu...');
    await optionsButtonOpener.first().click();
    await page.waitForTimeout(1500); // Wait for dropdown menu to appear

    // Selector for the "Delete Plan" link in the menu
    const deleteLinkInMenu = page.locator('a[data-cy="timeline-delete-button"]');
    if (await deleteLinkInMenu.count() > 0) {
      console.log('Found "Delete Plan" link in menu. Clicking...');
      // It's possible the delete link is not unique across the page if multiple menus could be open,
      // so we target the one that should be visible after the click.
      await deleteLinkInMenu.filter({ hasText: /Delete Plan/i }).first().click();
      console.log('Clicked "Delete Plan" link.');

      // Wait for confirmation dialog and confirm deletion
      // This part remains speculative as the confirmation dialog HTML was not in TODO.md
      await page.waitForTimeout(2000); // Wait a bit longer for potential confirmation dialog to appear
      
      // Use getByRole for robust text matching for the confirmation button.
      // This looks for a visible button with text matching "delete", "confirm", or "yes" (case-insensitive).
      let confirmButton = page.getByRole('button', { name: /delete|confirm|yes/i, exact: false });
      
      // Check if the primary locator found anything. If not, try a common data-cy attribute as a fallback.
      if (await confirmButton.count() === 0) {
        console.log('Primary confirmation button locator (getByRole) found nothing. Trying data-cy fallback...');
        confirmButton = page.locator('[data-cy="confirm-delete-button"]:visible');
      }
      
      // Ensure the located button is visible before interacting.
      // If multiple buttons match (e.g. "Delete" in the main page and "Delete" in a dialog),
      // this tries to prefer one that might be in a dialog.
      const visibleConfirmButtons = confirmButton.locator(':visible');

      if (await visibleConfirmButtons.count() > 0) {
        const firstVisibleConfirmButton = visibleConfirmButtons.first();
        console.log(`Found visible confirmation button. Text: "${await firstVisibleConfirmButton.textContent()}" Clicking...`);
        await firstVisibleConfirmButton.click(); 
        console.log('Confirmed deletion.');
        await page.waitForLoadState('networkidle', { timeout: 20000 }); // Increased timeout for page update
        return true; // Deletion attempted and confirmed
      } else {
        console.warn('Could not find a visible confirmation button for deletion after clicking "Delete Plan" link. Plan might not be deleted. Please check the page.');
        // If no confirmation, it's possible the action completed without it, or failed silently.
        // Pressing Escape might close an unexpected state or the already-closed menu.
        await page.keyboard.press('Escape'); 
        return false; // Confirmation step failed
      }
    } else {
      console.warn('Could not find "Delete Plan" link (a[data-cy="timeline-delete-button"]) in the options menu.');
      await page.keyboard.press('Escape'); // Close the options menu
      return false;
    }
  } else {
    console.warn('Could not find options menu button ([data-cy="timeline-actions-button"] button) for the plan item. Cannot delete.');
    return false;
  }
}

async function main() {
  let browser;
  let page;
  try {
    const plansConfig = JSON.parse(await fs.readFile('tripPlans.json', 'utf-8'));
    const tripId = plansConfig.tripId;

    if (!tripId) {
      throw new Error('tripId is missing in tripPlans.json');
    }

    const TRIP_URL = `https://www.tripit.com/app/trips/${tripId}`;

    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();

    await login(page);
    console.log('Login successful.');

    await page.goto(TRIP_URL);
    await page.waitForLoadState('networkidle');
    console.log(`Navigated to trip page: ${TRIP_URL}`);

    let plansDeletedCount = 0; // Renamed for clarity
    const maxDeletions = 50; // Increased safety break, adjust if necessary for very long trips

    console.log(`Attempting to delete all plans from trip: ${tripId}`);
    for (let i = 0; i < maxDeletions; i++) {
      console.log(`\nDeletion attempt pass ${i + 1}...`);
      const deleted = await deleteFirstPlanOnPage(page);
      if (deleted) {
        plansDeletedCount++;
        console.log(`Successfully deleted a plan item. Total deleted so far: ${plansDeletedCount}. Page should refresh/update.`);
        // Adding a slightly longer timeout to ensure UI updates, especially if there are many items.
        await page.waitForTimeout(4000); 
      } else {
        console.log('No plan item was deleted in this pass, or no items left on the page.');
        break; 
      }
    }
    console.log(`\nFinished deletion process. Total plans deleted from the website in this run: ${plansDeletedCount}`);

    // The tripPlans.json file will no longer be modified by this script.
    console.log('The script will not modify the local tripPlans.json file.');

  } catch (error) {
    console.error('Error in deletePlan.js:', error.message);
    if (page) {
      const screenshotPath = 'error_deletePlan_script.png';
      try {
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to ${screenshotPath}`);
      } catch (ssError) {
        console.error(`Failed to save screenshot: ${ssError.message}`);
      }
    }
  } finally {
    if (browser) {
      console.log('Closing browser.');
      await browser.close();
    }
  }
}

main();
