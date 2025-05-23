// Content script for TripIt Direct Importer
console.log("TripIt Content Script Loaded and Ready.");

// --- Communication with background.js ---
function sendProgress(message) {
  console.log("TripIt Importer Progress:", message);
  chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_STATUS", message: message, isError: false });
}

function sendError(errorMessage, currentErrorMessagesList) { // Pass the list to potentially add to it
  console.error("TripIt Importer Error:", errorMessage);
  chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_STATUS", message: errorMessage, isError: true });
  if (currentErrorMessagesList) { // Add to the list if provided
      currentErrorMessagesList.push(errorMessage);
  }
}

// Modified sendCompletion
function sendCompletion(overallSuccess, summary, errorMessagesList) {
  console.log("TripIt Importer Completion. Success:", overallSuccess, "Summary:", summary, "Errors:", errorMessagesList);
  chrome.runtime.sendMessage({ 
    type: "IMPORT_COMPLETE", 
    success: overallSuccess, 
    summary: summary, 
    errors: errorMessagesList 
  });
}

// --- Simplified DOM Interaction Helpers ---
async function waitForElement(selector, timeout = 5000, interval = 250) { // Adjusted default interval
    sendProgress(`Attempting to find element: ${selector} (timeout: ${timeout}ms)`);
    return new Promise((resolve, reject) => {
        let elapsedTime = 0;
        const timer = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(timer);
                sendProgress(`Element found: ${selector}`);
                resolve(element);
            } else {
                elapsedTime += interval;
                if (elapsedTime >= timeout) {
                    clearInterval(timer);
                    const errorMsg = `Timeout: Element not found after ${timeout}ms: ${selector}`;
                    // sendError(errorMsg, []); // Assuming errorMessagesList is not directly available or needed here, log instead
                    console.warn(errorMsg); // Log as warning, let calling function decide if it's a fatal error
                    resolve(null); // Resolve with null to indicate not found
                } else {
                    // Optional: sendProgress(`Still waiting for ${selector} (${elapsedTime / 1000}s)...`);
                }
            }
        }, interval);
    });
}

async function fillValue(selector, value, errorMessagesList) {
    if (value === undefined || value === null) {
        sendProgress(`Skipping fill for ${selector} as value is undefined/null.`);
        return false; // Indicate that no action was taken
    }
    sendProgress(`Attempting to fill value for selector: ${selector}`);
    try {
        const element = await waitForElement(selector);
        if (element) {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true })); // Added blur
            sendProgress(`Filled '${value}' into ${selector}`);
            return true;
        } else {
            const errorMsg = `Cannot fill value: Element not found for selector: ${selector}`;
            sendError(errorMsg, errorMessagesList);
            return false;
        }
    } catch (e) {
        const errorMsg = `Exception filling value for ${selector}: ${e.message}`;
        sendError(errorMsg, errorMessagesList);
        console.error(errorMsg, e);
        return false;
    }
}

async function clickElement(selector, errorMessagesList) {
    sendProgress(`Attempting to click element: ${selector}`);
    try {
        const element = await waitForElement(selector);
        if (element) {
            element.click();
            sendProgress(`Clicked element: ${selector}`);
            return true;
        } else {
            const errorMsg = `Cannot click: Element not found for selector: ${selector}`;
            sendError(errorMsg, errorMessagesList);
            return false;
        }
    } catch (e) {
        const errorMsg = `Exception clicking element ${selector}: ${e.message}`;
        sendError(errorMsg, errorMessagesList);
        console.error(errorMsg, e);
        return false;
    }
}

async function selectDropdownByText(selector, text, errorMessagesList) {
    if (!text) {
        sendProgress(`Skipping select for ${selector} as text is empty.`);
        return false;
    }
    sendProgress(`Attempting to select option '${text}' in dropdown: ${selector}`);
    try {
        const selectElement = await waitForElement(selector);
        if (selectElement) {
            let optionFound = false;
            for (let i = 0; i < selectElement.options.length; i++) {
                if (selectElement.options[i].text.trim().toLowerCase() === text.trim().toLowerCase()) {
                    selectElement.selectedIndex = i;
                    optionFound = true;
                    break;
                }
            }
            if (optionFound) {
                selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                sendProgress(`Selected option '${text}' in ${selector}`);
                return true;
            } else {
                const errorMsg = `Option '${text}' not found in dropdown ${selector}`;
                sendError(errorMsg, errorMessagesList);
                return false;
            }
        } else {
            const errorMsg = `Cannot select: Dropdown element not found for selector: ${selector}`;
            sendError(errorMsg, errorMessagesList);
            return false;
        }
    } catch (e) {
        const errorMsg = `Exception selecting in dropdown ${selector}: ${e.message}`;
        sendError(errorMsg, errorMessagesList);
        console.error(errorMsg, e);
        return false;
    }
}


