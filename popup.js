document.addEventListener('DOMContentLoaded', () => {
  // --- Element References ---
  const authStatusDiv = document.getElementById('auth-status');
  const connectButton = document.getElementById('connect-button');
  const disconnectButton = document.getElementById('disconnect-button');
  const importerForm = document.getElementById('importer-form');
  const submissionStatusDiv = document.getElementById('submission-status');

  // Trip Details
  const tripNameInput = document.getElementById('tripName');
  const tripStartDateInput = document.getElementById('tripStartDate');
  const tripEndDateInput = document.getElementById('tripEndDate');
  const tripDestinationInput = document.getElementById('tripDestination');

  // Sections for dynamic entries
  const flightsSection = document.getElementById('flights-section');
  const hotelsSection = document.getElementById('hotels-section');
  const transportationSection = document.getElementById('transportation-section');
  const activitiesSection = document.getElementById('activities-section');
  const todosSection = document.getElementById('todos-section');

  // "Add" buttons
  const addFlightButton = document.getElementById('add-flight-button');
  const addHotelButton = document.getElementById('add-hotel-button');
  const addTransportButton = document.getElementById('add-transport-button');
  const addActivityButton = document.getElementById('add-activity-button');
  const addTodoButton = document.getElementById('add-todo-button');

  // Templates
  const flightTemplate = document.getElementById('flight-template');
  const hotelTemplate = document.getElementById('hotel-template');
  const transportTemplate = document.getElementById('transport-template');
  const activityTemplate = document.getElementById('activity-template');
  const todoTemplate = document.getElementById('todo-template');

  // --- Utility Functions ---
  function updateAuthUI(isAuthenticated, message = '') {
    if (isAuthenticated) {
      authStatusDiv.textContent = message || 'Connected to SAP Concur.';
      authStatusDiv.className = 'status-connected';
      connectButton.classList.add('hidden');
      disconnectButton.classList.remove('hidden');
      importerForm.classList.remove('hidden');
    } else {
      authStatusDiv.textContent = message || 'Not connected. Please authenticate.';
      authStatusDiv.className = 'status-disconnected';
      connectButton.classList.remove('hidden');
      disconnectButton.classList.add('hidden');
      importerForm.classList.add('hidden');
      submissionStatusDiv.textContent = ''; // Clear any previous submission status
    }
  }

  function addEntry(sectionElement, templateElement) {
    if (!templateElement) {
        console.error("Template not found for this section");
        return;
    }
    const clone = templateElement.content.cloneNode(true);
    // Clear input values in the cloned template
    const inputs = clone.querySelectorAll('input[type="text"], input[type="date"], input[type="time"], input[type="number"], select');
    inputs.forEach(input => {
        if (input.type === 'select-one') {
            input.selectedIndex = 0;
        } else {
            input.value = '';
        }
    });
    sectionElement.appendChild(clone);
  }

  function removeEntry(event, parentSelector) {
    if (event.target.classList.contains('remove-button')) {
      const entryToRemove = event.target.closest(parentSelector);
      if (entryToRemove) {
        entryToRemove.remove();
      }
    }
  }

  // --- Event Listeners ---

  // Authentication
  if (connectButton) {
    connectButton.addEventListener('click', () => {
      authStatusDiv.textContent = 'Attempting to connect...';
      authStatusDiv.className = 'status-pending';
      chrome.runtime.sendMessage({ type: "INITIATE_AUTH" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending INITIATE_AUTH message:", chrome.runtime.lastError.message);
          updateAuthUI(false, `Error initiating connection: ${chrome.runtime.lastError.message}`);
        }
      });
    });
  }

  if (disconnectButton) {
    disconnectButton.addEventListener('click', () => {
      authStatusDiv.textContent = 'Disconnecting...';
      authStatusDiv.className = 'status-pending';
      chrome.runtime.sendMessage({ type: "DISCONNECT_AUTH" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error sending DISCONNECT_AUTH message:", chrome.runtime.lastError.message);
             // Update UI anyway or based on expected response from background
            updateAuthUI(false, 'Failed to disconnect properly. Please try again.');
        }
        // Background will send AUTH_FAILURE or similar, or we can directly update UI
        updateAuthUI(false, 'Disconnected successfully.');
      });
    });
  }

  // "Add" buttons
  if (addFlightButton) addFlightButton.addEventListener('click', () => addEntry(flightsSection, flightTemplate));
  if (addHotelButton) addHotelButton.addEventListener('click', () => addEntry(hotelsSection, hotelTemplate));
  if (addTransportButton) addTransportButton.addEventListener('click', () => addEntry(transportationSection, transportTemplate));
  if (addActivityButton) addActivityButton.addEventListener('click', () => addEntry(activitiesSection, activityTemplate));
  if (addTodoButton) addTodoButton.addEventListener('click', () => addEntry(todosSection, todoTemplate));

  // "Remove" buttons (using event delegation)
  if (flightsSection) flightsSection.addEventListener('click', (e) => removeEntry(e, '.flight-entry'));
  if (hotelsSection) hotelsSection.addEventListener('click', (e) => removeEntry(e, '.hotel-entry'));
  if (transportationSection) transportationSection.addEventListener('click', (e) => removeEntry(e, '.transport-entry'));
  if (activitiesSection) activitiesSection.addEventListener('click', (e) => removeEntry(e, '.activity-entry'));
  if (todosSection) todosSection.addEventListener('click', (e) => removeEntry(e, '.todo-entry'));


  // Form Submission
  if (importerForm) {
    importerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      submissionStatusDiv.textContent = 'Processing...';
      submissionStatusDiv.style.color = 'orange';

      // --- Data Collection ---
      const collectedData = {
        tripDetails: {
          name: tripNameInput.value.trim(),
          startDate: tripStartDateInput.value,
          endDate: tripEndDateInput.value,
          destination: tripDestinationInput.value.trim(),
        },
        flights: [],
        hotels: [],
        transportation: [],
        activities: [],
        todos: []
      };

      // Collect Flights
      flightsSection.querySelectorAll('.flight-entry').forEach(entry => {
        collectedData.flights.push({
          airline: entry.querySelector('.flightAirline').value.trim(),
          flightNumber: entry.querySelector('.flightNumber').value.trim(),
          depCity: entry.querySelector('.flightDepCity').value.trim(),
          depDate: entry.querySelector('.flightDepDate').value,
          depTime: entry.querySelector('.flightDepTime').value,
          arrCity: entry.querySelector('.flightArrCity').value.trim(),
          arrDate: entry.querySelector('.flightArrDate').value,
          arrTime: entry.querySelector('.flightArrTime').value,
        });
      });

      // Collect Hotels
      hotelsSection.querySelectorAll('.hotel-entry').forEach(entry => {
        collectedData.hotels.push({
          name: entry.querySelector('.hotelName').value.trim(),
          city: entry.querySelector('.hotelCity').value.trim(),
          checkinDate: entry.querySelector('.hotelCheckinDate').value,
          checkoutDate: entry.querySelector('.hotelCheckoutDate').value,
        });
      });

      // Collect Transportation
      transportationSection.querySelectorAll('.transport-entry').forEach(entry => {
        collectedData.transportation.push({
          type: entry.querySelector('.transportType').value,
          vendor: entry.querySelector('.transportVendor').value.trim(),
          startLoc: entry.querySelector('.transportStartLoc').value.trim(),
          startDate: entry.querySelector('.transportStartDate').value,
          startTime: entry.querySelector('.transportStartTime').value,
          endLoc: entry.querySelector('.transportEndLoc').value.trim(),
          endDate: entry.querySelector('.transportEndDate').value,
          endTime: entry.querySelector('.transportEndTime').value,
        });
      });
      
      // Collect Activities
      activitiesSection.querySelectorAll('.activity-entry').forEach(entry => {
        collectedData.activities.push({
          name: entry.querySelector('.activityName').value.trim(),
          location: entry.querySelector('.activityLocation').value.trim(),
          date: entry.querySelector('.activityDate').value,
          time: entry.querySelector('.activityTime').value,
          cost: entry.querySelector('.activityCost').value,
        });
      });

      // Collect TODOs
      todosSection.querySelectorAll('.todo-entry').forEach(entry => {
        collectedData.todos.push({
          description: entry.querySelector('.todoDescription').value.trim(),
          dueDate: entry.querySelector('.todoDueDate').value,
          location: entry.querySelector('.todoLocation').value.trim(),
        });
      });

      // --- Basic Validation ---
      if (!collectedData.tripDetails.name) {
        submissionStatusDiv.textContent = 'Trip Name is required.';
        submissionStatusDiv.style.color = 'red';
        tripNameInput.focus();
        return;
      }
      // Add more validation as needed for other fields or sections

      console.log("Collected Data:", collectedData);
      submissionStatusDiv.textContent = 'Submitting data...';
      chrome.runtime.sendMessage({ type: "SUBMIT_DATA", data: collectedData }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending SUBMIT_DATA:", chrome.runtime.lastError.message);
          submissionStatusDiv.textContent = `Error submitting: ${chrome.runtime.lastError.message}`;
          submissionStatusDiv.style.color = 'red';
          return;
        }
        if (response && response.success) {
          submissionStatusDiv.textContent = 'Data submitted successfully! ' + (response.message || '');
          submissionStatusDiv.style.color = 'green';
          // Optionally clear form or parts of it
          // importerForm.reset(); // This might be too aggressive for dynamic fields
        } else {
          submissionStatusDiv.textContent = 'Submission failed: ' + (response.error || 'Unknown error from background.');
          submissionStatusDiv.style.color = 'red';
        }
      });
    });
  }

  // --- Message Listener from Background ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case "AUTH_SUCCESS":
        updateAuthUI(true, 'Successfully connected to SAP Concur!');
        break;
      case "AUTH_FAILURE":
        updateAuthUI(false, `Authentication failed: ${message.error || 'Unknown error.'}`);
        break;
      case "AUTH_REQUIRED":
        updateAuthUI(false, "Connection required. Please connect to SAP Concur.");
        break;
      case "CHECK_AUTH_STATUS_RESPONSE": // New message type for initial check
        updateAuthUI(message.isAuthenticated, message.message);
        break;
      case "DATA_SUBMISSION_RESULT": // For feedback after submit from background
        if (message.success) {
            submissionStatusDiv.textContent = 'Data processed successfully by background: ' + (message.detail || '');
            submissionStatusDiv.style.color = 'green';
        } else {
            submissionStatusDiv.textContent = 'Background processing error: ' + (message.error || 'Unknown error.');
            submissionStatusDiv.style.color = 'red';
        }
        break;
    }
    // Return true if sendResponse will be used asynchronously (not needed here for simple UI updates)
  });

  // --- Initial UI State Check ---
  authStatusDiv.textContent = 'Checking authentication status...';
  authStatusDiv.className = 'status-pending';
  chrome.runtime.sendMessage({ type: "CHECK_AUTH_STATUS" }, (response) => {
     if (chrome.runtime.lastError) {
        console.warn("Error sending CHECK_AUTH_STATUS message or background not ready:", chrome.runtime.lastError.message);
        // Assume not authenticated if background isn't responding yet, or if an error occurs
        updateAuthUI(false, "Could not verify connection status. Please try connecting.");
     }
     // Response will be handled by the onMessage listener for "CHECK_AUTH_STATUS_RESPONSE"
     // If background doesn't send a specific response for this, the UI will remain in pending
     // or default to disconnected. The onMessage listener is more robust.
  });
});
