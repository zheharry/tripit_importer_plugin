document.addEventListener('DOMContentLoaded', () => {
  // --- Element References ---
  const statusArea = document.getElementById('status-area');
  const importerFormContainer = document.getElementById('importer-form-container');

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
  const submitButton = document.getElementById('submit-button');

  // Templates
  const flightTemplate = document.getElementById('flight-template');
  const hotelTemplate = document.getElementById('hotel-template');
  const transportTemplate = document.getElementById('transport-template');
  const activityTemplate = document.getElementById('activity-template');
  const todoTemplate = document.getElementById('todo-template');

  // --- Utility Functions ---
  function updateStatus(message, isError = false, isSuccess = false) {
    statusArea.innerHTML = message; // Use innerHTML to allow for list formatting
    statusArea.className = 'status-area'; // Reset classes
    if (isError) {
      statusArea.classList.add('status-error');
    } else if (isSuccess) {
      statusArea.classList.add('status-success');
    }
  }

  function addEntry(sectionElement, templateElement) {
    if (!templateElement) {
      console.error("Template not found for this section");
      updateStatus("Error: UI template missing.", true);
      return;
    }
    const clone = templateElement.content.cloneNode(true);
    // Clear input values in the cloned template
    const inputs = clone.querySelectorAll('input[type="text"], input[type="date"], input[type="time"], select');
    inputs.forEach(input => {
        if (input.type === 'select-one') {
            input.selectedIndex = 0; // Reset select to the first option
        } else {
            input.value = ''; // Clear value for other inputs
        }
    });
    sectionElement.appendChild(clone);
  }

  function handleRemoveEntry(event) {
    if (event.target.classList.contains('remove-entry-button')) {
      const entryToRemove = event.target.closest('.entry');
      if (entryToRemove) {
        entryToRemove.remove();
      }
    }
  }

  // --- Event Listeners ---

  // "Add" buttons
  if (addFlightButton) addFlightButton.addEventListener('click', () => addEntry(flightsSection, flightTemplate));
  if (addHotelButton) addHotelButton.addEventListener('click', () => addEntry(hotelsSection, hotelTemplate));
  if (addTransportButton) addTransportButton.addEventListener('click', () => addEntry(transportationSection, transportTemplate));
  if (addActivityButton) addActivityButton.addEventListener('click', () => addEntry(activitiesSection, activityTemplate));
  if (addTodoButton) addTodoButton.addEventListener('click', () => addEntry(todosSection, todoTemplate));

  // Event Delegation for "Remove" buttons
  if (flightsSection) flightsSection.addEventListener('click', handleRemoveEntry);
  if (hotelsSection) hotelsSection.addEventListener('click', handleRemoveEntry);
  if (transportationSection) transportationSection.addEventListener('click', handleRemoveEntry);
  if (activitiesSection) activitiesSection.addEventListener('click', handleRemoveEntry);
  if (todosSection) todosSection.addEventListener('click', handleRemoveEntry);

  // Form Submission
  if (submitButton) {
    submitButton.addEventListener('click', () => {
      submitButton.disabled = true; // Disable button
      // --- Data Collection ---
      const tripData = {
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

      // Collect Flights, Hotels, etc. (Code from previous turn, assumed correct)
      flightsSection.querySelectorAll('.flight-entry').forEach(entry => {
        tripData.flights.push({
          airline: entry.querySelector('.flightAirline')?.value.trim(),
          flightNumber: entry.querySelector('.flightNumber')?.value.trim(),
          depCity: entry.querySelector('.flightDepCity')?.value.trim(),
          depDate: entry.querySelector('.flightDepDate')?.value,
          depTime: entry.querySelector('.flightDepTime')?.value,
          arrCity: entry.querySelector('.flightArrCity')?.value.trim(),
          arrDate: entry.querySelector('.flightArrDate')?.value,
          arrTime: entry.querySelector('.flightArrTime')?.value,
        });
      });
      hotelsSection.querySelectorAll('.hotel-entry').forEach(entry => {
        tripData.hotels.push({
          name: entry.querySelector('.hotelName')?.value.trim(),
          city: entry.querySelector('.hotelCity')?.value.trim(),
          checkinDate: entry.querySelector('.hotelCheckinDate')?.value,
          checkoutDate: entry.querySelector('.hotelCheckoutDate')?.value,
        });
      });
      transportationSection.querySelectorAll('.transport-entry').forEach(entry => {
        tripData.transportation.push({
          type: entry.querySelector('.transportType')?.value,
          vendor: entry.querySelector('.transportVendor')?.value.trim(),
          startLoc: entry.querySelector('.transportStartLoc')?.value.trim(),
          startDate: entry.querySelector('.transportStartDate')?.value,
          startTime: entry.querySelector('.transportStartTime')?.value,
          endLoc: entry.querySelector('.transportEndLoc')?.value.trim(),
          endDate: entry.querySelector('.transportEndDate')?.value,
          endTime: entry.querySelector('.transportEndTime')?.value,
        });
      });
      activitiesSection.querySelectorAll('.activity-entry').forEach(entry => {
        tripData.activities.push({
          name: entry.querySelector('.activityName')?.value.trim(),
          location: entry.querySelector('.activityLocation')?.value.trim(),
          date: entry.querySelector('.activityDate')?.value,
          time: entry.querySelector('.activityTime')?.value,
        });
      });
      todosSection.querySelectorAll('.todo-entry').forEach(entry => {
        tripData.todos.push({
          description: entry.querySelector('.todoDescription')?.value.trim(),
          date: entry.querySelector('.todoDate')?.value,
        });
      });


      // --- Basic Validation ---
      if (!tripData.tripDetails.name) {
        updateStatus('Trip Name is required.', true);
        tripNameInput.focus();
        submitButton.disabled = false; // Re-enable button on validation failure
        return;
      }

      console.log("Collected Trip Data:", tripData);
      updateStatus('Importing... Please ensure you are logged into TripIt.com in an active tab and that the page is fully loaded.');
      
      chrome.runtime.sendMessage({ type: "START_IMPORT", data: tripData }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending START_IMPORT message:", chrome.runtime.lastError.message);
          updateStatus(`Error initiating import: ${chrome.runtime.lastError.message}`, true);
          submitButton.disabled = false; // Re-enable button on message sending failure
          return;
        }
        if (response && response.error) {
             updateStatus(`Initial background response error: ${response.error}`, true);
             // Consider if button should be re-enabled here too, if it's a synchronous error from background.
             // For now, assuming background will always lead to an IMPORT_FINAL_RESULT
        } else if (response && response.message) {
             updateStatus(response.message, false);
        }
      });
    });
  }

  // --- Message Listener from Background ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "IMPORT_STATUS") { // This is for intermediate progress updates
      console.log("IMPORT_STATUS received:", message);
      updateStatus(message.message, message.isError);
    } else if (message.type === "IMPORT_FINAL_RESULT") {
      console.log("IMPORT_FINAL_RESULT received:", message);
      let finalMsg = "";
      if (message.success) {
        finalMsg = `Import complete. Successfully processed ${message.summary.successful} of ${message.summary.total} items.`;
        updateStatus(finalMsg, false, true); // isError = false, isSuccess = true
      } else {
        finalMsg = `Import finished with errors. Successfully processed ${message.summary.successful} of ${message.summary.total} items.`;
        if (message.errors && message.errors.length > 0) {
          finalMsg += "<br><strong>Errors:</strong><ul>";
          message.errors.forEach(err => {
            finalMsg += `<li>${err}</li>`;
          });
          finalMsg += "</ul>";
        }
        updateStatus(finalMsg, true, false); // isError = true, isSuccess = false
      }
      submitButton.disabled = false; // Re-enable button
    }
  });

  // Initial status
  updateStatus("Ready to import. Fill in the details and click 'Start Import'.");
});
