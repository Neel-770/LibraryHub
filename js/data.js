/**
 * data.js - LibraryHub Initial Sample Data & Schemas
 * 
 * Provides initial configurations, demo user profile, facility resources,
 * time slot presets, and realistic sample bookings.
 */

// Demo User Profile
export const DEMO_USER = {
  id: "STU-2024-8842",
  name: "Alex Rivera",
  email: "alex.rivera@campus.edu",
  department: "Computer Science & Engineering",
  year: "Junior (Year 3)",
  studentCardId: "LIB-8842-X",
  avatarText: "AR",
  phone: "+1 (555) 234-5678",
  role: "Undergraduate Student",
  preferences: {
    defaultDuration: "2", // hours
    notificationsEnabled: true,
    autoCheckinReminders: true,
    compactView: false,
    defaultBookingType: "librarySeat"
  }
};

// Standard Time Slots (08:00 to 20:00)
export const TIME_SLOTS = [
  { id: "slot-1", label: "08:00 AM - 10:00 AM", startTime: "08:00", endTime: "10:00", period: "Morning" },
  { id: "slot-2", label: "10:00 AM - 12:00 PM", startTime: "10:00", endTime: "12:00", period: "Morning" },
  { id: "slot-3", label: "12:00 PM - 02:00 PM", startTime: "12:00", endTime: "14:00", period: "Afternoon" },
  { id: "slot-4", label: "02:00 PM - 04:00 PM", startTime: "14:00", endTime: "16:00", period: "Afternoon" },
  { id: "slot-5", label: "04:00 PM - 06:00 PM", startTime: "16:00", endTime: "18:00", period: "Evening" },
  { id: "slot-6", label: "06:00 PM - 08:00 PM", startTime: "18:00", endTime: "20:00", period: "Evening" }
];

// Computer Labs Meta
export const COMPUTER_LABS = [
  {
    id: "LAB-A",
    name: "Alan Turing Computing Lab",
    shortName: "Turing Lab",
    location: "2nd Floor, West Wing",
    totalComputers: 16,
    description: "High-performance programming workstations equipped with dual monitors and developer tools.",
    operatingHours: "08:00 AM - 08:00 PM",
    specs: "Core i7, 32GB RAM, Dual 27\" Monitors",
    os: "Ubuntu Linux & Windows 11",
    primarySoftware: ["VS Code", "PyCharm", "Docker", "Node.js", "MATLAB", "Git"]
  },
  {
    id: "LAB-B",
    name: "Ada Lovelace Digital Media Lab",
    shortName: "Lovelace Lab",
    location: "2nd Floor, East Wing",
    totalComputers: 12,
    description: "Digital design and audiovisual editing stations with color-calibrated 4K displays.",
    operatingHours: "08:00 AM - 08:00 PM",
    specs: "Apple Mac Studio / Core i9, 64GB RAM, 4K Display",
    os: "macOS Sonoma & Windows 11",
    primarySoftware: ["Adobe Creative Cloud", "Blender", "Figma", "DaVinci Resolve", "Audacity"]
  },
  {
    id: "LAB-C",
    name: "Grace Hopper AI & Research Lab",
    shortName: "Hopper Lab",
    location: "3rd Floor, Tech Annex",
    totalComputers: 12,
    description: "GPU-accelerated systems tailored for machine learning, data science, and academic research.",
    operatingHours: "08:00 AM - 08:00 PM",
    specs: "NVIDIA RTX 4080, 64GB RAM, High-speed NVMe",
    os: "Ubuntu 24.04 LTS (CUDA 12)",
    primarySoftware: ["JupyterLab", "TensorFlow", "PyTorch", "RStudio", "PostgreSQL", "Conda"]
  }
];

