// Configuration variables
const CLIENT_ID = "YOUR_CLIENT_ID"; // Replace with your actual Concur Client ID
const CLIENT_SECRET = "YOUR_CLIENT_SECRET"; // Replace with your actual Concur Client Secret
const CONCUR_AUTH_URL = "https://us.api.concursolutions.com/oauth2/v0/authorize"; // Adjust if not US
const CONCUR_TOKEN_URL = "https://us.api.concursolutions.com/oauth2/v0/token"; // Adjust if not US
const CONCUR_API_BASE_URL = CONCUR_TOKEN_URL.substring(0, CONCUR_TOKEN_URL.indexOf("/oauth2/v0/token")); // e.g. https://us.api.concursolutions.com

// Function to Base64 encode CLIENT_ID:CLIENT_SECRET
function base64Encode(str) {
  return btoa(str);
}

// --- OAuth and Token Management ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "INITIATE_AUTH") {
    console.log("Authentication initiated...");
    const redirectUri = chrome.identity.getRedirectURL("oauth2"); // oauth2 is a placeholder, real one from manifest
    console.log("Redirect URI:", redirectUri);

    const manifest = chrome.runtime.getManifest();
    const scopes = manifest.oauth2.scopes;
    const scopeString = scopes.join(" ");

    // Use client_id from manifest's oauth2 section
    const oauthClientId = manifest.oauth2.client_id;
    // NOTE: The Concur CLIENT_ID for API calls (used in Authorization Basic header for token exchange)
    // might be different from the oauthClientId used in the auth URL for Chrome identity.
    // For this example, we'll assume CLIENT_ID is for the API token exchange.
    // If Concur's OAuth setup uses the same ID for both, then it's simpler.
    // The instructions imply CLIENT_ID and CLIENT_SECRET are for token exchange.

    let authUrl = `${CONCUR_AUTH_URL}?client_id=${oauthClientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopeString)}`;

    console.log("Constructed Auth URL:", authUrl);

    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, (redirectURL) => {
      if (chrome.runtime.lastError || !redirectURL) {
        console.error("Authentication failed:", chrome.runtime.lastError ? chrome.runtime.lastError.message : "No redirect URL received.");
        chrome.runtime.sendMessage({ type: "AUTH_FAILURE", error: chrome.runtime.lastError ? chrome.runtime.lastError.message : "User cancelled or an error occurred." });
        sendResponse({ success: false, error: chrome.runtime.lastError ? chrome.runtime.lastError.message : "User cancelled or an error occurred." });
        return;
      }

      console.log("Redirect URL received:", redirectURL);
      const url = new URL(redirectURL);
      const code = url.searchParams.get("code");

      if (!code) {
        console.error("Authorization code not found in redirect URL.");
        chrome.runtime.sendMessage({ type: "AUTH_FAILURE", error: "Authorization code not found." });
        sendResponse({ success: false, error: "Authorization code not found." });
        return;
      }

      console.log("Authorization code:", code);

      const tokenRequestBody = new URLSearchParams();
      tokenRequestBody.append("grant_type", "authorization_code");
      tokenRequestBody.append("code", code);
      tokenRequestBody.append("redirect_uri", redirectUri);
      // According to Concur docs, client_id and client_secret are also needed for this call.
      tokenRequestBody.append("client_id", CLIENT_ID);
      tokenRequestBody.append("client_secret", CLIENT_SECRET);


      fetch(CONCUR_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // "Authorization": "Basic " + base64Encode(CLIENT_ID + ":" + CLIENT_SECRET) // Some docs say this, others say include in body
        },
        body: tokenRequestBody.toString()
      })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log("Token exchange successful:", data);
        const { access_token, refresh_token, expires_in, geolocation } = data; // geolocation might be returned

        if (!access_token) {
            console.error("Access token not found in response.");
            chrome.runtime.sendMessage({ type: "AUTH_FAILURE", error: "Access token not found in response." });
            sendResponse({ success: false, error: "Access token not found." });
            return;
        }

        const tokenExpiresAt = Date.now() + (expires_in * 1000);
        chrome.storage.local.set({
          concurAccessToken: access_token,
          concurRefreshToken: refresh_token,
          tokenExpiresAt: tokenExpiresAt,
          concurApiServer: geolocation || CONCUR_API_BASE_URL // Store API server from token response if available
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error saving tokens to storage:", chrome.runtime.lastError.message);
            chrome.runtime.sendMessage({ type: "AUTH_FAILURE", error: "Failed to save tokens." });
            sendResponse({ success: false, error: "Failed to save tokens."});
          } else {
            console.log("Tokens stored successfully. API Server:", geolocation || CONCUR_API_BASE_URL);
            chrome.runtime.sendMessage({ type: "AUTH_SUCCESS" });
            sendResponse({ success: true });
          }
        });
      })
      .catch(error => {
        console.error("Error during token exchange:", error);
        chrome.runtime.sendMessage({ type: "AUTH_FAILURE", error: error.message || "Token exchange process failed." });
        sendResponse({ success: false, error: error.message });
      });
    });
    return true; // Indicates sendResponse will be called asynchronously
  }
  else if (message.type === "DISCONNECT_AUTH") {
    chrome.storage.local.remove(["concurAccessToken", "concurRefreshToken", "tokenExpiresAt", "concurApiServer"], () => {
        if (chrome.runtime.lastError) {
            console.error("Error removing tokens:", chrome.runtime.lastError.message);
            sendResponse({ success: false, error: "Failed to clear tokens." });
        } else {
            console.log("Tokens removed successfully.");
            chrome.runtime.sendMessage({ type: "AUTH_FAILURE", error: "User disconnected."}); // Effectively signs out
            sendResponse({ success: true });
        }
    });
    return true;
  }
  else if (message.type === "CHECK_AUTH_STATUS") {
    chrome.storage.local.get(["concurAccessToken", "tokenExpiresAt"], (result) => {
        if (chrome.runtime.lastError) {
            sendResponse({ isAuthenticated: false, message: "Error checking auth status." });
            return;
        }
        if (result.concurAccessToken && result.tokenExpiresAt && Date.now() < result.tokenExpiresAt) {
            sendResponse({ isAuthenticated: true, message: "Connected." });
        } else {
            sendResponse({ isAuthenticated: false, message: "Not connected or session expired." });
        }
    });
    return true; // Important for async response
  }
  else if (message.type === "SUBMIT_DATA") {
    handleDataSubmission(message.data, sendResponse);
    return true; // Indicates sendResponse will be called asynchronously
  }
});

