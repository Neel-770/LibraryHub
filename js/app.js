/**
 * app.js - Main Application Coordinator & View Router
 * 
 * Handles:
 * - Application initialization and storage hydration
 * - Client-side view switching (Hash & state-based navigation)
 * - Header updates, active navigation link states, and mobile drawer
 * - Global booking confirmation modal and flow
 * - Booking details receipt modal
 * - Booking cancellation modal and flow
 * - Toast notification management
 * - Profile & demo settings management
 */

import {
  initStorage,
  getCurrentUser,
  updateCurrentUser,
  getSettings,
  updateSettings,
  getSavedTheme,
  saveTheme,
  resetDemoData,
  clearAllBookings,
  exportDataAsJSON,
  getBookingById,
  getUserBookings
} from "./storage.js";

import {
  createBooking,
  cancelBooking,
  formatDisplayDate,
  formatDisplayTime,
  formatDuration
} from "./booking.js";

import { renderDashboard } from "./dashboard.js";
import {
  renderComputerLabsView,
  renderDiscussionRoomsView,
  renderStudyRoomView
} from "./resources.js";
import { renderLibrarySeatsView } from "./seats.js";
import { renderMyBookingsView } from "./my-bookings.js";

// Application State
const AppState = {
  currentView: "dashboard",
  currentUser: null,
  activeModal: null
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize safe storage
  initStorage();
  AppState.currentUser = getCurrentUser();

  // 2. Setup theme toggle (Dark / Light mode)
  setupThemeToggle();

  // 3. Setup DOM event listeners
  setupNavigation();
  setupMobileDrawer();
  setupNotificationBell();

  // 4. Handle initial route
  handleInitialRoute();

  // 5. Update user chip in header and sidebar
  updateUserUI();

  // 6. Update header date/time
  updateHeaderDateTime();
});

// ============================================================================
// ROUTING & VIEW NAVIGATION
// ============================================================================

const VIEW_TITLES = {
  dashboard: { title: "Dashboard", breadcrumb: "Overview" },
  "computer-labs": { title: "Computer Labs", breadcrumb: "Facilities" },
  "discussion-rooms": { title: "Discussion Rooms", breadcrumb: "Facilities" },
  "study-room": { title: "Study Room", breadcrumb: "Facilities" },
  "library-seats": { title: "Library Seats", breadcrumb: "Facilities" },
  "my-bookings": { title: "My Bookings", breadcrumb: "Bookings" },
  "profile-settings": { title: "Settings", breadcrumb: "Account" }
};

export function navigateTo(viewId) {
  if (!VIEW_TITLES[viewId]) {
    viewId = "dashboard";
  }

  AppState.currentView = viewId;
  window.location.hash = viewId;

  // Update navigation link active classes
  document.querySelectorAll(".nav-link").forEach(link => {
    const target = link.getAttribute("data-view");
    if (target === viewId) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    } else {
      link.classList.remove("active");
      link.removeAttribute("aria-current");
    }
  });

  // Update Header title & breadcrumb
  const headerTitleEl = document.getElementById("page-header-title");
  const headerCrumbEl = document.getElementById("page-header-crumb");
  if (headerTitleEl) headerTitleEl.textContent = VIEW_TITLES[viewId].title;
  if (headerCrumbEl) headerCrumbEl.textContent = VIEW_TITLES[viewId].breadcrumb;

  // Close mobile drawer if open
  closeMobileDrawer();

  // Render view
  renderCurrentView();

  // Update notification badge
  updateNotificationBadge();

  // Scroll main view to top
  const mainContent = document.getElementById("main-content-area");
  if (mainContent) mainContent.scrollTop = 0;
  window.scrollTo(0, 0);
}

function handleInitialRoute() {
  const hash = window.location.hash.replace("#", "").trim();
  if (hash && VIEW_TITLES[hash]) {
    navigateTo(hash);
  } else {
    navigateTo("dashboard");
  }

  window.addEventListener("hashchange", () => {
    const currentHash = window.location.hash.replace("#", "").trim();
    if (currentHash && VIEW_TITLES[currentHash] && currentHash !== AppState.currentView) {
      navigateTo(currentHash);
    }
  });
}