// Helper to generate individual computers
function generateComputers() {
  const computers = [];

  // LAB-A: 16 computers
  for (let i = 1; i <= 16; i++) {
    const num = i < 10 ? `0${i}` : `${i}`;
    computers.push({
      id: `PC-A-${num}`,
      name: `Workstation A-${num}`,
      type: "computer",
      parentId: "LAB-A",
      parentName: "Alan Turing Computing Lab",
      location: `2nd Floor, West Wing - Row ${Math.ceil(i / 4)}`,
      specs: "Intel i7-13700, 32GB RAM, Dual 27\" Monitors",
      features: ["Dual 27\" 144Hz Monitors", "Mechanical Keyboard", "High-speed Ethernet", "Webcam"],
      isAccessible: i === 1 || i === 2
    });
  }

  // LAB-B: 12 computers
  for (let i = 1; i <= 12; i++) {
    const num = i < 10 ? `0${i}` : `${i}`;
    computers.push({
      id: `PC-B-${num}`,
      name: `Media Studio B-${num}`,
      type: "computer",
      parentId: "LAB-B",
      parentName: "Ada Lovelace Digital Media Lab",
      location: `2nd Floor, East Wing - Row ${Math.ceil(i / 4)}`,
      specs: "Mac Studio M2 Max / Core i9, 64GB RAM, Color-calibrated 4K",
      features: ["Calibrated 4K 32\" Display", "Wacom Intuos Pro Tablet", "Studio Headphones", "SD Card Reader"],
      isAccessible: i === 1
    });
  }

  // LAB-C: 12 computers
  for (let i = 1; i <= 12; i++) {
    const num = i < 10 ? `0${i}` : `${i}`;
    computers.push({
      id: `PC-C-${num}`,
      name: `AI Station C-${num}`,
      type: "computer",
      parentId: "LAB-C",
      parentName: "Grace Hopper AI & Research Lab",
      location: `3rd Floor, Tech Annex - Row ${Math.ceil(i / 4)}`,
      specs: "NVIDIA RTX 4080, AMD Ryzen 9, 64GB RAM, CUDA 12",
      features: ["RTX 4080 GPU", "Linux Ubuntu 24.04", "Docker/CUDA Ready", "Gigabit Uplink"],
      isAccessible: i === 1
    });
  }

  return computers;
}

// Discussion Rooms (Booked as entire rooms)
export const DISCUSSION_ROOMS = [
  {
    id: "DR-101",
    name: "Newton Collaboration Room",
    type: "discussionRoom",
    location: "1st Floor, West Wing",
    capacity: 6,
    features: [
      "65\" 4K Smart Presentation Screen",
      "Large Magnetic Glass Whiteboard",
      "Logitech Conference Cam & Mic",
      "HDMI & USB-C Universal Hub",
      "Acoustic Wall Panels"
    ],
    recommendedFor: "Group study, project presentations, collaborative coding",
    description: "Comfortable room suited for mid-sized project teams with full video conferencing and presentation gear."
  },
  {
    id: "DR-102",
    name: "Curie Innovation Hub",
    type: "discussionRoom",
    location: "1st Floor, East Wing",
    capacity: 8,
    features: [
      "75\" Interactive Touchscreen Board",
      "Dual Floor-to-Ceiling Whiteboards",
      "Omnidirectional Conference Microphone",
      "High-power Device Charging Table",
      "Sound-damped Quiet Glass"
    ],
    recommendedFor: "Brainstorming sessions, design critiques, club meetings",
    description: "Spacious tech-forward room equipped with an interactive touch board for dynamic whiteboarding and teamwork."
  },
  {
    id: "DR-201",
    name: "Galileo Strategy Room",
    type: "discussionRoom",
    location: "2nd Floor, Central Atrium",
    capacity: 4,
    features: [
      "55\" Ultra-HD Monitor",
      "Wall-mounted Dry Erase Board",
      "Quiet Acoustic Privacy Booth Style",
      "Power Strips & Fast Wireless Pad"
    ],
    recommendedFor: "Pair programming, research interviews, 3-4 person groups",
    description: "Compact, private meeting space ideal for focused discussions and peer tutoring."
  },
  {
    id: "DR-202",
    name: "Ramanujan Study Suite",
    type: "discussionRoom",
    location: "2nd Floor, Seminar Corridor",
    capacity: 10,
    features: [
      "85\" Conference Presentation Wall",
      "Full Surround Ceiling Microphone Array",
      "Dry-Erase Walls (360° writing)",
      "Tiered Seating & Ergonomic Chairs",
      "Dedicated Climate Control"
    ],
    recommendedFor: "Large group seminars, research defenses, club executive meets",
    description: "Premium large collaboration suite designed for full team workshops and structured seminars."
  },
  {
    id: "DR-301",
    name: "Tesla Creative Studio",
    type: "discussionRoom",
    location: "3rd Floor, Quiet Terrace",
    capacity: 6,
    features: [
      "Ultra-short Throw Smart Laser Projector",
      "Mobile Flip-chart & Glass Boards",
      "Surround Studio Soundproofing",
      "Modular Movable Desks",
      "Natural Daylight Terrace View"
    ],
    recommendedFor: "Creative brainstorming, pitch rehearsals, video conferencing",
    description: "Bright room with natural light and modular furniture that can be rearranged for flexible layouts."
  }
];