async function getAccessToken() {
  return new Promise((resolve) => { // Removed reject as we resolve with null for simplicity
    chrome.storage.local.get(["concurAccessToken", "concurRefreshToken", "tokenExpiresAt", "concurApiServer"], async (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error retrieving tokens from storage:", chrome.runtime.lastError.message);
        resolve(null);
        return;
      }

      const { concurAccessToken, concurRefreshToken, tokenExpiresAt, concurApiServer } = result;
      const apiServer = concurApiServer || CONCUR_API_BASE_URL; // Use stored or default

      if (concurAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
        console.log("Using existing valid access token.");
        resolve({ token: concurAccessToken, apiServer });
      } else if (concurRefreshToken) {
        console.log("Access token expired or missing, attempting refresh...");
        try {
          const newAccessData = await refreshAccessToken(concurRefreshToken, apiServer); // Pass apiServer
          resolve(newAccessData); // Should return { token, apiServer }
        } catch (error) {
          console.error("Failed to refresh access token:", error);
          chrome.runtime.sendMessage({ type: "AUTH_FAILURE", error: "Session expired. Please reconnect." });
          resolve(null);
        }
      } else {
        console.log("No valid access token or refresh token found.");
        chrome.runtime.sendMessage({ type: "AUTH_REQUIRED" });
        resolve(null);
      }
    });
  });
}

