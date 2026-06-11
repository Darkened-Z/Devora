"use client";

import { useEffect, useMemo, useState } from "react";
import DemoShell from "@/components/DemoShell";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Category = "Burgers" | "Pizza" | "Drinks" | "Desserts" | "Deals";

interface Product {
  id: string;
  name: string;
  price: number;
  emoji: string;
  cat: Category;
}

interface CartLine {
  product: Product;
  qty: number;
}

type PayMethod = "Cash" | "Card" | "Wallet";

interface SaleLine {
  name: string;
  emoji: string;
  qty: number;
  price: number;
}

interface Sale {
  no: number; // order number, e.g. 1042 -> displayed as #1042
  ts: number; // epoch ms
  lines: SaleLine[];
  subtotal: number;
  discount: number; // absolute Rs amount
  tax: number;
  total: number;
  payment: PayMethod;
  tendered?: number;
  change?: number;
}

type Tab = "register" | "sales" | "dashboard";
type DiscountMode = "percent" | "flat";

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const TAX_RATE = 0.05;
const LS_SALES = "devora-pos-sales";
const LS_COUNTER = "devora-pos-counter";

const PRODUCTS: Product[] = [
  { id: "b1", name: "Classic Burger", price: 350, emoji: "🍔", cat: "Burgers" },
  { id: "b2", name: "Chicken Fillet Burger", price: 450, emoji: "🍔", cat: "Burgers" },
  { id: "b3", name: "Beef Smash Burger", price: 550, emoji: "🍔", cat: "Burgers" },
  { id: "b4", name: "Zinger Burger", price: 520, emoji: "🍗", cat: "Burgers" },
  { id: "p1", name: "Margherita Slice", price: 300, emoji: "🍕", cat: "Pizza" },
  { id: "p2", name: "Pepperoni Slice", price: 350, emoji: "🍕", cat: "Pizza" },
  { id: "p3", name: "Chicken Fajita (Small)", price: 750, emoji: "🍕", cat: "Pizza" },
  { id: "p4", name: "BBQ Tikka (Small)", price: 800, emoji: "🍕", cat: "Pizza" },
  { id: "d1", name: "Soft Drink 345ml", price: 120, emoji: "🥤", cat: "Drinks" },
  { id: "d2", name: "Mineral Water", price: 80, emoji: "💧", cat: "Drinks" },
  { id: "d3", name: "Fresh Lime Soda", price: 180, emoji: "🍋", cat: "Drinks" },
  { id: "d4", name: "Cold Coffee", price: 320, emoji: "🧋", cat: "Drinks" },
  { id: "s1", name: "Vanilla Sundae", price: 250, emoji: "🍨", cat: "Desserts" },
  { id: "s2", name: "Chocolate Lava Cake", price: 380, emoji: "🍫", cat: "Desserts" },
  { id: "s3", name: "Gulab Jamun (2 pc)", price: 180, emoji: "🍡", cat: "Desserts" },
  { id: "x1", name: "Burger + Fries + Drink", price: 650, emoji: "🍟", cat: "Deals" },
  { id: "x2", name: "Pizza Slice Combo", price: 550, emoji: "🥡", cat: "Deals" },
  { id: "x3", name: "Family Feast (4 pax)", price: 2400, emoji: "👨‍👩‍👧‍👦", cat: "Deals" },
];

const CATEGORIES: ("All" | Category)[] = ["All", "Burgers", "Pizza", "Drinks", "Desserts", "Deals"];

const PAY_META: Record<PayMethod, { emoji: string; label: string; color: string }> = {
  Cash: { emoji: "💵", label: "Cash", color: "bg-emerald-500" },
  Card: { emoji: "💳", label: "Card", color: "bg-sky-500" },
  Wallet: { emoji: "📱", label: "Mobile wallet", color: "bg-amber-500" },
};

