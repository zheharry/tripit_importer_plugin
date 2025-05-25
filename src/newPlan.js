const fs = require('fs').promises;
const { chromium } = require('playwright');
const { z } = require('zod');
const login = require('./login');
const addLodgingPlan = require('./plans/addLodgingPlan');
const addNotePlan = require('./plans/addNotePlan');
const addRailPlan = require('./plans/addRailPlan');
const addActivityPlan = require('./plans/addActivityPlan');
const addRestaurantPlan = require('./plans/addRestaurantPlan');
const addFlightPlan = require('./plans/addFlightPlan');
const addCarRentalPlan = require('./plans/addCarRentalPlan');

// Define Zod Schemas

// Schemas for each plan type's data
const LodgingDataSchema = z.object({
  hotelName: z.string().min(1),
  address: z.string().optional(),
  checkInDate: z.string().min(1),
  checkOutDate: z.string().min(1),
}).strict(); // No extra fields allowed

const NoteDataSchema = z.object({
  title: z.string().min(1),
  details: z.string().optional(),
  date: z.string().optional(),
}).strict();

const RailDataSchema = z.object({
  carrierName: z.string().min(1),
  trainNumber: z.string().optional(),
  departureStation: z.string().min(1),
  departureDate: z.string().min(1),
  departureTime: z.string().min(1),
  arrivalStation: z.string().min(1),
  arrivalDate: z.string().min(1),
  arrivalTime: z.string().min(1),
}).strict();

const ActivityDataSchema = z.object({
  eventName: z.string().min(1),
  startDate: z.string().min(1),
  startTime: z.string().optional(),
  venue: z.string().optional(),
  address: z.string().optional(),
}).strict();

const RestaurantDataSchema = z.object({
  restaurantName: z.string().min(1),
  address: z.string().optional(),
  date: z.string().min(1),
  time: z.string().optional(),
}).strict();

const FlightDataSchema = z.object({
  airline: z.string().min(1),
  flightNumber: z.string().min(1),
  departureCity: z.string().optional(),
  departureDate: z.string().min(1),
  departureTime: z.string().min(1),
  arrivalCity: z.string().optional(),
  arrivalDate: z.string().min(1),
  arrivalTime: z.string().min(1),
}).strict();

const CarDataSchema = z.object({
  rentalAgency: z.string().min(1),
  pickupDate: z.string().min(1),
  pickupTime: z.string().optional(),
  pickupLocation: z.string().optional(),
  dropoffDate: z.string().min(1),
  dropoffTime: z.string().optional(),
  dropoffLocation: z.string().optional(),
  confirmationNumber: z.string().optional(),
  carType: z.string().optional(),
}).strict();

// Discriminated union for plans
const PlanSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("lodging"), data: LodgingDataSchema }),
  z.object({ type: z.literal("note"), data: NoteDataSchema }),
  z.object({ type: z.literal("rail"), data: RailDataSchema }),
  z.object({ type: z.literal("activity"), data: ActivityDataSchema }),
  z.object({ type: z.literal("restaurant"), data: RestaurantDataSchema }),
  z.object({ type: z.literal("flight"), data: FlightDataSchema }),
  z.object({ type: z.literal("car"), data: CarDataSchema }),
]);

const TripConfigSchema = z.object({
  tripId: z.string().min(1, "tripId cannot be empty"),
  plans: z.array(PlanSchema),
});

async function main() {
  let browser;
  let page; // Declare page here so it's available in catch/finally
  try {
    const plansConfigString = await fs.readFile('tripPlans.json', 'utf-8');
    const rawPlansConfig = JSON.parse(plansConfigString);

    // Validate with Zod
    const validationResult = TripConfigSchema.safeParse(rawPlansConfig);

    if (!validationResult.success) {
      console.error('Invalid tripPlans.json configuration:');
      validationResult.error.errors.forEach(err => {
        console.error(`- Path: ${err.path.join('.')}, Message: ${err.message}`);
      });
      return; // Exit if validation fails
    }
    console.log('tripPlans.json is valid.');

    const plansConfig = validationResult.data; // Use the validated and typed data
    const tripId = plansConfig.tripId;
    const plansToAdd = plansConfig.plans;

    const TRIP_URL = `https://www.tripit.com/app/trips/${tripId}`;
    const ADD_PLAN_URL = `${TRIP_URL}/plans/create`;

    browser = await chromium.launch({ headless: false });
    page = await browser.newPage(); // Assign to the outer scope variable

    await login(page);
    console.log('Login successful.');

    for (const plan of plansToAdd) {
      try {
        if (!plan || !plan.type || !plan.data) {
          console.warn(`Invalid plan structure, skipping: ${JSON.stringify(plan)}`);
          continue;
        }
        await page.goto(TRIP_URL); // Navigate to trip overview before each plan type
        await page.waitForLoadState('networkidle');
        console.log(`On trip page: ${page.url()} - preparing to add ${plan.type}`);

        switch (plan.type) {
          case 'lodging':
            await addLodgingPlan(page, ADD_PLAN_URL, plan.data);
            console.log('Lodging plan addition process completed.');
            break;
          case 'note':
            await addNotePlan(page, ADD_PLAN_URL, plan.data);
            console.log('Note plan addition process completed.');
            break;
          case 'rail':
            await addRailPlan(page, ADD_PLAN_URL, plan.data);
            console.log('Rail plan addition process completed.');
            break;
          case 'activity':
            await addActivityPlan(page, ADD_PLAN_URL, plan.data);
            console.log('Activity plan addition process completed.');
            break;
          case 'restaurant':
            await addRestaurantPlan(page, ADD_PLAN_URL, plan.data);
            console.log('Restaurant plan addition process completed.');
            break;
          case 'flight': // Commenting out flight case
            await addFlightPlan(page, ADD_PLAN_URL, plan.data);
            console.log('Flight plan addition process completed.');
            break;
          case 'car': // Added case for car rental
            await addCarRentalPlan(page, ADD_PLAN_URL, plan.data);
            console.log('Car Rental plan addition process completed.');
            break;
          default:
            console.warn(`Unknown plan type: ${plan.type}`);
        }
      } catch (error) {
        console.error(`Error processing plan type ${plan.type}: ${error.message}. Skipping this plan.`);
        // Optionally, take a screenshot specific to this plan error
        // await page.screenshot({ path: `error_plan_${plan.type}.png` });
      }
    }

    console.log('All specified plans processed. Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error in newPlan.js:', error.message);
    if (page) { // Check if page is defined before using it
      await page.screenshot({ path: 'error_newPlan_main_script.png' });
      console.log('Screenshot saved to error_newPlan_main_script.png');
    } else {
      console.log('Page object not available for screenshot in main catch block.');
    }
  } finally {
    if (browser) {
      console.log('Closing browser.');
      await browser.close();
    }
  }
}

main();
