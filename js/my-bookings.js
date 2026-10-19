/**
 * my-bookings.js - Booking Management, Filtering & Cancellation View
 * 
 * Allows students to inspect all reservations, filter by facility type,
 * status (Confirmed, Cancelled, Completed), or date range, view detailed
 * booking passes, and cancel active reservations with confirmation modals.
 */

import { getUserBookings, getCurrentUser } from "./storage.js";
import {
  formatDisplayDate,
  formatDisplayTime,
  formatDuration
} from "./booking.js";

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

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export function renderMyBookingsView(container, onOpenDetailsCallback, onRequestCancelCallback) {
  let activeStatusFilter = "all"; // 'all' | 'upcoming' | 'completed' | 'cancelled'
  let activeTypeFilter = "all"; // 'all' | 'computer' | 'discussionRoom' | 'studyPlace' | 'librarySeat'
  let activeDateFilter = "all"; // 'all' | 'today' | 'upcoming' | 'past'
  let searchQuery = "";

  function updateView() {
    const user = getCurrentUser();
    const allUserBookings = getUserBookings(user.id);
    const today = getTodayString();

    // Compute status counts for filter tabs
    const statusCounts = {
      all: allUserBookings.length,
      upcoming: allUserBookings.filter(b => b.status === "confirmed" && b.date >= today).length,
      completed: allUserBookings.filter(b => b.status === "completed" || (b.status === "confirmed" && b.date < today)).length,
      cancelled: allUserBookings.filter(b => b.status === "cancelled").length
    };

    // Filter bookings based on selections
    const filteredBookings = allUserBookings.filter(b => {
      // 1. Status Filter
      if (activeStatusFilter === "upcoming") {
        if (b.status !== "confirmed" || b.date < today) return false;
      } else if (activeStatusFilter === "completed") {
        if (b.status !== "completed" && !(b.status === "confirmed" && b.date < today)) return false;
      } else if (activeStatusFilter === "cancelled") {
        if (b.status !== "cancelled") return false;
      }

      // 2. Type Filter
      if (activeTypeFilter !== "all" && b.bookingType !== activeTypeFilter) {
        return false;
      }

      // 3. Date Filter
      if (activeDateFilter === "today" && b.date !== today) return false;
      if (activeDateFilter === "upcoming" && b.date < today) return false;
      if (activeDateFilter === "past" && b.date >= today) return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = b.id.toLowerCase().includes(query);
        const matchesResource = b.resourceName.toLowerCase().includes(query);
        const matchesFacility = (b.facilityName || "").toLowerCase().includes(query);
        const matchesLocation = (b.location || "").toLowerCase().includes(query);
        if (!matchesId && !matchesResource && !matchesFacility && !matchesLocation) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort newest dates first, or upcoming first
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.startTime.localeCompare(a.startTime);
    });

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">My Reservations & History</h1>
          <p class="view-subtitle">Review, manage, or cancel your campus study spaces and lab workstation bookings.</p>
        </div>
      </div>

      <!-- Status Tabs Bar -->
      <div class="booking-status-tabs" role="tablist">
        <button class="status-tab ${activeStatusFilter === "all" ? "active" : ""}" data-status="all" role="tab">
          All Bookings <span class="tab-count">${statusCounts.all}</span>
        </button>
        <button class="status-tab ${activeStatusFilter === "upcoming" ? "active" : ""}" data-status="upcoming" role="tab">
          Upcoming Active <span class="tab-count count-green">${statusCounts.upcoming}</span>
        </button>
        <button class="status-tab ${activeStatusFilter === "completed" ? "active" : ""}" data-status="completed" role="tab">
          Completed <span class="tab-count">${statusCounts.completed}</span>
        </button>
        <button class="status-tab ${activeStatusFilter === "cancelled" ? "active" : ""}" data-status="cancelled" role="tab">
          Cancelled <span class="tab-count count-red">${statusCounts.cancelled}</span>
        </button>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="bookings-toolbar">
        <!-- Search Input -->
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input 
            type="text" 
            id="bookings-search-input" 
            class="search-input" 
            placeholder="Search by Booking ID (e.g. LH-10021), seat, or lab name..." 
            value="${escapeHtml(searchQuery)}"
          >
          ${searchQuery ? `<button type="button" id="btn-clear-search" class="clear-search-btn">&times;</button>` : ""}
        </div>

        <!-- Facility Type Select -->
        <div class="toolbar-select-group">
          <label for="filter-type-select" class="sr-only">Filter by Facility</label>
          <select id="filter-type-select" class="form-select">
            <option value="all" ${activeTypeFilter === "all" ? "selected" : ""}>All Facility Types</option>
            <option value="computer" ${activeTypeFilter === "computer" ? "selected" : ""}>Computer Workstations</option>
            <option value="discussionRoom" ${activeTypeFilter === "discussionRoom" ? "selected" : ""}>Discussion Rooms</option>
            <option value="studyPlace" ${activeTypeFilter === "studyPlace" ? "selected" : ""}>Honors Study Places</option>
            <option value="librarySeat" ${activeTypeFilter === "librarySeat" ? "selected" : ""}>Library Reading Seats</option>
          </select>
        </div>

        <!-- Date Range Filter -->
        <div class="toolbar-select-group">
          <label for="filter-date-select" class="sr-only">Filter by Date</label>
          <select id="filter-date-select" class="form-select">
            <option value="all" ${activeDateFilter === "all" ? "selected" : ""}>All Dates</option>
            <option value="today" ${activeDateFilter === "today" ? "selected" : ""}>Today Only</option>
            <option value="upcoming" ${activeDateFilter === "upcoming" ? "selected" : ""}>Future Dates</option>
            <option value="past" ${activeDateFilter === "past" ? "selected" : ""}>Past Dates</option>
          </select>
        </div>

        ${(activeTypeFilter !== "all" || activeDateFilter !== "all" || searchQuery) ? `
          <button class="btn btn-outline-sm" id="btn-reset-filters">
            Reset Filters
          </button>
        ` : ""}
      </div>

      <!-- Bookings List Container -->
      <div class="bookings-list-container">
        ${renderBookingsList(filteredBookings, today)}
      </div>
    `;

    // Attach event listeners
    // 1. Status tabs
    container.querySelectorAll(".status-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        activeStatusFilter = tab.getAttribute("data-status");
        updateView();
      });
    });

    // 2. Search input
    const searchInput = container.querySelector("#bookings-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        // Debounce not needed for local array, but quick timeout ensures smooth typing
        updateView();
        const updatedInput = container.querySelector("#bookings-search-input");
        if (updatedInput) {
          updatedInput.focus();
          updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
        }
      });
    }

    const btnClearSearch = container.querySelector("#btn-clear-search");
    if (btnClearSearch) {
      btnClearSearch.addEventListener("click", () => {
        searchQuery = "";
        updateView();
      });
    }

    // 3. Type select
    const typeSelect = container.querySelector("#filter-type-select");
    if (typeSelect) {
      typeSelect.addEventListener("change", (e) => {
        activeTypeFilter = e.target.value;
        updateView();
      });
    }

    // 4. Date select
    const dateSelect = container.querySelector("#filter-date-select");
    if (dateSelect) {
      dateSelect.addEventListener("change", (e) => {
        activeDateFilter = e.target.value;
        updateView();
      });
    }

    // 5. Reset filters
    const btnReset = container.querySelector("#btn-reset-filters");
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        activeStatusFilter = "all";
        activeTypeFilter = "all";
        activeDateFilter = "all";
        searchQuery = "";
        updateView();
      });
    }

    // 6. View Details buttons
    container.querySelectorAll("[data-action='view-details']").forEach(btn => {
      btn.addEventListener("click", () => {
        const bId = btn.getAttribute("data-id");
        if (bId && onOpenDetailsCallback) {
          onOpenDetailsCallback(bId);
        }
      });
    });

    // 7. Cancel Booking buttons
    container.querySelectorAll("[data-action='cancel-booking']").forEach(btn => {
      btn.addEventListener("click", () => {
        const bId = btn.getAttribute("data-id");
        if (bId && onRequestCancelCallback) {
          onRequestCancelCallback(bId, () => {
            updateView();
          });
        }
      });
    });
  }

  updateView();
}

/**
 * Render bookings list or empty states
 */
function renderBookingsList(bookings, today) {
  if (bookings.length === 0) {
    return `
      <div class="empty-state-card">
        <div class="empty-state-icon">
          <svg class="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <h3 class="empty-state-title">No reservations found</h3>
        <p class="empty-state-desc">No bookings match your current filter criteria. Try adjusting the search term, date range, or facility type.</p>
      </div>
    `;
  }

  return `
    <div class="bookings-grid-list">
      ${bookings.map(b => {
        const isUpcoming = b.status === "confirmed" && b.date >= today;
        const isCancelled = b.status === "cancelled";
        const isPast = b.date < today || b.status === "completed";

        let statusClass = "status-confirmed";
        let statusLabel = "Confirmed";
        if (isCancelled) {
          statusClass = "status-cancelled";
          statusLabel = "Cancelled";
        } else if (isPast) {
          statusClass = "status-completed";
          statusLabel = "Completed";
        }

        const typeBadgeClass = getBadgeClassForType(b.bookingType);
        const typeLabel = getBookingTypeFriendly(b.bookingType);

        return `
          <div class="booking-item-card ${isCancelled ? "item-cancelled" : ""}">
            <div class="item-card-header">
              <div class="item-tags-row">
                <span class="booking-type-tag ${typeBadgeClass}">${typeLabel}</span>
                <span class="booking-id-tag">#${escapeHtml(b.id)}</span>
              </div>
              <span class="status-badge ${statusClass}">${statusLabel}</span>
            </div>

            <div class="item-card-body">
              <h3 class="item-resource-name">${escapeHtml(b.resourceName)}</h3>
              <div class="item-facility-name">${escapeHtml(b.facilityName || "")}</div>

              <div class="item-meta-grid">
                <div class="item-meta-cell">
                  <span class="meta-label">Date</span>
                  <span class="meta-value">${formatDisplayDate(b.date)}</span>
                </div>
                <div class="item-meta-cell">
                  <span class="meta-label">Time Interval</span>
                  <span class="meta-value">${formatDisplayTime(b.startTime)} - ${formatDisplayTime(b.endTime)}</span>
                </div>
                <div class="item-meta-cell">
                  <span class="meta-label">Location</span>
                  <span class="meta-value">${escapeHtml(b.location)}</span>
                </div>
                <div class="item-meta-cell">
                  <span class="meta-label">${b.bookingType === "discussionRoom" ? "Participants" : "Duration"}</span>
                  <span class="meta-value">
                    ${b.bookingType === "discussionRoom" ? `${b.participants} People` : formatDuration(b.startTime, b.endTime)}
                  </span>
                </div>
              </div>

              ${isCancelled && b.cancellationReason ? `
                <div class="cancellation-notice-box">
                  <strong>Cancellation Note:</strong> ${escapeHtml(b.cancellationReason)}
                </div>
              ` : ""}
            </div>

            <div class="item-card-actions">
              <button class="btn btn-secondary-sm" data-action="view-details" data-id="${escapeHtml(b.id)}">
                View Details
              </button>

              ${isUpcoming ? `
                <button class="btn btn-outline-danger-sm" data-action="cancel-booking" data-id="${escapeHtml(b.id)}">
                  Cancel Reservation
                </button>
              ` : ""}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
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
