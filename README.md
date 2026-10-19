# LibraryHub — College Library Seat, Resource & Facility Reservation System

LibraryHub is a modern, student-facing web application designed for college libraries. It allows students to check real-time facility availability, reserve individual computer workstations, book group discussion rooms, select quiet study cubicles, and choose specific desks on an interactive architectural seat map.

Built strictly with **vanilla web technologies (HTML5, CSS3, and modern ES6+ JavaScript modules)**, LibraryHub requires **no compilation step, no build tools, and no external dependencies**. It runs instantly in any modern browser via VS Code Live Server or a basic local HTTP server.

---

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [How to Run](#how-to-run)
5. [Facilities & Booking Workflows](#facilities--booking-workflows)
6. [Shared Booking Engine & Overlap Logic](#shared-booking-engine--overlap-logic)
7. [LocalStorage Persistence & Demo Data](#localstorage-persistence--demo-data)
8. [Testing & Verification Guide](#testing--verification-guide)
9. [Current Limitations & Future Scope](#current-limitations--future-scope)

---

## Features

- **Live Overview Dashboard**:
  - Live statistics calculated in real-time from stored demo data (total resources, spaces available right now, active student bookings, and total semester history).
  - Four quick-access facility cards with dynamic available-capacity counters.
  - Upcoming reservations widget with one-click access to detailed digital passes.
- **Computer Lab Reservation**:
  - Reserve **individual computers** (e.g., `PC-A-01` to `PC-C-12`), not entire labs.
  - Supports three specialized labs: Alan Turing Computing Lab (Dual 27" screens), Ada Lovelace Digital Media Lab (4K displays), and Grace Hopper AI & Research Lab (RTX 4080 GPUs).
  - Clear state indicators: Available (green), Occupied for selected slot (red/gray disabled), and Selected (blue).
- **Discussion Room Reservation**:
  - Book **entire collaboration suites** (4 to 10-person capacities).
  - Enforces capacity checks: cannot book for more participants than the room allows.
  - A confirmed booking reserves the entire room for that time interval, preventing double bookings.
- **Honors Study Room**:
  - Visual grid of 20 individual quiet study cubicles (`ST-01` to `ST-20`).
  - Each cubicle operates independently with individual power outlets, reading lamps, and acoustic partitions.
- **Interactive Library Seat Map**:
  - Visual architectural layout of the Main Library Reading Hall built with CSS Grid.
  - Four distinct rows: Row A (North Window Bay with daylight), Row B (Central Silent Core), Row C (Reference Stacks Deck), and Row D (South Courtyard Bay).
  - Complete with labeled rows, central aisles, walkway barriers, window walls, and power socket badges.
  - Seat states clearly indicated via color, accessible text captions, and ARIA labels.
- **Complete Booking Management (My Bookings)**:
  - Filter by status (All, Upcoming Active, Completed, Cancelled).
  - Filter by facility type and date range (Today, Future, Past).
  - Real-time instant search by Booking ID (e.g., `LH-10021`) or resource name.
  - Modal digital passes with barcode graphics and check-in instructions.
  - Safe cancellation with confirmation dialogs: updates status to `cancelled` and immediately releases the resource for other students while preserving booking history.
- **Profile & Demo Settings**:
  - Demo student account for **Alex Rivera** (`STU-2024-8842`).
  - Configurable notification and grace-period reminders.
  - Demo data controls: "Reset to Initial Sample Data", "Clear All Bookings", and "Export Data (JSON)".

---

## Technology Stack

- **HTML5**: Semantic document structure (`<aside>`, `<header>`, `<main>`, `<nav>`, `<section>`).
- **CSS3**:
  - CSS Custom Properties (semantic design tokens for colors, spacing, shadows, and radii).
  - CSS Grid and Flexbox for responsive layouts and architectural floor plans.
  - Responsive design with off-canvas mobile drawer and touch-friendly controls.
  - Accessible focus states (`:focus-visible`) and reduced-motion media query support.
- **Vanilla JavaScript (ES6+)**:
  - Native ES Modules (`import` / `export`).
  - Browser Native Web Storage API (`localStorage`).
  - Zero external frameworks (No React, Vue, Angular, Bootstrap, Tailwind, jQuery, or TypeScript).
- **Typography**: Inter (via Google Fonts with clean system sans-serif fallback).
- **Icons**: Clean inline SVG icons ensuring complete offline resilience.

---

## Project Structure

```text
LibraryHub/
├── index.html              # Main application shell with sidebar, header, and containers
├── README.md               # Complete project documentation and guide
├── css/
│   ├── style.css           # Design tokens, typography, components, and floor plan styling
│   └── responsive.css      # Off-canvas mobile navigation drawer and breakpoint rules
├── js/
│   ├── app.js              # Application coordinator, view router, modals, and toasts
│   ├── data.js             # Initial resource configurations, time slots, and sample bookings
│   ├── storage.js          # LocalStorage persistence, safe parsing, and data mutators
│   ├── booking.js          # Shared booking engine, time-interval overlap logic, and validator
│   ├── dashboard.js        # Dashboard statistics, facility cards, and upcoming widget
│   ├── resources.js        # Computer labs, discussion rooms, and study room views
│   ├── seats.js            # Interactive library seat map controller and dynamic floor plan
│   └── my-bookings.js      # Booking management, filtering, and cancellation workflows
└── assets/
    └── icons/              # Standalone SVG icon assets
        ├── logo.svg
        ├── computer.svg
        ├── room.svg
        ├── study.svg
        └── seat.svg
```

---

## How to Run

Because LibraryHub uses standard **ES Modules (`type="module"`)**, browsers require the application to be served through an HTTP server (to satisfy browser CORS security policies for local files).

### Option 1: VS Code Live Server (Recommended)

1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension by Ritwick Dey (if not already installed).
3. Right-click `index.html` (or `LibraryHub/index.html`) and select **"Open with Live Server"**.
4. The application will automatically open in your default browser at `http://127.0.0.1:5500/`.

### Option 2: Python Built-in HTTP Server

Open a terminal or PowerShell in the project directory:

```bash
# Python 3
python -m http.server 8000
```

Open your browser and navigate to: `http://localhost:8000/LibraryHub/index.html`

### Option 3: Node.js `npx serve`

```bash
npx serve .
```

---

## Facilities & Booking Workflows

### 1. Computer Labs (Individual Workstations)
- Students choose a lab tab (Alan Turing Lab, Ada Lovelace Media Lab, or Grace Hopper AI Lab).
- Select a date and one of the standard time slots (e.g., `10:00 AM - 12:00 PM`).
- The system checks each computer's availability for that specific interval.
- The student selects an available workstation (e.g., `PC-A-01`), reviews hardware specs, and confirms the booking.
- A computer is **only blocked for the reserved slot**, remaining available for other slots throughout the day.

### 2. Discussion Rooms (Entire Rooms)
- Discussion rooms (`DR-101` to `DR-301`) accommodate between 4 and 10 students.
- The student sets expected participants. If the participant count exceeds a room's capacity, the card indicates overcapacity and disables reservation.
- Reserving a discussion room blocks the **entire room** for the specified interval.

### 3. Honors Study Room (Quiet Study Pods)
- 20 individual quiet cubicles (`ST-01` to `ST-20`) in the Honors Silent Study Hall.
- Each place can be booked independently; reserving `ST-01` leaves `ST-02` through `ST-20` open.

### 4. Library Reading Seats (Interactive Seat Map)
- Visual architectural floor plan of the Main Reading Hall.
- Dynamic color-coding:
  - **Green**: Available for selection during the chosen time interval.
  - **Red**: Occupied/Reserved by another student during that slot.
  - **Blue**: Currently selected by the student.
- Selecting an available desk displays its study zone, power socket status, desk type, and time interval before confirming.

---

## Shared Booking Engine & Overlap Logic

All four facility views share a unified booking validation and persistence engine in `js/booking.js`.

### Overlap Detection Formula

Two intervals on the same date for the same resource conflict when:

$$\text{newStart} < \text{existingEnd} \quad \text{AND} \quad \text{newEnd} > \text{existingStart}$$

```javascript
export function isTimeOverlapping(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}
```

### Validation Checklist Before Saving
1. Valid resource ID exists in stored resources.
2. Reservation date is valid and not in the past (`date >= today`).
3. Start time is strictly earlier than end time (`startTime < endTime`).
4. Minimum reservation duration is at least 30 minutes.
5. Participant count is valid (must not exceed room capacity for discussion rooms).
6. Resource availability is re-verified immediately before persisting to prevent race conditions.
7. Generates a unique booking ID (e.g., `LH-10842`).
8. Cancelled bookings (`status === 'cancelled'`) are excluded from conflict checks.

---

## LocalStorage Persistence & Demo Data

All data is stored in the browser's `localStorage` under four keys:
- `lh_resources`: Catalog of all 85 bookable facilities and individual seats.
- `lh_bookings`: Array of active, completed, and cancelled bookings.
- `lh_currentUser`: Current demo student profile (`Alex Rivera`, `STU-2024-8842`).
- `lh_settings`: User preferences (notification toggles, default duration).

### Persistence Guarantees
- **Safe Initialization**: Resources and initial sample bookings are seeded only if the keys do not already exist in `localStorage`.
- **Refresh Resilient**: Refreshing the browser preserves all created and cancelled reservations.
- **Safe JSON Access**: All reads and writes are wrapped in `try...catch` blocks to prevent crashes if `localStorage` contains unexpected data.
- **Demo Reset Feature**: The Profile & Settings view provides a "Reset to Initial Sample Data" button with confirmation.

> **Important Note for Demonstrations**: `localStorage` is isolated to the specific browser and machine running the application. It provides realistic persistence for a single-device demo but is not a shared multi-user backend.

---

## Testing & Verification Guide

| Test Scenario | How to Verify | Expected Result |
| :--- | :--- | :--- |
| **1. Navigation & Routing** | Click each link in the left sidebar (or mobile drawer). | The view switches smoothly without full page reload; header breadcrumb and title update. |
| **2. Live Statistics** | View the Dashboard statistics cards. | Metric counters match the count of stored resources and bookings. |
| **3. Book a Computer** | Go to Computer Labs, select Turing Lab, pick an available PC, click "Confirm Reservation". | Unique `LH-XXXXX` ID generated, success pass shown, PC changes to reserved for that slot. |
| **4. Time Slot Independence** | In Computer Labs, change time slot from 10:00-12:00 to 14:00-16:00. | The PC previously booked in 10:00-12:00 shows as available in 14:00-16:00. |
| **5. Room Capacity Check** | In Discussion Rooms, set participants to 9. | Rooms with capacity < 9 (e.g., Galileo Room, capacity 4) indicate capacity exceeded and disable booking. |
| **6. Visual Seat Map** | Go to Library Seats, click an available green seat (e.g., A03). | Desk turns blue with pulse border; summary pane displays desk details and enables confirmation. |
| **7. Double-Booking Prevention** | Attempt to reserve an occupied (red) seat or computer. | Selection is blocked and disabled; engine rejects overlapping requests. |
| **8. Cancellation Flow** | In My Bookings, click "Cancel Reservation" on an active booking. | Confirmation modal appears; upon confirmation, status changes to "Cancelled" and the resource immediately frees up on the seat map. |
| **9. Persistence on Refresh** | Create a booking, then press F5 to reload the page. | The booking remains in My Bookings, and statistics on Dashboard remain accurate. |
| **10. Mobile Responsiveness** | Resize browser below 768px or open mobile emulation. | Sidebar collapses into hamburger drawer; seat map enables touch scrolling; all forms stack cleanly. |

---

## Current Limitations & Future Scope

### Current Architectural Limitations
1. **Client-Side Storage**: Data is saved in the browser's `localStorage`, meaning reservations made in Chrome will not appear in Firefox or on another student's phone.
2. **Simulated Authentication**: The student profile is a pre-configured demo account (`Alex Rivera`) for project demonstration purposes.
3. **No Real Hardware Integration**: Check-in and check-out are simulated via UI actions rather than physical RFID/barcode scanners at library gates.

### Recommended Future Enhancements
- Connect to a centralized backend API (Node.js/Express, Python/FastAPI, or Java/Spring Boot) with a PostgreSQL database.
- Integrate Single Sign-On (SSO) with the university's CAS or SAML/OAuth2 authentication.
- Implement WebSockets or Server-Sent Events (SSE) for multi-device real-time seat map synchronization.
- Add QR code generation and camera-based gate check-in scanners.
