// Data layer for the Devora ERP demo — types, seed data, persistence helpers.
// All persistence is localStorage-backed and SSR-guarded.

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  cost: number;
  price: number;
  stock: number;
  reorderLevel: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  totalPurchases: number;
  lastPurchase: string | null; // ISO
  balanceDue: number;
};

export type SaleItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
};

export type Sale = {
  id: string;
  date: string; // ISO
  customerName: string;
  items: SaleItem[];
  total: number;
};

export type PurchaseOrder = {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  supplier: string;
  status: "pending" | "received";
  createdAt: string; // ISO
};

export type Activity = {
  id: string;
  type: "sale" | "restock" | "po" | "customer" | "product";
  message: string;
  at: string; // ISO
};

export type Store = {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  purchaseOrders: PurchaseOrder[];
  activity: Activity[];
};

export const STORAGE_KEY = "devora-erp-store-v1";

/* ---------- formatting ---------- */

export function rs(n: number): string {
  return "Rs " + Math.round(n).toLocaleString("en-PK");
}

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function shortDay(key: string): string {
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" });
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

let uidCounter = 0;
export function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${uidCounter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/* ---------- seed data ---------- */

// Deterministic PRNG so the seeded history looks the same on every fresh load.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED_PRODUCTS: Product[] = [
  { id: "p01", name: "Milk 1L (Olper's)", sku: "DRY-001", category: "Dairy", cost: 285, price: 335, stock: 46, reorderLevel: 20 },
  { id: "p02", name: "Eggs — Dozen", sku: "DRY-002", category: "Dairy", cost: 305, price: 365, stock: 31, reorderLevel: 12 },
  { id: "p03", name: "Bread Large", sku: "BKR-001", category: "Bakery", cost: 150, price: 185, stock: 13, reorderLevel: 15 },
  { id: "p04", name: "Rusk Cake 300g", sku: "BKR-002", category: "Bakery", cost: 120, price: 160, stock: 22, reorderLevel: 8 },
  { id: "p05", name: "Basmati Rice 5kg", sku: "PNT-001", category: "Pantry", cost: 1280, price: 1495, stock: 21, reorderLevel: 8 },
  { id: "p06", name: "Cooking Oil 1L", sku: "PNT-002", category: "Pantry", cost: 520, price: 598, stock: 6, reorderLevel: 10 },
  { id: "p07", name: "Sugar 1kg", sku: "PNT-003", category: "Pantry", cost: 168, price: 199, stock: 38, reorderLevel: 15 },
  { id: "p08", name: "Biryani Masala 100g", sku: "PNT-004", category: "Pantry", cost: 110, price: 145, stock: 27, reorderLevel: 10 },
  { id: "p09", name: "Black Tea 190g", sku: "BEV-001", category: "Beverages", cost: 545, price: 625, stock: 9, reorderLevel: 12 },
  { id: "p10", name: "Cola 1.5L", sku: "BEV-002", category: "Beverages", cost: 155, price: 195, stock: 52, reorderLevel: 24 },
  { id: "p11", name: "Detergent Powder 1kg", sku: "HSH-001", category: "Household", cost: 385, price: 455, stock: 11, reorderLevel: 12 },
  { id: "p12", name: "Instant Noodles (Pack)", sku: "SNK-001", category: "Snacks", cost: 48, price: 65, stock: 0, reorderLevel: 30 },
];

const SEED_CUSTOMER_BASE: Array<[string, string, number]> = [
  ["Imran Siddiqui", "0301-2345678", 0],
  ["Farah Malik", "0333-8765432", 1450],
  ["Ahmed Khan", "0345-1122334", 0],
  ["Sana Tariq", "0321-9988776", 0],
  ["Bilal Hussain", "0312-5566778", 3200],
  ["Nadia Aslam", "0300-4433221", 0],
  ["Usman Sheikh", "0334-7788990", 860],
  ["Hira Qureshi", "0346-2211445", 0],
  ["Kamran Baig", "0315-6677889", 0],
  ["Zara Iqbal", "0322-3344556", 540],
];

export function seedStore(): Store {
  const rand = mulberry32(20260612);
  const products = SEED_PRODUCTS.map((p) => ({ ...p }));
  const now = new Date();

  // Customers — totals filled in from generated history below.
  const customers: Customer[] = SEED_CUSTOMER_BASE.map(([name, phone, balanceDue], i) => ({
    id: `c${String(i + 1).padStart(2, "0")}`,
    name,
    phone,
    totalPurchases: 0,
    lastPurchase: null,
    balanceDue,
  }));

  // 14 days of sales history, 2–6 sales per day, 1–3 line items each.
  const sales: Sale[] = [];
  for (let back = 13; back >= 0; back--) {
    const day = new Date(now);
    day.setDate(now.getDate() - back);
    const isWeekend = day.getDay() === 6 || day.getDay() === 0;
    const count = 2 + Math.floor(rand() * (isWeekend ? 5 : 4));
    for (let s = 0; s < count; s++) {
      const itemCount = 1 + Math.floor(rand() * 3);
      const items: SaleItem[] = [];
      const used = new Set<number>();
      for (let it = 0; it < itemCount; it++) {
        let idx = Math.floor(rand() * products.length);
        if (used.has(idx)) idx = (idx + 1) % products.length;
        used.add(idx);
        const p = products[idx];
        items.push({ productId: p.id, name: p.name, qty: 1 + Math.floor(rand() * 3), price: p.price });
      }
      const total = items.reduce((sum, it) => sum + it.qty * it.price, 0);
      const at = new Date(day);
      at.setHours(9 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0);
      // Don't generate "future" timestamps for today.
      if (back === 0 && at.getTime() > now.getTime()) at.setTime(now.getTime() - Math.floor(rand() * 3_600_000));
      const walkIn = rand() < 0.35;
      const customer = walkIn ? null : customers[Math.floor(rand() * customers.length)];
      sales.push({
        id: uid("S"),
        date: at.toISOString(),
        customerName: customer ? customer.name : "Walk-in",
        items,
        total,
      });
      if (customer) {
        customer.totalPurchases += total;
        if (!customer.lastPurchase || at.toISOString() > customer.lastPurchase) {
          customer.lastPurchase = at.toISOString();
        }
      }
    }
  }
  sales.sort((a, b) => (a.date < b.date ? 1 : -1));

  const poAt = (hoursBack: number) => new Date(now.getTime() - hoursBack * 3_600_000).toISOString();
  const purchaseOrders: PurchaseOrder[] = [
    { id: uid("PO"), productId: "p06", productName: "Cooking Oil 1L", qty: 24, supplier: "Karachi Wholesale Co.", status: "pending", createdAt: poAt(26) },
    { id: uid("PO"), productId: "p12", productName: "Instant Noodles (Pack)", qty: 60, supplier: "Metro Cash & Carry", status: "pending", createdAt: poAt(20) },
    { id: uid("PO"), productId: "p03", productName: "Bread Large", qty: 30, supplier: "Daily Fresh Bakers", status: "pending", createdAt: poAt(5) },
  ];

  const activity: Activity[] = [
    ...sales.slice(0, 5).map((s) => ({
      id: uid("A"),
      type: "sale" as const,
      message: `Sale of ${s.items.reduce((n, it) => n + it.qty, 0)} item(s) to ${s.customerName} — ${rs(s.total)}`,
      at: s.date,
    })),
    { id: uid("A"), type: "po" as const, message: "Purchase order raised: 30 × Bread Large (Daily Fresh Bakers)", at: poAt(5) },
    { id: uid("A"), type: "restock" as const, message: "Restocked 24 × Cola 1.5L", at: poAt(30) },
    { id: uid("A"), type: "po" as const, message: "Purchase order raised: 60 × Instant Noodles (Metro Cash & Carry)", at: poAt(20) },
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return { products, customers, sales, purchaseOrders, activity };
}

/* ---------- persistence (SSR-guarded) ---------- */

export function loadStore(): Store {
  if (typeof window === "undefined") return seedStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.sales)) return parsed;
    }
  } catch {
    // fall through to reseed
  }
  const fresh = seedStore();
  saveStore(fresh);
  return fresh;
}

export function saveStore(store: Store): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full / unavailable — demo keeps working in memory
  }
}

export function resetStore(): Store {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  const fresh = seedStore();
  saveStore(fresh);
  return fresh;
}
