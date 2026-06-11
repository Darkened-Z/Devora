"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import DemoShell from "@/components/DemoShell";
import {
  type Activity,
  type Customer,
  type Product,
  type PurchaseOrder,
  type Sale,
  type Store,
  dayKey,
  loadStore,
  resetStore,
  rs,
  saveStore,
  shortDay,
  timeAgo,
  uid,
} from "./lib";

/* ============================== navigation ============================== */

type Section = "dashboard" | "inventory" | "sales" | "customers";

const NAV: { id: Section; label: string; hint: string; icon: ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    hint: "Overview & alerts",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
        <path d="M3 3h6v6H3V3zm8 0h6v4h-6V3zM3 11h6v6H3v-6zm8-2h6v8h-6V9z" />
      </svg>
    ),
  },
  {
    id: "inventory",
    label: "Inventory",
    hint: "Stock & products",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
        <path d="M10 1.5 17.5 5v10L10 18.5 2.5 15V5L10 1.5zm0 2.2L5 6.1v7.6l5 2.6 5-2.6V6.1l-5-2.4zM10 7l3 1.5v3L10 13l-3-1.5v-3L10 7z" />
      </svg>
    ),
  },
  {
    id: "sales",
    label: "Sales",
    hint: "Orders & history",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
        <path d="M4 2h12v16l-2-1.2L12 18l-2-1.2L8 18l-2-1.2L4 18V2zm3 4h6v1.5H7V6zm0 3h6v1.5H7V9zm0 3h4v1.5H7V12z" />
      </svg>
    ),
  },
  {
    id: "customers",
    label: "Customers",
    hint: "Accounts & dues",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
        <path d="M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm6.5 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1.5 16c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5v1H1.5v-1zm12.6 1c.06-.34.09-.67.09-1 0-1.4-.5-2.6-1.3-3.5.5-.1 1-.2 1.6-.2 2.3 0 4 1.3 4 3.5v1.2h-4.4z" />
      </svg>
    ),
  },
];

const SECTION_META: Record<Section, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Today's performance at a glance" },
  inventory: { title: "Inventory", sub: "Stock levels, pricing and reorder points" },
  sales: { title: "Sales", sub: "Every transaction, searchable by day" },
  customers: { title: "Customers", sub: "Accounts, purchase history and balances" },
};

/* ============================== small UI bits ============================== */

type Toast = { id: number; message: string; tone: "ok" | "warn" | "bad" | "info" };

const TOAST_STYLES: Record<Toast["tone"], string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  bad: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  info: "border-indigo-500/40 bg-indigo-500/10 text-indigo-200",
};

function StockBadge({ stock, reorderLevel }: { stock: number; reorderLevel: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Out · 0
      </span>
    );
  }
  if (stock <= reorderLevel) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Low · {stock}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> OK · {stock}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-slate-400 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

const INPUT_CLS =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500";

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="py-12 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-sm font-medium text-slate-300">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

const ACTIVITY_ICON: Record<Activity["type"], string> = {
  sale: "🛒",
  restock: "📦",
  po: "📝",
  customer: "👤",
  product: "🏷️",
};

/* ============================== page ============================== */