// Study Room Places (Individual cubicles in Honors Quiet Hall)
function generateStudyPlaces() {
  const places = [];
  for (let i = 1; i <= 20; i++) {
    const num = i < 10 ? `0${i}` : `${i}`;
    const podType = i <= 6 ? "Quiet Pod" : i <= 14 ? "Silent Cubicle" : "Deep Focus Carrel";
    places.push({
      id: `ST-${num}`,
      name: `Study Place ${num}`,
      type: "studyPlace",
      parentId: "HONORS-HALL",
      parentName: "Honors Silent Study Hall",
      location: `Ground Floor, South Wing - Zone ${String.fromCharCode(65 + Math.floor((i - 1) / 5))}`,
      features: [
        "Individual 230V AC Socket & 65W USB-C PD",
        "Adjustable LED Desk Lamp",
        "Acoustic Noise-dampening Partition",
        "Ergonomic Mesh Task Chair"
      ],
      podType,
      isAccessible: i === 1 || i === 11
    });
  }
  return places;
}

// Library Seats (Main Reading Hall Visual Map)
// 4 Rows: A (Window Bay), B (Silent Core), C (Reference Stacks), D (Courtyard Terrace)
function generateLibrarySeats() {
  const seats = [];
  const rows = [
    { row: "A", name: "Window Bay (North Garden View)", zone: "Natural Light Zone" },
    { row: "B", name: "Central Silent Core", zone: "Zero Noise Zone" },
    { row: "C", name: "Reference Stacks Deck", zone: "Research & Catalog Zone" },
    { row: "D", name: "Courtyard Terrace Deck", zone: "Open Reading Area" }
  ];

  rows.forEach(r => {
    for (let i = 1; i <= 5; i++) {
      const num = i < 10 ? `0${i}` : `${i}`;
      seats.push({
        id: `LS-${r.row}${num}`,
        code: `${r.row}${num}`,
        name: `Seat ${r.row}${num}`,
        type: "librarySeat",
        row: r.row,
        seatNumber: i,
        rowName: r.name,
        zone: r.zone,
        location: `Main Library Reading Hall, 1st Floor - Row ${r.row}`,
        features: [
          "Integrated Power Outlet",
          "Soft Desk Task Lamp",
          "Wide Oak Reading Surface",
          "Ergonomic Armchair"
        ],
        hasPower: true,
        isNearWindow: r.row === "A" || r.row === "D",
        isAccessible: i === 1
      });
    }
  });

  return seats;
}

// Combine all initial resources
export function getInitialResources() {
  const computers = generateComputers();
  const discussionRooms = DISCUSSION_ROOMS;
  const studyPlaces = generateStudyPlaces();
  const librarySeats = generateLibrarySeats();

  return [
    ...computers,
    ...discussionRooms,
    ...studyPlaces,
    ...librarySeats
  ];
}

