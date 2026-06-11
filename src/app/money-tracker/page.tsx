"use client";

import { useCallback, useEffect, useState } from "react";
import DemoShell from "@/components/DemoShell";
import OverviewTab from "./OverviewTab";
import TransactionsTab from "./TransactionsTab";
import BudgetsTab from "./BudgetsTab";
import {
  Budgets,
  DEFAULT_BUDGETS,
  LS_BUDGETS,
  LS_TRANSACTIONS,
  Transaction,
  generateSeedTransactions,
} from "./lib";

type Tab = "overview" | "transactions" | "budgets";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "budgets", label: "Budgets" },
];

function isTransactionArray(v: unknown): v is Transaction[] {
  return (
    Array.isArray(v) &&
    v.every(
      (t) =>
        t &&
        typeof t === "object" &&
        typeof (t as Transaction).id === "string" &&
        typeof (t as Transaction).amount === "number" &&
        typeof (t as Transaction).date === "string" &&
        ((t as Transaction).type === "income" || (t as Transaction).type === "expense"),
    )
  );
}

export default function MoneyTrackerPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budgets>(DEFAULT_BUDGETS);
  const [loaded, setLoaded] = useState(false);
  const [today] = useState(() => new Date());

  // Load (or seed) data on the client only.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let txs: Transaction[] | null = null;
    let bud: Budgets | null = null;
    try {
      const rawTx = window.localStorage.getItem(LS_TRANSACTIONS);
      if (rawTx) {
        const parsed: unknown = JSON.parse(rawTx);
        if (isTransactionArray(parsed) && parsed.length > 0) txs = parsed;
      }
      const rawBud = window.localStorage.getItem(LS_BUDGETS);
      if (rawBud) {
        const parsed: unknown = JSON.parse(rawBud);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          bud = { ...DEFAULT_BUDGETS, ...(parsed as Budgets) };
        }
      }
    } catch {
      // corrupted storage — fall back to fresh seed
    }
    if (!txs) {
      txs = generateSeedTransactions(new Date());
      try {
        window.localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(txs));
      } catch {}
    }
    setTransactions(txs);
    if (bud) setBudgets(bud);
    setLoaded(true);
  }, []);

  const persistTransactions = useCallback((next: Transaction[]) => {
    setTransactions(next);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(next));
      }
    } catch {}
  }, []);

  const persistBudgets = useCallback((next: Budgets) => {
    setBudgets(next);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_BUDGETS, JSON.stringify(next));
      }
    } catch {}
  }, []);

  const addTransaction = useCallback(
    (t: Transaction) => {
      const next = [t, ...transactions].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
      );
      persistTransactions(next);
    },
    [transactions, persistTransactions],
  );

  const deleteTransaction = useCallback(
    (id: string) => persistTransactions(transactions.filter((t) => t.id !== id)),
    [transactions, persistTransactions],
  );

  const setBudget = useCallback(
    (category: string, amount: number) => persistBudgets({ ...budgets, [category]: amount }),
    [budgets, persistBudgets],
  );

  const resetDemo = useCallback(() => {
    const fresh = generateSeedTransactions(new Date());
    persistTransactions(fresh);
    persistBudgets({ ...DEFAULT_BUDGETS });
  }, [persistTransactions, persistBudgets]);

  return (
    <DemoShell
      title="Money Tracker"
      tagline="Income, expenses & budgets for a small business — at a glance."
    >
      {/* Tab bar */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <nav
          className="inline-flex rounded-xl border border-slate-800 bg-slate-900 p-1"
          aria-label="Money tracker sections"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-indigo-500 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              aria-current={tab === t.id ? "page" : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button
          onClick={resetDemo}
          className="text-xs text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
          title="Restore the original demo dataset"
        >
          ↺ Reset demo data
        </button>
      </div>

      {!loaded ? (
        /* Skeleton while localStorage hydrates — avoids SSR mismatch */
        <div className="space-y-6 animate-pulse" aria-hidden="true">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl border border-slate-800 bg-slate-900" />
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 rounded-xl border border-slate-800 bg-slate-900" />
            <div className="h-72 rounded-xl border border-slate-800 bg-slate-900" />
          </div>
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <OverviewTab
              transactions={transactions}
              today={today}
              onSeeAll={() => setTab("transactions")}
            />
          )}
          {tab === "transactions" && (
            <TransactionsTab
              transactions={transactions}
              onAdd={addTransaction}
              onDelete={deleteTransaction}
            />
          )}
          {tab === "budgets" && (
            <BudgetsTab
              transactions={transactions}
              budgets={budgets}
              onSetBudget={setBudget}
              today={today}
            />
          )}
        </>
      )}

      <p className="text-xs text-slate-600 mt-8 text-center">
        Demo data is generated locally and saved in your browser — nothing leaves this page.
      </p>
    </DemoShell>
  );
}
