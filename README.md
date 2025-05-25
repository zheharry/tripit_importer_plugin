# TripIt Importer Plugin

This project is a plugin for importing trip plans into TripIt. It allows users to add various types of plans, including activities, car rentals, flights, lodging, notes, rail, and restaurant reservations.

## Features

*   Import various plan types:
    *   Activities
    *   Car Rentals
    *   Flights
    *   Lodging
    *   Notes
    *   Rail
    *   Restaurant Reservations
*   Create new trips
*   Delete plans
*   Login functionality

## Usage

user may input a trip.html. the LLM will honor the content and follow tripPlans.json.template to create a tripPlans.json.
And then use the command to create plans on certain tripid.
```
node src/newPlans.js
```

And you can delete all plans for debug purpose by:
```
node src/deletePlan.js
```

## Project Structure

*   `src/`: Contains the main source code for the plugin.
    *   `plans/`: Contains modules for adding different types of plans.
    *   `deletePlan.js`: Handles deleting plans.
    *   `login.js`: Handles user login.
    *   `newPlan.js`: Handles creation of new plans.
    *   `newTrip.js`: Handles creation of new trips.
*   `tripPlans.json.template`: A template file for trip plans.
