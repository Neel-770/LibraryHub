/**
 * resources.js - Clean, Unified Facility Views
 * 
 * Implements the standard 6-step pattern:
 * 1. Small title & one-line description
 * 2. Date and time selection
 * 3. Resource selection
 * 4. Clear availability display
 * 5. Compact booking summary
 * 6. Prominent confirmation button
 */

import { COMPUTER_LABS, TIME_SLOTS } from "./data.js";
import {
  getResourcesByType,
  getResourcesByParent,
  getResourceById,
  getBookings
} from "./storage.js";
import {
  isResourceAvailable,
  formatDisplayDate
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

// ============================================================================
// 1. COMPUTER LABS VIEW
// ============================================================================

export function renderComputerLabsView(container, onRequestBookingCallback) {
  let selectedLabId = COMPUTER_LABS[0].id;
  let selectedDate = getTodayString();
  let selectedSlotId = TIME_SLOTS[1].id;
  let selectedComputerId = null;

  function updateView() {
    const activeSlot = TIME_SLOTS.find(s => s.id === selectedSlotId) || TIME_SLOTS[0];
    const currentLab = COMPUTER_LABS.find(l => l.id === selectedLabId) || COMPUTER_LABS[0];
    const computersInLab = getResourcesByParent(selectedLabId);
    const bookings = getBookings();

    let availableCount = 0;
    const computersWithStatus = computersInLab.map(pc => {
      const isAvail = isResourceAvailable(pc.id, selectedDate, activeSlot.startTime, activeSlot.endTime, bookings);
      if (isAvail) availableCount++;
      return {
        ...pc,
        isAvailable: isAvail,
        isSelected: pc.id === selectedComputerId
      };
    });

    const selectedComputer = selectedComputerId ? getResourceById(selectedComputerId) : null;

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Computer Labs</h1>
        <p class="view-subtitle">Select a lab and workstation to reserve your computer session.</p>
      </div>

      <!-- Lab Selector Tabs -->
      <div class="lab-selector-tabs" role="tablist">
        ${COMPUTER_LABS.map(lab => `
          <button class="lab-tab-btn ${lab.id === selectedLabId ? "active" : ""}" data-lab-id="${lab.id}" role="tab" aria-selected="${lab.id === selectedLabId}">
            <div class="tab-title">${escapeHtml(lab.shortName)}</div>
            <div class="tab-subtitle">${escapeHtml(lab.location)}</div>
          </button>
        `).join("")}
      </div>

      <!-- Date & Time Selection -->
      <div class="booking-control-bar">
        <div class="control-group">
          <label for="lab-date-picker" class="control-label">Date</label>
          <input type="date" id="lab-date-picker" class="form-input" min="${getTodayString()}" value="${selectedDate}">
        </div>

        <div class="control-group flex-grow">
          <label class="control-label">Time Slot</label>
          <div class="slot-pills-row" id="lab-slot-pills">
            ${TIME_SLOTS.map(slot => `
              <button class="slot-pill-btn ${slot.id === selectedSlotId ? "active" : ""}" data-slot-id="${slot.id}" type="button">
                ${slot.startTime} - ${slot.endTime}
              </button>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Main Layout: Grid + Summary -->
      <div class="facility-layout-grid">
        <!-- Resource Selection Grid -->
        <div class="computers-grid-container">
          <div class="section-title-row">
            <h2 class="subsection-title">${escapeHtml(currentLab.name)} (${availableCount} of ${computersInLab.length} available)</h2>
            <div class="legend-row">
              <span class="legend-badge"><span class="legend-dot dot-avail"></span> Available</span>
              <span class="legend-badge"><span class="legend-dot dot-occupied"></span> Reserved</span>
              <span class="legend-badge"><span class="legend-dot dot-selected"></span> Selected</span>
            </div>
          </div>

          <div class="pc-workstations-grid">
            ${computersWithStatus.map(pc => {
              let stateClass = "pc-avail";
              let labelText = "Available";
              if (!pc.isAvailable) {
                stateClass = "pc-occupied";
                labelText = "Reserved";
              }
              if (pc.isSelected) {
                stateClass = "pc-selected";
                labelText = "Selected";
              }

              return `
                <button 
                  type="button" 
                  class="pc-card ${stateClass}" 
                  data-pc-id="${pc.id}" 
                  ${!pc.isAvailable ? "disabled" : ""}
                  aria-label="${pc.name}, ${labelText}"
                >
                  <div class="pc-card-header">
                    <span class="pc-id-label">${pc.id.replace("PC-", "")}</span>
                    <span class="pc-status-dot"></span>
                  </div>
                  <div class="pc-card-name">${escapeHtml(pc.name)}</div>
                  <div class="pc-card-status">${labelText}</div>
                </button>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Compact Booking Summary Panel -->
        <div class="booking-summary-panel">
          <h2 class="summary-title">Booking Summary</h2>
          
          ${selectedComputer ? `
            <div class="summary-card">
              <div>
                <h3 class="summary-item-name">${escapeHtml(selectedComputer.name)}</h3>
                <p class="summary-item-loc">${escapeHtml(currentLab.shortName)} • ${escapeHtml(selectedComputer.location)}</p>
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
                  <span class="detail-label">Workstation</span>
                  <span class="detail-val">${escapeHtml(selectedComputer.id)}</span>
                </div>
              </div>

              <div class="summary-actions">
                <button class="btn btn-primary btn-block" id="btn-confirm-pc-booking">
                  Confirm Reservation
                </button>
                <button class="btn btn-secondary-sm btn-block" id="btn-clear-pc-selection">
                  Deselect
                </button>
              </div>
            </div>
          ` : `
            <div class="summary-empty-state">
              <p>Select an available workstation to review details and confirm.</p>
            </div>
          `}
        </div>
      </div>
    `;

    // Event listeners
    container.querySelectorAll(".lab-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedLabId = btn.getAttribute("data-lab-id");
        selectedComputerId = null;
        updateView();
      });
    });

    const dateInput = container.querySelector("#lab-date-picker");
    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        selectedDate = e.target.value;
        if (selectedComputerId && !isResourceAvailable(selectedComputerId, selectedDate, activeSlot.startTime, activeSlot.endTime)) {
          selectedComputerId = null;
        }
        updateView();
      });
    }

    container.querySelectorAll("#lab-slot-pills .slot-pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedSlotId = btn.getAttribute("data-slot-id");
        const newSlot = TIME_SLOTS.find(s => s.id === selectedSlotId);
        if (selectedComputerId && newSlot && !isResourceAvailable(selectedComputerId, selectedDate, newSlot.startTime, newSlot.endTime)) {
          selectedComputerId = null;
        }
        updateView();
      });
    });

    container.querySelectorAll(".pc-card:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        const pcId = btn.getAttribute("data-pc-id");
        selectedComputerId = (selectedComputerId === pcId) ? null : pcId;
        updateView();
      });
    });

    const btnConfirm = container.querySelector("#btn-confirm-pc-booking");
    if (btnConfirm && selectedComputer) {
      btnConfirm.addEventListener("click", () => {
        onRequestBookingCallback({
          resource: selectedComputer,
          date: selectedDate,
          startTime: activeSlot.startTime,
          endTime: activeSlot.endTime,
          participants: 1,
          bookingType: "computer"
        }, () => {
          selectedComputerId = null;
          updateView();
        });
      });
    }

    const btnClear = container.querySelector("#btn-clear-pc-selection");
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        selectedComputerId = null;
        updateView();
      });
    }
  }

  updateView();
}

// ============================================================================
// 2. DISCUSSION ROOMS VIEW
// ============================================================================

export function renderDiscussionRoomsView(container, onRequestBookingCallback) {
  let selectedDate = getTodayString();
  let selectedSlotId = TIME_SLOTS[1].id;
  let participantsCount = 4;
  let selectedRoomId = null;

  function updateView() {
    const activeSlot = TIME_SLOTS.find(s => s.id === selectedSlotId) || TIME_SLOTS[0];
    const rooms = getResourcesByType("discussionRoom");
    const bookings = getBookings();

    const roomsWithStatus = rooms.map(room => {
      const isAvail = isResourceAvailable(room.id, selectedDate, activeSlot.startTime, activeSlot.endTime, bookings);
      const isCapacitySufficient = participantsCount <= room.capacity;
      return {
        ...room,
        isAvailable: isAvail,
        isCapacitySufficient,
        isSelected: room.id === selectedRoomId
      };
    });

    const availableCount = roomsWithStatus.filter(r => r.isAvailable && r.isCapacitySufficient).length;
    const selectedRoom = selectedRoomId ? getResourceById(selectedRoomId) : null;

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Discussion Rooms</h1>
        <p class="view-subtitle">Reserve an entire collaboration room for your study group.</p>
      </div>

      <!-- Date, Time & Participant Controls -->
      <div class="booking-control-bar">
        <div class="control-group">
          <label for="room-date-picker" class="control-label">Date</label>
          <input type="date" id="room-date-picker" class="form-input" min="${getTodayString()}" value="${selectedDate}">
        </div>

        <div class="control-group flex-grow">
          <label class="control-label">Time Slot</label>
          <div class="slot-pills-row" id="room-slot-pills">
            ${TIME_SLOTS.map(slot => `
              <button class="slot-pill-btn ${slot.id === selectedSlotId ? "active" : ""}" data-slot-id="${slot.id}" type="button">
                ${slot.startTime} - ${slot.endTime}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="control-group">
          <label for="participant-count-input" class="control-label">Participants</label>
          <div class="counter-input-group">
            <button type="button" class="counter-btn" id="btn-part-minus" ${participantsCount <= 1 ? "disabled" : ""}>-</button>
            <input type="number" id="participant-count-input" class="counter-input" min="1" max="10" value="${participantsCount}">
            <button type="button" class="counter-btn" id="btn-part-plus" ${participantsCount >= 10 ? "disabled" : ""}>+</button>
          </div>
        </div>
      </div>

      <!-- Main Layout: Grid + Summary -->
      <div class="facility-layout-grid">
        <!-- Rooms Grid -->
        <div>
          <div class="section-title-row">
            <h2 class="subsection-title">Available Rooms (${availableCount} of ${rooms.length} match)</h2>
            <div class="legend-row">
              <span class="legend-badge"><span class="legend-dot dot-avail"></span> Available</span>
              <span class="legend-badge"><span class="legend-dot dot-occupied"></span> Reserved</span>
              <span class="legend-badge"><span class="legend-dot dot-amber"></span> Over Capacity</span>
            </div>
          </div>

          <div class="rooms-grid">
            ${roomsWithStatus.map(room => {
              let badgeText = "Available";
              let badgeClass = "pill-avail";
              let canBook = true;
              let disabledReason = "";

              if (!room.isAvailable) {
                badgeText = "Reserved";
                badgeClass = "pill-full";
                canBook = false;
                disabledReason = "Reserved for selected slot";
              } else if (!room.isCapacitySufficient) {
                badgeText = `Max ${room.capacity}`;
                badgeClass = "pill-amber";
                canBook = false;
                disabledReason = `Room capacity is ${room.capacity} (requested ${participantsCount})`;
              }

              const isSelected = room.id === selectedRoomId;

              return `
                <div class="room-card ${room.isAvailable && room.isCapacitySufficient ? "status-available" : "status-reserved"}" style="${isSelected ? "border-color: var(--color-selected); box-shadow: 0 0 0 1px var(--color-selected);" : ""}">
                  <div class="room-card-header">
                    <div>
                      <h3 class="room-name">${escapeHtml(room.name)}</h3>
                      <div class="room-location">${escapeHtml(room.location)}</div>
                    </div>
                    <span class="status-pill ${badgeClass}">${badgeText}</span>
                  </div>

                  <div class="capacity-text">Capacity: up to <strong>${room.capacity} people</strong></div>
                  <p class="room-desc">${escapeHtml(room.description)}</p>

                  <div class="amenity-tags">
                    ${room.features.map(f => `<span class="amenity-tag">${escapeHtml(f)}</span>`).join("")}
                  </div>

                  <div class="room-card-footer">
                    ${canBook ? `
                      <button class="btn ${isSelected ? "btn-primary" : "btn-secondary"} btn-block" data-select-room-id="${room.id}">
                        ${isSelected ? "Selected" : "Select Room"}
                      </button>
                    ` : `
                      <button class="btn btn-disabled btn-block" disabled>
                        ${disabledReason}
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Compact Booking Summary Panel -->
        <div class="booking-summary-panel">
          <h2 class="summary-title">Booking Summary</h2>

          ${selectedRoom ? `
            <div class="summary-card">
              <div>
                <h3 class="summary-item-name">${escapeHtml(selectedRoom.name)}</h3>
                <p class="summary-item-loc">${escapeHtml(selectedRoom.location)}</p>
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
                  <span class="detail-label">Group Size</span>
                  <span class="detail-val">${participantsCount} People (Max ${selectedRoom.capacity})</span>
                </div>
              </div>

              <div class="summary-actions">
                <button class="btn btn-primary btn-block" id="btn-confirm-room-booking">
                  Confirm Reservation
                </button>
                <button class="btn btn-secondary-sm btn-block" id="btn-clear-room-selection">
                  Deselect
                </button>
              </div>
            </div>
          ` : `
            <div class="summary-empty-state">
              <p>Select an available room to review group booking details and confirm.</p>
            </div>
          `}
        </div>
      </div>
    `;

    // Event listeners
    const dateInput = container.querySelector("#room-date-picker");
    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        selectedDate = e.target.value;
        if (selectedRoomId && !isResourceAvailable(selectedRoomId, selectedDate, activeSlot.startTime, activeSlot.endTime)) {
          selectedRoomId = null;
        }
        updateView();
      });
    }

    container.querySelectorAll("#room-slot-pills .slot-pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedSlotId = btn.getAttribute("data-slot-id");
        const newSlot = TIME_SLOTS.find(s => s.id === selectedSlotId);
        if (selectedRoomId && newSlot && !isResourceAvailable(selectedRoomId, selectedDate, newSlot.startTime, newSlot.endTime)) {
          selectedRoomId = null;
        }
        updateView();
      });
    });

    const btnMinus = container.querySelector("#btn-part-minus");
    if (btnMinus) {
      btnMinus.addEventListener("click", () => {
        if (participantsCount > 1) {
          participantsCount--;
          if (selectedRoom && participantsCount > selectedRoom.capacity) {
            selectedRoomId = null;
          }
          updateView();
        }
      });
    }

    const btnPlus = container.querySelector("#btn-part-plus");
    if (btnPlus) {
      btnPlus.addEventListener("click", () => {
        if (participantsCount < 10) {
          participantsCount++;
          if (selectedRoom && participantsCount > selectedRoom.capacity) {
            selectedRoomId = null;
          }
          updateView();
        }
      });
    }

    const partInput = container.querySelector("#participant-count-input");
    if (partInput) {
      partInput.addEventListener("change", (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1 && val <= 10) {
          participantsCount = val;
          if (selectedRoom && participantsCount > selectedRoom.capacity) {
            selectedRoomId = null;
          }
          updateView();
        }
      });
    }

    container.querySelectorAll("[data-select-room-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const roomId = btn.getAttribute("data-select-room-id");
        selectedRoomId = (selectedRoomId === roomId) ? null : roomId;
        updateView();
      });
    });

    const btnConfirm = container.querySelector("#btn-confirm-room-booking");
    if (btnConfirm && selectedRoom) {
      btnConfirm.addEventListener("click", () => {
        onRequestBookingCallback({
          resource: selectedRoom,
          date: selectedDate,
          startTime: activeSlot.startTime,
          endTime: activeSlot.endTime,
          participants: participantsCount,
          bookingType: "discussionRoom"
        }, () => {
          selectedRoomId = null;
          updateView();
        });
      });
    }

    const btnClear = container.querySelector("#btn-clear-room-selection");
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        selectedRoomId = null;
        updateView();
      });
    }
  }

  updateView();
}

// ============================================================================
// 3. STUDY ROOM VIEW
// ============================================================================

export function renderStudyRoomView(container, onRequestBookingCallback) {
  let selectedDate = getTodayString();
  let selectedSlotId = TIME_SLOTS[1].id;
  let selectedPlaceId = null;

  function updateView() {
    const activeSlot = TIME_SLOTS.find(s => s.id === selectedSlotId) || TIME_SLOTS[0];
    const places = getResourcesByType("studyPlace");
    const bookings = getBookings();

    let availableCount = 0;
    const placesWithStatus = places.map(p => {
      const isAvail = isResourceAvailable(p.id, selectedDate, activeSlot.startTime, activeSlot.endTime, bookings);
      if (isAvail) availableCount++;
      return {
        ...p,
        isAvailable: isAvail,
        isSelected: p.id === selectedPlaceId
      };
    });

    const selectedPlace = selectedPlaceId ? getResourceById(selectedPlaceId) : null;

    container.innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Study Room</h1>
        <p class="view-subtitle">Reserve an individual quiet study desk in the silent study hall.</p>
      </div>

      <!-- Date & Time Selection -->
      <div class="booking-control-bar">
        <div class="control-group">
          <label for="study-date-picker" class="control-label">Date</label>
          <input type="date" id="study-date-picker" class="form-input" min="${getTodayString()}" value="${selectedDate}">
        </div>

        <div class="control-group flex-grow">
          <label class="control-label">Time Slot</label>
          <div class="slot-pills-row" id="study-slot-pills">
            ${TIME_SLOTS.map(slot => `
              <button class="slot-pill-btn ${slot.id === selectedSlotId ? "active" : ""}" data-slot-id="${slot.id}" type="button">
                ${slot.startTime} - ${slot.endTime}
              </button>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Main Layout: Grid + Summary -->
      <div class="facility-layout-grid">
        <!-- Resource Grid -->
        <div class="study-places-container">
          <div class="section-title-row">
            <h2 class="subsection-title">Study Desks (${availableCount} of ${places.length} available)</h2>
            <div class="legend-row">
              <span class="legend-badge"><span class="legend-dot dot-avail"></span> Available</span>
              <span class="legend-badge"><span class="legend-dot dot-occupied"></span> Reserved</span>
              <span class="legend-badge"><span class="legend-dot dot-selected"></span> Selected</span>
            </div>
          </div>

          <div class="study-places-grid">
            ${placesWithStatus.map(p => {
              let stateClass = "place-avail";
              let labelText = "Available";
              if (!p.isAvailable) {
                stateClass = "place-occupied";
                labelText = "Reserved";
              }
              if (p.isSelected) {
                stateClass = "place-selected";
                labelText = "Selected";
              }

              return `
                <button
                  type="button"
                  class="study-place-card ${stateClass}"
                  data-place-id="${p.id}"
                  ${!p.isAvailable ? "disabled" : ""}
                  aria-label="${p.name}, ${labelText}"
                >
                  <div class="place-badge">${p.id}</div>
                  <div class="place-name">${escapeHtml(p.name)}</div>
                  <div class="place-status">${labelText}</div>
                </button>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Compact Booking Summary Panel -->
        <div class="booking-summary-panel">
          <h2 class="summary-title">Booking Summary</h2>

          ${selectedPlace ? `
            <div class="summary-card">
              <div>
                <h3 class="summary-item-name">${escapeHtml(selectedPlace.name)}</h3>
                <p class="summary-item-loc">${escapeHtml(selectedPlace.location)}</p>
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
                  <span class="detail-label">Desk</span>
                  <span class="detail-val">${escapeHtml(selectedPlace.id)}</span>
                </div>
              </div>

              <div class="summary-actions">
                <button class="btn btn-primary btn-block" id="btn-confirm-study-booking">
                  Confirm Study Place
                </button>
                <button class="btn btn-secondary-sm btn-block" id="btn-clear-study-selection">
                  Deselect
                </button>
              </div>
            </div>
          ` : `
            <div class="summary-empty-state">
              <p>Select an available study desk to review details and confirm.</p>
            </div>
          `}
        </div>
      </div>
    `;

    // Event listeners
    const dateInput = container.querySelector("#study-date-picker");
    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        selectedDate = e.target.value;
        if (selectedPlaceId && !isResourceAvailable(selectedPlaceId, selectedDate, activeSlot.startTime, activeSlot.endTime)) {
          selectedPlaceId = null;
        }
        updateView();
      });
    }

    container.querySelectorAll("#study-slot-pills .slot-pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedSlotId = btn.getAttribute("data-slot-id");
        const newSlot = TIME_SLOTS.find(s => s.id === selectedSlotId);
        if (selectedPlaceId && newSlot && !isResourceAvailable(selectedPlaceId, selectedDate, newSlot.startTime, newSlot.endTime)) {
          selectedPlaceId = null;
        }
        updateView();
      });
    });

    container.querySelectorAll(".study-place-card:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        const placeId = btn.getAttribute("data-place-id");
        selectedPlaceId = (selectedPlaceId === placeId) ? null : placeId;
        updateView();
      });
    });

    const btnConfirm = container.querySelector("#btn-confirm-study-booking");
    if (btnConfirm && selectedPlace) {
      btnConfirm.addEventListener("click", () => {
        onRequestBookingCallback({
          resource: selectedPlace,
          date: selectedDate,
          startTime: activeSlot.startTime,
          endTime: activeSlot.endTime,
          participants: 1,
          bookingType: "studyPlace"
        }, () => {
          selectedPlaceId = null;
          updateView();
        });
      });
    }

    const btnClear = container.querySelector("#btn-clear-study-selection");
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        selectedPlaceId = null;
        updateView();
      });
    }
  }

  updateView();
}
