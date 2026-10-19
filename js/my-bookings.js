/**
 * my-bookings.js - Simplified, Compact Bookings Management
 * 
 * Features:
 * - Simple compact table with Resource, Date, Time, Status, Actions
 * - Functional status tabs, filters, and real-time search
 * - Cancellation with confirmation modal & history preservation
 * - Clear empty state
 */

import { getUserBookings, getCurrentUser } from "./storage.js";
import {
  formatDisplayDate,
  formatDisplayTime
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
  let activeStatusFilter = "all";
  let activeTypeFilter = "all";
  let activeDateFilter = "all";
  let searchQuery = "";

  function updateView() {
    const user = getCurrentUser();
    const allUserBookings = getUserBookings(user.id);
    const today = getTodayString();

    const statusCounts = {
      all: allUserBookings.length,
      upcoming: allUserBookings.filter(b => b.status === "confirmed" && b.date >= today).length,
      completed: allUserBookings.filter(b => b.status === "completed" || (b.status === "confirmed" && b.date < today)).length,
      cancelled: allUserBookings.filter(b => b.status === "cancelled").length
    };

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
        const matchesLocation = (b.location || "").toLowerCase().includes(query);
        if (!matchesId && !matchesResource && !matchesLocation) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.startTime.localeCompare(a.startTime);
    });

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">My Bookings</h1>
        <p class="view-subtitle">Review, inspect details, or cancel your library reservations.</p>
      </div>

      <!-- Status Filter Tabs -->
      <div class="booking-status-tabs" role="tablist">
        <button class="status-tab ${activeStatusFilter === "all" ? "active" : ""}" data-status="all" role="tab">
          All Bookings (${statusCounts.all})
        </button>
        <button class="status-tab ${activeStatusFilter === "upcoming" ? "active" : ""}" data-status="upcoming" role="tab">
          Upcoming (${statusCounts.upcoming})
        </button>
        <button class="status-tab ${activeStatusFilter === "completed" ? "active" : ""}" data-status="completed" role="tab">
          Completed (${statusCounts.completed})
        </button>
        <button class="status-tab ${activeStatusFilter === "cancelled" ? "active" : ""}" data-status="cancelled" role="tab">
          Cancelled (${statusCounts.cancelled})
        </button>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="bookings-toolbar">
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input 
            type="text" 
            id="bookings-search-input" 
            class="search-input" 
            placeholder="Search bookings by ID, room, or seat..." 
            value="${escapeHtml(searchQuery)}"
          >
          ${searchQuery ? `<button type="button" id="btn-clear-search" class="clear-search-btn">&times;</button>` : ""}
        </div>

        <div class="toolbar-select-group">
          <select id="filter-type-select" class="form-select form-select-sm">
            <option value="all" ${activeTypeFilter === "all" ? "selected" : ""}>All Facilities</option>
            <option value="computer" ${activeTypeFilter === "computer" ? "selected" : ""}>Computer Labs</option>
            <option value="discussionRoom" ${activeTypeFilter === "discussionRoom" ? "selected" : ""}>Discussion Rooms</option>
            <option value="studyPlace" ${activeTypeFilter === "studyPlace" ? "selected" : ""}>Study Room</option>
            <option value="librarySeat" ${activeTypeFilter === "librarySeat" ? "selected" : ""}>Library Seats</option>
          </select>
        </div>

        <div class="toolbar-select-group">
          <select id="filter-date-select" class="form-select form-select-sm">
            <option value="all" ${activeDateFilter === "all" ? "selected" : ""}>All Dates</option>
            <option value="today" ${activeDateFilter === "today" ? "selected" : ""}>Today</option>
            <option value="upcoming" ${activeDateFilter === "upcoming" ? "selected" : ""}>Upcoming</option>
            <option value="past" ${activeDateFilter === "past" ? "selected" : ""}>Past</option>
          </select>
        </div>

        ${(activeTypeFilter !== "all" || activeDateFilter !== "all" || searchQuery) ? `
          <button class="btn btn-outline-sm" id="btn-reset-filters">
            Reset
          </button>
        ` : ""}
      </div>

      <!-- Bookings Table -->
      <div class="bookings-list-container">
        ${renderBookingsTable(filteredBookings, today)}
      </div>
    `;

    // Event listeners
    container.querySelectorAll(".status-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        activeStatusFilter = tab.getAttribute("data-status");
        updateView();
      });
    });

    const searchInput = container.querySelector("#bookings-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        updateView();
        const updated = container.querySelector("#bookings-search-input");
        if (updated) {
          updated.focus();
          updated.setSelectionRange(updated.value.length, updated.value.length);
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

    const typeSelect = container.querySelector("#filter-type-select");
    if (typeSelect) {
      typeSelect.addEventListener("change", (e) => {
        activeTypeFilter = e.target.value;
        updateView();
      });
    }

    const dateSelect = container.querySelector("#filter-date-select");
    if (dateSelect) {
      dateSelect.addEventListener("change", (e) => {
        activeDateFilter = e.target.value;
        updateView();
      });
    }

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

    container.querySelectorAll("[data-action='view-details']").forEach(btn => {
      btn.addEventListener("click", () => {
        const bId = btn.getAttribute("data-id");
        if (bId && onOpenDetailsCallback) {
          onOpenDetailsCallback(bId);
        }
      });
    });

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
 * Render compact table of bookings or clear empty state
 */
function renderBookingsTable(bookings, today) {
  if (bookings.length === 0) {
    return `
      <div class="empty-state-card">
        <h3 class="empty-state-title">No bookings found</h3>
        <p class="empty-state-desc">No reservations match the selected filters. Try clearing your search query or selecting all dates.</p>
      </div>
    `;
  }

  return `
    <div class="bookings-table-wrapper">
      <table class="bookings-table">
        <thead>
          <tr>
            <th>Resource</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
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

            return `
              <tr>
                <td>
                  <div style="font-weight: 600;">${escapeHtml(b.resourceName)}</div>
                  <div style="font-size: 11px; color: var(--color-text-secondary);">${escapeHtml(b.location)} • <span style="font-family: monospace;">#${escapeHtml(b.id)}</span></div>
                </td>
                <td>${formatDisplayDate(b.date)}</td>
                <td>${formatDisplayTime(b.startTime)} - ${formatDisplayTime(b.endTime)}</td>
                <td>
                  <span class="status-badge ${statusClass}">${statusLabel}</span>
                </td>
                <td style="text-align: right;">
                  <div class="bookings-table-actions" style="justify-content: flex-end;">
                    <button class="btn btn-secondary-sm" data-action="view-details" data-id="${escapeHtml(b.id)}">
                      View
                    </button>
                    ${isUpcoming ? `
                      <button class="btn btn-outline-danger-sm" data-action="cancel-booking" data-id="${escapeHtml(b.id)}">
                        Cancel
                      </button>
                    ` : ""}
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}
