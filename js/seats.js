/**
 * seats.js - Interactive Visual Library Seat Map Controller
 * 
 * Renders an architectural layout of the Main Library Reading Hall:
 * - Row A: North Window Bay (Natural daylight, garden outlook)
 * - Row B: Central Quiet Core (Deep study, silent)
 * - Row C: Reference Stacks Deck (Adjacent to catalog & journals)
 * - Row D: South Courtyard Bay (Open airy terrace view)
 * 
 * Features dynamic occupancy calculations from localStorage bookings,
 * real-time date/slot switching, seat selection, summary panel, and
 * booking initiation with full validation.
 */

import { TIME_SLOTS } from "./data.js";
import { getResourcesByType, getResourceById, getBookings } from "./storage.js";
import {
  isResourceAvailable,
  formatDisplayDate,
  formatDisplayTime,
  formatDuration
} from "./booking.js";

function getTodayString() {
  return new Date().toISOString().split("T")[0];
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

export function renderLibrarySeatsView(container, onRequestBookingCallback) {
  let selectedDate = getTodayString();
  let selectedSlotId = TIME_SLOTS[1].id; // Default 10:00 - 12:00
  let selectedSeatId = null;

  function updateView() {
    const activeSlot = TIME_SLOTS.find(s => s.id === selectedSlotId) || TIME_SLOTS[0];
    const seats = getResourcesByType("librarySeat");
    const bookings = getBookings();

    // Group seats by row
    const rowDefinitions = [
      {
        row: "A",
        name: "North Window Bay",
        badge: "Natural Sunlight & Garden View",
        icon: "sun"
      },
      {
        row: "B",
        name: "Central Silent Core",
        badge: "Deep Concentration • Zero Noise",
        icon: "volume-x"
      },
      {
        row: "C",
        name: "Reference Stacks Deck",
        badge: "Adjacent to Research Journals",
        icon: "book-open"
      },
      {
        row: "D",
        name: "South Courtyard Deck",
        badge: "Spacious Desks & Courtyard Outlook",
        icon: "compass"
      }
    ];

    let totalSeats = seats.length;
    let availableCount = 0;
    let occupiedCount = 0;

    const seatsMap = {};
    seats.forEach(s => {
      const isAvail = isResourceAvailable(s.id, selectedDate, activeSlot.startTime, activeSlot.endTime, bookings);
      if (isAvail) availableCount++;
      else occupiedCount++;

      seatsMap[s.id] = {
        ...s,
        isAvailable: isAvail,
        isSelected: s.id === selectedSeatId
      };
    });

    const selectedSeat = selectedSeatId ? seatsMap[selectedSeatId] : null;

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Library Reading Seats</h1>
          <p class="view-subtitle">Select your preferred study desk on the interactive floor map of the Main Reading Hall.</p>
        </div>
      </div>

      <!-- Controls & Filter Bar -->
      <div class="booking-control-bar">
        <div class="control-group">
          <label for="seat-date-picker" class="control-label">Reservation Date</label>
          <input type="date" id="seat-date-picker" class="form-input" min="${getTodayString()}" value="${selectedDate}">
        </div>

        <div class="control-group flex-grow">
          <label class="control-label">Time Slot</label>
          <div class="slot-pills-row" id="seat-slot-pills">
            ${TIME_SLOTS.map(slot => `
              <button class="slot-pill-btn ${slot.id === selectedSlotId ? "active" : ""}" data-slot-id="${slot.id}" type="button">
                <span class="slot-time">${slot.startTime} - ${slot.endTime}</span>
                <span class="slot-period">${slot.period}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Live Floor Occupancy Stats & Legend Bar -->
      <div class="seat-map-topbar">
        <div class="floor-stats-pill-group">
          <span class="floor-pill pill-total"><strong>${totalSeats}</strong> Total Desks</span>
          <span class="floor-pill pill-avail"><strong>${availableCount}</strong> Available</span>
          <span class="floor-pill pill-full"><strong>${occupiedCount}</strong> Occupied</span>
          ${selectedSeat ? `<span class="floor-pill pill-selected"><strong>1</strong> Selected</span>` : ""}
        </div>

        <div class="legend-row">
          <span class="legend-badge"><span class="legend-dot dot-avail"></span> Available (Click to select)</span>
          <span class="legend-badge"><span class="legend-dot dot-occupied"></span> Occupied (Reserved)</span>
          <span class="legend-badge"><span class="legend-dot dot-selected"></span> Selected (Your choice)</span>
        </div>
      </div>

      <!-- Main Floor Map & Details Layout -->
      <div class="seat-view-grid">
        <!-- Visual Architectural Seat Map -->
        <div class="seat-map-wrapper">
          <!-- Architectural boundary: North Windows -->
          <div class="map-boundary-top">
            <div class="boundary-line"></div>
            <span class="boundary-label">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              North Window Wall • Natural Daylight Zone
            </span>
            <div class="boundary-line"></div>
          </div>

          <!-- Floor Plan Container -->
          <div class="floor-plan-container">
            ${rowDefinitions.map((rDef, idx) => {
              const rowSeats = [1, 2, 3, 4, 5].map(num => {
                const seatId = `LS-${rDef.row}0${num}`;
                return seatsMap[seatId] || null;
              }).filter(Boolean);

              return `
                <!-- Row Group: ${rDef.row} -->
                <div class="seat-row-block">
                  <div class="row-header">
                    <div class="row-tag">Row ${rDef.row}</div>
                    <div class="row-name">${escapeHtml(rDef.name)}</div>
                    <div class="row-badge">${escapeHtml(rDef.badge)}</div>
                  </div>

                  <!-- Desks Row with Aisle -->
                  <div class="seats-row-grid">
                    ${rowSeats.map((seat, sIdx) => {
                      let stateClass = "seat-avail";
                      let stateLabel = "Available";
                      if (!seat.isAvailable) {
                        stateClass = "seat-occupied";
                        stateLabel = "Occupied for Slot";
                      }
                      if (seat.isSelected) {
                        stateClass = "seat-selected";
                        stateLabel = "Selected";
                      }

                      // Insert an aisle marker after 3rd seat for realistic floor plan feel
                      const isAisleBefore = sIdx === 3;

                      return `
                        ${isAisleBefore ? `<div class="floor-aisle-marker" title="Central Pedestrian Aisle"><span>AISLE</span></div>` : ""}
                        <button
                          type="button"
                          class="seat-element ${stateClass}"
                          data-seat-id="${seat.id}"
                          ${!seat.isAvailable ? "disabled" : ""}
                          aria-label="${seat.name}, ${seat.rowName}, ${stateLabel}"
                          title="${seat.name} (${stateLabel})"
                        >
                          <div class="seat-top-notch"></div>
                          <div class="seat-code">${seat.code}</div>
                          <div class="seat-icon-container">
                            <svg class="seat-desk-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="3" y="4" width="18" height="12" rx="2"/>
                              <line x1="7" y1="20" x2="7" y2="16"/>
                              <line x1="17" y1="20" x2="17" y2="16"/>
                            </svg>
                          </div>
                          <div class="seat-status-caption">${stateLabel}</div>
                          ${seat.hasPower ? `<span class="seat-power-indicator" title="AC Power Outlet Available">&#9889;</span>` : ""}
                        </button>
                      `;
                    }).join("")}
                  </div>
                </div>

                ${idx === 1 ? `
                  <!-- Central Promenade & Stacks Boundary -->
                  <div class="main-walkway-divider">
                    <span class="walkway-arrow">&larr;</span>
                    <span class="walkway-title">MAIN LIBRARY WALKWAY • QUIET PLEASE</span>
                    <span class="walkway-arrow">&rarr;</span>
                  </div>
                ` : ""}
              `;
            }).join("")}
          </div>

          <!-- Architectural boundary: South Garden View -->
          <div class="map-boundary-bottom">
            <div class="boundary-line"></div>
            <span class="boundary-label">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 0-7.07 17.07C7.62 21.75 12 22 12 22s4.38-.25 7.07-2.93A10 10 0 0 0 12 2z"/></svg>
              South Courtyard Terrace • Outdoor Garden Boundary
            </span>
            <div class="boundary-line"></div>
          </div>
        </div>

        <!-- Selected Seat Summary & Confirmation Sidebar -->
        <div class="seat-summary-sidebar">
          <h3 class="summary-title">Seat Details & Booking</h3>

          ${selectedSeat ? `
            <div class="summary-card">
              <div class="summary-badge-row">
                <span class="summary-chip-lab">${escapeHtml(selectedSeat.rowName)}</span>
                <span class="summary-chip-id">${escapeHtml(selectedSeat.code)}</span>
              </div>
              <h4 class="summary-item-name">${escapeHtml(selectedSeat.name)}</h4>
              <p class="summary-item-loc">${escapeHtml(selectedSeat.location)}</p>

              <div class="summary-details-list">
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-val">${formatDisplayDate(selectedDate)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time Slot:</span>
                  <span class="detail-val">${activeSlot.startTime} - ${activeSlot.endTime} (${formatDuration(activeSlot.startTime, activeSlot.endTime)})</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Study Zone:</span>
                  <span class="detail-val text-sm">${escapeHtml(selectedSeat.zone)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Desk Amenities:</span>
                  <span class="detail-val text-sm">${selectedSeat.features.join(", ")}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Power Outlet:</span>
                  <span class="detail-val text-success">Included (AC Socket + USB)</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Cost:</span>
                  <span class="detail-val text-success">Free (Student Pass)</span>
                </div>
              </div>

              <div class="summary-actions">
                <button class="btn btn-primary btn-block" id="btn-confirm-seat-booking">
                  Confirm Seat Reservation
                </button>
                <button class="btn btn-outline btn-block" id="btn-clear-seat-selection">
                  Deselect Seat
                </button>
              </div>
            </div>
          ` : `
            <div class="summary-empty-state">
              <div class="empty-icon-circle">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <h4>No Seat Selected</h4>
              <p>Click on any available green seat on the floor map to review desk details and book your spot.</p>
            </div>
          `}

          <!-- Library Reading Zone Etiquette -->
          <div class="guidelines-box">
            <h5 class="guidelines-title">
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Reading Hall Etiquette
            </h5>
            <ul class="guidelines-list">
              <li>Each student may reserve 1 individual seat per time slot.</li>
              <li>Please keep personal belongings within your desk space.</li>
              <li>Seats held for 15 minutes after start time before release.</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Attach event listeners
    // 1. Date change
    const dateInput = container.querySelector("#seat-date-picker");
    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        selectedDate = e.target.value;
        if (selectedSeatId && !isResourceAvailable(selectedSeatId, selectedDate, activeSlot.startTime, activeSlot.endTime)) {
          selectedSeatId = null;
        }
        updateView();
      });
    }

    // 2. Slot pills
    container.querySelectorAll("#seat-slot-pills .slot-pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedSlotId = btn.getAttribute("data-slot-id");
        const newSlot = TIME_SLOTS.find(s => s.id === selectedSlotId);
        if (selectedSeatId && newSlot && !isResourceAvailable(selectedSeatId, selectedDate, newSlot.startTime, newSlot.endTime)) {
          selectedSeatId = null;
        }
        updateView();
      });
    });

    // 3. Seat element clicks
    container.querySelectorAll(".seat-element:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        const seatId = btn.getAttribute("data-seat-id");
        selectedSeatId = (selectedSeatId === seatId) ? null : seatId;
        updateView();
      });
    });

    // 4. Confirm booking
    const btnConfirm = container.querySelector("#btn-confirm-seat-booking");
    if (btnConfirm && selectedSeat) {
      btnConfirm.addEventListener("click", () => {
        onRequestBookingCallback({
          resource: selectedSeat,
          date: selectedDate,
          startTime: activeSlot.startTime,
          endTime: activeSlot.endTime,
          participants: 1,
          bookingType: "librarySeat"
        }, () => {
          selectedSeatId = null;
          updateView();
        });
      });
    }

    const btnClear = container.querySelector("#btn-clear-seat-selection");
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        selectedSeatId = null;
        updateView();
      });
    }
  }

  updateView();
}