// --- Placeholder Import Functions ---
// Modified to pass errorMessagesList to DOM helpers and to return success/failure consistently
async function createOrNavigateToTrip(tripDetails, errorMessagesList) { // errorMessagesList is passed from handleImport
    sendProgress(`Processing trip: ${tripDetails.name}`); // Note: The subtask uses tripDetails.tripName, popup.js sends tripDetails.name

    // Placeholder selectors - THESE MUST BE REPLACED WITH ACTUAL SELECTORS FROM TRIPIT.COM
    const addTripButtonSelectors = ["#add-trip-button", ".new-trip-link", "button[data-action='create-trip']"]; // Try multiple common selectors
    const tripNameFieldSelector = "#tripNameInput"; // e.g., <input type="text" id="tripNameInput">
    const tripDestinationFieldSelector = "#tripDestinationInput"; // e.g., <input type="text" id="tripDestinationInput">
    const tripStartDateFieldSelector = "#tripStartDateInput"; // e.g., <input type="date" id="tripStartDateInput">
    const tripEndDateFieldSelector = "#tripEndDateInput"; // e.g., <input type="date" id="tripEndDateInput">
    const saveTripButtonSelector = "#saveTripButton"; // e.g., <button id="saveTripButton">Save Trip</button>
    const tripPageConfirmationElementSelector = ".trip-header-name"; // An element that appears once a trip page is loaded, showing the trip name.
    // const existingTripLinkSelector = `a[data-trip-name='${tripDetails.name}']`; // Adjusted to tripDetails.name

    try {
        sendProgress("Checking if on TripIt dashboard or a page where a trip can be added...");
        // TODO: User might need to add logic here to navigate to a specific starting page if not already there.

        sendProgress("Looking for 'Add Trip' button...");
        let addTripButtonClicked = false;
        for (const selector of addTripButtonSelectors) {
            if (await clickElement(selector, errorMessagesList)) { // clickElement already includes waitForElement
                addTripButtonClicked = true;
                sendProgress(`'Add Trip' button clicked using selector: ${selector}. Waiting for trip creation form...`);
                break;
            }
        }

        if (!addTripButtonClicked) {
            const errorMsg = "Could not find and click 'Add Trip' button on the page. Please ensure you are on the main trips page or dashboard.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, tripId: null, error: errorMsg };
        }

        // Wait for form to appear by checking for the first field
        if (!await waitForElement(tripNameFieldSelector, 5000)) {
            const errorMsg = "Trip creation form did not appear after clicking 'Add Trip'.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, tripId: null, error: errorMsg };
        }

        sendProgress("Filling trip name...");
        if (!await fillValue(tripNameFieldSelector, tripDetails.name, errorMessagesList)) { // Using tripDetails.name
             return { success: false, tripId: null, error: `Failed to fill trip name.` };
        }

        sendProgress("Filling trip destination...");
        if (!await fillValue(tripDestinationFieldSelector, tripDetails.destination, errorMessagesList)) {
            return { success: false, tripId: null, error: `Failed to fill trip destination.` };
        }

        sendProgress("Filling trip start date...");
        if (!await fillValue(tripStartDateFieldSelector, tripDetails.startDate, errorMessagesList)) {
            return { success: false, tripId: null, error: `Failed to fill trip start date.` };
        }

        sendProgress("Filling trip end date...");
        if (!await fillValue(tripEndDateFieldSelector, tripDetails.endDate, errorMessagesList)) {
            return { success: false, tripId: null, error: `Failed to fill trip end date.` };
        }

        sendProgress("Clicking 'Save Trip' button...");
        if (!await clickElement(saveTripButtonSelector, errorMessagesList)) {
            return { success: false, tripId: null, error: `Failed to click 'Save Trip' button.` };
        }

        sendProgress("Waiting for trip creation confirmation...");
        const confirmationElement = await waitForElement(tripPageConfirmationElementSelector, 10000);

        if (confirmationElement) {
            sendProgress(`Trip '${tripDetails.name}' processed successfully. Confirmation element found.`);
            return { success: true, tripId: window.location.href, error: null }; // Placeholder for actual trip context/URL
        } else {
            const errorMsg = "Failed to confirm trip creation. Page may not have loaded as expected or confirmation element not found.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, tripId: null, error: errorMsg };
        }

    } catch (error) {
        console.error("Error in createOrNavigateToTrip:", error);
        const errorMsg = `Error creating trip: ${error.message}`;
        sendError(errorMsg, errorMessagesList);
        return { success: false, tripId: null, error: errorMsg };
    }
}

