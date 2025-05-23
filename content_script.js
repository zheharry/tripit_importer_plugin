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
async function waitForElement(selector, timeout = 1000) { 
  sendProgress(`Waiting for element: ${selector} (timeout: ${timeout}ms)`);
  return new Promise(resolve => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        sendProgress(`Element found: ${selector}`);
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        console.warn(`waitForElement: Timeout! Element not found: ${selector}`);
        sendProgress(`Element NOT found after ${timeout}ms: ${selector}`);
        resolve(null); 
      }
    }, 100); 
  });
}

async function fillValue(selector, value, errorMessagesList) {
  sendProgress(`Attempting to fill value in "${selector}" with "${value}"`);
  const element = await waitForElement(selector);
  if (element) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    sendProgress(`Value filled for ${selector}.`);
    return true;
  } else {
    sendError(`Element not found for fillValue: ${selector}`, errorMessagesList);
    return false;
  }
}

async function clickElement(selector, errorMessagesList) {
  sendProgress(`Attempting to click element: ${selector}`);
  const element = await waitForElement(selector);
  if (element) {
    element.click();
    sendProgress(`Clicked element: ${selector}.`);
    return true;
  } else {
    sendError(`Element not found for clickElement: ${selector}`, errorMessagesList);
    return false;
  }
}

async function selectDropdownByText(selector, text, errorMessagesList) {
    sendProgress(`Attempting to select in dropdown "${selector}" by text: "${text}"`);
    const selectElement = await waitForElement(selector);
    if (selectElement) {
        const option = Array.from(selectElement.options).find(opt => opt.text.toLowerCase().includes(text.toLowerCase()));
        if (option) {
            selectElement.value = option.value;
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            sendProgress(`Selected "${text}" in dropdown ${selector}.`);
            return true;
        } else {
            sendError(`Option "${text}" not found in dropdown ${selector}.`, errorMessagesList);
            return false;
        }
    } else {
        sendError(`Dropdown element not found: ${selector}.`, errorMessagesList);
        return false;
    }
}


// --- Placeholder Import Functions ---
// Modified to pass errorMessagesList to DOM helpers and to return success/failure consistently
async function createOrNavigateToTrip(tripDetails, errorMessagesList) {
  sendProgress(`Processing trip: ${tripDetails.name}`);
  await new Promise(r => setTimeout(r, 200)); 
  if (tripDetails.name.toLowerCase().includes("fail")) { 
      const errorMsg = "Simulated failure creating trip: " + tripDetails.name;
      sendError(errorMsg, errorMessagesList); // sendError now adds to the list
      return { success: false, tripId: null, error: errorMsg };
  }
  sendProgress(`Successfully processed trip: ${tripDetails.name}.`);
  return { success: true, tripId: "MOCK_TRIP_URL_OR_ID_FOR_" + tripDetails.name.replace(/\s+/g, '_'), error: null };
}

async function addFlightToTrip(flightData, errorMessagesList) {
  sendProgress(`Adding flight: ${flightData.airline || 'N/A'} ${flightData.flightNumber || 'N/A'}`);
  await new Promise(r => setTimeout(r, 150)); 
  if (flightData.airline && flightData.airline.toLowerCase().includes("error")) {
      const errorMsg = `Simulated failure adding flight: ${flightData.airline} ${flightData.flightNumber}`;
      // No direct call to sendError here, the failure is reported by the return value
      // errorMessagesList.push(errorMsg); // The caller will handle adding to errorMessagesList
      return { success: false, error: errorMsg };
  }
  return { success: true, error: null };
}

async function addHotelToTrip(hotelData, errorMessagesList) {
  sendProgress(`Adding hotel: ${hotelData.name || 'N/A'}`);
  await new Promise(r => setTimeout(r, 150));
  return { success: true, error: null };
}

async function addTransportationToTrip(transportData, errorMessagesList) {
  sendProgress(`Adding transport: ${transportData.type || 'N/A'} - ${transportData.vendor || 'N/A'}`);
  await new Promise(r => setTimeout(r, 150));
  return { success: true, error: null };
}

async function addActivityToTrip(activityData, errorMessagesList) {
  sendProgress(`Adding activity: ${activityData.name || 'N/A'}`);
  await new Promise(r => setTimeout(r, 150));
  return { success: true, error: null };
}

async function addTodoToTrip(todoData, errorMessagesList) {
  sendProgress(`Adding note/TODO: ${todoData.description || 'N/A'}`);
  await new Promise(r => setTimeout(r, 150));
  return { success: true, error: null };
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

    const processItems = async (items, itemType, addItemFunction) => {
        if (items && items.length > 0) {
            sendProgress(`Starting to import ${items.length} ${itemType}(s).`);
            for (let i = 0; i < items.length; i++) {
                summary.total++;
                const item = items[i];
                const itemDescription = item.airline || item.name || item.type || item.description || `item ${i+1}`;
                sendProgress(`Importing ${itemType} ${i + 1} of ${items.length}: ${itemDescription}`);
                const itemResult = await addItemFunction(item, errorMessages);
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

    await processItems(travelData.flights, "flight", addFlightToTrip);
    await processItems(travelData.hotels, "hotel", addHotelToTrip);
    await processItems(travelData.transportation, "transportation", addTransportationToTrip);
    await processItems(travelData.activities, "activity", addActivityToTrip);
    await processItems(travelData.todos, "note/TODO", addTodoToTrip);

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
