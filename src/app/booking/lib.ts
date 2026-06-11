// Shared types, data and helpers for the booking demo.
// All persistence goes through localStorage with the "devora-booking-" prefix,
// guarded for SSR.

export type ServiceId = "haircut" | "beard" | "facial" | "color" | "massage";

export type Service = {
  id: ServiceId;
  name: string;
  mins: number;
  price: number;
  desc: string;
  /** Tailwind classes for the owner-calendar block */
  block: string;
  /** Tailwind class for the legend / list dot */
  dot: string;
};

export type Booking = {
  id: string;
  ref: string; // e.g. BK-1043
  serviceId: ServiceId;
  date: string; // YYYY-MM-DD (local)
  start: number; // minutes from midnight
  name: string;
  phone: string;
  createdAt: number;
};

export type DayInfo = {
  iso: string;
  weekday: string; // "Friday"
  short: string; // "Fri"
  dayNum: number;
  month: string; // "Jun"
  isToday: boolean;
  closed: boolean; // Sundays
};

export const OPEN_MIN = 10 * 60; // 10:00
export const CLOSE_MIN = 20 * 60; // 20:00

export const SERVICES: Service[] = [
  {
    id: "haircut",
    name: "Haircut",
    mins: 30,
    price: 800,
    desc: "Cut, wash & style",
    block: "bg-indigo-500/20 border-indigo-400/60 text-indigo-100",
    dot: "bg-indigo-400",
  },
  {
    id: "beard",
    name: "Beard Trim",
    mins: 15,
    price: 400,
    desc: "Shape-up & line work",
    block: "bg-sky-500/20 border-sky-400/60 text-sky-100",
    dot: "bg-sky-400",
  },
  {
    id: "facial",
    name: "Facial",
    mins: 45,
    price: 1500,
    desc: "Deep-cleanse glow facial",
    block: "bg-emerald-500/20 border-emerald-400/60 text-emerald-100",
    dot: "bg-emerald-400",
  },
  {
    id: "color",
    name: "Hair Color",
    mins: 60,
    price: 2500,
    desc: "Full color or highlights",
    block: "bg-fuchsia-500/20 border-fuchsia-400/60 text-fuchsia-100",
    dot: "bg-fuchsia-400",
  },
  {
    id: "massage",
    name: "Massage",
    mins: 60,
    price: 2000,
    desc: "Head & shoulder relaxation",
    block: "bg-amber-500/20 border-amber-400/60 text-amber-100",
    dot: "bg-amber-400",
  },
];

export const SERVICE_MAP: Record<ServiceId, Service> = Object.fromEntries(
  SERVICES.map((s) => [s.id, s])
) as Record<ServiceId, Service>;

/* ---------------- date / time helpers ---------------- */

function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nextDays(n = 7): DayInfo[] {
  const now = new Date();
  const out: DayInfo[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      iso: localISO(d),
      weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
      short: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      isToday: i === 0,
      closed: d.getDay() === 0, // Sunday
    });
  }
  return out;
}

