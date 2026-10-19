/**
 * seats.js - Clean, Uniform Interactive Library Seat Map
 * 
 * Implements the standard 6-step pattern:
 * 1. Small title & one-line description
 * 2. Date and time selection
 * 3. Resource selection (Architectural seat map)
 * 4. Clear availability display & legend
 * 5. Compact booking summary
 * 6. Prominent confirmation button
 */

import { TIME_SLOTS } from "./data.js";
import { getResourcesByType, getBookings } from "./storage.js";
import {
  isResourceAvailable,
  formatDisplayDate
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
  let selectedSlotId = TIME_SLOTS[1].id;
  let selectedSeatId = null;

  function updateView() {
    const activeSlot = TIME_SLOTS.find(s => s.id === selectedSlotId) || TIME_SLOTS[0];
    const seats = getResourcesByType("librarySeat");
    const bookings = getBookings();

    const rowDefinitions = [
      { row: "A", name: "North Window Bay" },
      { row: "B", name: "Central Silent Core" },
      { row: "C", name: "Reference Stacks Deck" },
      { row: "D", name: "South Courtyard Deck" }
    ];

    let totalSeats = seats.length;
    let availableCount = 0;

    const seatsMap = {};
    seats.forEach(s => {
      const isAvail = isResourceAvailable(s.id, selectedDate, activeSlot.startTime, activeSlot.endTime, bookings);
      if (isAvail) availableCount++;

      seatsMap[s.id] = {
        ...s,
        isAvailable: isAvail,
        isSelected: s.id === selectedSeatId
      };
    });

    const selectedSeat = selectedSeatId ? seatsMap[selectedSeatId] : null;

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Library Seats</h1>
        <p class="view-subtitle">Select an individual reading desk on the interactive floor map.</p>
      </div>

      <!-- Date & Time Selection -->
      <div class="booking-control-bar">
        <div class="control-group">
          <label for="seat-date-picker" class="control-label">Date</label>
          <input type="date" id="seat-date-picker" class="form-input" min="${getTodayString()}" value="${selectedDate}">
        </div>

        <div class="control-group flex-grow">
          <label class="control-label">Time Slot</label>
          <div class="slot-pills-row" id="seat-slot-pills">
            ${TIME_SLOTS.map(slot => `
              <button class="slot-pill-btn ${slot.id === selectedSlotId ? "active" : ""}" data-slot-id="${slot.id}" type="button">
                ${slot.startTime} - ${slot.endTime}
              </button>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Main Layout: Map + Summary -->
      <div class="seat-view-grid">
        <!-- Visual Seat Map -->
        <div class="seat-map-wrapper">
          <div class="section-title-row">
            <h2 class="subsection-title">Reading Hall (${availableCount} of ${totalSeats} available)</h2>
            <div class="legend-row">
              <span class="legend-badge"><span class="legend-dot dot-avail"></span> Available</span>
              <span class="legend-badge"><span class="legend-dot dot-occupied"></span> Occupied</span>
              <span class="legend-badge"><span class="legend-dot dot-selected"></span> Selected</span>
            </div>
          </div>

          <div class="floor-plan-container">
            ${rowDefinitions.map(rDef => {
              const rowSeats = [1, 2, 3, 4, 5].map(num => {
                const seatId = `LS-${rDef.row}0${num}`;
                return seatsMap[seatId] || null;
              }).filter(Boolean);

              return `
                <div class="seat-row-block">
                  <div class="row-header">
                    <span class="row-tag">Row ${rDef.row}</span>
                    <span class="row-name">${escapeHtml(rDef.name)}</span>
                  </div>

                  <div class="seats-row-grid">
                    ${rowSeats.map(seat => {
                      let stateClass = "seat-avail";
                      let stateLabel = "Available";
                      if (!seat.isAvailable) {
                        stateClass = "seat-occupied";
                        stateLabel = "Occupied";
                      }
                      if (seat.isSelected) {
                        stateClass = "seat-selected";
                        stateLabel = "Selected";
                      }

                      return `
                        <button
                          type="button"
                          class="seat-element ${stateClass}"
                          data-seat-id="${seat.id}"
                          ${!seat.isAvailable ? "disabled" : ""}
                          aria-label="${seat.name}, ${stateLabel}"
                          title="${seat.name} (${stateLabel})"
                        >
                          <span class="seat-code">${seat.code}</span>
                          <span class="seat-status-caption">${stateLabel}</span>
                          ${seat.hasPower ? `<span class="seat-power-indicator" title="Power Outlet">&#9889;</span>` : ""}
                        </button>
                      `;
                    }).join("")}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Compact Booking Summary Panel -->
        <div class="seat-summary-sidebar">
          <h2 class="summary-title">Booking Summary</h2>

          ${selectedSeat ? `
            <div class="summary-card">
              <div>
                <h3 class="summary-item-name">${escapeHtml(selectedSeat.name)}</h3>
                <p class="summary-item-loc">${escapeHtml(selectedSeat.rowName)} • ${escapeHtml(selectedSeat.location)}</p>
              </div>

              <div class="summary-details-list">
                <div class="detail-row">
                  <span class="detail-label">Date</span>
                  <span class="detail-val">${formatDisplayDate(selectedDate)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time</span>
                  <span class="detail-val">${activeSlot.startTime} - ${activeSlot.endTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Desk Code</span>
                  <span class="detail-val">${escapeHtml(selectedSeat.code)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Power Outlet</span>
                  <span class="detail-val">${selectedSeat.hasPower ? "Included" : "None"}</span>
                </div>
              </div>

              <div class="summary-actions">
                <button class="btn btn-primary btn-block" id="btn-confirm-seat-booking">
                  Confirm Seat Reservation
                </button>
                <button class="btn btn-secondary-sm btn-block" id="btn-clear-seat-selection">
                  Deselect
                </button>
              </div>
            </div>
          ` : `
            <div class="summary-empty-state">
              <p>Select an available seat on the floor map to review details and confirm.</p>
            </div>
          `}
        </div>
      </div>
    `;

    // Event listeners
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

    container.querySelectorAll(".seat-element:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        const seatId = btn.getAttribute("data-seat-id");
        selectedSeatId = (selectedSeatId === seatId) ? null : seatId;
        updateView();
      });
    });

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