function rupees(n: number): string {
  return "Rs " + Math.round(n).toLocaleString("en-PK");
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isToday(ts: number): boolean {
  return startOfDay(ts) === startOfDay(Date.now());
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/* Demo-data seeding (~7 days of fake history)                         */
/* ------------------------------------------------------------------ */

function seedHistory(): { sales: Sale[]; nextNo: number } {
  const rnd = (n: number) => Math.floor(Math.random() * n);
  const pick = <T,>(arr: T[]): T => arr[rnd(arr.length)];
  const sales: Sale[] = [];
  const now = Date.now();

  for (let daysAgo = 7; daysAgo >= 0; daysAgo--) {
    const dayStart = startOfDay(now - daysAgo * 86_400_000);
    // Orders per day: weekends a bit busier; today only partial
    const fullDayOrders = 9 + rnd(7);
    const orderCount =
      daysAgo === 0
        ? Math.min(fullDayOrders, Math.max(2, Math.floor((now - dayStart) / 3_600_000 / 2)))
        : fullDayOrders;

    for (let i = 0; i < orderCount; i++) {
      // Business hours 11:00 – 22:30
      let ts = dayStart + (11 * 60 + rnd(11.5 * 60)) * 60_000 + rnd(60_000);
      if (ts > now) ts = now - rnd(3_600_000);
      if (ts < dayStart) ts = dayStart + 11 * 3_600_000;

      const lineCount = 1 + rnd(4);
      const chosen = new Map<string, SaleLine>();
      for (let j = 0; j < lineCount; j++) {
        const p = pick(PRODUCTS);
        const existing = chosen.get(p.id);
        if (existing) existing.qty += 1;
        else chosen.set(p.id, { name: p.name, emoji: p.emoji, qty: 1 + rnd(2), price: p.price });
      }
      const lines = [...chosen.values()];
      const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
      const discount = rnd(10) === 0 ? Math.round(subtotal * 0.1) : 0;
      const tax = Math.round((subtotal - discount) * TAX_RATE);
      const total = subtotal - discount + tax;
      const roll = rnd(100);
      const payment: PayMethod = roll < 55 ? "Cash" : roll < 85 ? "Card" : "Wallet";

      const sale: Sale = { no: 0, ts, lines, subtotal, discount, tax, total, payment };
      if (payment === "Cash") {
        const tendered = Math.ceil(total / 500) * 500;
        sale.tendered = tendered;
        sale.change = tendered - total;
      }
      sales.push(sale);
    }
  }

  sales.sort((a, b) => a.ts - b.ts);
  let no = 1001;
  for (const s of sales) s.no = no++;
  return { sales, nextNo: no };
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold tracking-tight ${accent ?? ""}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div className="text-center py-10">
      <div className="text-4xl mb-3">{emoji}</div>
      <div className="font-medium text-slate-300">{title}</div>
      <div className="text-sm text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cart panel (shared by desktop sidebar + mobile drawer)              */
/* ------------------------------------------------------------------ */

interface CartPanelProps {
  cart: CartLine[];
  subtotal: number;
  discountAmt: number;
  tax: number;
  total: number;
  discountVal: string;
  discountMode: DiscountMode;
  onDiscountVal: (v: string) => void;
  onDiscountMode: (m: DiscountMode) => void;
  onAdd: (p: Product) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCharge: () => void;
}

function CartPanel(props: CartPanelProps) {
  const { cart, subtotal, discountAmt, tax, total } = props;
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Current order</h3>
        {cart.length > 0 && (
          <button
            onClick={props.onClear}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <EmptyState emoji="🛒" title="Cart is empty" sub="Tap items on the left to start an order" />
      ) : (
        <div className="space-y-2.5 mb-4 overflow-y-auto max-h-72 pr-1">
          {cart.map((l) => (
            <div
              key={l.product.id}
              className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2"
            >
              <span className="text-lg">{l.product.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{l.product.name}</div>
                <div className="text-xs text-slate-400">
                  {rupees(l.product.price)} × {l.qty} ={" "}
                  <span className="text-slate-300 font-medium">{rupees(l.product.price * l.qty)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => props.onDec(l.product.id)}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-base font-bold transition-colors"
                  aria-label={`Decrease ${l.product.name}`}
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                <button
                  onClick={() => props.onAdd(l.product)}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-base font-bold transition-colors"
                  aria-label={`Increase ${l.product.name}`}
                >
                  +
                </button>
                <button
                  onClick={() => props.onRemove(l.product.id)}
                  className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                  aria-label={`Remove ${l.product.name}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Discount */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-400 shrink-0">Discount</span>
        <input
          inputMode="decimal"
          value={props.discountVal}
          onChange={(e) => props.onDiscountVal(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0"
          className="w-full min-w-0 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm text-right focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <div className="flex rounded-lg overflow-hidden border border-slate-700 shrink-0">
          {(["percent", "flat"] as DiscountMode[]).map((m) => (
            <button
              key={m}
              onClick={() => props.onDiscountMode(m)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                props.discountMode === m ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {m === "percent" ? "%" : "Rs"}
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-slate-800 pt-3 space-y-1.5 text-sm mb-4">
        <div className="flex justify-between text-slate-400">
          <span>Subtotal ({itemCount} items)</span>
          <span className="tabular-nums">{rupees(subtotal)}</span>
        </div>
        {discountAmt > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>Discount</span>
            <span className="tabular-nums">− {rupees(discountAmt)}</span>
          </div>
        )}
        <div className="flex justify-between text-slate-400">
          <span>Sales tax ({Math.round(TAX_RATE * 100)}%)</span>
          <span className="tabular-nums">{rupees(tax)}</span>
        </div>
        <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-800">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-bold tabular-nums">{rupees(total)}</span>
        </div>
      </div>

      <button
        onClick={props.onCharge}
        disabled={cart.length === 0}
        className="w-full py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-base transition-colors"
      >
        Charge {total > 0 ? rupees(total) : ""}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Payment modal                                                       */
/* ------------------------------------------------------------------ */

function PaymentModal({
  total,
  onClose,
  onConfirm,
}: {
  total: number;
  onClose: () => void;
  onConfirm: (method: PayMethod, tendered?: number, change?: number) => void;
}) {
  const [method, setMethod] = useState<PayMethod>("Cash");
  const [tenderedStr, setTenderedStr] = useState("");

  const tendered = parseFloat(tenderedStr) || 0;
  const change = tendered - total;
  const cashShort = method === "Cash" && tendered < total;
  const quickAmounts = [total, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000, 5000].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-lg">Take payment</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="text-3xl font-bold mb-5 tabular-nums">{rupees(total)}</div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {(Object.keys(PAY_META) as PayMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`rounded-xl border px-2 py-3 text-center transition-colors ${
                method === m
                  ? "border-indigo-500 bg-indigo-500/15 text-white"
                  : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
              }`}
            >
              <div className="text-xl mb-1">{PAY_META[m].emoji}</div>
              <div className="text-xs font-medium">{PAY_META[m].label}</div>
            </button>
          ))}
        </div>

        {method === "Cash" ? (
          <div className="mb-5">
            <label className="text-xs text-slate-400 block mb-1.5">Cash tendered</label>
            <input
              inputMode="decimal"
              autoFocus
              value={tenderedStr}
              onChange={(e) => setTenderedStr(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-xl text-right font-semibold tabular-nums focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTenderedStr(String(amt))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium transition-colors"
                >
                  {amt === total ? "Exact" : rupees(amt)}
                </button>
              ))}
            </div>
            <div
              className={`flex justify-between mt-3 text-sm font-medium ${
                change >= 0 && tendered > 0 ? "text-emerald-400" : "text-slate-500"
              }`}
            >
              <span>Change due</span>
              <span className="tabular-nums">{tendered > 0 && change >= 0 ? rupees(change) : "—"}</span>
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded-xl bg-slate-800/50 border border-slate-800 p-4 text-sm text-slate-400">
            {method === "Card"
              ? "Hand the terminal to the customer to tap or insert their card."
              : "Customer scans the QR code with JazzCash / Easypaisa to pay."}
          </div>
        )}

        <button
          onClick={() =>
            onConfirm(
              method,
              method === "Cash" ? tendered : undefined,
              method === "Cash" ? change : undefined
            )
          }
          disabled={cashShort}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-950 transition-colors"
        >
          {cashShort ? `Short by ${rupees(total - tendered)}` : "Confirm payment"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Receipt overlay                                                     */
/* ------------------------------------------------------------------ */

function ReceiptOverlay({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-white text-slate-900 rounded-xl p-6 font-mono text-[13px] shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
          <div className="font-bold text-base tracking-wide">DEVORA BISTRO</div>
          <div className="text-[11px] text-slate-500">Shop 12, Main Boulevard, Karachi</div>
          <div className="text-[11px] text-slate-500">+92 300 1234567</div>
        </div>
        <div className="flex justify-between text-[11px] text-slate-500 mb-3">
          <span>Order #{sale.no}</span>
          <span>{fmtDateTime(sale.ts)}</span>
        </div>
        {sale.lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-2 mb-1">
            <span className="truncate">
              {l.qty} × {l.name}
            </span>
            <span className="tabular-nums shrink-0">{rupees(l.qty * l.price)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-slate-300 mt-3 pt-2 space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{rupees(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <span className="tabular-nums">− {rupees(sale.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Tax ({Math.round(TAX_RATE * 100)}%)</span>
            <span className="tabular-nums">{rupees(sale.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-1 border-t border-dashed border-slate-300">
            <span>TOTAL</span>
            <span className="tabular-nums">{rupees(sale.total)}</span>
          </div>
          <div className="flex justify-between text-slate-600 pt-1">
            <span>Paid via {sale.payment}</span>
            <span className="tabular-nums">{sale.tendered ? rupees(sale.tendered) : rupees(sale.total)}</span>
          </div>
          {sale.change !== undefined && sale.change > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Change</span>
              <span className="tabular-nums">{rupees(sale.change)}</span>
            </div>
          )}
        </div>
        <div className="text-center text-[11px] text-slate-400 mt-4 border-t border-dashed border-slate-300 pt-3">
          Thank you for dining with us!
          <br />
          Powered by Devora POS
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-sans font-medium hover:bg-slate-700 transition-colors"
        >
          New sale
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function POSDemo() {
  const [tab, setTab] = useState<Tab>("register");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountVal, setDiscountVal] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("percent");
  const [sales, setSales] = useState<Sale[]>([]);
  const [nextNo, setNextNo] = useState(1001);
  const [loaded, setLoaded] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [clock, setClock] = useState<string>("");

  // Sales-tab state
  const [query, setQuery] = useState("");
  const [payFilter, setPayFilter] = useState<"All" | PayMethod>("All");
  const [dayFilter, setDayFilter] = useState<"all" | "today">("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  /* ---- Load / seed from localStorage (client only) ---- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LS_SALES);
      const rawNo = localStorage.getItem(LS_COUNTER);
      if (raw) {
        setSales(JSON.parse(raw) as Sale[]);
        setNextNo(rawNo ? parseInt(rawNo, 10) : 1001);
      } else {
        const seeded = seedHistory();
        setSales(seeded.sales);
        setNextNo(seeded.nextNo);
        localStorage.setItem(LS_SALES, JSON.stringify(seeded.sales));
        localStorage.setItem(LS_COUNTER, String(seeded.nextNo));
      }
    } catch {
      // localStorage unavailable — run in-memory only
      const seeded = seedHistory();
      setSales(seeded.sales);
      setNextNo(seeded.nextNo);
    }
    setLoaded(true);
  }, []);

  /* ---- Live clock ---- */
  useEffect(() => {
    const update = () =>
      setClock(
        new Date().toLocaleString("en-PK", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  /* ---- Cart maths ---- */
  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.product.price * l.qty, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);
  const discountAmt = useMemo(() => {
    const v = parseFloat(discountVal) || 0;
    const amt = discountMode === "percent" ? (subtotal * v) / 100 : v;
    return Math.min(Math.max(0, Math.round(amt)), subtotal);
  }, [discountVal, discountMode, subtotal]);
  const tax = Math.round((subtotal - discountAmt) * TAX_RATE);
  const total = subtotal - discountAmt + tax;

  /* ---- Cart actions ---- */
  const addToCart = (p: Product) =>
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id);
      if (i === -1) return [...c, { product: p, qty: 1 }];
      const next = [...c];
      next[i] = { ...next[i], qty: next[i].qty + 1 };
      return next;
    });

  const decQty = (id: string) =>
    setCart((c) => c.map((l) => (l.product.id === id ? { ...l, qty: l.qty - 1 } : l)).filter((l) => l.qty > 0));

  const removeLine = (id: string) => setCart((c) => c.filter((l) => l.product.id !== id));

  const clearCart = () => {
    setCart([]);
    setDiscountVal("");
  };

  /* ---- Persist sales ---- */
  const persistSales = (next: Sale[], nextCounter: number) => {
    setSales(next);
    setNextNo(nextCounter);
    try {
      localStorage.setItem(LS_SALES, JSON.stringify(next));
      localStorage.setItem(LS_COUNTER, String(nextCounter));
    } catch {
      /* ignore quota / privacy errors */
    }
  };

  const completeSale = (method: PayMethod, tendered?: number, change?: number) => {
    const sale: Sale = {
      no: nextNo,
      ts: Date.now(),
      lines: cart.map((l) => ({ name: l.product.name, emoji: l.product.emoji, qty: l.qty, price: l.product.price })),
      subtotal,
      discount: discountAmt,
      tax,
      total,
      payment: method,
      ...(tendered !== undefined ? { tendered, change: Math.max(0, change ?? 0) } : {}),
    };
    persistSales([...sales, sale], nextNo + 1);
    setPayOpen(false);
    setMobileCartOpen(false);
    setReceipt(sale);
    clearCart();
  };

  /* ---- Derived: sales-tab list ---- */
  const filteredSales = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...sales]
      .reverse()
      .filter((s) => {
        if (dayFilter === "today" && !isToday(s.ts)) return false;
        if (payFilter !== "All" && s.payment !== payFilter) return false;
        if (!q) return true;
        return (
          ("#" + s.no).includes(q) ||
          String(s.no).includes(q) ||
          s.lines.some((l) => l.name.toLowerCase().includes(q))
        );
      });
  }, [sales, query, payFilter, dayFilter]);

  /* ---- Derived: dashboard ---- */
  const dashboard = useMemo(() => {
    const todaySales = sales.filter((s) => isToday(s.ts));
    const todayRevenue = todaySales.reduce((s, x) => s + x.total, 0);
    const avgOrder = todaySales.length ? todayRevenue / todaySales.length : 0;

    // Top item today (by qty)
    const todayQty = new Map<string, { qty: number; emoji: string }>();
    for (const s of todaySales)
      for (const l of s.lines) {
        const cur = todayQty.get(l.name) ?? { qty: 0, emoji: l.emoji };
        cur.qty += l.qty;
        todayQty.set(l.name, cur);
      }
    let topToday: { name: string; qty: number; emoji: string } | null = null;
    for (const [name, v] of todayQty)
      if (!topToday || v.qty > topToday.qty) topToday = { name, qty: v.qty, emoji: v.emoji };

    // 7-day revenue series (oldest → newest)
    const days: { label: string; revenue: number; orders: number; isToday: boolean }[] = [];
    for (let d = 6; d >= 0; d--) {
      const dayStart = startOfDay(Date.now() - d * 86_400_000);
      const dayEnd = dayStart + 86_400_000;
      const daySales = sales.filter((s) => s.ts >= dayStart && s.ts < dayEnd);
      days.push({
        label: new Date(dayStart).toLocaleDateString("en-PK", { weekday: "short" }),
        revenue: daySales.reduce((s, x) => s + x.total, 0),
        orders: daySales.length,
        isToday: d === 0,
      });
    }
    const maxDay = Math.max(1, ...days.map((d) => d.revenue));

    // Top-5 sellers (all time, by revenue)
    const sellerMap = new Map<string, { qty: number; revenue: number; emoji: string }>();
    for (const s of sales)
      for (const l of s.lines) {
        const cur = sellerMap.get(l.name) ?? { qty: 0, revenue: 0, emoji: l.emoji };
        cur.qty += l.qty;
        cur.revenue += l.qty * l.price;
        sellerMap.set(l.name, cur);
      }
    const topSellers = [...sellerMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const maxSeller = Math.max(1, ...topSellers.map((s) => s.revenue));

    // Payment split (all time, by revenue)
    const paySplit = (Object.keys(PAY_META) as PayMethod[]).map((m) => {
      const ms = sales.filter((s) => s.payment === m);
      return { method: m, revenue: ms.reduce((s, x) => s + x.total, 0), count: ms.length };
    });
    const payTotal = Math.max(1, paySplit.reduce((s, x) => s + x.revenue, 0));

    return { todaySales, todayRevenue, avgOrder, topToday, days, maxDay, topSellers, maxSeller, paySplit, payTotal };
  }, [sales]);

  const visibleProducts = PRODUCTS.filter((p) => cat === "All" || p.cat === cat);

  const resetDemo = () => {
    try {
      localStorage.removeItem(LS_SALES);
      localStorage.removeItem(LS_COUNTER);
    } catch {}
    const seeded = seedHistory();
    persistSales(seeded.sales, seeded.nextNo);
    clearCart();
  };

  /* ------------------------------------------------------------------ */

  return (
    <DemoShell title="Devora POS" tagline="Restaurant point-of-sale · register, sales log & live dashboard">
      {/* Sub-header: store identity + live clock */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-xl">
            🍔
          </div>
          <div>
            <div className="font-semibold leading-tight">Devora Bistro</div>
            <div className="text-xs text-slate-400">Terminal 1 · Cashier: Zeeshan</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 tabular-nums hidden sm:block" suppressHydrationWarning>
            {clock}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Open
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {(
          [
            { key: "register", label: "Register", icon: "🧾" },
            { key: "sales", label: "Sales", icon: "📋" },
            { key: "dashboard", label: "Dashboard", icon: "📊" },
          ] as { key: Tab; label: string; icon: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-indigo-500 text-white" : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
        <button
          onClick={resetDemo}
          className="ml-auto px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors whitespace-nowrap"
          title="Clear saved data and re-seed demo history"
        >
          ↺ Reset demo
        </button>
      </div>

      {/* ============================ REGISTER ============================ */}
      {tab === "register" && (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div>
            {/* Category chips */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                    cat === c ? "bg-indigo-500 text-white" : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-24 lg:pb-0">
              {visibleProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="rounded-xl border border-slate-800 bg-slate-900 hover:border-indigo-500/60 hover:bg-slate-800/80 active:scale-[0.97] transition-all p-4 text-left group"
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform origin-left">{p.emoji}</div>
                  <div className="font-medium text-sm leading-snug min-h-[2.5rem]">{p.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-indigo-400 text-sm font-semibold tabular-nums">{rupees(p.price)}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">{p.cat}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop cart */}
          <aside className="hidden lg:block rounded-xl border border-slate-800 bg-slate-900 p-5 sticky top-20">
            <CartPanel
              cart={cart}
              subtotal={subtotal}
              discountAmt={discountAmt}
              tax={tax}
              total={total}
              discountVal={discountVal}
              discountMode={discountMode}
              onDiscountVal={setDiscountVal}
              onDiscountMode={setDiscountMode}
              onAdd={addToCart}
              onDec={decQty}
              onRemove={removeLine}
              onClear={clearCart}
              onCharge={() => setPayOpen(true)}
            />
          </aside>

          {/* Mobile bottom bar */}
          {cart.length > 0 && !mobileCartOpen && (
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur p-3">
              <button
                onClick={() => setMobileCartOpen(true)}
                className="w-full flex items-center justify-between rounded-xl bg-indigo-500 hover:bg-indigo-400 px-5 py-3.5 font-semibold transition-colors"
              >
                <span>
                  🛒 View order <span className="text-indigo-200 font-normal">({itemCount} items)</span>
                </span>
                <span className="tabular-nums">{rupees(total)}</span>
              </button>
            </div>
          )}

          {/* Mobile cart drawer */}
          {mobileCartOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end" onClick={() => setMobileCartOpen(false)}>
              <div
                className="w-full max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-slate-800 bg-slate-900 p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-center mb-3">
                  <button
                    onClick={() => setMobileCartOpen(false)}
                    className="w-12 h-1.5 rounded-full bg-slate-700"
                    aria-label="Close cart"
                  />
                </div>
                <CartPanel
                  cart={cart}
                  subtotal={subtotal}
                  discountAmt={discountAmt}
                  tax={tax}
                  total={total}
                  discountVal={discountVal}
                  discountMode={discountMode}
                  onDiscountVal={setDiscountVal}
                  onDiscountMode={setDiscountMode}
                  onAdd={addToCart}
                  onDec={decQty}
                  onRemove={removeLine}
                  onClear={clearCart}
                  onCharge={() => setPayOpen(true)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================== SALES ============================= */}
      {tab === "sales" && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order # or item…"
              className="flex-1 min-w-[200px] rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <div className="flex rounded-xl overflow-hidden border border-slate-800">
              {(["All", "Cash", "Card", "Wallet"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayFilter(m)}
                  className={`px-3 py-2.5 text-xs font-medium transition-colors ${
                    payFilter === m ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex rounded-xl overflow-hidden border border-slate-800">
              {(
                [
                  { key: "all", label: "All days" },
                  { key: "today", label: "Today" },
                ] as { key: "all" | "today"; label: string }[]
              ).map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDayFilter(d.key)}
                  className={`px-3 py-2.5 text-xs font-medium transition-colors ${
                    dayFilter === d.key ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 mb-3">
            {filteredSales.length} order{filteredSales.length === 1 ? "" : "s"} ·{" "}
            {rupees(filteredSales.reduce((s, x) => s + x.total, 0))} total
          </div>

          {!loaded ? (
            <EmptyState emoji="⏳" title="Loading orders…" sub="Reading sales history" />
          ) : filteredSales.length === 0 ? (
            <EmptyState emoji="🔍" title="No orders match" sub="Try a different search or filter" />
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="bg-slate-950/60 text-slate-400 text-xs">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Order</th>
                      <th className="text-left px-4 py-3 font-medium">Date / time</th>
                      <th className="text-left px-4 py-3 font-medium">Payment</th>
                      <th className="text-right px-4 py-3 font-medium">Items</th>
                      <th className="text-right px-4 py-3 font-medium">Total</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => {
                      const isOpen = expanded === s.no;
                      const itemTotal = s.lines.reduce((n, l) => n + l.qty, 0);
                      return (
                        <FragmentRow
                          key={s.no}
                          sale={s}
                          isOpen={isOpen}
                          itemTotal={itemTotal}
                          onToggle={() => setExpanded(isOpen ? null : s.no)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================ DASHBOARD =========================== */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Today's revenue"
              value={rupees(dashboard.todayRevenue)}
              sub={`${dashboard.todaySales.length} orders so far`}
              accent="text-emerald-400"
            />
            <StatCard label="Orders today" value={String(dashboard.todaySales.length)} sub="across all channels" />
            <StatCard label="Avg. order value" value={rupees(dashboard.avgOrder)} sub="today" />
            <StatCard
              label="Top item today"
              value={dashboard.topToday ? `${dashboard.topToday.emoji} ${dashboard.topToday.qty}×` : "—"}
              sub={dashboard.topToday ? dashboard.topToday.name : "No sales yet today"}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* 7-day revenue chart */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="font-semibold">Revenue — last 7 days</h3>
                <span className="text-xs text-slate-500">
                  {rupees(dashboard.days.reduce((s, d) => s + d.revenue, 0))} total
                </span>
              </div>
              <div className="flex items-end gap-2 h-44">
                {dashboard.days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                    <div className="text-[10px] text-slate-500 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                      {rupees(d.revenue)}
                    </div>
                    <div
                      className={`w-full rounded-t-md transition-colors ${
                        d.isToday ? "bg-indigo-400" : "bg-indigo-500/40 group-hover:bg-indigo-500/70"
                      }`}
                      style={{ height: `${Math.max(3, (d.revenue / dashboard.maxDay) * 100)}%` }}
                      title={`${d.label}: ${rupees(d.revenue)} · ${d.orders} orders`}
                    />
                    <div className={`text-[11px] ${d.isToday ? "text-indigo-300 font-semibold" : "text-slate-500"}`}>
                      {d.isToday ? "Today" : d.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top sellers */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold mb-4">Top 5 sellers (all time)</h3>
              {dashboard.topSellers.length === 0 ? (
                <EmptyState emoji="📦" title="No sales yet" sub="Ring up an order on the Register tab" />
              ) : (
                <div className="space-y-3.5">
                  {dashboard.topSellers.map((s, i) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="truncate">
                          <span className="text-slate-500 mr-1.5">{i + 1}.</span>
                          {s.emoji} {s.name}
                        </span>
                        <span className="text-slate-400 tabular-nums shrink-0 ml-2">
                          {s.qty} sold · {rupees(s.revenue)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${(s.revenue / dashboard.maxSeller) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Payment split */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold mb-4">Payment methods</h3>
            <div className="h-3 rounded-full overflow-hidden flex bg-slate-800 mb-4">
              {dashboard.paySplit.map((p) => (
                <div
                  key={p.method}
                  className={`${PAY_META[p.method].color} h-full transition-all`}
                  style={{ width: `${(p.revenue / dashboard.payTotal) * 100}%` }}
                  title={`${p.method}: ${rupees(p.revenue)}`}
                />
              ))}
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {dashboard.paySplit.map((p) => (
                <div key={p.method} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${PAY_META[p.method].color}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {PAY_META[p.method].emoji} {PAY_META[p.method].label}
                    </div>
                    <div className="text-xs text-slate-400 tabular-nums">
                      {p.count} orders · {rupees(p.revenue)} ·{" "}
                      {Math.round((p.revenue / dashboard.payTotal) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {payOpen && <PaymentModal total={total} onClose={() => setPayOpen(false)} onConfirm={completeSale} />}
      {receipt && <ReceiptOverlay sale={receipt} onClose={() => setReceipt(null)} />}
    </DemoShell>
  );
}

/* ------------------------------------------------------------------ */
/* Sales table row (main row + expandable detail row)                  */
/* ------------------------------------------------------------------ */

function FragmentRow({
  sale,
  isOpen,
  itemTotal,
  onToggle,
}: {
  sale: Sale;
  isOpen: boolean;
  itemTotal: number;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-t border-slate-800 cursor-pointer transition-colors ${
          isOpen ? "bg-slate-800/40" : "hover:bg-slate-800/30"
        }`}
      >
        <td className="px-4 py-3 font-mono text-indigo-400">#{sale.no}</td>
        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
          {fmtDate(sale.ts)} · {fmtTime(sale.ts)}
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs rounded-full bg-slate-800 px-2.5 py-1">
            {PAY_META[sale.payment].emoji} {sale.payment}
          </span>
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{itemTotal}</td>
        <td className="px-4 py-3 text-right font-semibold tabular-nums">{rupees(sale.total)}</td>
        <td className="px-2 py-3 text-center text-slate-500 text-xs">{isOpen ? "▲" : "▼"}</td>
      </tr>
      {isOpen && (
        <tr className="border-t border-slate-800/60 bg-slate-950/40">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-1.5">
                {sale.lines.map((l, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-300">
                      {l.emoji} {l.qty} × {l.name}
                    </span>
                    <span className="text-slate-400 tabular-nums">{rupees(l.qty * l.price)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 text-sm sm:border-l sm:border-slate-800 sm:pl-4">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{rupees(sale.subtotal)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span className="tabular-nums">− {rupees(sale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span className="tabular-nums">{rupees(sale.tax)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{rupees(sale.total)}</span>
                </div>
                {sale.tendered !== undefined && (
                  <div className="flex justify-between text-slate-500 text-xs pt-1">
                    <span>
                      Tendered {rupees(sale.tendered)} · change {rupees(sale.change ?? 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
