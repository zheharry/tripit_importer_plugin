# TripIt Importer Chrome Extension

## Overview
This Chrome extension allows you to manually input your flight, hotel, transportation, activity, and TODO details and import them into your TripIt account via SAP Concur.

## Features
*   Imports flights, hotels, various transportation types, activities, and TODOs.
*   Uses OAuth 2.0 to securely connect to your SAP Concur account.
*   Simple interface for adding multiple travel segments.

## Prerequisites
*   You must have an SAP Concur account that is linked to TripIt.
*   You must register this extension as an application with SAP Concur to obtain a **Client ID** and **Client Secret**. (Link to the SAP Concur developer portal or relevant documentation if a general link is known, e.g., `https://developer.concur.com/`). This process will also provide you with the correct **API Geolocation URL** (e.g., `https://us.api.concursolutions.com` or `https://emea.api.concursolutions.com`).

## Setup Instructions
1.  **Download or Clone:**
    *   Download the extension files or clone the repository.
2.  **Configure the Extension:**
    *   Open the `background.js` file in a text editor.
    *   Replace the placeholder values for `CLIENT_ID`, `CLIENT_SECRET` with the credentials you obtained from SAP Concur.
    *   Verify that `CONCUR_AUTH_URL` and `CONCUR_TOKEN_URL` (which help determine `CONCUR_API_BASE_URL`) are correct for your SAP Concur account's region (e.g., `https://us.api.concursolutions.com/oauth2/v0/authorize` and `https://us.api.concursolutions.com/oauth2/v0/token`). The actual API endpoint used for data submission will also depend on the `geolocation` value returned during OAuth, which the extension attempts to use.
3.  **Install the Extension in Chrome:**
    *   Open Chrome and navigate to `chrome://extensions`.
    *   Enable "Developer mode" (usually a toggle in the top right).
    *   Click "Load unpacked".
    *   Select the directory where you downloaded/cloned the extension files.
4.  **Register Redirect URI with SAP Concur:**
    *   After loading the extension, Chrome will assign it an Extension ID. You can find this on the `chrome://extensions` page.
    *   The Redirect URI for the OAuth flow will be `https://<your-extension-id>.chromiumapp.org/oauth2`. (Note: The `oauth2` part is a placeholder path defined by `chrome.identity.getRedirectURL("oauth2")` in the code; ensure this matches exactly if you modified the placeholder in `background.js` for `getRedirectURL`).
    *   You **MUST** add this exact Redirect URI to your application's configuration settings in the SAP Concur developer portal.

## How to Use
1.  **Authenticate:**
    *   Click on the TripIt Importer extension icon in your Chrome toolbar.
    *   Click the "Connect to Concur/TripIt" button.
    *   You will be redirected to the SAP Concur login page. Log in and authorize the extension.
    *   The popup should now indicate that you are connected.
2.  **Input Travel Data:**
    *   Fill in the overall "Trip Details" (Trip Name, Dates, Destination).
    *   Use the "Add Flight," "Add Hotel," etc., buttons to add your travel items.
    *   Fill in the details for each item.
3.  **Import:**
    *   Once all details are entered, click the "Import to TripIt/Concur" button.
    *   The extension will process the data and show a success or error message.
    *   Check your Concur account (and subsequently TripIt) to see the imported trip.

## Troubleshooting
*   **Not Connecting:**
    *   Ensure your Client ID, Client Secret, and API URLs in `background.js` are correct.
    *   Verify that the Redirect URI (`https://<your-extension-id>.chromiumapp.org/oauth2`) is correctly registered in your SAP Concur application settings. The `<your-extension-id>` must be replaced with the actual ID from `chrome://extensions`.
*   **Import Errors:**
    *   The extension will attempt to display error messages from the API. These might provide clues about missing or incorrect data.
    *   Check the extension's console for more detailed error messages:
        1.  Right-click the extension icon and select "Inspect popup" (for popup errors).
        2.  For background script errors: Go to `chrome://extensions`, find the "TripIt Importer" extension, click on "Details," and then click the link next to "Inspect views" (often "service worker").

## Disclaimer
This extension interacts with SAP Concur APIs. Ensure you comply with SAP Concur's terms of service for API usage. The developers of this extension are not responsible for any issues with your Concur or TripIt account. Use at your own risk.