// Generate Realistic Initial Sample Bookings
// Current local reference date: 2026-10-19
export function getInitialBookings() {
  // Use today and tomorrow dates dynamically based on current date
  const now = new Date();
  const formatDate = (d) => d.toISOString().split("T")[0];

  const today = formatDate(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = formatDate(tomorrowDate);

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = formatDate(yesterdayDate);

  return [
    // 1. Current student's upcoming confirmed library seat booking (Today afternoon)
    {
      id: "LH-10021",
      userId: DEMO_USER.id,
      userName: DEMO_USER.name,
      resourceId: "LS-A02",
      resourceName: "Seat A02",
      bookingType: "librarySeat",
      facilityName: "Main Library Reading Hall",
      location: "Main Reading Hall, 1st Floor - Row A (Window Bay)",
      date: today,
      startTime: "14:00",
      endTime: "16:00",
      participants: 1,
      status: "confirmed",
      purpose: "Midterm Exam Preparation & Algorithms Study",
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString()
    },
    // 2. Current student's upcoming computer lab booking (Tomorrow morning)
    {
      id: "LH-10022",
      userId: DEMO_USER.id,
      userName: DEMO_USER.name,
      resourceId: "PC-A-03",
      resourceName: "Workstation A-03",
      bookingType: "computer",
      facilityName: "Alan Turing Computing Lab",
      location: "2nd Floor, West Wing - Row 1",
      date: tomorrow,
      startTime: "10:00",
      endTime: "12:00",
      participants: 1,
      status: "confirmed",
      purpose: "Operating Systems Thread Synchronization Lab",
      createdAt: new Date(now.getTime() - 86400000).toISOString()
    },
    // 3. Current student's discussion room booking (Tomorrow afternoon)
    {
      id: "LH-10023",
      userId: DEMO_USER.id,
      userName: DEMO_USER.name,
      resourceId: "DR-101",
      resourceName: "Newton Collaboration Room",
      bookingType: "discussionRoom",
      facilityName: "Newton Collaboration Room",
      location: "1st Floor, West Wing",
      date: tomorrow,
      startTime: "14:00",
      endTime: "16:00",
      participants: 5,
      status: "confirmed",
      purpose: "Senior Capstone Project Architecture Review",
      createdAt: new Date(now.getTime() - 43200000).toISOString()
    },
    // 4. Current student's past study place booking (Yesterday)
    {
      id: "LH-10015",
      userId: DEMO_USER.id,
      userName: DEMO_USER.name,
      resourceId: "ST-04",
      resourceName: "Study Place 04",
      bookingType: "studyPlace",
      facilityName: "Honors Silent Study Hall",
      location: "Ground Floor, South Wing - Zone A",
      date: yesterday,
      startTime: "10:00",
      endTime: "12:00",
      participants: 1,
      status: "completed",
      purpose: "Database Normalization Problem Set",
      createdAt: new Date(now.getTime() - 86400000 * 3).toISOString()
    },
    // 5. Current student's cancelled booking (demonstrating cancellation history)
    {
      id: "LH-10009",
      userId: DEMO_USER.id,
      userName: DEMO_USER.name,
      resourceId: "LS-B03",
      resourceName: "Seat B03",
      bookingType: "librarySeat",
      facilityName: "Main Library Reading Hall",
      location: "Main Reading Hall, 1st Floor - Row B",
      date: yesterday,
      startTime: "16:00",
      endTime: "18:00",
      participants: 1,
      status: "cancelled",
      cancellationReason: "Schedule conflict with lab lecture",
      purpose: "Quiet reading",
      createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(),
      cancelledAt: new Date(now.getTime() - 86400000 * 2).toISOString()
    },

    // 6. Other students' bookings (Creating realistic occupied resources for slot checks)
    // Occupied seat for Today 10:00 - 12:00
    {
      id: "LH-09941",
      userId: "STU-2023-1102",
      userName: "Elena Rostova",
      resourceId: "LS-A01",
      resourceName: "Seat A01",
      bookingType: "librarySeat",
      facilityName: "Main Library Reading Hall",
      location: "Main Reading Hall, 1st Floor - Row A",
      date: today,
      startTime: "10:00",
      endTime: "12:00",
      participants: 1,
      status: "confirmed",
      purpose: "Independent Study",
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString()
    },
    // Occupied seat for Today 10:00 - 12:00
    {
      id: "LH-09942",
      userId: "STU-2024-5519",
      userName: "Marcus Chen",
      resourceId: "LS-B02",
      resourceName: "Seat B02",
      bookingType: "librarySeat",
      facilityName: "Main Library Reading Hall",
      location: "Main Reading Hall, 1st Floor - Row B",
      date: today,
      startTime: "10:00",
      endTime: "12:00",
      participants: 1,
      status: "confirmed",
      purpose: "Thesis Writing",
      createdAt: new Date(now.getTime() - 86400000).toISOString()
    },
    // Occupied computer for Today 10:00 - 12:00
    {
      id: "LH-09943",
      userId: "STU-2022-7721",
      userName: "Sarah Jenkins",
      resourceId: "PC-A-01",
      resourceName: "Workstation A-01",
      bookingType: "computer",
      facilityName: "Alan Turing Computing Lab",
      location: "2nd Floor, West Wing - Row 1",
      date: today,
      startTime: "10:00",
      endTime: "12:00",
      participants: 1,
      status: "confirmed",
      purpose: "Compiler Construction Assignment",
      createdAt: new Date(now.getTime() - 86400000).toISOString()
    },
    // Occupied discussion room for Today 10:00 - 12:00
    {
      id: "LH-09944",
      userId: "STU-2023-4410",
      userName: "Robotics Club",
      resourceId: "DR-102",
      resourceName: "Curie Innovation Hub",
      bookingType: "discussionRoom",
      facilityName: "Curie Innovation Hub",
      location: "1st Floor, East Wing",
      date: today,
      startTime: "10:00",
      endTime: "12:00",
      participants: 6,
      status: "confirmed",
      purpose: "Autonomous Navigation Sub-team Sprint",
      createdAt: new Date(now.getTime() - 86400000).toISOString()
    },
    // Occupied study place for Today 10:00 - 12:00
    {
      id: "LH-09945",
      userId: "STU-2024-9011",
      userName: "Devon Vance",
      resourceId: "ST-01",
      resourceName: "Study Place 01",
      bookingType: "studyPlace",
      facilityName: "Honors Silent Study Hall",
      location: "Ground Floor, South Wing - Zone A",
      date: today,
      startTime: "10:00",
      endTime: "12:00",
      participants: 1,
      status: "confirmed",
      purpose: "GRE Quantitative Prep",
      createdAt: new Date(now.getTime() - 86400000).toISOString()
    }
  ];
}