async function addFlightToTrip(flightData, tripContext, errorMessagesList) { // Added tripContext, errorMessagesList
    sendProgress(`Processing flight: ${flightData.airline} ${flightData.flightNumber}`); // Used flightData.airline from popup

    // Placeholder selectors - THESE MUST BE REPLACED WITH ACTUAL SELECTORS FROM TRIPIT.COM
    const addFlightButtonSelectors = [".add-flight-button", "button[data-action='add-flight']", "#add-new-flight-link"];
    const airlineFieldSelector = "input[name='airlineName']"; 
    const flightNumberFieldSelector = "input[name='flightNumber']";
    const depCityFieldSelector = "input[name='departureCity']";
    const depDateFieldSelector = "input[name='departureDate']";
    const depTimeFieldSelector = "input[name='departureTime']";
    const arrCityFieldSelector = "input[name='arrivalCity']";
    const arrDateFieldSelector = "input[name='arrivalDate']";
    const arrTimeFieldSelector = "input[name='arrivalTime']";
    const saveFlightButtonSelector = "button.save-flight-button"; 
    const flightConfirmationElementSelector = ".flight-confirmation-message";

    try {
        sendProgress(`Ensuring we are in the correct trip context: ${tripContext}`);
        // TODO: Add logic to navigate if tripContext is a URL, or scope selectors.
        // For now, assume we are on the correct trip page.

        sendProgress("Looking for 'Add Flight' button...");
        let addFlightButton = null;
        let clickedSelector = null; // To store which selector worked for clickElement
        for (const selector of addFlightButtonSelectors) {
            addFlightButton = await waitForElement(selector, 2000); 
            if (addFlightButton) {
                clickedSelector = selector;
                break;
            }
        }

        if (!addFlightButton || !clickedSelector) {
            const errorMsg = "Could not find 'Add Flight' button on the trip page.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }
        
        // Use the selector that was found by waitForElement for clickElement
        if (!await clickElement(clickedSelector, errorMessagesList)) {
             // clickElement already sends an error if it fails
            return { success: false, error: "Failed to click 'Add Flight' button." };
        }
        sendProgress("'Add Flight' button clicked. Waiting for flight form...");

        if (!await waitForElement(airlineFieldSelector, 5000)) {
             const errorMsg = "Flight form did not appear after clicking 'Add Flight'.";
             sendError(errorMsg, errorMessagesList);
             return { success: false, error: errorMsg };
        }

        sendProgress("Filling flight details...");
        // Using flightData.airline (from popup) instead of flightData.flightAirline
        if (!await fillValue(airlineFieldSelector, flightData.airline, errorMessagesList)) return { success: false, error: "Failed to fill airline."};
        if (!await fillValue(flightNumberFieldSelector, flightData.flightNumber, errorMessagesList)) return { success: false, error: "Failed to fill flight number."};
        if (!await fillValue(depCityFieldSelector, flightData.depCity, errorMessagesList)) return { success: false, error: "Failed to fill departure city."};
        if (!await fillValue(depDateFieldSelector, flightData.depDate, errorMessagesList)) return { success: false, error: "Failed to fill departure date."};
        if (!await fillValue(depTimeFieldSelector, flightData.depTime, errorMessagesList)) return { success: false, error: "Failed to fill departure time."};
        if (!await fillValue(arrCityFieldSelector, flightData.arrCity, errorMessagesList)) return { success: false, error: "Failed to fill arrival city."};
        if (!await fillValue(arrDateFieldSelector, flightData.arrDate, errorMessagesList)) return { success: false, error: "Failed to fill arrival date."};
        if (!await fillValue(arrTimeFieldSelector, flightData.arrTime, errorMessagesList)) return { success: false, error: "Failed to fill arrival time."};

        sendProgress("Clicking 'Save Flight' button...");
        if (!await clickElement(saveFlightButtonSelector, errorMessagesList)) {
            return { success: false, error: "Failed to click 'Save Flight' button."};
        }

        sendProgress("Waiting for flight addition confirmation...");
        const confirmationElement = await waitForElement(flightConfirmationElementSelector, 10000);

        if (confirmationElement) {
            sendProgress(`Flight ${flightData.airline} ${flightData.flightNumber} added successfully.`);
            return { success: true, error: null };
        } else {
            const errorMsg = "Failed to confirm flight addition. Confirmation element not found.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }

    } catch (error) {
        console.error("Error in addFlightToTrip:", error);
        const errorMsg = `Error adding flight: ${error.message}`;
        sendError(errorMsg, errorMessagesList);
        return { success: false, error: errorMsg };
    }
}

async function addHotelToTrip(hotelData, tripContext, errorMessagesList) { // Added errorMessagesList
    sendProgress(`Processing hotel: ${hotelData.name}`); // Changed from hotelData.hotelName

    // Placeholder selectors - THESE MUST BE REPLACED WITH ACTUAL SELECTORS FROM TRIPIT.COM
    const addHotelButtonSelectors = [".add-hotel-button", "button[data-action='add-hotel']", "#add-new-hotel-link"]; // Within trip context
    const hotelNameFieldSelector = "input[name='hotelName']";
    const hotelCityFieldSelector = "input[name='hotelCity']"; // Or a more complex location lookup field
    const checkinDateFieldSelector = "input[name='checkinDate']";
    const checkoutDateFieldSelector = "input[name='checkoutDate']";
    // Add selectors for other relevant fields like address, confirmation number, etc., if TripIt has them.
    const saveHotelButtonSelector = "button.save-hotel-button";
    const hotelConfirmationElementSelector = ".hotel-confirmation-message"; // Or an element in the hotel list

    try {
        sendProgress(`Ensuring we are in the correct trip context for adding a hotel: ${tripContext}`);
        // TODO: User might need to add logic here to navigate if tripContext is a URL,
        // or to scope selectors if tripContext is a parent element selector.
        // For now, assume we are on the correct trip page where an "Add Hotel" button can be found.

        sendProgress("Looking for 'Add Hotel' button...");
        let addHotelButton = null;
        let clickedSelector = null; // To store which selector worked
        for (const selector of addHotelButtonSelectors) {
            addHotelButton = await waitForElement(selector, 2000);
            if (addHotelButton) {
                clickedSelector = selector; // Store the selector that worked
                break;
            }
        }

        if (!addHotelButton || !clickedSelector) { // Check clickedSelector too
            const errorMsg = "Could not find 'Add Hotel' button on the trip page.";
            sendError(errorMsg, errorMessagesList); // Pass errorMessagesList
            return { success: false, error: errorMsg };
        }
        // Use the selector that was found to click the element
        if (!await clickElement(clickedSelector, errorMessagesList)) { // Pass errorMessagesList
             // clickElement already sends an error if it fails and adds to list if errorMessagesList is passed
            return { success: false, error: "Failed to click 'Add Hotel' button." };
        }
        sendProgress("'Add Hotel' button clicked. Waiting for hotel form...");

        // Wait for the first field of the hotel form to appear
        if (!await waitForElement(hotelNameFieldSelector, 5000)) {
            const errorMsg = "Hotel form did not appear after clicking 'Add Hotel'.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }

        sendProgress("Filling hotel details...");
        // Using hotelData.name from popup.js, not hotelData.hotelName
        if (!await fillValue(hotelNameFieldSelector, hotelData.name, errorMessagesList)) return { success: false, error: "Failed to fill hotel name."};
        if (!await fillValue(hotelCityFieldSelector, hotelData.city, errorMessagesList)) return { success: false, error: "Failed to fill hotel city."}; 
        if (!await fillValue(checkinDateFieldSelector, hotelData.checkinDate, errorMessagesList)) return { success: false, error: "Failed to fill check-in date."};
        if (!await fillValue(checkoutDateFieldSelector, hotelData.checkoutDate, errorMessagesList)) return { success: false, error: "Failed to fill check-out date."};
        // Fill other hotel fields (address, phone, confirmation #) if selectors are identified

        sendProgress("Clicking 'Save Hotel' button...");
        if (!await clickElement(saveHotelButtonSelector, errorMessagesList)) { // Pass errorMessagesList
            return { success: false, error: "Failed to click 'Save Hotel' button."};
        }

        sendProgress("Waiting for hotel addition confirmation...");
        const confirmationElement = await waitForElement(hotelConfirmationElementSelector, 10000);

        if (confirmationElement) {
            sendProgress(`Hotel '${hotelData.name}' added successfully.`); // Using hotelData.name
            return { success: true, error: null };
        } else {
            const errorMsg = "Failed to confirm hotel addition. Confirmation element not found.";
            sendError(errorMsg, errorMessagesList); // Pass errorMessagesList
            return { success: false, error: errorMsg };
        }

    } catch (error) {
        console.error("Error in addHotelToTrip:", error);
        const errorMsg = `Error adding hotel: ${error.message}`; // More specific error message
        sendError(errorMsg, errorMessagesList); // Pass errorMessagesList
        return { success: false, error: errorMsg }; // Return the specific error message
    }
}

async function addTransportationToTrip(transportData, tripContext, errorMessagesList) {
    sendProgress(`Processing transportation: ${transportData.transportType} - ${transportData.transportVendor}`);

    // Placeholder selectors - THESE MUST BE REPLACED WITH ACTUAL SELECTORS FROM TRIPIT.COM
    // These will likely vary significantly based on the transportType selected by the user.
    // For now, we'll use generic names and assume a common "Add Transportation" button.
    const addTransportButtonSelectors = [".add-transport-button", "button[data-action='add-transport']", "#add-new-transport-link"];
    
    // Generic fields (TripIt might have different forms for Car Rental vs. Train vs. Taxi)
    const transportTypeDropdownSelector = "select[name='transportType']"; // e.g., a dropdown to pick Car, Train, etc.
    const vendorFieldSelector = "input[name='transportVendor']";
    const startLocationFieldSelector = "input[name='transportStartLocation']";
    const startDateFieldSelector = "input[name='transportStartDate']";
    const startTimeFieldSelector = "input[name='transportStartTime']";
    const endLocationFieldSelector = "input[name='transportEndLocation']";
    const endDateFieldSelector = "input[name='transportEndDate']";
    const endTimeFieldSelector = "input[name='transportEndTime']";
    // Specific fields might exist, e.g., confirmation number, booking reference
    const confirmationNumberFieldSelector = "input[name='transportConfirmationNumber']"; 
    const saveTransportButtonSelector = "button.save-transport-button";
    const transportConfirmationElementSelector = ".transport-confirmation-message";

    try {
        sendProgress(`Ensuring we are in the correct trip context for adding transportation: ${tripContext}`);
        // TODO: User might need to add logic here for navigation or scoping selectors.

        sendProgress("Looking for 'Add Transportation' button...");
        let addTransportButton = null;
        let clickedSelector = null; // To store which selector worked
        for (const selector of addTransportButtonSelectors) {
            addTransportButton = await waitForElement(selector, 2000);
            if (addTransportButton) {
                clickedSelector = selector;
                break;
            }
        }

        if (!addTransportButton || !clickedSelector) {
            const errorMsg = "Could not find 'Add Transportation' button on the trip page.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }
        // Pass clickedSelector to clickElement
        if (!await clickElement(clickedSelector, errorMessagesList)) {
            // error is already sent by clickElement if it fails
            return { success: false, error: "Failed to click 'Add Transportation' button." };
        }
        sendProgress("'Add Transportation' button clicked. Waiting for transportation form...");

        // Wait for a common field in the transportation form to appear
        if (!await waitForElement(transportTypeDropdownSelector, 5000)) {
            const errorMsg = "Transportation form (type dropdown) did not appear after clicking 'Add Transportation'.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }
        // OR, if TripIt has separate "Add Car", "Add Train" buttons, the logic would be different here.
        // This template assumes a generic "Add Transportation" flow where type is selected first.

        sendProgress(`Selecting transportation type: ${transportData.transportType}`); // Changed to transportData.transportType
        // Assuming transportData.type is what comes from popup.js for the select value
        if (!await selectDropdownByText(transportTypeDropdownSelector, transportData.type, errorMessagesList)) {
            return { success: false, error: `Failed to select transportation type ${transportData.type}.`};
        }
        // Depending on TripIt's site, selecting the type might dynamically load different form fields.
        // May need to add a short pause or wait for a specific field related to the type chosen.
        await new Promise(r => setTimeout(r, 500)); // Small pause for dynamic form changes

        sendProgress("Filling transportation details...");
        // Using transportData.vendor from popup.js
        if (!await fillValue(vendorFieldSelector, transportData.vendor, errorMessagesList)) return { success: false, error: "Failed to fill vendor."};
        if (!await fillValue(startLocationFieldSelector, transportData.startLoc, errorMessagesList)) return { success: false, error: "Failed to fill start location."};
        if (!await fillValue(startDateFieldSelector, transportData.startDate, errorMessagesList)) return { success: false, error: "Failed to fill start date."};
        if (!await fillValue(startTimeFieldSelector, transportData.startTime, errorMessagesList)) return { success: false, error: "Failed to fill start time."};
        if (!await fillValue(endLocationFieldSelector, transportData.endLoc, errorMessagesList)) return { success: false, error: "Failed to fill end location."};
        if (!await fillValue(endDateFieldSelector, transportData.endDate, errorMessagesList)) return { success: false, error: "Failed to fill end date."};
        if (!await fillValue(endTimeFieldSelector, transportData.endTime, errorMessagesList)) return { success: false, error: "Failed to fill end time."};
        
        // Example of filling a conditional field (e.g., confirmation number)
        if (transportData.confirmationNumber) { // Assuming popup.js might add this field
             if(!await fillValue(confirmationNumberFieldSelector, transportData.confirmationNumber, errorMessagesList)) {
                // Optionally return error or just log if it's not critical
                sendProgress("Note: Could not fill confirmation number, field might not be available for this transport type.");
             }
        }

        sendProgress("Clicking 'Save Transportation' button...");
        if (!await clickElement(saveTransportButtonSelector, errorMessagesList)) {
            return { success: false, error: "Failed to click 'Save Transportation' button."};
        }

        sendProgress("Waiting for transportation addition confirmation...");
        const confirmationElement = await waitForElement(transportConfirmationElementSelector, 10000);

        if (confirmationElement) {
            // Using transportData.type and transportData.vendor from popup.js
            sendProgress(`Transportation '${transportData.type} - ${transportData.vendor}' added successfully.`);
            return { success: true, error: null };
        } else {
            const errorMsg = "Failed to confirm transportation addition. Confirmation element not found.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }

    } catch (error) {
        console.error("Error in addTransportationToTrip:", error);
        const errorMsg = `Error adding transportation: ${error.message}`;
        sendError(errorMsg, errorMessagesList);
        return { success: false, error: errorMsg }; // Return the specific error message
    }
}

async function addActivityToTrip(activityData, tripContext, errorMessagesList) {
    sendProgress(`Processing activity: ${activityData.name}`); // Changed from activityData.activityName

    // Placeholder selectors - THESE MUST BE REPLACED WITH ACTUAL SELECTORS FROM TRIPIT.COM
    // TripIt might have a specific "Add Activity", "Add Event", or a more generic "Add Note/Other" button.
    const addActivityButtonSelectors = [
        ".add-activity-button", 
        "button[data-action='add-activity']", 
        "#add-new-event-link",
        ".add-note-button" // Fallback if no specific activity button
    ];
    
    // Fields might be generic if activities are like "notes" or "other segments"
    const activityNameFieldSelector = "input[name='activityName'], textarea[name='activityDescription']"; // Could be a title or a description field
    const activityLocationFieldSelector = "input[name='activityLocation']";
    const activityDateFieldSelector = "input[name='activityDate']";
    const activityTimeFieldSelector = "input[name='activityTime']";
    // TripIt might not have a dedicated "cost" field for generic activities/notes.
    // If it does, add selector: const activityCostFieldSelector = "input[name='activityCost']";
    
    const saveActivityButtonSelector = "button.save-activity-button, button.save-note-button";
    const activityConfirmationElementSelector = ".activity-confirmation-message, .note-added-confirmation"; // Or an element appearing in a list of activities/notes

    try {
        sendProgress(`Ensuring we are in the correct trip context for adding an activity: ${tripContext}`);
        // TODO: User might need to add logic here for navigation or scoping selectors.

        sendProgress("Looking for 'Add Activity/Note' button...");
        let addButton = null;
        let clickedSelector = null; // To store which selector worked
        for (const selector of addActivityButtonSelectors) {
            addButton = await waitForElement(selector, 2000);
            if (addButton) {
                clickedSelector = selector; // Store the selector that worked
                break;
            }
        }

        if (!addButton || !clickedSelector) { // Check clickedSelector too
            const errorMsg = "Could not find 'Add Activity/Note' button on the trip page.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }
        
        // Use the selector that was found by waitForElement for clickElement
        if (!await clickElement(clickedSelector, errorMessagesList)) {
             // clickElement already sends an error if it fails
            return { success: false, error: "Failed to click 'Add Activity/Note' button." };
        }
        sendProgress("'Add Activity/Note' button clicked. Waiting for form...");

        // Wait for a common field in the form to appear
        // Use the combined selector for activityNameFieldSelector to wait for either input or textarea
        const formAppeared = await waitForElement(activityNameFieldSelector.split(',')[0].trim(), 5000) || // try first part
                             await waitForElement(activityNameFieldSelector.split(',')[1]?.trim(), 100);   // then second part if exists
        
        if (!formAppeared) {
            const errorMsg = "Activity/Note form did not appear after clicking the add button.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }


        sendProgress("Filling activity details...");
        // Using activityData.name from popup.js
        if (!await fillValue(activityNameFieldSelector, activityData.name, errorMessagesList)) return { success: false, error: "Failed to fill activity name/description."};
        
        // Optional fields, check if data exists and element is found
        if (activityData.location) { // Data from popup uses activityData.location
            if (!await fillValue(activityLocationFieldSelector, activityData.location, errorMessagesList)) {
                 sendProgress("Note: Could not fill activity location, field might not be available or data missing.");
            }
        }
        if (activityData.date) { // Data from popup uses activityData.date
            if (!await fillValue(activityDateFieldSelector, activityData.date, errorMessagesList)) {
                sendProgress("Note: Could not fill activity date, field might not be available or data missing.");
            }
        }
        if (activityData.time) { // Data from popup uses activityData.time
             if (!await fillValue(activityTimeFieldSelector, activityData.time, errorMessagesList)) {
                sendProgress("Note: Could not fill activity time, field might not be available or data missing.");
            }
        }
        // If activityCostFieldSelector is defined and activityData.cost exists from popup:
        // if (activityData.cost) {
        //    if(!await fillValue(activityCostFieldSelector, activityData.cost, errorMessagesList)) {
        //        sendProgress("Note: Could not fill activity cost, field might not be available or data missing.");
        //    }
        // }


        sendProgress("Clicking 'Save Activity/Note' button...");
        if (!await clickElement(saveActivityButtonSelector, errorMessagesList)) {
            return { success: false, error: "Failed to click 'Save Activity/Note' button."};
        }

        sendProgress("Waiting for activity/note addition confirmation...");
        const confirmationElement = await waitForElement(activityConfirmationElementSelector, 10000);

        if (confirmationElement) {
            sendProgress(`Activity '${activityData.name}' added successfully.`);
            return { success: true, error: null };
        } else {
            const errorMsg = "Failed to confirm activity/note addition. Confirmation element not found.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }

    } catch (error) {
        console.error("Error in addActivityToTrip:", error);
        const errorMsg = `Error adding activity: ${error.message}`;
        sendError(errorMsg, errorMessagesList);
        return { success: false, error: errorMsg };
    }
}

async function addTodoToTrip(todoData, tripContext, errorMessagesList) {
    sendProgress(`Processing TODO/Note: ${todoData.description}`); // Changed from todoData.todoDescription

    // Placeholder selectors - THESE MUST BE REPLACED WITH ACTUAL SELECTORS FROM TRIPIT.COM
    // Likely similar to adding an activity or a general note.
    const addNoteButtonSelectors = [
        ".add-note-button", 
        "button[data-action='add-note']", 
        "#add-new-note-link",
        ".add-text-button" // General "add text" type button
    ];
    
    const noteDescriptionFieldSelector = "textarea[name='noteDescription'], textarea[name='textEntry']"; // A textarea is common for notes/todos
    const noteDateFieldSelector = "input[name='noteDate']"; // Optional date field
    // TripIt might not have a specific "location" field for general notes/todos.
    // const noteLocationFieldSelector = "input[name='noteLocation']"; 
    
    const saveNoteButtonSelector = "button.save-note-button, button.submit-text-entry";
    const noteConfirmationElementSelector = ".note-added-confirmation, .text-entry-saved"; // Element confirming note/text addition

    try {
        sendProgress(`Ensuring we are in the correct trip context for adding a TODO/Note: ${tripContext}`);
        // TODO: User might need to add logic here for navigation or scoping selectors.

        sendProgress("Looking for 'Add Note/Text' button...");
        let addButton = null;
        let clickedSelector = null; // To store which selector worked
        for (const selector of addNoteButtonSelectors) {
            addButton = await waitForElement(selector, 2000);
            if (addButton) {
                clickedSelector = selector; // Store the selector that worked
                break;
            }
        }

        if (!addButton || !clickedSelector) { // Check clickedSelector too
            const errorMsg = "Could not find 'Add Note/Text' button on the trip page.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }
        
        // Use the selector that was found by waitForElement for clickElement
        if (!await clickElement(clickedSelector, errorMessagesList)) {
             // clickElement already sends an error if it fails
            return { success: false, error: "Failed to click 'Add Note/Text' button." };
        }
        sendProgress("'Add Note/Text' button clicked. Waiting for form...");

        // Wait for the description field to appear
        // Use the combined selector for noteDescriptionFieldSelector
        const formAppeared = await waitForElement(noteDescriptionFieldSelector.split(',')[0].trim(), 5000) ||
                             await waitForElement(noteDescriptionFieldSelector.split(',')[1]?.trim(), 100);

        if (!formAppeared) {
            const errorMsg = "Note/TODO form (description field) did not appear after clicking the add button.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }

        sendProgress("Filling TODO/Note details...");
        // Using todoData.description from popup.js
        if (!await fillValue(noteDescriptionFieldSelector, todoData.description, errorMessagesList)) {
             return { success: false, error: "Failed to fill TODO/Note description."};
        }
        
        // Optional fields
        if (todoData.date) { // Data from popup uses todoData.date
            // Check if the date field selector even exists on the form before trying to fill
            const dateFieldExists = await waitForElement(noteDateFieldSelector, 500); // Short timeout, just to check
            if (dateFieldExists) { 
                if(!await fillValue(noteDateFieldSelector, todoData.date, errorMessagesList)) {
                    sendProgress("Note: Could not fill TODO/Note date, but continuing.");
                }
            } else {
                sendProgress("Note: Date field for TODOs/Notes not found on TripIt's form, skipping date.");
            }
        }
        // If a location field selector for notes was identified and todoData.location exists from popup:
        // if (todoData.location) {
        //    const locationFieldExists = await waitForElement(noteLocationFieldSelector, 500);
        //    if (locationFieldExists) {
        //        if(!await fillValue(noteLocationFieldSelector, todoData.location, errorMessagesList)) {
        //            sendProgress("Note: Could not fill TODO/Note location, but continuing.");
        //        }
        //    } else {
        //        sendProgress("Note: Location field for TODOs/Notes not found, skipping location.");
        //    }
        // }


        sendProgress("Clicking 'Save Note/Text' button...");
        if (!await clickElement(saveNoteButtonSelector, errorMessagesList)) {
            return { success: false, error: "Failed to click 'Save Note/Text' button."};
        }

        sendProgress("Waiting for TODO/Note addition confirmation...");
        const confirmationElement = await waitForElement(noteConfirmationElementSelector, 10000);

        if (confirmationElement) {
            sendProgress(`TODO/Note '${todoData.description}' added successfully.`);
            return { success: true, error: null };
        } else {
            const errorMsg = "Failed to confirm TODO/Note addition. Confirmation element not found.";
            sendError(errorMsg, errorMessagesList);
            return { success: false, error: errorMsg };
        }

    } catch (error) {
        console.error("Error in addTodoToTrip:", error);
        const errorMsg = `Error adding TODO/Note: ${error.message}`;
        sendError(errorMsg, errorMessagesList);
        return { success: false, error: errorMsg }; // Return specific error
    }
}

// --- Main Import Orchestration ---
async function handleImport(travelData) {
  const summary = { total: 0, successful: 0, failed: 0 };
  const errorMessages = [];

  try {
    sendProgress("Import process started by content script.");

    summary.total++; // For the main trip itself
    const tripResult = await createOrNavigateToTrip(travelData.tripDetails, errorMessages);
    if (!tripResult.success) {
      summary.failed++;
      // errorMessages.push(tripResult.error); // createOrNavigateToTrip's sendError already adds
      sendCompletion(false, summary, errorMessages);
      return;
    }
    summary.successful++;
    sendProgress(`Main trip processed. Current URL/ID: ${tripResult.tripId}`);

    const processItems = async (items, itemType, addItemFunction, currentTripContext) => { // Added currentTripContext
        if (items && items.length > 0) {
            sendProgress(`Starting to import ${items.length} ${itemType}(s).`);
            for (let i = 0; i < items.length; i++) {
                summary.total++;
                const item = items[i];
                const itemDescription = item.airline || item.name || item.type || item.description || `item ${i+1}`;
                sendProgress(`Importing ${itemType} ${i + 1} of ${items.length}: ${itemDescription}`);
                // Pass currentTripContext and errorMessages to the addItemFunction
                const itemResult = await addItemFunction(item, currentTripContext, errorMessages); 
                if (!itemResult.success) {
                    summary.failed++;
                    const specificError = itemResult.error || `Failed to add ${itemType} ${i + 1} (${itemDescription}). Skipping.`;
                    errorMessages.push(specificError); // Add error to the list
                    sendError(specificError); // Also send immediate feedback
                } else {
                    summary.successful++;
                    sendProgress(`Successfully added ${itemType} ${i + 1}.`);
                }
            }
        }
    };

    await processItems(travelData.flights, "flight", addFlightToTrip, tripResult.tripId);
    await processItems(travelData.hotels, "hotel", addHotelToTrip, tripResult.tripId);
    await processItems(travelData.transportation, "transportation", addTransportationToTrip, tripResult.tripId);
    await processItems(travelData.activities, "activity", addActivityToTrip, tripResult.tripId);
    await processItems(travelData.todos, "note/TODO", addTodoToTrip, tripResult.tripId);

    const overallSuccess = summary.failed === 0;
    sendCompletion(overallSuccess, summary, errorMessages);

  } catch (error) {
    console.error("Unhandled error during import process:", error);
    const unhandledErrorMsg = `An unexpected error occurred during import: ${error.message}`;
    errorMessages.push(unhandledErrorMsg);
    summary.failed++; // Assume the current item or overall process failed
    summary.total = Math.max(summary.total, summary.successful + summary.failed); // Ensure total isn't less
    sendError(unhandledErrorMsg); // Send this specific error
    sendCompletion(false, summary, errorMessages);
  }
}

// --- Message Listener from background.js ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXECUTE_IMPORT") {
    console.log("Content Script: Received EXECUTE_IMPORT with data:", message.data);
    sendResponse({ success: true, message: "EXECUTE_IMPORT received by content script. Starting process." });
    handleImport(message.data); 
    return true; 
  }
});
