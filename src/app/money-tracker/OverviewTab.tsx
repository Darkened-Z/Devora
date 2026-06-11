"use client";

import { useMemo, useState } from "react";
import {
  Transaction,
  formatRs,
  formatRsCompact,
  formatDateShort,
  monthKey,
  toISODate,
} from "./lib";

interface DayPoint {
  date: string;
  income: number;
  expense: number;
}

const CHART_W = 720;
const CHART_H = 240;
const PAD_L = 52;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 28;

function buildSeries(transactions: Transaction[], today: Date): DayPoint[] {
  const byDate = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    const cur = byDate.get(t.date) ?? { income: 0, expense: 0 };
    cur[t.type] += t.amount;
    byDate.set(t.date, cur);
  }
  const days: DayPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = toISODate(d);
    const v = byDate.get(date) ?? { income: 0, expense: 0 };
    days.push({ date, income: v.income, expense: v.expense });
  }
  return days;
}

function TrendChart({ transactions, today }: { transactions: Transaction[]; today: Date }) {
  const [hover, setHover] = useState<number | null>(null);
  const series = useMemo(() => buildSeries(transactions, today), [transactions, today]);

  const maxVal = Math.max(1000, ...series.map((d) => Math.max(d.income, d.expense)));
  const yMax = Math.ceil(maxVal / 5000) * 5000;
  const innerW = CHART_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;
  const x = (i: number) => PAD_L + (i / (series.length - 1)) * innerW;
  const y = (v: number) => PAD_T + innerH - (v / yMax) * innerH;

  const linePath = (key: "income" | "expense") =>
    series.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const areaPath = (key: "income" | "expense") =>
    `${linePath(key)} L${x(series.length - 1).toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${PAD_L},${(
      PAD_T + innerH
    ).toFixed(1)} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    yPos: PAD_T + innerH - f * innerH,
    label: formatRsCompact(yMax * f),
  }));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const i = Math.round(((px - PAD_L) / innerW) * (series.length - 1));
    setHover(i >= 0 && i < series.length ? i : null);
  };

  const h = hover !== null ? series[hover] : null;
  const tooltipX = hover !== null ? Math.min(Math.max(x(hover), PAD_L + 70), CHART_W - PAD_R - 78) : 0;

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full h-auto select-none"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      role="img"
      aria-label="30-day income versus expense trend"
    >
      {gridLines.map((g) => (
        <g key={g.yPos}>
          <line x1={PAD_L} x2={CHART_W - PAD_R} y1={g.yPos} y2={g.yPos} stroke="#1e293b" strokeWidth="1" />
          <text x={PAD_L - 8} y={g.yPos + 3.5} textAnchor="end" fontSize="10" fill="#64748b">
            {g.label}
          </text>
        </g>
      ))}
      {series.map((d, i) =>
        i % 5 === 0 ? (
          <text key={d.date} x={x(i)} y={CHART_H - 8} textAnchor="middle" fontSize="10" fill="#64748b">
            {formatDateShort(d.date)}
          </text>
        ) : null,
      )}

      <path d={areaPath("income")} fill="#10b981" opacity="0.12" />
      <path d={areaPath("expense")} fill="#f43f5e" opacity="0.10" />
      <path d={linePath("income")} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" />
      <path d={linePath("expense")} fill="none" stroke="#fb7185" strokeWidth="2" strokeLinejoin="round" />

      {h && hover !== null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={PAD_T} y2={PAD_T + innerH} stroke="#475569" strokeDasharray="3 3" />
          <circle cx={x(hover)} cy={y(h.income)} r="3.5" fill="#34d399" stroke="#020617" strokeWidth="1.5" />
          <circle cx={x(hover)} cy={y(h.expense)} r="3.5" fill="#fb7185" stroke="#020617" strokeWidth="1.5" />
          <g transform={`translate(${tooltipX - 66}, ${PAD_T + 4})`}>
            <rect width="132" height="52" rx="6" fill="#0f172a" stroke="#334155" />
            <text x="8" y="14" fontSize="10" fill="#94a3b8">
              {formatDateShort(h.date)}
            </text>
            <text x="8" y="29" fontSize="10" fill="#34d399">
              In {formatRs(h.income)}
            </text>
            <text x="8" y="44" fontSize="10" fill="#fb7185">
              Out {formatRs(h.expense)}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-xl sm:text-2xl font-bold tracking-tight ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-xs">{sub}</div>}
    </div>
  );
}

export default function OverviewTab({
  transactions,
  today,
  onSeeAll,
}: {
  transactions: Transaction[];
  today: Date;
  onSeeAll: () => void;
}) {
  const thisMonth = monthKey(toISODate(today));
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonth = monthKey(toISODate(prev));

  const stats = useMemo(() => {
    let income = 0,
      expense = 0,
      lastIncome = 0,
      lastExpense = 0,
      balance = 0;
    for (const t of transactions) {
      const mk = monthKey(t.date);
      const signed = t.type === "income" ? t.amount : -t.amount;
      balance += signed;
      if (mk === thisMonth) {
        if (t.type === "income") income += t.amount;
        else expense += t.amount;
      } else if (mk === lastMonth) {
        if (t.type === "income") lastIncome += t.amount;
        else lastExpense += t.amount;
      }
    }
    return { income, expense, net: income - expense, lastNet: lastIncome - lastExpense, balance };
  }, [transactions, thisMonth, lastMonth]);

  const netDelta =
    stats.lastNet !== 0 ? ((stats.net - stats.lastNet) / Math.abs(stats.lastNet)) * 100 : null;
  const netUp = stats.net >= stats.lastNet;

  const categoryBars = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const t of transactions) {
      if (t.type !== "expense" || monthKey(t.date) !== thisMonth) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
      total += t.amount;
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({ cat, amt, pct: total ? Math.round((amt / total) * 100) : 0 }));
  }, [transactions, thisMonth]);

  const recent = transactions.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Income this month" value={formatRs(stats.income)} accent="text-emerald-400" />
        <StatCard label="Expenses this month" value={formatRs(stats.expense)} accent="text-rose-400" />
        <StatCard
          label="Net profit"
          value={formatRs(stats.net)}
          accent={stats.net >= 0 ? "text-emerald-400" : "text-rose-400"}
          sub={
            <span className={netUp ? "text-emerald-400" : "text-rose-400"}>
              {netUp ? "▲" : "▼"}{" "}
              {netDelta !== null ? `${Math.abs(netDelta).toFixed(1)}%` : formatRs(stats.net - stats.lastNet)}{" "}
              <span className="text-slate-500">vs last month</span>
            </span>
          }
        />
        <StatCard
          label="Cash balance"
          value={formatRs(stats.balance)}
          accent="text-indigo-400"
          sub={<span className="text-slate-500">All-time net position</span>}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Last 30 days</h3>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Expenses
              </span>
            </div>
          </div>
          <TrendChart transactions={transactions} today={today} />
        </div>

        {/* Category breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold text-sm mb-4">Spending by category</h3>
          {categoryBars.length === 0 ? (
            <p className="text-sm text-slate-500">No expenses recorded this month yet.</p>
          ) : (
            <div className="space-y-3.5">
              {categoryBars.map(({ cat, amt, pct }) => (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300">{cat}</span>
                    <span className="text-slate-400">
                      {formatRs(amt)} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-sm">Recent activity</h3>
          <button
            onClick={onSeeAll}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all transactions →
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500 text-center">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30 transition-colors">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                    t.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {t.type === "income" ? "↑" : "↓"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-200 truncate">{t.note}</div>
                  <div className="text-xs text-slate-500">
                    {formatDateShort(t.date)} · {t.category}
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold whitespace-nowrap ${
                    t.type === "income" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {t.type === "income" ? "+" : "−"}
                  {formatRs(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
