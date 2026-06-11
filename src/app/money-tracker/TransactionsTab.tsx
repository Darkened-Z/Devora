"use client";

import { useMemo, useState } from "react";
import {
  ALL_CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Transaction,
  TxType,
  formatDateLong,
  formatMonthLabel,
  formatRs,
  monthKey,
  newId,
  toISODate,
} from "./lib";

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors";

function AddTransactionModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (t: Transaction) => void;
}) {
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [error, setError] = useState("");

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const switchType = (t: TxType) => {
    setType(t);
    setCategory((t === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0]);
  };

  const submit = () => {
    const amt = Number(amount);
    if (!amount || !Number.isFinite(amt) || amt <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }
    onAdd({
      id: newId(),
      type,
      amount: Math.round(amt),
      category,
      note: note.trim() || category,
      date,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add transaction"
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">New transaction</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                type === t
                  ? t === "expense"
                    ? "bg-rose-500/90 text-white"
                    : "bg-emerald-500/90 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Amount (Rs)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="e.g. 12,500"
              inputMode="numeric"
              autoFocus
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={date}
                max={toISODate(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Supplier restock"
              className={inputCls}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold text-white transition-colors"
          >
            Save transaction
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsTab({
  transactions,
  onAdd,
  onDelete,
}: {
  transactions: Transaction[];
  onAdd: (t: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TxType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const months = useMemo(() => {
    const set = new Set(transactions.map((t) => monthKey(t.date)));
    return [...set].sort().reverse();
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (monthFilter !== "all" && monthKey(t.date) !== monthFilter) return false;
      if (q && !t.note.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, search, typeFilter, categoryFilter, monthFilter]);

  const totals = useMemo(() => {
    let income = 0,
      expense = 0;
    for (const t of filtered) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  const hasFilters = search !== "" || typeFilter !== "all" || categoryFilter !== "all" || monthFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes or categories…"
          className={`${inputCls} lg:max-w-xs`}
        />
        <div className="grid grid-cols-3 gap-3 lg:flex">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | TxType)}
            className={inputCls}
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={inputCls}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className={inputCls}
            aria-label="Filter by month"
          >
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="lg:ml-auto px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold text-white whitespace-nowrap transition-colors"
        >
          + Add transaction
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Note</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    {hasFilters ? (
                      <>No transactions match your filters.</>
                    ) : (
                      <>
                        No transactions yet.{" "}
                        <button
                          onClick={() => setShowModal(true)}
                          className="text-indigo-400 hover:text-indigo-300"
                        >
                          Add your first one
                        </button>
                        .
                      </>
                    )}
                  </td>
                </tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDateLong(t.date)}</td>
                  <td className="px-4 py-3 text-slate-200 max-w-[220px] truncate">{t.note}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full capitalize ${
                        t.type === "income"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      t.type === "income" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {t.type === "income" ? "+" : "−"}
                    {formatRs(t.amount)}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {confirmId === t.id ? (
                      <span className="inline-flex gap-1">
                        <button
                          onClick={() => {
                            onDelete(t.id);
                            setConfirmId(null);
                          }}
                          className="text-xs px-2 py-1 rounded bg-rose-500/90 hover:bg-rose-400 text-white transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                        >
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmId(t.id)}
                        className="text-slate-600 hover:text-rose-400 text-xs px-2 transition-colors"
                        aria-label={`Delete ${t.note}`}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-950/60 border-t border-slate-800 text-xs">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-slate-400">
                    {filtered.length} transaction{filtered.length === 1 ? "" : "s"} · income{" "}
                    <span className="text-emerald-400 font-semibold">{formatRs(totals.income)}</span> · expenses{" "}
                    <span className="text-rose-400 font-semibold">{formatRs(totals.expense)}</span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      totals.net >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    Net {formatRs(totals.net)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} onAdd={onAdd} />}
    </div>
  );
}
