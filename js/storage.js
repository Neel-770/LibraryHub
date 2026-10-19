/**
 * storage.js - LocalStorage Persistence & Safe Access Helpers
 * 
 * Safely reads and writes resources, bookings, user profile, and settings
 * to the browser's localStorage. Ensures the app is resilient against
 * empty or corrupted storage, and never wipes saved bookings on refresh.
 */

import { DEMO_USER, getInitialResources, getInitialBookings } from "./data.js";

const STORAGE_KEYS = {
  RESOURCES: "lh_resources",
  BOOKINGS: "lh_bookings",
  CURRENT_USER: "lh_currentUser",
  SETTINGS: "lh_settings",
  THEME: "lh_theme"
};

/**
 * Safe JSON parser with fallback
 */
function safeGetItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[LibraryHub Storage] Failed to parse key "${key}":`, err);
    return fallback;
  }
}

/**
 * Safe JSON stringifier
 */
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[LibraryHub Storage] Failed to write key "${key}":`, err);
    return false;
  }
}

/**
 * Initialize storage with default data if missing or corrupted
 */
export function initStorage(forceReset = false) {
  if (forceReset) {
    localStorage.removeItem(STORAGE_KEYS.RESOURCES);
    localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  }

  // Check and seed resources
  let resources = safeGetItem(STORAGE_KEYS.RESOURCES);
  if (!resources || !Array.isArray(resources) || resources.length === 0) {
    resources = getInitialResources();
    safeSetItem(STORAGE_KEYS.RESOURCES, resources);
  }

  // Check and seed bookings
  let bookings = safeGetItem(STORAGE_KEYS.BOOKINGS);
  if (!bookings || !Array.isArray(bookings)) {
    bookings = getInitialBookings();
    safeSetItem(STORAGE_KEYS.BOOKINGS, bookings);
  }

  // Check and seed user profile
  let user = safeGetItem(STORAGE_KEYS.CURRENT_USER);
  if (!user || typeof user !== "object") {
    user = { ...DEMO_USER };
    safeSetItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  // Check and seed settings
  let settings = safeGetItem(STORAGE_KEYS.SETTINGS);
  if (!settings || typeof settings !== "object") {
    settings = { ...DEMO_USER.preferences };
    safeSetItem(STORAGE_KEYS.SETTINGS, settings);
  }

  return {
    resourcesCount: resources.length,
    bookingsCount: bookings.length,
    user
  };
}

// ----------------------------------------------------
// RESOURCES ACCESSORS
// ----------------------------------------------------

export function getResources() {
  const items = safeGetItem(STORAGE_KEYS.RESOURCES, []);
  if (!Array.isArray(items) || items.length === 0) {
    const initial = getInitialResources();
    safeSetItem(STORAGE_KEYS.RESOURCES, initial);
    return initial;
  }
  return items;
}

export function getResourceById(id) {
  const all = getResources();
  return all.find(r => r.id === id) || null;
}

export function getResourcesByType(type) {
  const all = getResources();
  return all.filter(r => r.type === type);
}

export function getResourcesByParent(parentId) {
  const all = getResources();
  return all.filter(r => r.parentId === parentId);
}

// ----------------------------------------------------
// BOOKINGS ACCESSORS
// ----------------------------------------------------

export function getBookings() {
  const bookings = safeGetItem(STORAGE_KEYS.BOOKINGS, []);
  return Array.isArray(bookings) ? bookings : [];
}

export function getBookingById(id) {
  const bookings = getBookings();
  return bookings.find(b => b.id === id) || null;
}

export function getUserBookings(userId = null) {
  const user = getCurrentUser();
  const targetId = userId || user.id;
  const bookings = getBookings();
  return bookings.filter(b => b.userId === targetId);
}

export function saveBooking(booking) {
  const bookings = getBookings();
  // Ensure no duplicate IDs
  const existingIdx = bookings.findIndex(b => b.id === booking.id);
  if (existingIdx >= 0) {
    bookings[existingIdx] = booking;
  } else {
    // Add new booking to beginning of list
    bookings.unshift(booking);
  }
  safeSetItem(STORAGE_KEYS.BOOKINGS, bookings);
  return booking;
}

export function updateBooking(id, updates) {
  const bookings = getBookings();
  const index = bookings.findIndex(b => b.id === id);
  if (index === -1) return null;

  bookings[index] = {
    ...bookings[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  safeSetItem(STORAGE_KEYS.BOOKINGS, bookings);
  return bookings[index];
}

export function cancelBookingInStorage(id, reason = "Cancelled by user") {
  return updateBooking(id, {
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    cancellationReason: reason
  });
}

export function deleteBooking(id) {
  const bookings = getBookings();
  const filtered = bookings.filter(b => b.id !== id);
  safeSetItem(STORAGE_KEYS.BOOKINGS, filtered);
  return filtered.length < bookings.length;
}

// ----------------------------------------------------
// USER & SETTINGS ACCESSORS
// ----------------------------------------------------

export function getCurrentUser() {
  const user = safeGetItem(STORAGE_KEYS.CURRENT_USER);
  return user || { ...DEMO_USER };
}

export function updateCurrentUser(updates) {
  const current = getCurrentUser();
  const updated = { ...current, ...updates };
  safeSetItem(STORAGE_KEYS.CURRENT_USER, updated);
  return updated;
}

export function getSettings() {
  const settings = safeGetItem(STORAGE_KEYS.SETTINGS);
  return settings || { ...DEMO_USER.preferences };
}

export function updateSettings(updates) {
  const current = getSettings();
  const updated = { ...current, ...updates };
  safeSetItem(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

export function getSavedTheme() {
  try {
    const directTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (directTheme === "dark" || directTheme === "light") {
      return directTheme;
    }
  } catch (e) {}

  const settings = getSettings();
  if (settings && (settings.theme === "dark" || settings.theme === "light")) {
    return settings.theme;
  }

  if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export function saveTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, normalized);
  } catch (e) {}
  updateSettings({ theme: normalized });
  return normalized;
}

// ----------------------------------------------------
// MANAGEMENT & RESET
// ----------------------------------------------------

export function resetDemoData() {
  const resources = getInitialResources();
  const bookings = getInitialBookings();
  const user = { ...DEMO_USER };
  const settings = { ...DEMO_USER.preferences };

  safeSetItem(STORAGE_KEYS.RESOURCES, resources);
  safeSetItem(STORAGE_KEYS.BOOKINGS, bookings);
  safeSetItem(STORAGE_KEYS.CURRENT_USER, user);
  safeSetItem(STORAGE_KEYS.SETTINGS, settings);

  return {
    resourcesCount: resources.length,
    bookingsCount: bookings.length,
    user
  };
}

export function clearAllBookings() {
  safeSetItem(STORAGE_KEYS.BOOKINGS, []);
  return true;
}

export function exportDataAsJSON() {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    user: getCurrentUser(),
    settings: getSettings(),
    resources: getResources(),
    bookings: getBookings()
  }, null, 2);
}
