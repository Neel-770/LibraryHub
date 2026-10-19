/**
 * booking.js - Shared Core Booking Engine
 * 
 * Reusable across all four facility types:
 * - Computer Labs (individual computers)
 * - Discussion Rooms (entire room reservations)
 * - Study Room (individual study places)
 * - Library Seats (visual seat reservations)
 * 
 * Enforces time interval overlap logic, room capacities, date checks,
 * booking creation, and cancellation.
 */

import {
  getBookings,
  getResourceById,
  saveBooking as persistBooking,
  cancelBookingInStorage,
  getCurrentUser
} from "./storage.js";

/**
 * Standard Booking Types
 */
export const BOOKING_TYPES = {
  COMPUTER: "computer",
  DISCUSSION_ROOM: "discussionRoom",
  STUDY_PLACE: "studyPlace",
  LIBRARY_SEAT: "librarySeat"
};

export const BOOKING_TYPE_LABELS = {
  computer: "Computer Lab Workstation",
  discussionRoom: "Discussion Room",
  studyPlace: "Study Room Place",
  librarySeat: "Library Reading Seat"
};

/**
 * Check if two time intervals overlap.
 * Rule: newStart < existingEnd AND newEnd > existingStart
 * Standard 24h string comparison ("09:00" < "11:00") is lexicographically valid.
 */
export function isTimeOverlapping(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

/**
 * Check if a resource is available for a given date and time range.
 * Considers only active/confirmed bookings (excludes cancelled ones).
 * 
 * @param {string} resourceId 
 * @param {string} date - 'YYYY-MM-DD'
 * @param {string} startTime - 'HH:mm'
 * @param {string} endTime - 'HH:mm'
 * @param {Array} bookingsList - optional bookings array; falls back to storage
 * @param {string|null} excludeBookingId - for updating existing bookings
 * @returns {boolean}
 */
export function isResourceAvailable(
  resourceId,
  date,
  startTime,
  endTime,
  bookingsList = null,
  excludeBookingId = null
) {
  const bookings = bookingsList || getBookings();

  const conflict = bookings.some(b => {
    // Must be same resource and same date
    if (b.resourceId !== resourceId || b.date !== date) {
      return false;
    }
    // Ignore cancelled bookings
    if (b.status === "cancelled") {
      return false;
    }
    // Ignore the booking being edited/checked
    if (excludeBookingId && b.id === excludeBookingId) {
      return false;
    }
    // Check interval overlap
    return isTimeOverlapping(startTime, endTime, b.startTime, b.endTime);
  });

  return !conflict;
}

/**
 * Get all active bookings for a specific resource on a given date.
 */
export function getActiveBookingsForResource(resourceId, date, bookingsList = null) {
  const bookings = bookingsList || getBookings();
  return bookings.filter(b => 
    b.resourceId === resourceId &&
    b.date === date &&
    b.status !== "cancelled"
  );
}

/**
 * Validate booking parameters before confirmation.
 * Returns { valid: boolean, error: string | null }
 */
export function validateBookingRequest({
  resourceId,
  bookingType,
  date,
  startTime,
  endTime,
  participants = 1
}) {
  if (!resourceId) {
    return { valid: false, error: "Please select a specific resource or seat." };
  }

  const resource = getResourceById(resourceId);
  if (!resource) {
    return { valid: false, error: `Resource "${resourceId}" was not found.` };
  }

  if (!date) {
    return { valid: false, error: "Please select a reservation date." };
  }

  // Validate date format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { valid: false, error: "Invalid date format. Expected YYYY-MM-DD." };
  }

  // Validate not in past
  const today = new Date().toISOString().split("T")[0];
  if (date < today) {
    return { valid: false, error: "Reservations cannot be made for past dates." };
  }

  if (!startTime || !endTime) {
    return { valid: false, error: "Please select both a start time and an end time." };
  }

  // Validate time format HH:mm
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return { valid: false, error: "Invalid time format. Expected 24-hour HH:mm." };
  }

  // Check start < end
  if (startTime >= endTime) {
    return { valid: false, error: "The end time must be later than the start time." };
  }

  // Check minimum duration: at least 30 minutes
  const [sH, sM] = startTime.split(":").map(Number);
  const [eH, eM] = endTime.split(":").map(Number);
  const durationMinutes = (eH * 60 + eM) - (sH * 60 + sM);

  if (durationMinutes < 30) {
    return { valid: false, error: "Minimum reservation duration is 30 minutes." };
  }

  if (durationMinutes > 480) { // 8 hours max
    return { valid: false, error: "Maximum reservation duration is 8 hours per session." };
  }

  // Check participant limits
  const participantCount = Number(participants);
  if (isNaN(participantCount) || participantCount < 1) {
    return { valid: false, error: "Participant count must be at least 1." };
  }

  if (resource.type === BOOKING_TYPES.DISCUSSION_ROOM) {
    if (resource.capacity && participantCount > resource.capacity) {
      return {
        valid: false,
        error: `Exceeds room capacity. "${resource.name}" accommodates a maximum of ${resource.capacity} people.`
      };
    }
  } else {
    // Individual resources (computer, study place, library seat) are for 1 person
    if (participantCount > 1) {
      return { valid: false, error: "Individual seats and workstations can only be booked for 1 person." };
    }
  }

  // Check if resource is available (re-verifying against storage)
  const available = isResourceAvailable(resourceId, date, startTime, endTime);
  if (!available) {
    return {
      valid: false,
      error: `"${resource.name}" is already reserved for the selected interval (${startTime} - ${endTime}). Please choose another slot or resource.`
    };
  }

  return { valid: true, error: null, resource };
}

