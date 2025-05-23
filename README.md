# TripIt Direct Importer Chrome Extension

## Overview
This Chrome extension directly interacts with the TripIt.com website to automate the manual process of inputting your flight, hotel, transportation, activity, and note details. It works by programmatically filling out forms on the TripIt.com interface.

**Important:** This extension's functionality is highly dependent on the current HTML structure and design of the TripIt.com website. Changes to TripIt.com may break the extension or cause it to malfunction.

## Features
*   Automates the entry of flights, hotels, transportation, activities, and notes/TODOs into TripIt.com.
*   Works with an active TripIt.com session in your browser.
*   Simple interface for adding multiple travel segments to a trip.

## Warning: Potential Fragility
This extension performs web automation by interacting directly with the HTML elements of the TripIt.com website. If TripIt.com updates its website design or underlying code structure, this extension may stop working correctly or entirely. Regular updates to the extension might be required to maintain compatibility if TripIt.com changes.

## Prerequisites
*   You must be logged into your TripIt.com account in an active browser tab for the extension to work.
*   Google Chrome browser.

## Setup Instructions
1.  **Download or Clone:**
    *   Download the extension files as a ZIP and extract them, or clone the repository to your local machine.
2.  **Install the Extension in Chrome:**
    *   Open Chrome and navigate to `chrome://extensions`.
    *   Enable "Developer mode" (usually a toggle switch in the top right corner).
    *   Click the "Load unpacked" button.
    *   Select the directory where you downloaded/cloned and extracted the extension files.

## How to Use
1.  **Log into TripIt.com:**
    *   Open a new tab and navigate to `https://www.tripit.com`.
    *   Log in to your account and ensure your dashboard or the relevant trip page is loaded.
2.  **Open the Extension:**
    *   Click the "TripIt Direct Importer" extension icon in your Chrome toolbar.
3.  **Input Travel Data:**
    *   The extension popup will appear. Fill in the overall "Trip Details" (Trip Name, Dates, Destination).
    *   Use the "Add Flight," "Add Hotel," etc., buttons to add your travel items.
    *   Fill in the details for each item.
4.  **Start Import:**
    *   Once all details are entered, click the "Start Import to TripIt.com" button.
    *   The extension will attempt to automate data entry on your active TripIt.com tab. It's recommended to keep this tab visible and not interact with it during the import process.
    *   Status messages will appear in the extension popup.

## Troubleshooting
*   **Import Fails or Behaves Unexpectedly:**
    *   **TripIt.com Website Changes:** TripIt.com may have updated its website structure. The extension might need an update to align with the new structure.
    *   **Not Logged In:** Ensure you are actively logged into TripIt.com in another tab.
    *   **Incorrect Tab Active:** Make sure the tab with TripIt.com is the active tab in your current window when you start the import, or that the extension is correctly identifying it.
    *   **Page Not Fully Loaded:** Ensure the TripIt.com page is fully loaded before initiating the import.
    *   **Check Extension Consoles:**
        1.  **Popup Console:** Right-click the extension icon, select "Inspect popup," and check the "Console" tab for errors.
        2.  **Content Script Console:** Go to your TripIt.com tab, open Chrome Developer Tools (right-click on the page -> Inspect), and check the "Console" tab for errors logged by the content script.
*   **Slow Import:** The automation process involves interacting with web pages, which can take time. Allow the extension to complete its operations.

## Understanding and Customizing `content_script.js`

The core logic for interacting with the TripIt.com website resides in the `content_script.js` file. This script is designed to automate the process of filling out forms and clicking buttons on your behalf.

**Key Points:**

*   **Placeholder Selectors:** The current version of `content_script.js` uses **placeholder CSS selectors** to identify elements on TripIt.com (e.g., `"#tripNameInput"`, `".add-flight-button"`). These are examples and **will likely not work out-of-the-box**.
*   **Your Primary Task:** If you intend to use or adapt this extension, your main task will be to inspect the TripIt.com website using your browser's developer tools and replace these placeholder selectors with the actual, current selectors used by TripIt.
*   **Dynamic Content and Timing:** Websites like TripIt often load content dynamically. The script includes `waitForElement` helper functions, but you may need to adjust timeouts or add more specific checks to ensure elements are present and interactive before the script attempts to use them. You might also need to add small delays (`await new Promise(r => setTimeout(r, 500));`) between certain actions if the website needs more time to process.
*   **Debugging:** Use the browser's Developer Tools (Console and Elements panel) extensively while on a TripIt.com page where the content script is active. `console.log` messages within `content_script.js` will appear here, helping you trace its execution and identify issues with selectors or logic.
*   **Fragility:** As mentioned, this approach is inherently fragile. Any significant update to TripIt.com's website structure may require you to update the selectors and logic in `content_script.js` again.

## Disclaimer
This extension is a third-party tool and is not affiliated with TripIt or SAP Concur. It interacts with the TripIt.com website by automating user actions. Users should be aware of TripIt's Terms of Service regarding automated access or data entry. The developers of this extension are not responsible for any issues with your TripIt account, data loss, or other problems that may arise from its use. Use at your own risk.
