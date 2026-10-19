/**
 * dashboard.js - Simplified, Action-Oriented Dashboard View
 * 
 * Clean, uncluttered layout:
 * 1. Short welcome heading & sentence with primary booking action
 * 2. Four compact facility cards (Computer Labs, Discussion Rooms, Study Room, Library Seats)
 * 3. Simple upcoming reservations list with clear actions
 */

import {
  getResources,
  getBookings,
  getUserBookings,
  getCurrentUser
} from "./storage.js";
import {
  isResourceAvailable,
  formatDisplayDate,
  formatDisplayTime
} from "./booking.js";
import { TIME_SLOTS } from "./data.js";

/**
 * Determine the current or next relevant time slot for today
 */
export function getCurrentSlotForToday() {
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTime = `${currentHours < 10 ? "0" + currentHours : currentHours}:${currentMinutes < 10 ? "0" + currentMinutes : currentMinutes}`;

  const matchingSlot = TIME_SLOTS.find(slot => currentTime >= slot.startTime && currentTime < slot.endTime);
  if (matchingSlot) return matchingSlot;

  if (currentTime < TIME_SLOTS[0].startTime) {
    return TIME_SLOTS[0];
  }

  return TIME_SLOTS[1] || TIME_SLOTS[0];
}

/**
 * Compute real-time dashboard metrics (preserved for logic and state updates)
 */
export function getDashboardMetrics() {
  const resources = getResources();
  const bookings = getBookings();
  const currentUser = getCurrentUser();
  const userBookings = getUserBookings(currentUser.id);

  const today = new Date().toISOString().split("T")[0];
  const currentSlot = getCurrentSlotForToday();

  const totalResources = resources.length;

  let availableCount = 0;
  resources.forEach(res => {
    if (isResourceAvailable(res.id, today, currentSlot.startTime, currentSlot.endTime, bookings)) {
      availableCount++;
    }
  });

  const upcomingUserBookings = userBookings.filter(b => {
    if (b.status !== "confirmed") return false;
    return b.date >= today;
  }).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  const totalUserBookings = userBookings.length;

  return {
    currentUser,
    today,
    currentSlot,
    totalResources,
    availableCount,
    upcomingUserBookings,
    totalUserBookings
  };
}

/**
 * Render simplified dashboard into target container
 */
