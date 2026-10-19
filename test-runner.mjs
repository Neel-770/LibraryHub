/**
 * Automated Verification Test Suite for LibraryHub
 * 
 * Tests:
 * 1. Storage & Data seeding
 * 2. Time overlap logic
 * 3. Booking creation, ID generation, validation
 * 4. Conflict detection & double booking prevention
 * 5. Facility-specific rules (Computers, Rooms, Study Places, Seats)
 * 6. Cancellation flow & status retention
 */

// Mock localStorage for Node environment
const store = new Map();
global.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};

import { initStorage, getResources, getBookings, saveBooking, cancelBookingInStorage, resetDemoData } from "./js/storage.js";
import { isTimeOverlapping, isResourceAvailable, validateBookingRequest, createBooking, cancelBooking } from "./js/booking.js";
import { TIME_SLOTS, COMPUTER_LABS } from "./js/data.js";

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  PASS: ${message}`);
  } else {
    console.error(`  FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("==================================================");
console.log("RUNNING LIBRARYHUB AUTOMATED VERIFICATION SUITE");
console.log("==================================================\n");

// Test 1: Storage Initialization
console.log("--- Test Group 1: Storage & Initial Data ---");
const initResult = initStorage(true);
assert(initResult.resourcesCount === 85, `Initialized 85 total resources (Got ${initResult.resourcesCount})`);
assert(initResult.bookingsCount > 0, `Initialized sample bookings (Got ${initResult.bookingsCount})`);

const resources = getResources();
const computers = resources.filter(r => r.type === "computer");
const rooms = resources.filter(r => r.type === "discussionRoom");
const studyPlaces = resources.filter(r => r.type === "studyPlace");
const seats = resources.filter(r => r.type === "librarySeat");

assert(computers.length === 40, `40 individual computers across 3 labs (Got ${computers.length})`);
assert(rooms.length === 5, `5 discussion rooms (Got ${rooms.length})`);
assert(studyPlaces.length === 20, `20 study places (Got ${studyPlaces.length})`);
assert(seats.length === 20, `20 visual library seats (Got ${seats.length})`);

// Test 2: Time Overlap Logic
console.log("\n--- Test Group 2: Time Interval Overlap Logic ---");
assert(isTimeOverlapping("10:00", "12:00", "11:00", "13:00") === true, "Partial overlap (10-12 vs 11-13)");
assert(isTimeOverlapping("10:00", "12:00", "12:00", "14:00") === false, "Contiguous non-overlapping (10-12 vs 12-14)");
assert(isTimeOverlapping("08:00", "16:00", "10:00", "12:00") === true, "Enclosing interval (8-16 vs 10-12)");
assert(isTimeOverlapping("08:00", "10:00", "14:00", "16:00") === false, "Disjoint interval (8-10 vs 14-16)");
assert(isTimeOverlapping("14:00", "16:00", "12:00", "14:00") === false, "Back-to-back intervals (14-16 vs 12-14)");

// Test 3: Resource Availability Checks
console.log("\n--- Test Group 3: Dynamic Availability Calculations ---");
const today = new Date().toISOString().split("T")[0];
const testSeatId = "LS-D05";
assert(isResourceAvailable(testSeatId, today, "16:00", "18:00") === true, "Unbooked seat is available");

// Create booking for testSeatId
const bookRes = createBooking({
  resourceId: testSeatId,
  bookingType: "librarySeat",
  date: today,
  startTime: "16:00",
  endTime: "18:00",
  participants: 1,
  purpose: "Automated Test Session"
});

assert(bookRes.success === true, `Booking successfully created with ID ${bookRes.booking?.id}`);
assert(isResourceAvailable(testSeatId, today, "16:00", "18:00") === false, "Seat is now marked unavailable for that slot");
assert(isResourceAvailable(testSeatId, today, "18:00", "20:00") === true, "Same seat is available for later slot");
assert(isResourceAvailable("LS-D04", today, "16:00", "18:00") === true, "Adjacent seat LS-D04 remains available");

// Test 4: Double Booking Prevention
console.log("\n--- Test Group 4: Double Booking Rejection ---");
const conflictRes = createBooking({
  resourceId: testSeatId,
  bookingType: "librarySeat",
  date: today,
  startTime: "16:30",
  endTime: "17:30",
  participants: 1,
  purpose: "Conflicting attempt"
});
assert(conflictRes.success === false, "Conflicting overlapping reservation is rejected");
assert(conflictRes.error.includes("already reserved"), `Expected conflict error message: "${conflictRes.error}"`);

// Test 5: Discussion Room Capacity Checks
console.log("\n--- Test Group 5: Discussion Room Capacity Rules ---");
const smallRoom = rooms.find(r => r.capacity === 4); // Galileo Room DR-201
assert(Boolean(smallRoom), "Found room with capacity 4");

const overCapRes = validateBookingRequest({
  resourceId: smallRoom.id,
  bookingType: "discussionRoom",
  date: today,
  startTime: "12:00",
  endTime: "14:00",
  participants: 6
});
assert(overCapRes.valid === false, "Booking for 6 participants rejected in 4-capacity room");
assert(overCapRes.error.includes("capacity"), `Expected capacity error message: "${overCapRes.error}"`);

const validCapRes = validateBookingRequest({
  resourceId: smallRoom.id,
  bookingType: "discussionRoom",
  date: today,
  startTime: "12:00",
  endTime: "14:00",
  participants: 4
});
assert(validCapRes.valid === true, "Booking for 4 participants accepted in 4-capacity room");

// Test 6: Invalid Date/Time Rejection
console.log("\n--- Test Group 6: Input Validation Edge Cases ---");
const pastDateRes = validateBookingRequest({
  resourceId: "PC-A-01",
  bookingType: "computer",
  date: "2020-01-01",
  startTime: "10:00",
  endTime: "12:00",
  participants: 1
});
assert(pastDateRes.valid === false, "Past date is rejected");

const invertedTimeRes = validateBookingRequest({
  resourceId: "PC-A-01",
  bookingType: "computer",
  date: today,
  startTime: "14:00",
  endTime: "12:00",
  participants: 1
});
assert(invertedTimeRes.valid === false, "End time earlier than start time is rejected");

const tooShortRes = validateBookingRequest({
  resourceId: "PC-A-01",
  bookingType: "computer",
  date: today,
  startTime: "10:00",
  endTime: "10:15",
  participants: 1
});
assert(tooShortRes.valid === false, "Duration under 30 minutes is rejected");

// Test 7: Cancellation Workflow
console.log("\n--- Test Group 7: Cancellation & History Retention ---");
const bookingToCancelId = bookRes.booking.id;
const cancelRes = cancelBooking(bookingToCancelId, "Student test cancellation");
assert(cancelRes.success === true, "Booking successfully cancelled");
assert(cancelRes.booking.status === "cancelled", "Booking status is updated to 'cancelled'");

assert(isResourceAvailable(testSeatId, today, "16:00", "18:00") === true, "Cancelled booking immediately frees the seat");

const doubleCancelRes = cancelBooking(bookingToCancelId, "Cancel again");
assert(doubleCancelRes.success === false, "Cannot cancel an already cancelled booking");

const allBookings = getBookings();
const cancelledFound = allBookings.find(b => b.id === bookingToCancelId);
assert(cancelledFound !== undefined, "Cancelled booking remains visible in booking history");
assert(cancelledFound.status === "cancelled", "Cancelled booking retains cancelled status in storage");

console.log("\n==================================================");
console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests} assertions)`);
console.log("==================================================");