function renderCurrentView() {
  const container = document.getElementById("view-container");
  if (!container) return;

  switch (AppState.currentView) {
    case "dashboard":
      renderDashboard(container, navigateTo, openBookingDetailsModal);
      break;

    case "computer-labs":
      renderComputerLabsView(container, openBookingConfirmModal);
      break;

    case "discussion-rooms":
      renderDiscussionRoomsView(container, openBookingConfirmModal);
      break;

    case "study-room":
      renderStudyRoomView(container, openBookingConfirmModal);
      break;

    case "library-seats":
      renderLibrarySeatsView(container, openBookingConfirmModal);
      break;

    case "my-bookings":
      renderMyBookingsView(container, openBookingDetailsModal, openCancelConfirmModal);
      break;

    case "profile-settings":
      renderProfileSettingsView(container);
      break;

    default:
      renderDashboard(container, navigateTo, openBookingDetailsModal);
      break;
  }
}

function setupNavigation() {
  document.querySelectorAll("[data-view]").forEach(elem => {
    elem.addEventListener("click", (e) => {
      e.preventDefault();
      const targetView = elem.getAttribute("data-view");
      if (targetView) navigateTo(targetView);
    });
  });
}

// ============================================================================
// MOBILE DRAWER
// ============================================================================

function setupMobileDrawer() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.getElementById("app-sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener("click", () => {
      const isOpen = sidebar.classList.contains("drawer-open");
      if (isOpen) {
        closeMobileDrawer();
      } else {
        sidebar.classList.add("drawer-open");
        overlay.classList.add("active");
        menuBtn.setAttribute("aria-expanded", "true");
      }
    });

    overlay.addEventListener("click", closeMobileDrawer);
  }
}

function closeMobileDrawer() {
  const sidebar = document.getElementById("app-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const menuBtn = document.getElementById("mobile-menu-btn");

  if (sidebar) sidebar.classList.remove("drawer-open");
  if (overlay) overlay.classList.remove("active");
  if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
}

// ============================================================================
// NOTIFICATION BELL & HEADER DATE
// ============================================================================

function setupNotificationBell() {
  const bellBtn = document.getElementById("notifications-bell-btn");
  const dropdown = document.getElementById("notifications-dropdown");

  if (bellBtn && dropdown) {
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("active");
      if (isOpen) {
        dropdown.classList.remove("active");
      } else {
        renderNotificationDropdownContent(dropdown);
        dropdown.classList.add("active");
      }
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== bellBtn) {
        dropdown.classList.remove("active");
      }
    });
  }
}

