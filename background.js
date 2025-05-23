// Background service worker for TripIt Direct Importer

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_IMPORT") {
    console.log("Background: Received START_IMPORT message with data:", message.data);

    chrome.tabs.query({ active: true, currentWindow: true, url: "*://www.tripit.com/*" }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Background: Error querying tabs:", chrome.runtime.lastError.message);
        // Send error back to popup
        chrome.runtime.sendMessage({
          type: "IMPORT_STATUS", // Could also be IMPORT_FINAL_RESULT if this is a terminal error for the attempt
          message: `Error finding TripIt tab: ${chrome.runtime.lastError.message}`,
          isError: true
        });
        return;
      }

      if (tabs.length === 0) {
        console.log("Background: No active TripIt.com tab found.");
        chrome.runtime.sendMessage({
          type: "IMPORT_STATUS", // Or IMPORT_FINAL_RESULT
          message: "Error: No active TripIt.com tab found. Please open TripIt, log in, and make sure the page is fully loaded.",
          isError: true
        });
        return;
      }

      const tripItTabId = tabs[0].id;
      console.log(`Background: Found TripIt tab with ID: ${tripItTabId}. Sending EXECUTE_IMPORT to content script.`);
      
      chrome.tabs.get(tripItTabId, (tab) => {
        if (chrome.runtime.lastError) {
            console.error("Background: Error getting tab details:", chrome.runtime.lastError.message);
            chrome.runtime.sendMessage({
              type: "IMPORT_STATUS", // Or IMPORT_FINAL_RESULT
              message: `Error accessing TripIt tab: ${chrome.runtime.lastError.message}`,
              isError: true
            });
            return;
        }

        if (tab.status === "complete") {
            chrome.tabs.sendMessage(tripItTabId, { type: "EXECUTE_IMPORT", data: message.data }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Background: Error sending EXECUTE_IMPORT to content script:", chrome.runtime.lastError.message);
                    chrome.runtime.sendMessage({
                        type: "IMPORT_STATUS", // Or IMPORT_FINAL_RESULT
                        message: "Error communicating with TripIt page. Ensure the page is fully loaded or try refreshing the TripIt tab. Details: " + chrome.runtime.lastError.message,
                        isError: true
                    });
                } else {
                    console.log("Background: Content script responded to EXECUTE_IMPORT:", response);
                     if (response && response.message) { // Immediate ack from content script
                        chrome.runtime.sendMessage({
                            type: "IMPORT_STATUS",
                            message: response.message,
                            isError: response.isError || false
                        });
                    }
                }
            });
        } else {
            console.log("Background: TripIt tab is not completely loaded. Status:", tab.status);
            chrome.runtime.sendMessage({
              type: "IMPORT_STATUS", // Or IMPORT_FINAL_RESULT
              message: "TripIt tab is still loading. Please wait for it to finish and try again.",
              isError: true
            });
        }
      });
    });
    return true; 
  } 
  else if (message.type === "CONTENT_SCRIPT_STATUS") {
    // Message comes from content_script.js for intermediate progress
    console.log("Background: Received CONTENT_SCRIPT_STATUS:", message);
    chrome.runtime.sendMessage({
      type: "IMPORT_STATUS", // Relay to popup.js with this type
      message: message.message,
      isError: message.isError
    });
  }
  else if (message.type === "IMPORT_COMPLETE") {
    // Message comes from content_script.js with detailed summary
    console.log("Background: Received IMPORT_COMPLETE from content script:", message);
    chrome.runtime.sendMessage({
      type: "IMPORT_FINAL_RESULT", // New type for popup.js
      success: message.success,
      summary: message.summary,
      errors: message.errors
    });
  }
  // If sendResponse is used, ensure it's called or return true for async.
  // For these relay messages, we are initiating new messages, not necessarily responding
  // to the sender of THIS message (content_script or popup).
});

console.log("TripIt Direct Importer background script loaded.");