export function renderDashboard(container, navigateToCallback, openBookingDetailsCallback) {
  const metrics = getDashboardMetrics();
  const { currentUser, upcomingUserBookings, totalUserBookings } = metrics;

  const html = `
    <!-- 1. Welcome Section with Primary Action -->
    <section class="dashboard-welcome" aria-labelledby="welcome-heading">
      <div class="welcome-content">
        <h1 id="welcome-heading" class="welcome-heading">Welcome, ${escapeHtml(currentUser.name)}</h1>
        <p class="welcome-sentence">Book study spaces, computer workstations, and discussion rooms across campus.</p>
      </div>
      <div class="welcome-action">
        <button class="btn btn-primary" id="dash-btn-book-seat">
          <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Book a Space
        </button>
      </div>
    </section>

    <!-- 2. Four Compact Facility Cards -->
    <section class="dashboard-facilities" aria-label="Library Facilities">
      <div class="facilities-grid">
        <!-- A. Computer Labs -->
        <div class="facility-card">
          <div class="facility-card-header">
            <div class="facility-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <h2 class="facility-name">Computer Labs</h2>
          </div>
          <p class="facility-desc">Reserve individual high-performance workstations for coding, design, and research.</p>
          <button class="btn btn-secondary btn-block" data-nav="computer-labs">
            Book Workstation
          </button>
        </div>

        <!-- B. Discussion Rooms -->
        <div class="facility-card">
          <div class="facility-card-header">
            <div class="facility-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h2 class="facility-name">Discussion Rooms</h2>
          </div>
          <p class="facility-desc">Private collaboration rooms with screens and whiteboards for team projects.</p>
          <button class="btn btn-secondary btn-block" data-nav="discussion-rooms">
            Book Room
          </button>
        </div>

        <!-- C. Study Room -->
        <div class="facility-card">
          <div class="facility-card-header">
            <div class="facility-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <h2 class="facility-name">Study Room</h2>
          </div>
          <p class="facility-desc">Quiet individual study cubicles in a dedicated silent study hall with power outlets.</p>
          <button class="btn btn-secondary btn-block" data-nav="study-room">
            Book Study Place
          </button>
        </div>

        <!-- D. Library Seats -->
        <div class="facility-card">
          <div class="facility-card-header">
            <div class="facility-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h2 class="facility-name">Library Seats</h2>
          </div>
          <p class="facility-desc">Select your preferred reading desk directly on an interactive visual floor map.</p>
          <button class="btn btn-primary btn-block" data-nav="library-seats">
            Select Seat
          </button>
        </div>
      </div>
    </section>

    <!-- 3. Simple Upcoming Bookings Section -->
    <section class="dashboard-section" aria-labelledby="upcoming-bookings-heading">
      <div class="section-header">
        <h2 id="upcoming-bookings-heading" class="section-title">Upcoming Bookings</h2>
        ${upcomingUserBookings.length > 0 ? `
          <button class="btn btn-secondary-sm" data-nav="my-bookings">
            View All (${totalUserBookings})
          </button>
        ` : ""}
      </div>

      ${renderUpcomingList(upcomingUserBookings)}
    </section>
  `;

  container.innerHTML = html;

  // Primary action button
  const btnBookSeat = container.querySelector("#dash-btn-book-seat");
  if (btnBookSeat) {
    btnBookSeat.addEventListener("click", () => navigateToCallback("library-seats"));
  }

  // Facility navigation buttons
  const navButtons = container.querySelectorAll("[data-nav]");
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target) navigateToCallback(target);
    });
  });

  // Details buttons on upcoming bookings
  const detailsButtons = container.querySelectorAll("[data-details-id]");
  detailsButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const bId = btn.getAttribute("data-details-id");
      if (bId && openBookingDetailsCallback) {
        openBookingDetailsCallback(bId);
      }
    });
  });
}

/**
 * Render compact upcoming bookings list or clean empty state
 */
function renderUpcomingList(upcomingBookings) {
  if (upcomingBookings.length === 0) {
    return `
      <div class="empty-state-card">
        <h3 class="empty-state-title">No upcoming bookings</h3>
        <p class="empty-state-desc">You do not have any active reservations. Select a facility above to book your spot.</p>
      </div>
    `;
  }

  const items = upcomingBookings.slice(0, 3).map(b => {
    return `
      <div class="upcoming-booking-card">
        <div class="booking-card-main">
          <div class="booking-card-tags">
            <span class="booking-type-tag">${getBookingTypeFriendly(b.bookingType)}</span>
            <span class="status-badge status-confirmed">Confirmed</span>
          </div>
          <div>
            <div class="booking-card-title">${escapeHtml(b.resourceName)}</div>
            <div class="booking-card-meta">
              <span>${formatDisplayDate(b.date)} • ${formatDisplayTime(b.startTime)} - ${formatDisplayTime(b.endTime)}</span>
              <span>• ${escapeHtml(b.location)}</span>
            </div>
          </div>
        </div>
        <div class="booking-card-actions">
          <button class="btn btn-secondary-sm" data-details-id="${escapeHtml(b.id)}">
            View Details
          </button>
        </div>
      </div>
    `;
  }).join("");

  return `<div class="upcoming-bookings-list">${items}</div>`;
}

function getBookingTypeFriendly(type) {
  switch (type) {
    case "computer": return "Computer Lab";
    case "discussionRoom": return "Discussion Room";
    case "studyPlace": return "Study Place";
    case "librarySeat": return "Library Seat";
    default: return "Booking";
  }
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"']/g, match => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[match]));
}
