/**
 * dashboard.js - Dashboard View Controller & Statistics Generator
 * 
 * Computes live statistics from stored data, renders facility quick cards
 * with dynamic availability, and displays the demo student's upcoming bookings.
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

  // Find slot that includes currentTime, or the earliest upcoming slot
  const matchingSlot = TIME_SLOTS.find(slot => currentTime >= slot.startTime && currentTime < slot.endTime);
  if (matchingSlot) return matchingSlot;

  // If before opening hours, pick first slot
  if (currentTime < TIME_SLOTS[0].startTime) {
    return TIME_SLOTS[0];
  }

  // If after closing, return the last slot or first morning slot
  return TIME_SLOTS[1] || TIME_SLOTS[0]; // fallback default to 10:00 - 12:00
}

/**
 * Compute real-time dashboard metrics
 */
export function getDashboardMetrics() {
  const resources = getResources();
  const bookings = getBookings();
  const currentUser = getCurrentUser();
  const userBookings = getUserBookings(currentUser.id);

  const today = new Date().toISOString().split("T")[0];
  const currentSlot = getCurrentSlotForToday();

  // Total bookable resources
  const totalResources = resources.length;

  // Currently available resources for today in current slot
  let availableCount = 0;
  resources.forEach(res => {
    if (isResourceAvailable(res.id, today, currentSlot.startTime, currentSlot.endTime, bookings)) {
      availableCount++;
    }
  });

  // User's active upcoming bookings (today or future dates, status == 'confirmed')
  const upcomingUserBookings = userBookings.filter(b => {
    if (b.status !== "confirmed") return false;
    return b.date >= today;
  }).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  // Total bookings ever made by this user
  const totalUserBookings = userBookings.length;

  // Breakdown by facility for current slot
  const facilityStats = {
    computers: { total: 0, available: 0 },
    discussionRooms: { total: 0, available: 0 },
    studyPlaces: { total: 0, available: 0 },
    librarySeats: { total: 0, available: 0 }
  };

  resources.forEach(res => {
    const isAvail = isResourceAvailable(res.id, today, currentSlot.startTime, currentSlot.endTime, bookings);

    if (res.type === "computer") {
      facilityStats.computers.total++;
      if (isAvail) facilityStats.computers.available++;
    } else if (res.type === "discussionRoom") {
      facilityStats.discussionRooms.total++;
      if (isAvail) facilityStats.discussionRooms.available++;
    } else if (res.type === "studyPlace") {
      facilityStats.studyPlaces.total++;
      if (isAvail) facilityStats.studyPlaces.available++;
    } else if (res.type === "librarySeat") {
      facilityStats.librarySeats.total++;
      if (isAvail) facilityStats.librarySeats.available++;
    }
  });

  return {
    currentUser,
    today,
    currentSlot,
    totalResources,
    availableCount,
    upcomingUserBookings,
    totalUserBookings,
    facilityStats
  };
}

/**
 * Render Dashboard Content into target container
 */
