"use client";

import { useMemo } from "react";
import {
  Budgets,
  EXPENSE_CATEGORIES,
  Transaction,
  formatMonthLabel,
  formatRs,
  monthKey,
  toISODate,
} from "./lib";

export default function BudgetsTab({
  transactions,
  budgets,
  onSetBudget,
  today,
}: {
  transactions: Transaction[];
  budgets: Budgets;
  onSetBudget: (category: string, amount: number) => void;
  today: Date;
}) {
  const thisMonth = monthKey(toISODate(today));

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense" || monthKey(t.date) !== thisMonth) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return map;
  }, [transactions, thisMonth]);

  const rows = EXPENSE_CATEGORIES.map((cat) => {
    const budget = budgets[cat] ?? 0;
    const spent = spentByCategory.get(cat) ?? 0;
    const pct = budget > 0 ? (spent / budget) * 100 : spent > 0 ? 999 : 0;
    return { cat, budget, spent, pct };
  });

  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const barColor = (pct: number) =>
    pct >= 100 ? "bg-rose-500" : pct >= 75 ? "bg-amber-400" : "bg-emerald-500";
  const textColor = (pct: number) =>
    pct >= 100 ? "text-rose-400" : pct >= 75 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="space-y-4">
      {/* Month summary */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h3 className="font-semibold text-sm">
            Budget overview · <span className="text-slate-400 font-normal">{formatMonthLabel(thisMonth)}</span>
          </h3>
          <div className="text-sm">
            <span className={`font-bold ${textColor(totalPct)}`}>{formatRs(totalSpent)}</span>
            <span className="text-slate-500"> of {formatRs(totalBudget)} budgeted</span>
          </div>
        </div>
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor(totalPct)}`}
            style={{ width: `${Math.min(totalPct, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {totalPct >= 100
            ? `You are ${formatRs(totalSpent - totalBudget)} over your total monthly budget.`
            : `${formatRs(totalBudget - totalSpent)} left to spend this month (${Math.round(100 - totalPct)}% remaining).`}
        </p>
      </div>

      {/* Per-category budgets */}
      <div className="grid sm:grid-cols-2 gap-4">
        {rows.map(({ cat, budget, spent, pct }) => (
          <div
            key={cat}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-slate-200">{cat}</span>
                {pct >= 100 && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    Over budget
                  </span>
                )}
                {pct >= 75 && pct < 100 && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Close to limit
                  </span>
                )}
              </div>
              <span className={`text-xs font-semibold ${textColor(pct)}`}>
                {budget > 0 ? `${Math.round(pct)}%` : "—"}
              </span>
            </div>

            <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">
                Spent <span className="text-slate-200 font-semibold">{formatRs(spent)}</span>
                {budget > 0 && pct < 100 && (
                  <span className="text-slate-500"> · {formatRs(budget - spent)} left</span>
                )}
                {budget > 0 && pct >= 100 && (
                  <span className="text-rose-400"> · {formatRs(spent - budget)} over</span>
                )}
              </span>
              <label className="flex items-center gap-1.5 text-slate-400 whitespace-nowrap">
                Budget
                <span className="text-slate-500">Rs</span>
                <input
                  value={budget === 0 ? "" : String(budget)}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(/[^\d]/g, ""));
                    onSetBudget(cat, Number.isFinite(v) ? v : 0);
                  }}
                  inputMode="numeric"
                  placeholder="0"
                  className="w-24 px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-right text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  aria-label={`Monthly budget for ${cat}`}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Budgets reset every month. Edit any amount above — changes save instantly in your browser.
      </p>
    </div>
  );
}
