console.log("TripIt Importer content script loaded.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "importPlans") {
    console.log("Content script received plans:", request.data);
    if (request.data && request.data.length > 0) {
      chrome.storage.local.set({ plans: request.data }, () => {
        console.log("Plans saved. Starting import flow.");
        processPlanFlow();
      });
      sendResponse({ status: "success", message: `Import flow started for ${request.data.length} plan(s)` });
    } else {
      sendResponse({ status: "error", message: "No plan data received." });
    }
    return true;
  }
});

document.addEventListener('DOMContentLoaded', processPlanFlow);

// Listen for SPA navigation events to re-run the import flow on URL changes
(function() {
  const triggerUrlChange = () => processPlanFlow();
  window.addEventListener('popstate', triggerUrlChange);
  const pushState = history.pushState;
  history.pushState = function(...args) {
    pushState.apply(this, args);
    triggerUrlChange();
  };
  const replaceState = history.replaceState;
  history.replaceState = function(...args) {
    replaceState.apply(this, args);
    triggerUrlChange();
  };
})();

/**
 * Handles navigation and form filling across TripIt pages:
 * 1. On trip summary page, clicks "Add a Plan".
 * 2. On plan type selection page, clicks "Flight" pill.
 * 3. On flight creation page, fills the flight form.
 */
function processPlanFlow() {
  chrome.storage.local.get(['plans'], (result) => {
    const plans = result.plans;
    if (!plans || plans.length === 0) {
      return;
    }
    const plan = plans[0];
    const url = window.location.href;
    if (url.includes('/flights/create')) {
      fillTripItForm(plan);
      chrome.storage.local.remove('plans');
      return;
    }
    if (url.includes('/plans/create') && !url.includes('/flights/create')) {
      // Poll for the Flight plan type button in case of dynamic loading
      const clickFlightBtn = () => {
        const flightBtn = document.querySelector('[data-cy="more-plan-types-flight"]');
        if (flightBtn) {
          console.log("Clicking Flight plan type button.");
          flightBtn.click();
        } else {
          console.warn("Flight plan type button not found. Retrying in 500ms...");
          setTimeout(clickFlightBtn, 500);
        }
      };
      clickFlightBtn();
      return;
    }
    if (url.match(/\/app\/trips\/[^/]+(\/)?($|\?)/) && !url.includes('/plans/create')) {
      const addPlanBtn = document.querySelector('a[aria-label="Add a Plan"], button[aria-label="Add a Plan"]');
      if (addPlanBtn) {
        console.log("Clicking Add a Plan button.");
        addPlanBtn.click();
      } else {
        console.warn("Add a Plan button not found.");
      }
    }
  });
}

function fillTripItForm(plan) {
  console.log("Attempting to fill form with plan:", plan);

  // Selectors for the "Add Flight" form, based on user-provided HTML
  const selectors = {
    // General plan fields from your CSV that don't map well to this specific "Flight" form:
    // plan.Subject -> No direct "Subject" field. For flights, it's Airline + Flight No.
    // plan['Start Time'] -> No direct field visible yet.
    // plan['End Date'] -> No direct field visible yet for arrival date.
    // plan['End Time'] -> No direct field visible yet for arrival time.
    // plan.Location -> No direct single "Location" field. Flights have departure/arrival airports.
    // plan.Description -> No direct "Description" field visible yet.

    // Fields we can try to map on the "Add Flight" form:
    confirmationNumber: 'input[data-cy="confirmation-number"]', // CSV doesn't have this.
    departureDate: 'input[data-cy="flight-form-0-start-date-input"]', // Maps to plan['Start Date']
    airline: 'input[name="flight-form-0-airline-input"]', // REQUIRED. What to use from CSV?
    flightNumber: 'input[data-cy="flight-form-0-flight-number"]', // What to use from CSV?
    
    // Potentially useful, but not directly in CSV:
    // seats: 'input[data-cy="flight-form-0-seats"]',

    saveButton: 'button[data-cy="footer-segment-edit-save"]'
  };

  console.log("Using 'Add Flight' form selectors.");

  try {
    // Helper function to set value and dispatch events if needed
    const setFieldValue = (selector, value) => {
      const element = document.querySelector(selector);
      if (element) {
        element.value = value;
        // Dispatch input and change events, as some sites use these to update their state
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`Set ${selector} to: ${value}`);
      } else {
        console.warn(`Element with selector "${selector}" not found.`);
      }
    };

    // Attempting to fill fields for the "Add Flight" form:
    setFieldValue(selectors.departureDate, plan['Start Date']);

    // Problematic fields: Airline is required.
    // For "Flight Arrival" (Subject), what should be the airline?
    // Let's try to put the Subject into Airline for now, though it's not correct.
    // This will likely fail if TripIt validates airline names.
    if (plan.Subject) {
      setFieldValue(selectors.airline, plan.Subject); 
      console.warn(`Attempted to use CSV 'Subject' ("${plan.Subject}") for 'Airline'. This might not be valid.`);
    } else {
      console.warn("'Airline' is required by TripIt, but CSV 'Subject' is empty or not suitable.");
    }
    
    // Similarly for Flight Number, using Description as a placeholder if Subject was used for Airline
    if (plan.Description) {
        setFieldValue(selectors.flightNumber, plan.Description);
        console.warn(`Attempted to use CSV 'Description' ("${plan.Description}") for 'Flight Number'. This might not be valid.`);
    }


    let message = `Form filling attempted for "${plan.Subject}" on the "Add Flight" form.
Departure Date: ${plan['Start Date'] || 'N/A'}.
Airline (used Subject): ${plan.Subject || 'N/A'}.
Flight No (used Description): ${plan.Description || 'N/A'}.

Check fields and console. This mapping is imperfect.`;

    // We need to address:
    // 1. How to handle the required "Airline" field if your CSV Subject isn't an airline.
    // 2. How to input Start Time, End Date/Time, Location (as airports), and Description.
    //    Does "Manually Edit Flight" button reveal these fields?
    // 3. Is there a more generic "Activity" or "Note" plan type that's a better fit for all your CSV items?

    alert(message);

    // Clicking the save button will be the next step once field filling is confirmed
    // const saveBtn = document.querySelector(selectors.saveButton);
    // if (saveBtn) {
    //   console.log("Attempting to click save button...");
    //   saveBtn.click();
    // } else {
    //   console.warn(`Save button with selector "${selectors.saveButton}" not found.`);
    // }

  } catch (error) {
    console.error("Error during form fill:", error);
    alert("An error occurred while trying to fill the form. Check the console on the TripIt page.");
  }
}
