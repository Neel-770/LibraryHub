/**
 * resources.js - Facility Views: Computer Labs, Discussion Rooms & Study Room
 * 
 * Manages view rendering, filtering, time slot selection, availability calculations,
 * and booking workflows for:
 * 1. Computer Labs (Individual workstations PC-A-01..PC-C-12)
 * 2. Discussion Rooms (Entire collaboration suites DR-101..DR-301)
 * 3. Study Room (Individual quiet pods ST-01..ST-20)
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
  formatDisplayTime,
  formatDisplayDate,
  formatDuration
} from "./booking.js";

// Helper for escaping strings safely
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
  let selectedSlotId = TIME_SLOTS[1].id; // Default to 10:00 - 12:00
  let selectedComputerId = null;

  function updateView() {
    const activeSlot = TIME_SLOTS.find(s => s.id === selectedSlotId) || TIME_SLOTS[0];
    const currentLab = COMPUTER_LABS.find(l => l.id === selectedLabId) || COMPUTER_LABS[0];
    const computersInLab = getResourcesByParent(selectedLabId);
    const bookings = getBookings();

    // Calculate availability stats for this lab and slot
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
        <div>
          <h1 class="view-title">Computer Lab Workstations</h1>
          <p class="view-subtitle">Reserve an individual computer for programming, media editing, or AI research.</p>
        </div>
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

      <!-- Controls & Filter Bar -->
      <div class="booking-control-bar">
        <div class="control-group">
          <label for="lab-date-picker" class="control-label">Reservation Date</label>
          <input type="date" id="lab-date-picker" class="form-input" min="${getTodayString()}" value="${selectedDate}">
        </div>

        <div class="control-group flex-grow">
          <label for="lab-slot-picker" class="control-label">Time Slot (${TIME_SLOTS.length} Slots)</label>
          <div class="slot-pills-row" id="lab-slot-pills">
            ${TIME_SLOTS.map(slot => `
              <button class="slot-pill-btn ${slot.id === selectedSlotId ? "active" : ""}" data-slot-id="${slot.id}" type="button">
                <span class="slot-time">${slot.startTime} - ${slot.endTime}</span>
                <span class="slot-period">${slot.period}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Active Lab Details Banner -->
      <div class="facility-info-banner">
        <div class="banner-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div class="banner-body">
          <div class="banner-title-row">
            <h2 class="banner-title">${escapeHtml(currentLab.name)}</h2>
            <span class="status-pill ${availableCount > 0 ? "pill-avail" : "pill-full"}">
              ${availableCount} of ${computersInLab.length} Computers Available
            </span>
          </div>
          <p class="banner-desc">${escapeHtml(currentLab.description)} • <strong>Hardware:</strong> ${escapeHtml(currentLab.specs)}</p>
          <div class="software-tags-row">
            ${currentLab.primarySoftware.map(s => `<span class="software-tag">${escapeHtml(s)}</span>`).join("")}
          </div>
        </div>
      </div>

      <!-- Computer Selection Layout -->
      <div class="facility-layout-grid">
        <!-- Left: Computers Grid -->
        <div class="computers-grid-container">
          <div class="section-title-row">
            <h3 class="subsection-title">Select Workstation in ${escapeHtml(currentLab.shortName)}</h3>
            <div class="legend-row">
              <span class="legend-badge"><span class="legend-dot dot-avail"></span> Available</span>
              <span class="legend-badge"><span class="legend-dot dot-occupied"></span> Occupied</span>
              <span class="legend-badge"><span class="legend-dot dot-selected"></span> Selected</span>
            </div>
          </div>

          <div class="pc-workstations-grid">
            ${computersWithStatus.map(pc => {
              let stateClass = "pc-avail";
              let labelText = "Available";
              if (!pc.isAvailable) {
                stateClass = "pc-occupied";
                labelText = "Reserved for Slot";
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
                  <div class="pc-card-icon">
                    <svg class="icon-monitor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="3" width="20" height="14" rx="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  </div>
                  <div class="pc-card-name">${escapeHtml(pc.name)}</div>
                  <div class="pc-card-status">${labelText}</div>
                </button>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Right: Booking Summary Sidebar -->
        <div class="booking-summary-panel">
          <h3 class="summary-title">Workstation Reservation</h3>
          
          ${selectedComputer ? `
            <div class="summary-card">
              <div class="summary-badge-row">
                <span class="summary-chip-lab">${escapeHtml(currentLab.shortName)}</span>
                <span class="summary-chip-id">${escapeHtml(selectedComputer.id)}</span>
              </div>
              <h4 class="summary-item-name">${escapeHtml(selectedComputer.name)}</h4>
              <p class="summary-item-loc">${escapeHtml(selectedComputer.location)}</p>

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
                  <span class="detail-label">Specification:</span>
                  <span class="detail-val text-sm">${escapeHtml(selectedComputer.specs)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Features:</span>
                  <span class="detail-val text-sm">${selectedComputer.features.join(", ")}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Cost:</span>
                  <span class="detail-val text-success">Free (College Amenity)</span>
                </div>
              </div>

              <div class="summary-actions">
                <button class="btn btn-primary btn-block" id="btn-confirm-pc-booking">
                  Confirm Reservation
                </button>
                <button class="btn btn-outline btn-block" id="btn-clear-pc-selection">
                  Deselect Workstation
                </button>
              </div>
            </div>
          ` : `
            <div class="summary-empty-state">
              <div class="empty-icon-circle">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <h4>No Workstation Selected</h4>
              <p>Click on any available green workstation in the grid to review specifications and finalize your booking.</p>
            </div>
          `}

          <!-- Quick Lab Guidelines -->
          <div class="guidelines-box">
            <h5 class="guidelines-title">
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Computer Lab Guidelines
            </h5>
            <ul class="guidelines-list">
              <li>Individual reservations are for 1 student only.</li>
              <li>Save all work to cloud or personal storage; systems reset nightly.</li>
              <li>15-minute grace period before unclaimed reservations release.</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Attach event listeners
    // 1. Lab selector tabs
    container.querySelectorAll(".lab-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedLabId = btn.getAttribute("data-lab-id");
        selectedComputerId = null; // reset selection on lab change
        updateView();
      });
    });

    // 2. Date input
    const dateInput = container.querySelector("#lab-date-picker");
    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        selectedDate = e.target.value;
        // Verify if selected PC is still available
        if (selectedComputerId && !isResourceAvailable(selectedComputerId, selectedDate, activeSlot.startTime, activeSlot.endTime)) {
          selectedComputerId = null;
        }
        updateView();
      });
    }

    // 3. Slot pills
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

    // 4. PC card clicks
    container.querySelectorAll(".pc-card:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        const pcId = btn.getAttribute("data-pc-id");
        selectedComputerId = (selectedComputerId === pcId) ? null : pcId;
        updateView();
      });
    });

    // 5. Booking action
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
  let selectedSlotId = TIME_SLOTS[1].id; // Default 10:00 - 12:00
  let participantsCount = 4;
  let customStartTime = null;
  let customEndTime = null;
  let isCustomTime = false;

  function updateView() {
    const activeSlot = TIME_SLOTS.find(s => s.id === selectedSlotId) || TIME_SLOTS[0];
    const startTime = isCustomTime ? customStartTime : activeSlot.startTime;
    const endTime = isCustomTime ? customEndTime : activeSlot.endTime;

    const rooms = getResourcesByType("discussionRoom");
    const bookings = getBookings();

    const roomsWithStatus = rooms.map(room => {
      const isAvail = isResourceAvailable(room.id, selectedDate, startTime, endTime, bookings);
      const isCapacitySufficient = participantsCount <= room.capacity;
      return {
        ...room,
        isAvailable: isAvail,
        isCapacitySufficient
      };
    });

    const availableCount = roomsWithStatus.filter(r => r.isAvailable && r.isCapacitySufficient).length;

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Discussion & Collaboration Rooms</h1>
          <p class="view-subtitle">Reserve entire private rooms for project teams, presentations, and group study sessions.</p>
        </div>
      </div>

      <!-- Controls Filter Bar -->
      <div class="booking-control-bar">
        <div class="control-group">
          <label for="room-date-picker" class="control-label">Reservation Date</label>
          <input type="date" id="room-date-picker" class="form-input" min="${getTodayString()}" value="${selectedDate}">
        </div>

        <div class="control-group">
          <label class="control-label">Time Interval</label>
          <div class="slot-pills-row" id="room-slot-pills">
            ${TIME_SLOTS.map(slot => `
              <button class="slot-pill-btn ${(!isCustomTime && slot.id === selectedSlotId) ? "active" : ""}" data-slot-id="${slot.id}" type="button">
                <span class="slot-time">${slot.startTime} - ${slot.endTime}</span>
                <span class="slot-period">${slot.period}</span>
              </button>
            `).join("")}
          </div>
        </div>

        <div class="control-group">
          <label for="participant-count-input" class="control-label">Expected Participants</label>
          <div class="counter-input-group">
            <button type="button" class="counter-btn" id="btn-part-minus" ${participantsCount <= 1 ? "disabled" : ""}>-</button>
            <input type="number" id="participant-count-input" class="counter-input" min="1" max="12" value="${participantsCount}">
            <button type="button" class="counter-btn" id="btn-part-plus" ${participantsCount >= 10 ? "disabled" : ""}>+</button>
          </div>
        </div>
      </div>

      <!-- Live Summary Bar -->
      <div class="filter-status-banner">
        <div>
          <span>Showing <strong>${availableCount} of ${rooms.length}</strong> rooms available for <strong>${formatDisplayDate(selectedDate)}</strong> from <strong>${startTime} to ${endTime}</strong> (${participantsCount} people).</span>
        </div>
        <div class="legend-row">
          <span class="legend-badge"><span class="legend-dot dot-avail"></span> Available</span>
          <span class="legend-badge"><span class="legend-dot dot-occupied"></span> Reserved for Slot</span>
          <span class="legend-badge"><span class="legend-dot dot-amber"></span> Capacity Exceeded</span>
        </div>
      </div>

      <!-- Room Cards Grid -->
      <div class="rooms-grid">
        ${roomsWithStatus.map(room => {
          let cardStatus = "status-available";
          let badgeText = "Available";
          let badgeClass = "pill-avail";
          let canBook = true;
          let disabledReason = "";

          if (!room.isAvailable) {
            cardStatus = "status-reserved";
            badgeText = "Reserved for Slot";
            badgeClass = "pill-full";
            canBook = false;
            disabledReason = "Already booked for the chosen time interval.";
          } else if (!room.isCapacitySufficient) {
            cardStatus = "status-overcapacity";
            badgeText = `Max Capacity: ${room.capacity}`;
            badgeClass = "pill-amber";
            canBook = false;
            disabledReason = `Room capacity is ${room.capacity} (requested for ${participantsCount} participants).`;
          }

          return `
            <div class="room-card ${cardStatus}">
              <div class="room-card-header">
                <div>
                  <span class="room-id-tag">${escapeHtml(room.id)}</span>
                  <h3 class="room-name">${escapeHtml(room.name)}</h3>
                  <div class="room-location">
                    <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${escapeHtml(room.location)}
                  </div>
                </div>
                <span class="status-pill ${badgeClass}">
                  ${badgeText}
                </span>
              </div>

              <div class="room-capacity-meter">
                <div class="capacity-bar">
                  <div class="capacity-fill" style="width: ${Math.min(100, (participantsCount / room.capacity) * 100)}%"></div>
                </div>
                <span class="capacity-text">Capacity: up to <strong>${room.capacity} people</strong></span>
              </div>

              <p class="room-desc">${escapeHtml(room.description)}</p>

              <div class="room-features-box">
                <h4 class="features-title">Included Amenities & Tech</h4>
                <div class="amenity-tags">
                  ${room.features.map(f => `<span class="amenity-tag">${escapeHtml(f)}</span>`).join("")}
                </div>
              </div>

              <div class="room-card-footer">
                ${canBook ? `
                  <button class="btn btn-primary btn-block" data-book-room-id="${room.id}">
                    Reserve ${escapeHtml(room.name)}
                  </button>
                ` : `
                  <button class="btn btn-disabled btn-block" disabled title="${escapeHtml(disabledReason)}">
                    ${disabledReason}
                  </button>
                `}
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <!-- Policy Info -->
      <div class="facility-policy-card">
        <h4>Discussion Room Reservation Policy</h4>
        <p>1. Discussion rooms are reserved as ENTIRE ROOMS for group collaboration. 2. A confirmed booking prevents any overlapping reservations for the same room. 3. Cancellations instantly release the room for other student groups.</p>
      </div>
    `;

    // Attach event listeners
    // 1. Date picker
    const dateInput = container.querySelector("#room-date-picker");
    if (dateInput) {
      dateInput.addEventListener("change", (e) => {
        selectedDate = e.target.value;
        updateView();
      });
    }

    // 2. Slot pills
    container.querySelectorAll("#room-slot-pills .slot-pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedSlotId = btn.getAttribute("data-slot-id");
        isCustomTime = false;
        updateView();
      });
    });

    // 3. Participant buttons
    const btnMinus = container.querySelector("#btn-part-minus");
    if (btnMinus) {
      btnMinus.addEventListener("click", () => {
        if (participantsCount > 1) {
          participantsCount--;
          updateView();
        }
      });
    }

    const btnPlus = container.querySelector("#btn-part-plus");
    if (btnPlus) {
      btnPlus.addEventListener("click", () => {
        if (participantsCount < 12) {
          participantsCount++;
          updateView();
        }
      });
    }

    const partInput = container.querySelector("#participant-count-input");
    if (partInput) {
      partInput.addEventListener("change", (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1 && val <= 12) {
          participantsCount = val;
          updateView();
        }
      });
    }

    // 4. Book room button
    container.querySelectorAll("[data-book-room-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const roomId = btn.getAttribute("data-book-room-id");
        const room = getResourceById(roomId);
        if (!room) return;

        onRequestBookingCallback({
          resource: room,
          date: selectedDate,
          startTime: startTime,
          endTime: endTime,
          participants: participantsCount,
          bookingType: "discussionRoom"
        }, () => {
          updateView();
        });
      });
    });
  }

  updateView();
}

// ============================================================================
// 3. STUDY ROOM VIEW (HONORS SILENT STUDY HALL)
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
        <div>
          <h1 class="view-title">Honors Silent Study Room</h1>
          <p class="view-subtitle">Reserve an individual quiet cubicle or study pod in our dedicated zero-noise research hall.</p>
        </div>
      </div>

      <!-- Controls & Filter Bar -->
      <div class="booking-control-bar">
        <div class="control-group">
          <label for="study-date-picker" class="control-label">Reservation Date</label>
          <input type="date" id="study-date-picker" class="form-input" min="${getTodayString()}" value="${selectedDate}">
        </div>

        <div class="control-group flex-grow">
          <label class="control-label">Time Slot</label>
          <div class="slot-pills-row" id="study-slot-pills">
            ${TIME_SLOTS.map(slot => `
              <button class="slot-pill-btn ${slot.id === selectedSlotId ? "active" : ""}" data-slot-id="${slot.id}" type="button">
                <span class="slot-time">${slot.startTime} - ${slot.endTime}</span>
                <span class="slot-period">${slot.period}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Study Hall Header Banner -->
      <div class="facility-info-banner study-banner">
        <div class="banner-icon">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <div class="banner-body">
          <div class="banner-title-row">
            <h2 class="banner-title">Honors Silent Study Hall (Ground Floor)</h2>
            <span class="status-pill ${availableCount > 0 ? "pill-avail" : "pill-full"}">
              ${availableCount} of ${places.length} Places Free
            </span>
          </div>
          <p class="banner-desc">Equipped with acoustic sound-dampening partitions, high-speed 65W USB-C PD power charging, ergonomic mesh task chairs, and individual task lamps.</p>
        </div>
      </div>

      <!-- Main Layout: Grid + Summary Panel -->
      <div class="facility-layout-grid">
        <!-- Left: Study Pods Grid -->
        <div class="study-places-container">
          <div class="section-title-row">
            <h3 class="subsection-title">Study Places Grid (ST-01 to ST-20)</h3>
            <div class="legend-row">
              <span class="legend-badge"><span class="legend-dot dot-avail"></span> Available</span>
              <span class="legend-badge"><span class="legend-dot dot-occupied"></span> Reserved for Slot</span>
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
                  <div class="place-icon">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                  </div>
                  <div class="place-name">${escapeHtml(p.name)}</div>
                  <div class="place-type-tag">${escapeHtml(p.podType)}</div>
                  <div class="place-status">${labelText}</div>
                </button>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Right: Summary Panel -->
        <div class="booking-summary-panel">
          <h3 class="summary-title">Place Reservation Summary</h3>

          ${selectedPlace ? `
            <div class="summary-card">
              <div class="summary-badge-row">
                <span class="summary-chip-lab">Honors Hall</span>
                <span class="summary-chip-id">${escapeHtml(selectedPlace.id)}</span>
              </div>
              <h4 class="summary-item-name">${escapeHtml(selectedPlace.name)}</h4>
              <p class="summary-item-loc">${escapeHtml(selectedPlace.location)}</p>

              <div class="summary-details-list">
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-val">${formatDisplayDate(selectedDate)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time Slot:</span>
                  <span class="detail-val">${activeSlot.startTime} - ${activeSlot.endTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Pod Style:</span>
                  <span class="detail-val">${escapeHtml(selectedPlace.podType)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Amenities:</span>
                  <span class="detail-val text-sm">${selectedPlace.features.join(", ")}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Noise Policy:</span>
                  <span class="detail-val text-success">Strict Silence</span>
                </div>
              </div>

              <div class="summary-actions">
                <button class="btn btn-primary btn-block" id="btn-confirm-study-booking">
                  Confirm Study Place
                </button>
                <button class="btn btn-outline btn-block" id="btn-clear-study-selection">
                  Deselect Place
                </button>
              </div>
            </div>
          ` : `
            <div class="summary-empty-state">
              <div class="empty-icon-circle">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <h4>No Study Place Selected</h4>
              <p>Click on any available green study cubicle in the grid to review its details and complete your reservation.</p>
            </div>
          `}

          <!-- Silent Study Rules -->
          <div class="guidelines-box">
            <h5 class="guidelines-title">
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              Silent Hall Rules
            </h5>
            <ul class="guidelines-list">
              <li>Mute all phone ringers and audio notifications.</li>
              <li>Headphones must be used at conversational listening levels.</li>
              <li>Covered beverage cups permitted; no open food.</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Attach event listeners
    // 1. Date picker
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

    // 2. Slot pills
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

    // 3. Place card clicks
    container.querySelectorAll(".study-place-card:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        const placeId = btn.getAttribute("data-place-id");
        selectedPlaceId = (selectedPlaceId === placeId) ? null : placeId;
        updateView();
      });
    });

    // 4. Booking action
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