async function refreshAccessToken(refreshToken, currentApiServer) {
  console.log("Refreshing access token...");
  const tokenRequestBody = new URLSearchParams();
  tokenRequestBody.append("grant_type", "refresh_token");
  tokenRequestBody.append("refresh_token", refreshToken);
  tokenRequestBody.append("client_id", CLIENT_ID);       // Required by Concur
  tokenRequestBody.append("client_secret", CLIENT_SECRET); // Required by Concur

  const response = await fetch(`${currentApiServer}/oauth2/v0/token`, { // Use currentApiServer
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenRequestBody.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Refresh token exchange failed:", errorText);
    // If refresh fails (e.g. invalid_grant), clear tokens to force re-auth
    chrome.storage.local.remove(["concurAccessToken", "concurRefreshToken", "tokenExpiresAt", "concurApiServer"]);
    throw new Error(`Refresh token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log("Token refresh successful:", data);
  const { access_token, refresh_token: new_refresh_token, expires_in, geolocation } = data;

  if (!access_token) {
    chrome.storage.local.remove(["concurAccessToken", "concurRefreshToken", "tokenExpiresAt", "concurApiServer"]);
    throw new Error("New access token not found in refresh response.");
  }

  const newTokenExpiresAt = Date.now() + (expires_in * 1000);
  const updatedRefreshToken = new_refresh_token || refreshToken;
  const apiServerForStorage = geolocation || currentApiServer;

  await new Promise((resolveSet, rejectSet) => {
    chrome.storage.local.set({
      concurAccessToken: access_token,
      concurRefreshToken: updatedRefreshToken,
      tokenExpiresAt: newTokenExpiresAt,
      concurApiServer: apiServerForStorage
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving refreshed tokens:", chrome.runtime.lastError.message);
        rejectSet(new Error("Failed to save refreshed tokens."));
      } else {
        console.log("Refreshed tokens stored. New API Server:", apiServerForStorage);
        resolveSet();
      }
    });
  });
  return { token: access_token, apiServer: apiServerForStorage };
}


// --- API Call Functions ---

async function createParentRequest(accessToken, apiServer, tripDetails) {
  const endpoint = `${apiServer}/travelrequest/v4/requests`;
  const correlationId = self.crypto.randomUUID();
  const payload = {
    name: tripDetails.name,
    startDate: tripDetails.startDate, // Expects YYYY-MM-DD
    endDate: tripDetails.endDate,     // Expects YYYY-MM-DD
    // mainDestination: { // This structure might vary based on exact API spec from Concur
    //   city: tripDetails.destination,
    //   countryCode: "" // Placeholder - API might require or infer. Often ISO 3166-1 alpha-2
    // },
    businessPurpose: tripDetails.businessPurpose || "Trip booked via Chrome Extension",
    // policyId: "YOUR_DEFAULT_POLICY_ID" // This might be required by your Concur setup
    // travelAgencyId: "YOUR_DEFAULT_AGENCY_ID" // This might be required
    // Other fields like custom fields (orgUnit, project, etc.) might be needed
    // For now, keeping it minimal based on common fields
  };

  // Adding a more generic way to add location if destination is provided
  if (tripDetails.destination) {
    payload.mainDestination = {
        value: tripDetails.destination, // Using 'value' as a common way to represent location name
        // city: tripDetails.destination, // Could also be structured like this
        // countryCode: "" // Still a placeholder
    };
  }


  console.log("Creating parent request with payload:", JSON.stringify(payload, null, 2));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Concur-CorrelationId": correlationId
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Create Parent Request API call failed:", response.status, errorText);
    throw new Error(`Failed to create parent request: ${response.status} - ${errorText}`);
  }
  const responseData = await response.json();
  console.log("Parent request created successfully:", responseData);
  return responseData; // Should contain { id: "request_id_string" }
}

function getExpenseTypeCode(itemType) {
    // These are examples and need to be mapped to ACTUAL Spend Category Codes from your Concur setup
    const mapping = {
        "flight": "AIRFR", // Airfare
        "hotel": "LODGA", // Lodging
        "car": "CARRT", // Car Rental
        "train": "RAILX", // Train
        "taxi": "GRTRN", // Ground Transportation (Taxi/Rideshare)
        "activity": "BUSML", // Business Meal or ENTER (Entertainment) - depends on activity nature
        "todo": "OTHER", // Other / Miscellaneous
        "transport": "GRTRN" // Generic transport, map to specific if possible from item.transportType
    };
    return mapping[itemType.toLowerCase()] || "OTHER";
}

function getSegmentCategory(itemType) {
    const mapping = {
        "flight": "REQ_SEG_AIRFR",
        "hotel": "REQ_SEG_HOTEL",
        "car": "REQ_SEG_CARNT", // Check exact code for car rental segment
        "train": "REQ_SEG_RAIL" // Check exact code for train segment
    };
    return mapping[itemType.toLowerCase()];
}


async function createExpectedExpense(accessToken, apiServer, parentRequestId, item, itemType) {
  const endpoint = `${apiServer}/travelrequest/v4/requests/${parentRequestId}/expenses`;
  const correlationId = self.crypto.randomUUID();

  const expensePayload = {
    expenseType: {
        // id: getExpenseTypeCode(itemType) // Using ID for direct code
        // Using 'code' as per some Concur docs, double check which one (id vs code)
        code: getExpenseTypeCode(itemType === 'transport' ? item.type : itemType)
    },
    transactionDate: item.startDate || item.depDate || item.checkinDate || item.date || item.todoDueDate || new Date().toISOString().split('T')[0], // YYYY-MM-DD
    transactionAmount: {
      value: parseFloat(item.cost) || 0, // Ensure it's a number
      currency: "USD" // Placeholder, make configurable if needed
    },
    businessPurpose: item.description || item.airline || item.name || item.activityName || item.todoDescription || `${itemType} entry`,
    location: { // Simplified location for now
      // city: item.depCity || item.city || item.location || item.startLoc,
      // countryCode: "" // Placeholder
      value: item.depCity || item.city || item.location || item.startLoc || "N/A"
    },
    // Other fields like custom fields may be required
  };

  // Add tripData for travel segments
  const segmentCategory = getSegmentCategory(itemType);
  if (segmentCategory) {
    expensePayload.tripData = {
      segmentType: {
        category: segmentCategory,
        code: getExpenseTypeCode(itemType) // Typically matches expense type code
      },
      tripType: "ONE_WAY", // Simplification for individual segments
      legs: [{
        // Common leg details
        startDate: item.depDate || item.checkinDate || item.startDate,
        startTime: item.depTime || item.startTime, // HH:mm
        endDate: item.arrDate || item.checkoutDate || item.endDate,
        endTime: item.arrTime || item.endTime,     // HH:mm
        startLocation: { value: item.depCity || item.startLoc || item.city },
        endLocation: { value: item.arrCity || item.endLoc || item.city },
        // Type-specific details
      }]
    };
    // Add more specific details to the leg based on itemType
    if (itemType === 'flight') {
        expensePayload.tripData.legs[0].vendorName = item.airline;
        expensePayload.tripData.legs[0].flightNumber = item.flightNumber;
    } else if (itemType === 'hotel') {
        expensePayload.tripData.legs[0].vendorName = item.name; // Hotel name
    } else if (itemType === 'transport' || itemType === 'car' || itemType === 'train') {
        expensePayload.tripData.legs[0].vendorName = item.vendor;
    }
  }
   // Specific handling for transportation types if needed
   if (itemType === 'transport') {
    expensePayload.expenseType.code = getExpenseTypeCode(item.type); // More specific type for transport
    if (getSegmentCategory(item.type)) { // If it's a segmentable transport type (car, train)
        expensePayload.tripData.segmentType.category = getSegmentCategory(item.type);
        expensePayload.tripData.segmentType.code = getExpenseTypeCode(item.type);
    } else { // For non-segment (e.g. Taxi)
        delete expensePayload.tripData; // No tripData for taxi if it's not segment-based
    }
  }


  console.log(`Creating ${itemType} expense with payload:`, JSON.stringify(expensePayload, null, 2));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Concur-CorrelationId": correlationId
    },
    body: JSON.stringify(expensePayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Create ${itemType} Expense API call failed:`, response.status, errorText);
    throw new Error(`Failed to create ${itemType} expense: ${response.status} - ${errorText} for item ${JSON.stringify(item)}`);
  }
  const responseData = await response.json();
  console.log(`${itemType} expense created successfully:`, responseData);
  return responseData;
}

// --- Main Data Submission Orchestrator ---
async function handleDataSubmission(data, sendResponse) {
  console.log("Received data for submission:", data);
  const authData = await getAccessToken();
  if (!authData || !authData.token) {
    sendResponse({ success: false, error: "Authentication required. Please connect first." });
    // No need to send AUTH_REQUIRED here as getAccessToken already does if token is missing/expired.
    return;
  }
  const { token: accessToken, apiServer } = authData;

  let parentRequestId;
  try {
    const parentRequestDetails = {
        name: data.tripDetails.name,
        startDate: data.tripDetails.startDate,
        endDate: data.tripDetails.endDate,
        destination: data.tripDetails.destination,
        businessPurpose: "Travel plan submitted via Chrome Extension" // Or make this configurable
    };
    const parentResponse = await createParentRequest(accessToken, apiServer, parentRequestDetails);
    if (!parentResponse || !parentResponse.id) {
        throw new Error("Parent request creation did not return an ID.");
    }
    parentRequestId = parentResponse.id;
    console.log("Parent Request ID:", parentRequestId);
    // Send preliminary success for parent request
    chrome.runtime.sendMessage({ type: "DATA_SUBMISSION_RESULT", success: true, message: `Trip '${data.tripDetails.name}' created with ID: ${parentRequestId}. Adding items...`});

  } catch (error) {
    console.error("Failed to create parent request:", error);
    sendResponse({ success: false, error: `Failed to create trip: ${error.message}` });
    return;
  }

  const results = { successes: [], failures: [] };

  // Process flights
  for (const flight of data.flights) {
    try {
      await createExpectedExpense(accessToken, apiServer, parentRequestId, flight, "flight");
      results.successes.push(`Flight: ${flight.airline} ${flight.flightNumber}`);
    } catch (e) { results.failures.push(`Flight ${flight.airline} ${flight.flightNumber}: ${e.message}`); }
  }
  // Process hotels
  for (const hotel of data.hotels) {
    try {
      await createExpectedExpense(accessToken, apiServer, parentRequestId, hotel, "hotel");
      results.successes.push(`Hotel: ${hotel.name} at ${hotel.city}`);
    } catch (e) { results.failures.push(`Hotel ${hotel.name}: ${e.message}`); }
  }
  // Process transportation
  for (const transport of data.transportation) {
    try {
      // Use transport.type (e.g., "Car Rental", "Taxi") to determine more specific itemType for mapping
      // For simplicity, sending "transport" and letting createExpectedExpense handle it.
      await createExpectedExpense(accessToken, apiServer, parentRequestId, transport, "transport");
      results.successes.push(`Transportation: ${transport.type} - ${transport.vendor}`);
    } catch (e) { results.failures.push(`Transportation ${transport.type} - ${transport.vendor}: ${e.message}`); }
  }
  // Process activities
  for (const activity of data.activities) {
    try {
      await createExpectedExpense(accessToken, apiServer, parentRequestId, activity, "activity");
      results.successes.push(`Activity: ${activity.name}`);
    } catch (e) { results.failures.push(`Activity ${activity.name}: ${e.message}`); }
  }
  // Process todos
  for (const todo of data.todos) {
    try {
      await createExpectedExpense(accessToken, apiServer, parentRequestId, todo, "todo");
      results.successes.push(`TODO: ${todo.description}`);
    } catch (e) { results.failures.push(`TODO ${todo.description}: ${e.message}`); }
  }

  console.log("Submission results:", results);
  const overallSuccess = results.failures.length === 0;
  let finalMessage = `Trip processed. ID: ${parentRequestId}. Successes: ${results.successes.length}. Failures: ${results.failures.length}.`;
  if (results.failures.length > 0) {
    finalMessage += " Details: " + results.failures.join("; ");
  }
   // Use the original sendResponse from the message listener
  sendResponse({ success: overallSuccess, message: finalMessage, details: results });
  // Also send a message to popup for general update (if popup is still open)
  chrome.runtime.sendMessage({ type: "DATA_SUBMISSION_RESULT", success: overallSuccess, detail: finalMessage });
}

console.log("Background script loaded and running.");
