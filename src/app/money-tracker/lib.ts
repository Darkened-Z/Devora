// Shared types, constants and helpers for the Money Tracker demo.

export type TxType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
}

export type Budgets = Record<string, number>;

export const INCOME_CATEGORIES = ["Sales", "Other"] as const;
export const EXPENSE_CATEGORIES = [
  "Supplies",
  "Rent",
  "Salaries",
  "Utilities",
  "Transport",
  "Marketing",
  "Other",
] as const;

export const ALL_CATEGORIES = Array.from(
  new Set<string>([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]),
);

export const LS_TRANSACTIONS = "devora-money-transactions";
export const LS_BUDGETS = "devora-money-budgets";

export const DEFAULT_BUDGETS: Budgets = {
  Supplies: 100000,
  Rent: 45000,
  Salaries: 70000,
  Utilities: 16000,
  Transport: 12000,
  Marketing: 18000,
  Other: 8000,
};

/* ---------- formatting ---------- */

export function formatRs(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}Rs ${Math.abs(Math.round(n)).toLocaleString("en-PK")}`;
}

export function formatRsCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `Rs ${Math.round(n / 1_000)}k`;
  return `Rs ${Math.round(n)}`;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function formatDateShort(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateLong(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMonthLabel(key: string): string {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------- demo seed data ---------- */

// Deterministic PRNG so the seeded demo looks the same for everyone.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SALES_NOTES = [
  "Counter sales",
  "Daily shop sales",
  "Walk-in customers",
  "Card machine settlement",
  "Wholesale order",
];
const SUPPLY_NOTES = [
  "Supplier restock",
  "Raw material purchase",
  "Packaging stock",
  "Inventory top-up",
];
const TRANSPORT_NOTES = ["Delivery van fuel", "Rider payments", "Courier charges"];
const MARKETING_NOTES = ["Facebook ads", "Instagram boost", "Flyer printing"];
const OTHER_EXPENSE_NOTES = ["Shop maintenance", "Tea & refreshments", "Stationery", "Misc repairs"];
const OTHER_INCOME_NOTES = ["Online order payment", "Old stock clearance", "Service charges"];

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

/**
 * Generates ~45 days of realistic small-business activity ending today,
 * so both the 30-day chart and the "vs last month" comparison have data.
 */
export function generateSeedTransactions(today: Date): Transaction[] {
  const rand = mulberry32(987654321);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const txs: Transaction[] = [];
  let seq = 0;

  const add = (type: TxType, amount: number, category: string, note: string, date: string) => {
    txs.push({ id: `seed-${++seq}`, type, amount, category, note, date });
  };

  const start = new Date(today);
  start.setDate(start.getDate() - 44);

  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const date = toISODate(d);
    const dow = d.getDay(); // 0 = Sunday
    const dom = d.getDate();

    // Daily counter sales — weekends busier, Sundays often closed.
    if (dow !== 0 || rand() > 0.6) {
      const base = dow === 5 || dow === 6 ? 17000 : 11500;
      add("income", roundTo(base + rand() * 9500, 50), "Sales", pick(SALES_NOTES), date);
    }
    // Occasional extra income (online orders, services).
    if (rand() > 0.82) {
      add("income", roundTo(2500 + rand() * 7500, 50), "Other", pick(OTHER_INCOME_NOTES), date);
    }

    // Supplies restock twice a week.
    if (dow === 1 || dow === 4) {
      add("expense", roundTo(9000 + rand() * 14000, 100), "Supplies", pick(SUPPLY_NOTES), date);
    }
    // Fixed monthly costs.
    if (dom === 1) {
      add("expense", 45000, "Rent", "Shop rent", date);
      add("expense", 68000, "Salaries", "Staff salaries (3)", date);
    }
    if (dom === 10) {
      add("expense", roundTo(7500 + rand() * 5500, 50), "Utilities", "Electricity bill", date);
      add("expense", roundTo(1800 + rand() * 1400, 50), "Utilities", "Internet & phone", date);
    }
    // Transport every couple of days.
    if (rand() > 0.62) {
      add("expense", roundTo(600 + rand() * 1900, 50), "Transport", pick(TRANSPORT_NOTES), date);
    }
    // Marketing roughly weekly.
    if (dow === 3 && rand() > 0.35) {
      add("expense", roundTo(2000 + rand() * 5500, 100), "Marketing", pick(MARKETING_NOTES), date);
    }
    // Misc one-offs.
    if (rand() > 0.88) {
      add("expense", roundTo(500 + rand() * 3000, 50), "Other", pick(OTHER_EXPENSE_NOTES), date);
    }
  }

  // Newest first.
  return txs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