export function renderDashboard(container, navigateToCallback, openBookingDetailsCallback) {
  const metrics = getDashboardMetrics();
  const { currentUser, currentSlot, totalResources, availableCount, upcomingUserBookings, totalUserBookings, facilityStats } = metrics;

  const html = `
    <!-- Welcome Hero Section -->
    <section class="welcome-hero" aria-labelledby="welcome-heading">
      <div class="welcome-hero-content">
        <div class="welcome-badge">
          <span class="pulse-indicator"></span>
          <span>Library System Live • Academic Term 2026</span>
        </div>
        <h1 id="welcome-heading" class="welcome-title">Welcome back, ${escapeHtml(currentUser.name)}</h1>
        <p class="welcome-subtitle">Find your perfect study space, reserve high-spec lab workstations, or book collaboration rooms with zero friction.</p>
        <div class="welcome-actions">
          <button class="btn btn-primary" id="dash-btn-book-seat">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Book a Seat Now
          </button>
          <button class="btn btn-secondary-light" id="dash-btn-explore">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
            Explore Facilities
          </button>
        </div>
      </div>
      <div class="welcome-hero-card">
        <div class="hero-card-header">
          <span class="hero-chip">Live Status</span>
          <span class="hero-slot">${escapeHtml(currentSlot.label)}</span>
        </div>
        <div class="hero-card-metric">
          <span class="metric-number">${availableCount}</span>
          <span class="metric-total">/ ${totalResources}</span>
        </div>
        <p class="hero-card-desc">Spaces currently open for study & research across all campus library zones.</p>
      </div>
    </section>

    <!-- Live Statistics Cards -->
    <section class="dashboard-stats-grid" aria-label="Key Library Statistics">
      <div class="stat-card">
        <div class="stat-icon-wrapper stat-blue">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        </div>
        <div class="stat-data">
          <span class="stat-label">Total Bookable Resources</span>
          <span class="stat-value">${totalResources}</span>
          <span class="stat-sub">Across 4 facility wings</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper stat-green">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="stat-data">
          <span class="stat-label">Available Right Now</span>
          <span class="stat-value text-success">${availableCount}</span>
          <span class="stat-sub">${Math.round((availableCount / totalResources) * 100)}% capacity open for booking</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper stat-amber">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="stat-data">
          <span class="stat-label">Active Upcoming Bookings</span>
          <span class="stat-value">${upcomingUserBookings.length}</span>
          <span class="stat-sub">Reserved for ${escapeHtml(currentUser.name.split(" ")[0])}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper stat-indigo">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div class="stat-data">
          <span class="stat-label">Total Bookings Made</span>
          <span class="stat-value">${totalUserBookings}</span>
          <span class="stat-sub">Current semester history</span>
        </div>
      </div>
    </section>

    <!-- Facility Cards Grid -->
    <section class="dashboard-section" id="facility-cards-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Explore Library Facilities</h2>
          <p class="section-subtitle">Real-time availability for slot: <strong>${escapeHtml(currentSlot.label)}</strong></p>
        </div>
      </div>

      <div class="facilities-grid">
        <!-- A. Computer Labs -->
        <div class="facility-card">
          <div class="facility-card-top">
            <div class="facility-badge-icon badge-pc">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <span class="availability-pill ${facilityStats.computers.available > 0 ? "pill-avail" : "pill-full"}">
              ${facilityStats.computers.available} of ${facilityStats.computers.total} Available
            </span>
          </div>
          <h3 class="facility-name">Computer Labs</h3>
          <p class="facility-desc">Reserve individual high-performance workstations with dual displays, Linux/Windows OS, and engineering suites.</p>
          <div class="facility-meta">
            <span class="meta-item"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> 3 Tech Labs</span>
            <span class="meta-item"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 08:00 - 20:00</span>
          </div>
          <button class="btn btn-outline btn-block" data-nav="computer-labs">
            Explore Lab Workstations &rarr;
          </button>
        </div>

        <!-- B. Discussion Rooms -->
        <div class="facility-card">
          <div class="facility-card-top">
            <div class="facility-badge-icon badge-rooms">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <span class="availability-pill ${facilityStats.discussionRooms.available > 0 ? "pill-avail" : "pill-full"}">
              ${facilityStats.discussionRooms.available} of ${facilityStats.discussionRooms.total} Rooms Free
            </span>
          </div>
          <h3 class="facility-name">Discussion Rooms</h3>
          <p class="facility-desc">Reserve entire private collaboration rooms equipped with 4K smart screens, whiteboards, and conference audio.</p>
          <div class="facility-meta">
            <span class="meta-item"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> 4 - 10 Capacities</span>
            <span class="meta-item"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Entire Room</span>
          </div>
          <button class="btn btn-outline btn-block" data-nav="discussion-rooms">
            Book a Discussion Room &rarr;
          </button>
        </div>

        <!-- C. Study Room -->
        <div class="facility-card">
          <div class="facility-card-top">
            <div class="facility-badge-icon badge-study">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <span class="availability-pill ${facilityStats.studyPlaces.available > 0 ? "pill-avail" : "pill-full"}">
              ${facilityStats.studyPlaces.available} of ${facilityStats.studyPlaces.total} Places Free
            </span>
          </div>
          <h3 class="facility-name">Honors Study Room</h3>
          <p class="facility-desc">Reserve individual quiet focus places with acoustic partitions, task lamps, and dedicated power sockets.</p>
          <div class="facility-meta">
            <span class="meta-item"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Zero-Noise Policy</span>
            <span class="meta-item"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Fast Charging</span>
          </div>
          <button class="btn btn-outline btn-block" data-nav="study-room">
            Find a Study Place &rarr;
          </button>
        </div>

        <!-- D. Library Seats -->
        <div class="facility-card">
          <div class="facility-card-top">
            <div class="facility-badge-icon badge-seats">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <span class="availability-pill ${facilityStats.librarySeats.available > 0 ? "pill-avail" : "pill-full"}">
              ${facilityStats.librarySeats.available} of ${facilityStats.librarySeats.total} Seats Free
            </span>
          </div>
          <h3 class="facility-name">Library Reading Seats</h3>
          <p class="facility-desc">Select and reserve your exact reading desk using our interactive visual seat map with real-time floor occupancy.</p>
          <div class="facility-meta">
            <span class="meta-item"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg> Interactive Map</span>
            <span class="meta-item"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg> Window & Garden Rows</span>
          </div>
          <button class="btn btn-primary btn-block" data-nav="library-seats">
            Choose a Seat &rarr;
          </button>
        </div>
      </div>
    </section>

    <!-- Upcoming Bookings Section -->
    <section class="dashboard-section" aria-labelledby="upcoming-bookings-heading">
      <div class="section-header">
        <div>
          <h2 id="upcoming-bookings-heading" class="section-title">Your Upcoming Reservations</h2>
          <p class="section-subtitle">Active bookings scheduled under your student account</p>
        </div>
        <button class="btn btn-secondary-sm" data-nav="my-bookings">
          View All Bookings (${totalUserBookings})
        </button>
      </div>

      ${renderUpcomingList(upcomingUserBookings)}
    </section>
  `;

  container.innerHTML = html;

  // Attach event listeners
  const btnBookSeat = container.querySelector("#dash-btn-book-seat");
  if (btnBookSeat) {
    btnBookSeat.addEventListener("click", () => navigateToCallback("library-seats"));
  }

  const btnExplore = container.querySelector("#dash-btn-explore");
  if (btnExplore) {
    btnExplore.addEventListener("click", () => {
      const section = container.querySelector("#facility-cards-section");
      if (section) section.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Facility card buttons
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
 * Render the upcoming bookings list or empty state
 */
function renderUpcomingList(upcomingBookings) {
  if (upcomingBookings.length === 0) {
    return `
      <div class="empty-state-card">
        <div class="empty-state-icon">
          <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <h3 class="empty-state-title">No upcoming reservations</h3>
        <p class="empty-state-desc">You don't have any active library reservations scheduled right now. Book a workstation, room, or reading seat to get started!</p>
        <button class="btn btn-primary" data-nav="library-seats">
          Reserve a Study Spot
        </button>
      </div>
    `;
  }

  // Render top 3 upcoming bookings
  const items = upcomingBookings.slice(0, 3).map(b => {
    const typeBadgeClass = getBadgeClassForType(b.bookingType);
    const typeLabel = getBookingTypeFriendly(b.bookingType);

    return `
      <div class="upcoming-booking-card">
        <div class="booking-date-block">
          <span class="booking-date-day">${formatShortDay(b.date)}</span>
          <span class="booking-date-num">${formatDayNumber(b.date)}</span>
          <span class="booking-date-month">${formatShortMonth(b.date)}</span>
        </div>
        <div class="booking-card-main">
          <div class="booking-card-tags">
            <span class="booking-type-tag ${typeBadgeClass}">${typeLabel}</span>
            <span class="booking-id-tag">#${escapeHtml(b.id)}</span>
            <span class="status-badge status-confirmed">Confirmed</span>
          </div>
          <h4 class="booking-card-title">${escapeHtml(b.resourceName)}</h4>
          <div class="booking-card-meta">
            <span class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${formatDisplayTime(b.startTime)} - ${formatDisplayTime(b.endTime)}
            </span>
            <span class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${escapeHtml(b.location)}
            </span>
            ${b.participants > 1 ? `
              <span class="meta-item">
                <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                ${b.participants} People
              </span>
            ` : ""}
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

function getBadgeClassForType(type) {
  switch (type) {
    case "computer": return "tag-computer";
    case "discussionRoom": return "tag-room";
    case "studyPlace": return "tag-study";
    case "librarySeat": return "tag-seat";
    default: return "tag-general";
  }
}

function getBookingTypeFriendly(type) {
  switch (type) {
    case "computer": return "Computer Lab";
    case "discussionRoom": return "Discussion Room";
    case "studyPlace": return "Study Place";
    case "librarySeat": return "Library Seat";
    default: return "Reservation";
  }
}

function formatShortDay(dateStr) {
  const parts = dateStr.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

function formatDayNumber(dateStr) {
  const parts = dateStr.split("-");
  return parts[2];
}

function formatShortMonth(dateStr) {
  const parts = dateStr.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString("en-US", { month: "short" });
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