export function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function fmtMoney(n: number): string {
  return `Rs ${n.toLocaleString("en-US")}`;
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Slot start times for a service: 10:00 → 20:00, stepped by duration. */
export function slotsForService(mins: number): number[] {
  const out: number[] = [];
  for (let t = OPEN_MIN; t + mins <= CLOSE_MIN; t += mins) out.push(t);
  return out;
}

/** Find any existing booking that overlaps [start, start+mins) on a date. */
export function findConflict(
  bookings: Booking[],
  date: string,
  start: number,
  mins: number,
  ignoreId?: string
): Booking | undefined {
  const end = start + mins;
  return bookings.find((b) => {
    if (b.date !== date || b.id === ignoreId) return false;
    const bMins = SERVICE_MAP[b.serviceId]?.mins ?? 30;
    return start < b.start + bMins && b.start < end;
  });
}

/* ---------------- persistence ---------------- */

const BOOKINGS_KEY = "devora-booking-bookings-v1";
const SEQ_KEY = "devora-booking-seq";

// [dayOffset, serviceId, startMin, name, phone] — spread across the week so the
// calendar looks alive on first load and the double-booking demo works at once.
const SEEDS: [number, ServiceId, number, string, string][] = [
  [0, "haircut", 600, "Ahmed Raza", "0301 2345671"],
  [0, "facial", 690, "Sana Tariq", "0333 8812204"],
  [0, "massage", 840, "Bilal Ahmed", "0345 6691102"],
  [0, "haircut", 1050, "Usman Ali", "0312 9907745"],
  [0, "color", 1080, "Mahira Khan", "0300 4456218"],
  [1, "beard", 630, "Danish Iqbal", "0321 7783301"],
  [1, "color", 720, "Ayesha Noor", "0334 2218890"],
  [1, "haircut", 960, "Imran Shaikh", "0302 5567134"],
  [1, "facial", 1095, "Hira Baig", "0345 1129967"],
  [2, "massage", 660, "Zara Yousuf", "0311 4490023"],
  [2, "haircut", 780, "Fahad Mir", "0333 6671845"],
  [2, "beard", 1020, "Saad Qureshi", "0322 9034516"],
  [3, "facial", 600, "Mahnoor Asif", "0301 7752290"],
  [3, "color", 900, "Komal Rizvi", "0344 3318804"],
  [3, "haircut", 1140, "Tariq Mehmood", "0313 8845067"],
  [4, "haircut", 750, "Nadia Hussain", "0335 9912637"],
  [4, "massage", 960, "Omar Farooq", "0303 4467891"],
  [5, "beard", 660, "Junaid Akram", "0321 5520348"],
  [5, "facial", 870, "Rabia Saleem", "0346 7783920"],
  [5, "haircut", 1110, "Ali Hassan", "0314 2290765"],
  [6, "haircut", 630, "Asad Jamil", "0331 6645102"],
  [6, "color", 780, "Mehwish Anwar", "0304 8873349"],
];

const SEED_REF_START = 1021;
const USER_REF_START = SEED_REF_START + SEEDS.length; // first ref a visitor gets

function buildSeeds(days: DayInfo[]): Booking[] {
  const out: Booking[] = [];
  SEEDS.forEach(([offset, serviceId, start, name, phone], i) => {
    const day = days[offset];
    if (!day || day.closed) return; // never seed a closed Sunday
    out.push({
      id: `seed-${i}`,
      ref: `BK-${SEED_REF_START + i}`,
      serviceId,
      date: day.iso,
      start,
      name,
      phone,
      createdAt: Date.now() - (SEEDS.length - i) * 3_600_000,
    });
  });
  return out;
}

export function loadBookings(days: DayInfo[]): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Booking[];
      const valid = days.map((d) => d.iso);
      // Drop bookings that scrolled out of the visible week (old demo runs),
      // then top up with this week's seeds for any day that went empty.
      const kept = parsed.filter((b) => valid.includes(b.date));
      const seeds = buildSeeds(days).filter(
        (s) =>
          !kept.some((k) => k.date === s.date) &&
          !findConflict(kept, s.date, s.start, SERVICE_MAP[s.serviceId].mins)
      );
      const merged = [...kept, ...seeds];
      saveBookings(merged);
      return merged;
    }
    const seeded = buildSeeds(days);
    window.localStorage.setItem(BOOKINGS_KEY, JSON.stringify(seeded));
    window.localStorage.setItem(SEQ_KEY, String(USER_REF_START));
    return seeded;
  } catch {
    return buildSeeds(days);
  }
}

export function saveBookings(bookings: Booking[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  } catch {
    /* storage full / blocked — demo keeps working in memory */
  }
}

export function nextRef(): string {
  if (typeof window === "undefined") return `BK-${USER_REF_START}`;
  let seq = USER_REF_START;
  try {
    const raw = window.localStorage.getItem(SEQ_KEY);
    const parsed = raw === null ? NaN : parseInt(raw, 10);
    if (!Number.isNaN(parsed)) seq = parsed;
    window.localStorage.setItem(SEQ_KEY, String(seq + 1));
  } catch {
    /* ignore */
  }
  return `BK-${seq}`;
}