/**
 * Generate a unique booking ID (e.g. LH-10842)
 */
export function generateBookingId() {
  const bookings = getBookings();
  const existingIds = new Set(bookings.map(b => b.id));
  
  let newId;
  let attempts = 0;
  do {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    newId = `LH-${randomNum}`;
    attempts++;
  } while (existingIds.has(newId) && attempts < 100);

  return newId;
}

/**
 * Create and persist a new booking.
 * 
 * @param {Object} bookingDetails
 * @returns {{ success: boolean, booking?: Object, error?: string }}
 */
export function createBooking({
  resourceId,
  bookingType,
  date,
  startTime,
  endTime,
  participants = 1,
  purpose = "Academic Study & Research",
  userId = null
}) {
  // Validate request
  const validation = validateBookingRequest({
    resourceId,
    bookingType,
    date,
    startTime,
    endTime,
    participants
  });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const resource = validation.resource;
  const currentUser = getCurrentUser();
  const effectiveUserId = userId || currentUser.id;

  // Determine facility / parent names for easy display
  let facilityName = resource.name;
  if (resource.parentName) {
    facilityName = resource.parentName;
  } else if (resource.type === BOOKING_TYPES.LIBRARY_SEAT) {
    facilityName = "Main Library Reading Hall";
  } else if (resource.type === BOOKING_TYPES.DISCUSSION_ROOM) {
    facilityName = resource.name;
  }

  const newBooking = {
    id: generateBookingId(),
    userId: effectiveUserId,
    userName: currentUser.name,
    resourceId: resource.id,
    resourceName: resource.name,
    bookingType: resource.type,
    facilityName: facilityName,
    location: resource.location || "Library Campus",
    date: date,
    startTime: startTime,
    endTime: endTime,
    participants: Number(participants) || 1,
    status: "confirmed", // 'confirmed' | 'cancelled' | 'completed'
    purpose: purpose.trim() || "Academic Study",
    createdAt: new Date().toISOString()
  };

  // Double check availability immediately before writing
  const finalCheck = isResourceAvailable(resource.id, date, startTime, endTime);
  if (!finalCheck) {
    return {
      success: false,
      error: `Conflict detected: "${resource.name}" was just reserved by another student for that slot.`
    };
  }

  persistBooking(newBooking);

  return { success: true, booking: newBooking };
}

/**
 * Cancel an existing booking.
 * 
 * @param {string} bookingId 
 * @param {string} reason 
 * @returns {{ success: boolean, booking?: Object, error?: string }}
 */
export function cancelBooking(bookingId, reason = "Cancelled by user") {
  const bookings = getBookings();
  const existing = bookings.find(b => b.id === bookingId);

  if (!existing) {
    return { success: false, error: `Booking "${bookingId}" does not exist.` };
  }

  if (existing.status === "cancelled") {
    return { success: false, error: `Booking "${bookingId}" has already been cancelled.` };
  }

  const updated = cancelBookingInStorage(bookingId, reason);
  return { success: true, booking: updated };
}

/**
 * Helper to compute human-friendly duration text (e.g. "2 hours")
 */
export function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return "";
  const [sH, sM] = startTime.split(":").map(Number);
  const [eH, eM] = endTime.split(":").map(Number);
  const diffMins = (eH * 60 + eM) - (sH * 60 + sM);

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
  if (hours > 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${mins} mins`;
}

/**
 * Convert 24h time to 12h display (e.g. "14:00" -> "02:00 PM")
 */
export function formatDisplayTime(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(displayH)}:${pad(m)} ${period}`;
}

/**
 * Format ISO date string into readable format (e.g. "Mon, Oct 19, 2026")
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