function updateNotificationBadge() {
  const badge = document.getElementById("notification-badge-count");
  if (!badge) return;

  const today = new Date().toISOString().split("T")[0];
  const user = getCurrentUser();
  const upcoming = getUserBookings(user.id).filter(b => b.status === "confirmed" && b.date >= today);

  if (upcoming.length > 0) {
    badge.textContent = upcoming.length;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

function renderNotificationDropdownContent(dropdown) {
  const today = new Date().toISOString().split("T")[0];
  const user = getCurrentUser();
  const upcoming = getUserBookings(user.id).filter(b => b.status === "confirmed" && b.date >= today);

  let html = `
    <div class="dropdown-header">
      <h4>Active Reservations (${upcoming.length})</h4>
    </div>
  `;

  if (upcoming.length === 0) {
    html += `
      <div class="dropdown-empty">
        <p>No active reservations right now.</p>
      </div>
    `;
  } else {
    html += `<div class="dropdown-items-list">`;
    upcoming.slice(0, 4).forEach(b => {
      html += `
        <div class="dropdown-item" data-notif-id="${escapeHtml(b.id)}">
          <div class="item-icon-col">
            <span class="pulse-dot"></span>
          </div>
          <div class="item-text-col">
            <span class="item-title">${escapeHtml(b.resourceName)}</span>
            <span class="item-sub">${formatDisplayDate(b.date)} • ${formatDisplayTime(b.startTime)}</span>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `
    <div class="dropdown-footer">
      <button class="btn btn-secondary-sm btn-block" id="btn-dropdown-view-all">View All Bookings</button>
    </div>
  `;

  dropdown.innerHTML = html;

  dropdown.querySelectorAll("[data-notif-id]").forEach(item => {
    item.addEventListener("click", () => {
      const bId = item.getAttribute("data-notif-id");
      dropdown.classList.remove("active");
      openBookingDetailsModal(bId);
    });
  });

  const btnAll = dropdown.querySelector("#btn-dropdown-view-all");
  if (btnAll) {
    btnAll.addEventListener("click", () => {
      dropdown.classList.remove("active");
      navigateTo("my-bookings");
    });
  }
}

function updateHeaderDateTime() {
  const dateEl = document.getElementById("header-current-date");
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }
}

function updateUserUI() {
  const user = getCurrentUser();
  const userNameEls = document.querySelectorAll(".current-user-name");
  const userRoleEls = document.querySelectorAll(".current-user-role");
  const userAvatarEls = document.querySelectorAll(".user-avatar-initials");

  userNameEls.forEach(el => el.textContent = user.name);
  userRoleEls.forEach(el => el.textContent = user.role || "Student");
  userAvatarEls.forEach(el => el.textContent = user.avatarText || "AR");
}

// ============================================================================
// THEME MANAGEMENT (DARK / LIGHT MODE)
// ============================================================================

export function getActiveTheme() {
  return document.documentElement.getAttribute("data-theme") || getSavedTheme();
}

export function setTheme(theme, triggerToast = true) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", normalized);
  saveTheme(normalized);

  // Update Topbar button accessibility attributes & states
  const toggleBtn = document.getElementById("theme-toggle-btn");
  if (toggleBtn) {
    const isDark = normalized === "dark";
    toggleBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    toggleBtn.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    toggleBtn.setAttribute("aria-pressed", isDark ? "true" : "false");
  }

  // Update Settings checkbox if present in DOM
  const prefThemeInput = document.getElementById("pref-theme");
  if (prefThemeInput) {
    prefThemeInput.checked = (normalized === "dark");
  }

  if (triggerToast) {
    showToast(`Switched to ${normalized} mode.`, "info", 2000);
  }

  return normalized;
}

export function toggleTheme() {
  const current = getActiveTheme();
  const next = current === "dark" ? "light" : "dark";
  return setTheme(next, true);
}

function setupThemeToggle() {
  // Apply initial theme immediately
  const initialTheme = getSavedTheme();
  setTheme(initialTheme, false);

  // Attach Topbar toggle button listener
  const toggleBtn = document.getElementById("theme-toggle-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      toggleTheme();
    });
  }

  // Listen for OS scheme change if user hasn't explicitly set localStorage
  if (typeof window !== "undefined" && window.matchMedia) {
    try {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        const explicit = localStorage.getItem("lh_theme");
        if (!explicit) {
          setTheme(e.matches ? "dark" : "light", false);
        }
      });
    } catch (e) {}
  }
}

// ============================================================================
// GLOBAL MODAL CONTROLLER
// ============================================================================

function openModal(modalHtml) {
  let modalWrapper = document.getElementById("app-modal-root");
  if (!modalWrapper) {
    modalWrapper = document.createElement("div");
    modalWrapper.id = "app-modal-root";
    modalWrapper.className = "modal-overlay-root";
    document.body.appendChild(modalWrapper);
  }

  modalWrapper.innerHTML = modalHtml;
  modalWrapper.classList.add("active");
  document.body.classList.add("modal-open");

  // Close handlers
  const closeButtons = modalWrapper.querySelectorAll("[data-modal-close]");
  closeButtons.forEach(btn => {
    btn.addEventListener("click", closeModal);
  });

  modalWrapper.addEventListener("click", (e) => {
    if (e.target === modalWrapper) {
      closeModal();
    }
  });

  // ESC key listener
  const escHandler = (e) => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  return modalWrapper;
}

export function closeModal() {
  const modalWrapper = document.getElementById("app-modal-root");
  if (modalWrapper) {
    modalWrapper.classList.remove("active");
    modalWrapper.innerHTML = "";
  }
  document.body.classList.remove("modal-open");
}

// ----------------------------------------------------
// 1. BOOKING CONFIRMATION MODAL
// ----------------------------------------------------

export function openBookingConfirmModal(bookingRequest, onSuccessCallback) {
  const { resource, date, startTime, endTime, participants, bookingType } = bookingRequest;
  const user = getCurrentUser();

  const modalHtml = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <span class="modal-kicker">Review & Confirm</span>
            <h3 class="modal-title">Confirm Your Reservation</h3>
          </div>
          <button class="modal-close-btn" data-modal-close aria-label="Close dialog">&times;</button>
        </div>

        <div class="modal-body">
          <div class="confirm-summary-banner">
            <div class="confirm-res-badge">${escapeHtml(resource.id)}</div>
            <div class="confirm-res-info">
              <h4>${escapeHtml(resource.name)}</h4>
              <p>${escapeHtml(resource.location || resource.parentName || "Library Hub")}</p>
            </div>
          </div>

          <div class="confirm-grid">
            <div class="confirm-cell">
              <span class="cell-label">Student Name</span>
              <span class="cell-value">${escapeHtml(user.name)} (${escapeHtml(user.id)})</span>
            </div>
            <div class="confirm-cell">
              <span class="cell-label">Date</span>
              <span class="cell-value">${formatDisplayDate(date)}</span>
            </div>
            <div class="confirm-cell">
              <span class="cell-label">Time Interval</span>
              <span class="cell-value">${formatDisplayTime(startTime)} - ${formatDisplayTime(endTime)} (${formatDuration(startTime, endTime)})</span>
            </div>
            <div class="confirm-cell">
              <span class="cell-label">${bookingType === "discussionRoom" ? "Expected Participants" : "Booking Type"}</span>
              <span class="cell-value">${bookingType === "discussionRoom" ? `${participants} People (Max ${resource.capacity})` : "Individual Study"}</span>
            </div>
          </div>

          <div class="form-group mt-3">
            <label for="booking-purpose-input" class="form-label">Academic Purpose / Note (Optional)</label>
            <input 
              type="text" 
              id="booking-purpose-input" 
              class="form-input" 
              placeholder="e.g. Senior Capstone Project, Algorithms Study, Thesis Prep"
              value="Academic Study & Project Work"
            >
          </div>

          <div id="booking-modal-error" class="modal-alert-error" style="display:none;"></div>

          <div class="confirm-amenity-notice">
            <svg class="meta-icon text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span>No reservation fee required. Covered under standard university student enrollment.</span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" data-modal-close>Cancel</button>
          <button class="btn btn-primary" id="btn-modal-confirm-submit">
            Confirm & Save Reservation
          </button>
        </div>
      </div>
    </div>
  `;

  const modalWrapper = openModal(modalHtml);
  const errorEl = modalWrapper.querySelector("#booking-modal-error");
  const submitBtn = modalWrapper.querySelector("#btn-modal-confirm-submit");

  submitBtn.addEventListener("click", () => {
    const purposeInput = modalWrapper.querySelector("#booking-purpose-input");
    const purpose = purposeInput ? purposeInput.value : "Academic Study";

    // Attempt booking creation
    submitBtn.disabled = true;
    submitBtn.textContent = "Validating...";

    const result = createBooking({
      resourceId: resource.id,
      bookingType: bookingType || resource.type,
      date,
      startTime,
      endTime,
      participants: Number(participants) || 1,
      purpose,
      userId: user.id
    });

    if (!result.success) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm & Save Reservation";
      errorEl.textContent = result.error;
      errorEl.style.display = "block";
      return;
    }

    // Success!
    closeModal();
    showToast(`Reservation confirmed! Booking ID: ${result.booking.id}`, "success");
    openBookingReceiptModal(result.booking);

    if (onSuccessCallback) {
      onSuccessCallback(result.booking);
    }

    updateNotificationBadge();
  });
}

// ----------------------------------------------------
// 2. BOOKING RECEIPT / SUCCESS MODAL
// ----------------------------------------------------

export function openBookingReceiptModal(booking) {
  const modalHtml = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <span class="modal-kicker" style="color: var(--color-available);">Success</span>
            <h3 class="modal-title">Reservation Confirmed</h3>
          </div>
          <button class="modal-close-btn" data-modal-close aria-label="Close dialog">&times;</button>
        </div>

        <div class="modal-body">
          <div>
            <h4 style="font-size: var(--font-size-base); font-weight: 600;">${escapeHtml(booking.resourceName)}</h4>
            <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">${escapeHtml(booking.location)}</p>
          </div>

          <div class="confirm-grid">
            <div class="confirm-cell">
              <span class="cell-label">Booking ID</span>
              <span class="cell-value" style="font-family: monospace;">#${escapeHtml(booking.id)}</span>
            </div>
            <div class="confirm-cell">
              <span class="cell-label">Date</span>
              <span class="cell-value">${formatDisplayDate(booking.date)}</span>
            </div>
            <div class="confirm-cell">
              <span class="cell-label">Time</span>
              <span class="cell-value">${formatDisplayTime(booking.startTime)} - ${formatDisplayTime(booking.endTime)}</span>
            </div>
            <div class="confirm-cell">
              <span class="cell-label">Status</span>
              <span class="cell-value" style="color: var(--color-available);">Confirmed</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" data-modal-close>Close</button>
          <button class="btn btn-primary" id="btn-receipt-view-bookings">View in My Bookings</button>
        </div>
      </div>
    </div>
  `;

  const modalWrapper = openModal(modalHtml);
  const viewBookingsBtn = modalWrapper.querySelector("#btn-receipt-view-bookings");
  if (viewBookingsBtn) {
    viewBookingsBtn.addEventListener("click", () => {
      closeModal();
      navigateTo("my-bookings");
    });
  }
}

// ----------------------------------------------------
// 3. BOOKING DETAILS MODAL
// ----------------------------------------------------

export function openBookingDetailsModal(bookingId) {
  const booking = getBookingById(bookingId);
  if (!booking) {
    showToast("Booking not found.", "error");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const isUpcoming = booking.status === "confirmed" && booking.date >= today;

  const modalHtml = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <span class="modal-kicker">Reservation Details</span>
            <h3 class="modal-title">${escapeHtml(booking.resourceName)}</h3>
          </div>
          <button class="modal-close-btn" data-modal-close aria-label="Close dialog">&times;</button>
        </div>

        <div class="modal-body">
          <div class="details-top-card">
            <div class="details-status-row">
              <span class="booking-id-tag">#${escapeHtml(booking.id)}</span>
              <span class="status-badge ${booking.status === "confirmed" ? "status-confirmed" : booking.status === "cancelled" ? "status-cancelled" : "status-completed"}">
                ${booking.status.toUpperCase()}
              </span>
            </div>
            <h4 class="details-facility-title">${escapeHtml(booking.facilityName || booking.resourceName)}</h4>
            <p class="details-location-text">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${escapeHtml(booking.location)}
            </p>
          </div>

          <div class="confirm-grid">
            <div class="confirm-cell">
              <span class="cell-label">Reservation Date</span>
              <span class="cell-value">${formatDisplayDate(booking.date)}</span>
            </div>
            <div class="confirm-cell">
              <span class="cell-label">Reserved Interval</span>
              <span class="cell-value">${formatDisplayTime(booking.startTime)} - ${formatDisplayTime(booking.endTime)} (${formatDuration(booking.startTime, booking.endTime)})</span>
            </div>
            <div class="confirm-cell">
              <span class="cell-label">Reserved For</span>
              <span class="cell-value">${escapeHtml(booking.userName)} (${escapeHtml(booking.userId)})</span>
            </div>
            <div class="confirm-cell">
              <span class="cell-label">Participants</span>
              <span class="cell-value">${booking.participants || 1} Person</span>
            </div>
            <div class="confirm-cell">
              <span class="cell-label">Academic Purpose</span>
              <span class="cell-value">${escapeHtml(booking.purpose || "Academic Study")}</span>
            </div>
            <div class="confirm-cell">
              <span class="cell-label">Booked At</span>
              <span class="cell-value">${new Date(booking.createdAt).toLocaleString()}</span>
            </div>
          </div>

          ${booking.status === "cancelled" ? `
            <div class="cancellation-notice-box mt-3">
              <strong>Cancelled At:</strong> ${booking.cancelledAt ? new Date(booking.cancelledAt).toLocaleString() : "Recently"}<br>
              <strong>Reason:</strong> ${escapeHtml(booking.cancellationReason || "Cancelled by user")}
            </div>
          ` : ""}
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" data-modal-close>Close</button>
          ${isUpcoming ? `
            <button class="btn btn-outline-danger" id="btn-details-cancel">
              Cancel This Reservation
            </button>
          ` : ""}
        </div>
      </div>
    </div>
  `;

  const modalWrapper = openModal(modalHtml);
  const cancelBtn = modalWrapper.querySelector("#btn-details-cancel");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      closeModal();
      openCancelConfirmModal(booking.id, () => {
        renderCurrentView();
      });
    });
  }
}

// ----------------------------------------------------
// 4. CANCEL CONFIRMATION MODAL
// ----------------------------------------------------

export function openCancelConfirmModal(bookingId, onSuccessCallback) {
  const booking = getBookingById(bookingId);
  if (!booking) return;

  const modalHtml = `
    <div class="modal-dialog modal-danger">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <span class="modal-kicker text-danger">Cancellation Confirmation</span>
            <h3 class="modal-title">Cancel Reservation?</h3>
          </div>
          <button class="modal-close-btn" data-modal-close aria-label="Close dialog">&times;</button>
        </div>

        <div class="modal-body">
          <div class="cancel-warning-box">
            <svg class="icon-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <p>Are you sure you want to cancel booking <strong>#${escapeHtml(booking.id)}</strong> for <strong>${escapeHtml(booking.resourceName)}</strong>?</p>
              <p class="text-sm">This space will immediately become available for other students to reserve on ${formatDisplayDate(booking.date)} (${formatDisplayTime(booking.startTime)} - ${formatDisplayTime(booking.endTime)}).</p>
            </div>
          </div>

          <div class="form-group mt-3">
            <label for="cancel-reason-input" class="form-label">Reason for Cancellation (Optional)</label>
            <input 
              type="text" 
              id="cancel-reason-input" 
              class="form-input" 
              placeholder="e.g. Class rescheduled, project completed early"
              value="Schedule change"
            >
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" data-modal-close>Keep Reservation</button>
          <button class="btn btn-danger" id="btn-confirm-cancel-action">
            Yes, Cancel Reservation
          </button>
        </div>
      </div>
    </div>
  `;

  const modalWrapper = openModal(modalHtml);
  const confirmBtn = modalWrapper.querySelector("#btn-confirm-cancel-action");

  confirmBtn.addEventListener("click", () => {
    const reasonInput = modalWrapper.querySelector("#cancel-reason-input");
    const reason = reasonInput ? reasonInput.value.trim() : "Cancelled by student";

    const res = cancelBooking(bookingId, reason);
    closeModal();

    if (res.success) {
      showToast(`Reservation #${bookingId} has been cancelled successfully.`, "info");
      updateNotificationBadge();
      if (onSuccessCallback) onSuccessCallback(res.booking);
    } else {
      showToast(res.error || "Failed to cancel reservation.", "error");
    }
  });
}

// ============================================================================
// PROFILE & SETTINGS VIEW
// ============================================================================

function renderProfileSettingsView(container) {
  const user = getCurrentUser();
  const settings = getSettings();

  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">Settings & Profile</h1>
      <p class="view-subtitle">Manage student profile details, preferences, and demonstration data.</p>
    </div>

    <div class="profile-layout-grid">
      <!-- Left: Student Profile Card -->
      <div class="profile-card">
        <div class="profile-avatar-header">
          <div class="profile-avatar-circle">${escapeHtml(user.avatarText || "AR")}</div>
          <div class="profile-avatar-meta">
            <h3 class="profile-name">${escapeHtml(user.name)}</h3>
            <span class="profile-badge">Active Student Pass</span>
          </div>
        </div>

        <div class="profile-details-list">
          <div class="profile-field">
            <span class="field-label">Student ID</span>
            <span class="field-value">${escapeHtml(user.id)}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">Institutional Email</span>
            <span class="field-value">${escapeHtml(user.email)}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">Department</span>
            <span class="field-value">${escapeHtml(user.department)}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">Academic Year</span>
            <span class="field-value">${escapeHtml(user.year)}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">Library Card No.</span>
            <span class="field-value">${escapeHtml(user.studentCardId)}</span>
          </div>
        </div>
      </div>

      <!-- Right: Settings & Data Management -->
      <div class="settings-column">
        <!-- Booking & Interface Preferences -->
        <div class="settings-card">
          <h3 class="settings-card-title">Preferences & Appearance</h3>
          
          <div class="settings-row">
            <div>
              <div class="setting-name">Dark Mode</div>
              <div class="setting-desc">Switch between light and dark visual themes across the application.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="pref-theme" ${getActiveTheme() === "dark" ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="settings-row">
            <div>
              <div class="setting-name">Email Reservation Receipts</div>
              <div class="setting-desc">Simulate automated confirmation emails upon new bookings.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="pref-notifications" ${settings.notificationsEnabled ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="settings-row">
            <div>
              <div class="setting-name">Check-in Grace Period Reminders</div>
              <div class="setting-desc">Alert 15 minutes prior to scheduled start time.</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="pref-reminders" ${settings.autoCheckinReminders ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="settings-row">
            <div>
              <div class="setting-name">Default Reservation Duration</div>
              <div class="setting-desc">Preferred duration for quick slot selections.</div>
            </div>
            <select id="pref-duration" class="form-select form-select-sm">
              <option value="1" ${settings.defaultDuration === "1" ? "selected" : ""}>1 Hour</option>
              <option value="2" ${settings.defaultDuration === "2" ? "selected" : ""}>2 Hours</option>
              <option value="4" ${settings.defaultDuration === "4" ? "selected" : ""}>4 Hours</option>
            </select>
          </div>
        </div>

        <!-- Data Management & Demo Controls -->
        <div class="settings-card">
          <h3 class="settings-card-title">Demo Data Controls</h3>
          <p class="settings-card-desc">Use these tools during your college project presentation to reset or inspect data.</p>

          <div class="data-actions-grid">
            <button class="btn btn-outline" id="btn-export-data">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Data (JSON)
            </button>

            <button class="btn btn-outline" id="btn-clear-bookings">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Clear All Bookings
            </button>

            <button class="btn btn-outline-danger" id="btn-reset-demo-data">
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
              Reset to Initial Sample Data
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach preference handlers
  const prefTheme = container.querySelector("#pref-theme");
  const prefNotif = container.querySelector("#pref-notifications");
  const prefRemind = container.querySelector("#pref-reminders");
  const prefDur = container.querySelector("#pref-duration");

  if (prefTheme) {
    prefTheme.addEventListener("change", () => {
      setTheme(prefTheme.checked ? "dark" : "light", true);
    });
  }

  const savePreferences = () => {
    updateSettings({
      notificationsEnabled: prefNotif.checked,
      autoCheckinReminders: prefRemind.checked,
      defaultDuration: prefDur.value
    });
    showToast("Preferences saved to local storage.", "info");
  };

  if (prefNotif) prefNotif.addEventListener("change", savePreferences);
  if (prefRemind) prefRemind.addEventListener("change", savePreferences);
  if (prefDur) prefDur.addEventListener("change", savePreferences);

  // Attach data management buttons
  const btnExport = container.querySelector("#btn-export-data");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      const dataStr = exportDataAsJSON();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `libraryhub_demo_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Data export initiated.", "success");
    });
  }

  const btnClearBookings = container.querySelector("#btn-clear-bookings");
  if (btnClearBookings) {
    btnClearBookings.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all bookings? Resources will remain intact.")) {
        clearAllBookings();
        showToast("All bookings have been cleared.", "info");
        updateNotificationBadge();
        renderProfileSettingsView(container);
      }
    });
  }

  const btnReset = container.querySelector("#btn-reset-demo-data");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      if (confirm("Reset demo data to initial factory state? Any new reservations created will be replaced with sample bookings.")) {
        resetDemoData();
        showToast("Demo data restored to initial factory sample state.", "success");
        updateUserUI();
        updateNotificationBadge();
        renderProfileSettingsView(container);
      }
    });
  }
}

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

export function showToast(message, type = "success", duration = 3500) {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;

  let iconSvg = "";
  if (type === "success") {
    iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === "error") {
    iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  } else if (type === "warning") {
    iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  } else {
    iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <div class="toast-msg">${escapeHtml(message)}</div>
    <button class="toast-close" aria-label="Close notification">&times;</button>
  `;

  toastContainer.appendChild(toast);

  // Auto remove
  const removeToast = () => {
    toast.classList.add("toast-hiding");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  };

  const timer = setTimeout(removeToast, duration);

  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      clearTimeout(timer);
      removeToast();
    });
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