export default function ErpPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [section, setSection] = useState<Section>("dashboard");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Inventory controls
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showAddProduct, setShowAddProduct] = useState(false);

  // Sales controls
  const [dayFilter, setDayFilter] = useState("All");

  // Customers controls
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  useEffect(() => {
    setStore(loadStore());
  }, []);

  function commit(next: Store) {
    setStore(next);
    saveStore(next);
  }

  function pushToast(message: string, tone: Toast["tone"] = "ok") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }

  function logActivity(s: Store, type: Activity["type"], message: string): Activity[] {
    return [{ id: uid("A"), type, message, at: new Date().toISOString() }, ...s.activity].slice(0, 40);
  }

  /* ---------- actions ---------- */

  function sellOne(p: Product) {
    if (!store || p.stock <= 0) return;
    const nowIso = new Date().toISOString();
    const newStock = p.stock - 1;
    const sale: Sale = {
      id: uid("S"),
      date: nowIso,
      customerName: "Walk-in",
      items: [{ productId: p.id, name: p.name, qty: 1, price: p.price }],
      total: p.price,
    };
    commit({
      ...store,
      products: store.products.map((x) => (x.id === p.id ? { ...x, stock: newStock } : x)),
      sales: [sale, ...store.sales],
      activity: logActivity(store, "sale", `Sold 1 × ${p.name} — ${rs(p.price)}`),
    });
    if (newStock === 0) pushToast(`${p.name} is now OUT OF STOCK`, "bad");
    else if (newStock <= p.reorderLevel) pushToast(`${p.name} hit reorder level — ${newStock} left`, "warn");
    else pushToast(`Sold 1 × ${p.name} — ${rs(p.price)}`);
  }

  function restock(p: Product) {
    if (!store) return;
    commit({
      ...store,
      products: store.products.map((x) => (x.id === p.id ? { ...x, stock: x.stock + 20 } : x)),
      activity: logActivity(store, "restock", `Restocked 20 × ${p.name} (now ${p.stock + 20})`),
    });
    pushToast(`Restocked 20 × ${p.name}`, "info");
  }

  function reorder(p: Product) {
    if (!store) return;
    const existing = store.purchaseOrders.find((po) => po.productId === p.id && po.status === "pending");
    if (existing) {
      pushToast(`A purchase order for ${p.name} is already pending (${existing.qty} units)`, "info");
      return;
    }
    const qty = Math.max(20, p.reorderLevel * 3);
    const po: PurchaseOrder = {
      id: uid("PO"),
      productId: p.id,
      productName: p.name,
      qty,
      supplier: "Karachi Wholesale Co.",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    commit({
      ...store,
      purchaseOrders: [po, ...store.purchaseOrders],
      activity: logActivity(store, "po", `Purchase order raised: ${qty} × ${p.name}`),
    });
    pushToast(`PO created — ${qty} × ${p.name} from ${po.supplier}`, "ok");
  }

  function receivePO(po: PurchaseOrder) {
    if (!store) return;
    commit({
      ...store,
      products: store.products.map((x) => (x.id === po.productId ? { ...x, stock: x.stock + po.qty } : x)),
      purchaseOrders: store.purchaseOrders.map((x) => (x.id === po.id ? { ...x, status: "received" as const } : x)),
      activity: logActivity(store, "restock", `Received PO: ${po.qty} × ${po.productName}`),
    });
    pushToast(`Received ${po.qty} × ${po.productName} into stock`, "ok");
  }

  function addProduct(data: { name: string; sku: string; category: string; cost: number; price: number; stock: number; reorderLevel: number }) {
    if (!store) return;
    const product: Product = { id: uid("p"), ...data };
    commit({
      ...store,
      products: [...store.products, product],
      activity: logActivity(store, "product", `Added product ${data.name} (${data.sku})`),
    });
    setShowAddProduct(false);
    pushToast(`${data.name} added to inventory`, "ok");
  }

  function addCustomer(data: { name: string; phone: string }) {
    if (!store) return;
    const customer: Customer = {
      id: uid("c"),
      name: data.name,
      phone: data.phone,
      totalPurchases: 0,
      lastPurchase: null,
      balanceDue: 0,
    };
    commit({
      ...store,
      customers: [...store.customers, customer],
      activity: logActivity(store, "customer", `New customer account: ${data.name}`),
    });
    setShowAddCustomer(false);
    pushToast(`${data.name} added to customers`, "ok");
  }

  function handleReset() {
    const fresh = resetStore();
    setStore(fresh);
    pushToast("Demo data reset to factory seed", "info");
  }

  /* ---------- derived ---------- */

  const derived = useMemo(() => {
    if (!store) return null;
    const todayKey = dayKey(new Date());
    const last14: { key: string; label: string; total: number; orders: number }[] = [];
    for (let back = 13; back >= 0; back--) {
      const d = new Date();
      d.setDate(d.getDate() - back);
      last14.push({ key: dayKey(d), label: shortDay(dayKey(d)), total: 0, orders: 0 });
    }
    const byDay = new Map(last14.map((d) => [d.key, d]));
    for (const s of store.sales) {
      const k = dayKey(new Date(s.date));
      const slot = byDay.get(k);
      if (slot) {
        slot.total += s.total;
        slot.orders += 1;
      }
    }
    const week = last14.slice(7).reduce((sum, d) => sum + d.total, 0);
    const prevWeek = last14.slice(0, 7).reduce((sum, d) => sum + d.total, 0);
    const today = byDay.get(todayKey);
    const lowStock = store.products
      .filter((p) => p.stock <= p.reorderLevel)
      .sort((a, b) => a.stock / Math.max(1, a.reorderLevel) - b.stock / Math.max(1, b.reorderLevel));
    return {
      todayKey,
      last14,
      revenueToday: today?.total ?? 0,
      ordersToday: today?.orders ?? 0,
      revenueWeek: week,
      weekDelta: prevWeek > 0 ? ((week - prevWeek) / prevWeek) * 100 : 0,
      lowStock,
      pendingPOs: store.purchaseOrders.filter((po) => po.status === "pending"),
    };
  }, [store]);

  /* ---------- render ---------- */

  if (!store || !derived) {
    return (
      <DemoShell title="Mart Manager ERP" tagline="Inventory, sales and customers — one back office.">
        <div className="py-24 text-center text-sm text-slate-500">Loading workspace…</div>
      </DemoShell>
    );
  }

  const meta = SECTION_META[section];

  return (
    <DemoShell title="Mart Manager ERP" tagline="Inventory, sales and customers — one back office.">
      {/* Mobile top tab bar */}
      <nav className="md:hidden flex gap-1 mb-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-1">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setSection(n.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              section === n.id ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>

      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <aside className="hidden md:block w-52 shrink-0 sticky top-20">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-2">
            <div className="px-3 pt-2 pb-3 border-b border-slate-800 mb-2">
              <div className="text-sm font-semibold">Khan Mini Mart</div>
              <div className="text-[11px] text-slate-500">Gulshan Branch · Karachi</div>
            </div>
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setSection(n.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  section === n.id
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {n.icon}
                <span className="flex-1">
                  <span className="block text-sm font-medium leading-tight">{n.label}</span>
                  <span className="block text-[10px] text-slate-500">{n.hint}</span>
                </span>
                {n.id === "dashboard" && derived.lowStock.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    {derived.lowStock.length}
                  </span>
                )}
              </button>
            ))}
            <div className="border-t border-slate-800 mt-2 pt-2">
              <button
                onClick={handleReset}
                className="w-full px-3 py-2 rounded-lg text-left text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
              >
                ↺ Reset demo data
              </button>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb header */}
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <div className="text-[11px] text-slate-500 mb-0.5">
                Mart Manager <span className="mx-1">/</span>
                <span className="text-indigo-400">{meta.title}</span>
              </div>
              <h2 className="text-lg font-semibold leading-tight">{meta.title}</h2>
              <p className="text-xs text-slate-400">{meta.sub}</p>
            </div>
            <div className="text-xs text-slate-500">
              {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          {section === "dashboard" && (
            <DashboardSection
              store={store}
              derived={derived}
              onReorder={reorder}
              onReceivePO={receivePO}
            />
          )}
          {section === "inventory" && (
            <InventorySection
              products={store.products}
              search={search}
              setSearch={setSearch}
              category={category}
              setCategory={setCategory}
              onSell={sellOne}
              onRestock={restock}
              onAdd={() => setShowAddProduct(true)}
            />
          )}
          {section === "sales" && (
            <SalesSection sales={store.sales} dayFilter={dayFilter} setDayFilter={setDayFilter} />
          )}
          {section === "customers" && (
            <CustomersSection customers={store.customers} onAdd={() => setShowAddCustomer(true)} />
          )}
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border px-4 py-3 text-xs font-medium shadow-xl backdrop-blur ${TOAST_STYLES[t.tone]}`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {showAddProduct && <AddProductModal onClose={() => setShowAddProduct(false)} onSave={addProduct} />}
      {showAddCustomer && <AddCustomerModal onClose={() => setShowAddCustomer(false)} onSave={addCustomer} />}
    </DemoShell>
  );
}

/* ============================== dashboard ============================== */

type Derived = {
  todayKey: string;
  last14: { key: string; label: string; total: number; orders: number }[];
  revenueToday: number;
  ordersToday: number;
  revenueWeek: number;
  weekDelta: number;
  lowStock: Product[];
  pendingPOs: PurchaseOrder[];
};

function DashboardSection({
  store,
  derived,
  onReorder,
  onReceivePO,
}: {
  store: Store;
  derived: Derived;
  onReorder: (p: Product) => void;
  onReceivePO: (po: PurchaseOrder) => void;
}) {
  const deltaUp = derived.weekDelta >= 0;
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400 mb-1.5">Revenue today</div>
          <div className="text-xl font-bold text-slate-100">{rs(derived.revenueToday)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{derived.ordersToday} orders so far</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400 mb-1.5">Revenue this week</div>
          <div className="text-xl font-bold text-slate-100">{rs(derived.revenueWeek)}</div>
          <div className={`text-[11px] mt-1 font-medium ${deltaUp ? "text-emerald-400" : "text-rose-400"}`}>
            {deltaUp ? "▲" : "▼"} {Math.abs(derived.weekDelta).toFixed(1)}% vs last week
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400 mb-1.5">Orders (14 days)</div>
          <div className="text-xl font-bold text-slate-100">
            {derived.last14.reduce((n, d) => n + d.orders, 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            avg {(derived.last14.reduce((n, d) => n + d.orders, 0) / 14).toFixed(1)}/day
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-400 mb-1.5">Low stock items</div>
          <div
            className={`text-xl font-bold ${
              derived.lowStock.some((p) => p.stock === 0)
                ? "text-rose-400"
                : derived.lowStock.length
                  ? "text-amber-400"
                  : "text-emerald-400"
            }`}
          >
            {derived.lowStock.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {derived.lowStock.filter((p) => p.stock === 0).length} out of stock
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Revenue — last 14 days</h3>
          <span className="text-[11px] text-slate-500">
            total {rs(derived.last14.reduce((n, d) => n + d.total, 0))}
          </span>
        </div>
        <RevenueChart days={derived.last14} todayKey={derived.todayKey} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Low stock panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold mb-3">Low stock alerts</h3>
          {derived.lowStock.length === 0 ? (
            <EmptyState icon="✅" title="All stocked up" sub="No products are below their reorder level." />
          ) : (
            <div className="space-y-2">
              {derived.lowStock.map((p) => {
                const pending = derived.pendingPOs.find((po) => po.productId === p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-500">
                        reorder at {p.reorderLevel} · <span className="text-slate-400">{p.sku}</span>
                      </div>
                    </div>
                    <StockBadge stock={p.stock} reorderLevel={p.reorderLevel} />
                    {pending ? (
                      <span className="text-[11px] px-2 py-1 rounded-md bg-slate-800 text-slate-400 whitespace-nowrap">
                        PO pending
                      </span>
                    ) : (
                      <button
                        onClick={() => onReorder(p)}
                        className="text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 whitespace-nowrap transition-colors"
                      >
                        Reorder
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {derived.pendingPOs.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-400 mb-2">
                Pending purchase orders ({derived.pendingPOs.length})
              </h4>
              <div className="space-y-1.5">
                {derived.pendingPOs.map((po) => (
                  <div key={po.id} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 min-w-0 truncate text-slate-300">
                      {po.qty} × {po.productName}
                    </span>
                    <span className="text-slate-500 hidden sm:inline truncate">{po.supplier}</span>
                    <button
                      onClick={() => onReceivePO(po)}
                      className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 font-medium whitespace-nowrap transition-colors"
                    >
                      Receive
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold mb-3">Recent activity</h3>
          {store.activity.length === 0 ? (
            <EmptyState icon="🕐" title="No activity yet" sub="Sales and restocks will show up here." />
          ) : (
            <div className="space-y-1">
              {store.activity.slice(0, 9).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 px-1 py-1.5">
                  <span className="text-sm leading-5">{ACTIVITY_ICON[a.type]}</span>
                  <span className="flex-1 text-xs text-slate-300 leading-5">{a.message}</span>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap leading-5">{timeAgo(a.at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RevenueChart({
  days,
  todayKey,
}: {
  days: { key: string; label: string; total: number }[];
  todayKey: string;
}) {
  const W = 700;
  const H = 200;
  const PAD_L = 8;
  const PAD_B = 22;
  const max = Math.max(1, ...days.map((d) => d.total));
  const innerW = W - PAD_L * 2;
  const slot = innerW / days.length;
  const barW = slot * 0.62;
  const chartH = H - PAD_B - 8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="14 day revenue bar chart">
      {/* gridlines */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD_L}
          x2={W - PAD_L}
          y1={8 + chartH * (1 - f)}
          y2={8 + chartH * (1 - f)}
          stroke="#1e293b"
          strokeWidth="1"
        />
      ))}
      {days.map((d, i) => {
        const h = Math.max(2, (d.total / max) * chartH);
        const x = PAD_L + i * slot + (slot - barW) / 2;
        const y = 8 + chartH - h;
        const isToday = d.key === todayKey;
        return (
          <g key={d.key}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={4}
              fill={isToday ? "#818cf8" : "#6366f1"}
              opacity={isToday ? 1 : 0.55}
              className="hover:opacity-100 transition-opacity"
            >
              <title>{`${d.label} — ${rs(d.total)}`}</title>
            </rect>
            {i % 2 === 1 && (
              <text
                x={x + barW / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
              >
                {d.label.split(" ").slice(1).join(" ")}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ============================== inventory ============================== */

function InventorySection({
  products,
  search,
  setSearch,
  category,
  setCategory,
  onSell,
  onRestock,
  onAdd,
}: {
  products: Product[];
  search: string;
  setSearch: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  onSell: (p: Product) => void;
  onRestock: (p: Product) => void;
  onAdd: () => void;
}) {
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products]
  );
  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesQ = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    return matchesQ && (category === "All" || p.category === category);
  });
  const stockValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or SKU…"
          className={`${INPUT_CLS} max-w-xs`}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${INPUT_CLS} w-auto`}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="text-xs text-slate-500 hidden sm:block">
          Stock value (at cost): <span className="text-slate-300 font-medium">{rs(stockValue)}</span>
        </span>
        <button
          onClick={onAdd}
          className="text-xs font-medium px-3 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
        >
          + Add product
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-3 py-3 font-medium">SKU</th>
                <th className="text-left px-3 py-3 font-medium">Category</th>
                <th className="text-right px-3 py-3 font-medium">Cost</th>
                <th className="text-right px-3 py-3 font-medium">Price</th>
                <th className="text-right px-3 py-3 font-medium">Margin</th>
                <th className="text-center px-3 py-3 font-medium">Stock</th>
                <th className="text-right px-3 py-3 font-medium">Reorder at</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon="🔍"
                      title="No products match"
                      sub="Try a different search term or clear the category filter."
                    />
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const margin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;
                return (
                  <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-3 py-3 text-slate-500 font-mono text-xs">{p.sku}</td>
                    <td className="px-3 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400">{rs(p.cost)}</td>
                    <td className="px-3 py-3 text-right">{rs(p.price)}</td>
                    <td
                      className={`px-3 py-3 text-right text-xs font-medium ${
                        margin >= 15 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {margin.toFixed(0)}%
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StockBadge stock={p.stock} reorderLevel={p.reorderLevel} />
                    </td>
                    <td className="px-3 py-3 text-right text-slate-500">{p.reorderLevel}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSell(p)}
                        disabled={p.stock === 0}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed mr-2 transition-colors"
                      >
                        Sell
                      </button>
                      <button
                        onClick={() => onRestock(p)}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                      >
                        Restock +20
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Tip: hit “Sell” on a low item — stock badges, dashboard alerts and the sales ledger all update live.
      </p>
    </div>
  );
}

/* ============================== sales ============================== */

function SalesSection({
  sales,
  dayFilter,
  setDayFilter,
}: {
  sales: Sale[];
  dayFilter: string;
  setDayFilter: (v: string) => void;
}) {
  const days = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of sales) {
      const k = dayKey(new Date(s.date));
      if (!seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
    return out;
  }, [sales]);

  const filtered = dayFilter === "All" ? sales : sales.filter((s) => dayKey(new Date(s.date)) === dayFilter);
  const total = filtered.reduce((sum, s) => sum + s.total, 0);
  const itemCount = filtered.reduce((sum, s) => sum + s.items.reduce((n, it) => n + it.qty, 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className={`${INPUT_CLS} w-auto`}>
          <option value="All">All days</option>
          {days.map((d) => (
            <option key={d} value={d}>
              {shortDay(d)}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>
            <span className="text-slate-200 font-semibold">{filtered.length}</span> orders
          </span>
          <span>
            <span className="text-slate-200 font-semibold">{itemCount}</span> items
          </span>
          <span>
            <span className="text-emerald-400 font-semibold">{rs(total)}</span> revenue
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-3 py-3 font-medium">Items</th>
                <th className="text-left px-3 py-3 font-medium">Customer</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState icon="🧾" title="No sales recorded" sub="Sell something from the Inventory tab to see it here." />
                  </td>
                </tr>
              )}
              {filtered.slice(0, 60).map((s) => (
                <tr key={s.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-xs">
                    {new Date(s.date).toLocaleString("en-PK", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-300">
                    {s.items.map((it) => `${it.qty} × ${it.name}`).join(", ")}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {s.customerName === "Walk-in" ? (
                      <span className="text-slate-500">Walk-in</span>
                    ) : (
                      <span className="text-slate-200">{s.customerName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{rs(s.total)}</td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-700 bg-slate-950/60">
                  <td className="px-4 py-3 text-xs text-slate-400" colSpan={2}>
                    {dayFilter === "All" ? "All days" : shortDay(dayFilter)}
                    {filtered.length > 60 ? ` · showing latest 60 of ${filtered.length}` : ""}
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-slate-400">{filtered.length} orders</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">{rs(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================== customers ============================== */

function CustomersSection({ customers, onAdd }: { customers: Customer[]; onAdd: () => void }) {
  const sorted = [...customers].sort((a, b) => b.totalPurchases - a.totalPurchases);
  const totalDue = customers.reduce((sum, c) => sum + c.balanceDue, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-400">
          <span className="text-slate-200 font-semibold">{customers.length}</span> accounts
        </span>
        <span className="text-xs text-slate-400">
          Outstanding: <span className={`font-semibold ${totalDue > 0 ? "text-rose-400" : "text-emerald-400"}`}>{rs(totalDue)}</span>
        </span>
        <div className="flex-1" />
        <button
          onClick={onAdd}
          className="text-xs font-medium px-3 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
        >
          + Add customer
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-3 py-3 font-medium">Phone</th>
                <th className="text-right px-3 py-3 font-medium">Total purchases</th>
                <th className="text-left px-3 py-3 font-medium">Last purchase</th>
                <th className="text-right px-4 py-3 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon="👥" title="No customers yet" sub="Add your first customer account to start tracking dues." />
                  </td>
                </tr>
              )}
              {sorted.map((c) => (
                <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-indigo-500/15 text-indigo-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                        {c.name
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")}
                      </span>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-xs font-mono">{c.phone}</td>
                  <td className="px-3 py-3 text-right">{rs(c.totalPurchases)}</td>
                  <td className="px-3 py-3 text-xs text-slate-400">
                    {c.lastPurchase
                      ? new Date(c.lastPurchase).toLocaleDateString("en-PK", { day: "numeric", month: "short" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.balanceDue > 0 ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300">
                        Due {rs(c.balanceDue)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                        Clear
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================== modals ============================== */

function AddProductModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (d: { name: string; sku: string; category: string; cost: number; price: number; stock: number; reorderLevel: number }) => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [cat, setCat] = useState("Pantry");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [err, setErr] = useState("");

  function submit() {
    const c = Number(cost);
    const p = Number(price);
    const st = Number(stock);
    const rl = Number(reorderLevel);
    if (!name.trim() || !sku.trim()) return setErr("Name and SKU are required.");
    if (!(c > 0) || !(p > 0)) return setErr("Cost and price must be positive numbers.");
    if (p < c) return setErr("Price should not be below cost.");
    if (!(st >= 0) || !(rl >= 0)) return setErr("Stock and reorder level must be 0 or more.");
    onSave({ name: name.trim(), sku: sku.trim().toUpperCase(), category: cat, cost: c, price: p, stock: st, reorderLevel: rl });
  }

  return (
    <Modal title="Add product" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Product name">
          <input className={INPUT_CLS} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Honey 500g" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU">
            <input className={INPUT_CLS} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="PNT-013" />
          </Field>
          <Field label="Category">
            <select className={INPUT_CLS} value={cat} onChange={(e) => setCat(e.target.value)}>
              {["Dairy", "Bakery", "Pantry", "Beverages", "Household", "Snacks"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Cost (Rs)">
            <input className={INPUT_CLS} type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="450" />
          </Field>
          <Field label="Price (Rs)">
            <input className={INPUT_CLS} type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="520" />
          </Field>
          <Field label="Opening stock">
            <input className={INPUT_CLS} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="24" />
          </Field>
          <Field label="Reorder level">
            <input className={INPUT_CLS} type="number" min="0" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
          </Field>
        </div>
        {err && <p className="text-xs text-rose-400">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button onClick={submit} className="text-xs font-medium px-3 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors">
            Save product
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddCustomerModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (d: { name: string; phone: string }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");

  function submit() {
    if (!name.trim()) return setErr("Customer name is required.");
    if (!/^[\d\s+()-]{7,}$/.test(phone.trim())) return setErr("Enter a valid phone number.");
    onSave({ name: name.trim(), phone: phone.trim() });
  }

  return (
    <Modal title="Add customer" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Full name">
          <input className={INPUT_CLS} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asad Mehmood" autoFocus />
        </Field>
        <Field label="Phone">
          <input className={INPUT_CLS} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
        </Field>
        {err && <p className="text-xs text-rose-400">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button onClick={submit} className="text-xs font-medium px-3 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors">
            Save customer
          </button>
        </div>
      </div>
    </Modal>
  );
}
