document.addEventListener('DOMContentLoaded', function () {
  const importButton = document.getElementById('importButton');
  const planDataTextarea = document.getElementById('planData');
  const statusDiv = document.getElementById('status');
  const csvFileInput = document.getElementById('csvFileInput');

  if (csvFileInput) {
    csvFileInput.addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        planDataTextarea.value = e.target.result;
        statusDiv.textContent = 'CSV file loaded into textarea.';
        statusDiv.style.color = 'green';
      };
      reader.onerror = function () {
        statusDiv.textContent = 'Error reading file.';
        statusDiv.style.color = 'red';
      };
      reader.readAsText(file);
    });
  }

  importButton.addEventListener('click', function () {
    const rawData = planDataTextarea.value.trim();
    statusDiv.textContent = ''; // Clear previous status

    if (!rawData) {
      statusDiv.textContent = 'Error: No data pasted.';
      statusDiv.style.color = 'red';
      return;
    }

    try {
      const lines = rawData.split(/\r?\n|\r/);
      if (lines.length < 2) {
        statusDiv.textContent = 'Error: Data must include a header and at least one plan item.';
        statusDiv.style.color = 'red';
        return;
      }

      const headers = lines[0].split(',').map(header => header.trim());
      const expectedHeaders = ['Subject', 'Start Date', 'Start Time', 'End Date', 'End Time', 'Location', 'Description'];
      
      // Basic header check
      if (headers.length !== expectedHeaders.length || !expectedHeaders.every((h, i) => h === headers[i])) {
          statusDiv.textContent = 'Error: CSV headers do not match expected format (Subject,Start Date,Start Time,End Date,End Time,Location,Description).';
          statusDiv.style.color = 'red';
          console.error('Parsed Headers:', headers);
          console.error('Expected Headers:', expectedHeaders);
          return;
      }

      const plans = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        if (values.length === headers.length) {
          const plan = {};
          headers.forEach((header, index) => {
            plan[header] = values[index];
          });
          plans.push(plan);
        } else if (values.some(v => v)) { // if not an empty line
            statusDiv.textContent = `Warning: Skipping malformed line ${i + 1}. Expected ${headers.length} values, got ${values.length}.`;
            statusDiv.style.color = 'orange';
            console.warn(`Malformed line ${i+1}:`, lines[i]);
        }
      }

      if (plans.length === 0 && lines.length > 1) {
        statusDiv.textContent = 'Error: No valid plan items found after parsing.';
        statusDiv.style.color = 'red';
        return;
      }
      
      if (plans.length > 0) {
        // Send plans to content script
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs.length === 0) {
            statusDiv.textContent = 'Error: No active tab found.';
            statusDiv.style.color = 'red';
            return;
          }
          const activeTab = tabs[0];
          console.log("Active tab URL:", activeTab.url); // Log the detected URL

          if (!activeTab.url || !activeTab.url.toLowerCase().includes('tripit.com')) {
            statusDiv.textContent = 'Error: Active tab is not a TripIt.com page. Detected URL: ' + (activeTab.url || 'N/A');
            statusDiv.style.color = 'red';
            console.error('Active tab URL check failed. Detected:', activeTab.url);
            alert('Please ensure you are on a TripIt.com page (e.g., www.tripit.com/...) and try importing again.');
            return;
          }

          console.log(`Attempting to send message to tab ID: ${activeTab.id} on URL: ${activeTab.url}`);
          chrome.tabs.sendMessage(activeTab.id, { action: "importPlans", data: plans }, function (response) {
            if (chrome.runtime.lastError) {
              statusDiv.textContent = 'Error sending message to TripIt page. Is content script running? Details: ' + chrome.runtime.lastError.message;
              statusDiv.style.color = 'red';
              console.error('chrome.runtime.lastError:', chrome.runtime.lastError.message);
              alert('Could not connect to the TripIt page. Please ensure you are on tripit.com, reload the extension, and refresh the TripIt page.');
            } else if (response && response.status === "success") {
              statusDiv.textContent = `Successfully sent ${plans.length} plan(s) to TripIt page. Content script says: "${response.message}"`;
              statusDiv.style.color = 'green';
            } else {
              statusDiv.textContent = 'Error: No response or failed response from TripIt page.';
              statusDiv.style.color = 'red';
              console.error('Response from content script:', response);
            }
          });
        });
      }

    } catch (error) {
      statusDiv.textContent = 'Error parsing data. Please check format and console for details.';
      statusDiv.style.color = 'red';
      console.error('Parsing error:', error);
    }
  });
});
