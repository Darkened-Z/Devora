"use client";

import { useMemo, useState } from "react";
import type { Booking, DayInfo } from "./lib";
import {
  CLOSE_MIN,
  OPEN_MIN,
  SERVICES,
  SERVICE_MAP,
  fmtMoney,
  fmtTime,
  nowMinutes,
} from "./lib";

const HOUR_PX = 56;
const GRID_H = ((CLOSE_MIN - OPEN_MIN) / 60) * HOUR_PX;

export default function OwnerView({
  bookings,
  days,
  onCancel,
}: {
  bookings: Booking[];
  days: DayInfo[];
  onCancel: (id: string) => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const nowMins = nowMinutes();
  const todayIso = days[0].iso;

  const weekIsos = useMemo(() => new Set(days.map((d) => d.iso)), [days]);
  const weekBookings = useMemo(
    () => bookings.filter((b) => weekIsos.has(b.date)),
    [bookings, weekIsos]
  );

  const stats = useMemo(() => {
    const todayCount = weekBookings.filter((b) => b.date === todayIso).length;
    const revenue = weekBookings.reduce(
      (sum, b) => sum + (SERVICE_MAP[b.serviceId]?.price ?? 0),
      0
    );
    const byDay: Record<string, number> = {};
    for (const b of weekBookings) byDay[b.date] = (byDay[b.date] ?? 0) + 1;
    let busiest: DayInfo | null = null;
    let max = 0;
    for (const d of days) {
      const c = byDay[d.iso] ?? 0;
      if (c > max) {
        max = c;
        busiest = d;
      }
    }
    return { todayCount, weekCount: weekBookings.length, revenue, busiest, busiestCount: max };
  }, [weekBookings, days, todayIso]);

  const upcoming = useMemo(
    () =>
      weekBookings
        .filter((b) => {
          if (b.date > todayIso) return true;
          if (b.date < todayIso) return false;
          const mins = SERVICE_MAP[b.serviceId]?.mins ?? 30;
          return b.start + mins > nowMins;
        })
        .sort((a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1)),
    [weekBookings, todayIso, nowMins]
  );

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let t = OPEN_MIN; t < CLOSE_MIN; t += 60) out.push(t);
    return out;
  }, []);

  return (
    <div className="bk-fade-up space-y-6">
      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Bookings today" value={String(stats.todayCount)} sub={days[0].weekday} />
        <StatCard label="This week" value={String(stats.weekCount)} sub="next 7 days" />
        <StatCard label="Est. revenue (week)" value={fmtMoney(stats.revenue)} sub="confirmed bookings" accent />
        <StatCard
          label="Busiest day"
          value={stats.busiest ? stats.busiest.weekday : "—"}
          sub={stats.busiest ? `${stats.busiestCount} bookings` : "no bookings yet"}
        />
      </div>

      {/* week calendar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-wrap gap-2">
          <h2 className="text-sm font-semibold">Week schedule</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {SERVICES.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className={`h-2 w-2 rounded-sm ${s.dot}`} />
                {s.name}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
            {/* header row */}
            <div className="grid grid-cols-[56px_repeat(7,minmax(112px,1fr))] border-b border-slate-800">
              <div />
              {days.map((d) => {
                const count = weekBookings.filter((b) => b.date === d.iso).length;
                return (
                  <div
                    key={d.iso}
                    className={`px-2 py-2.5 text-center border-l border-slate-800 ${
                      d.isToday ? "bg-indigo-500/10" : ""
                    }`}
                  >
                    <div className={`text-[11px] font-medium ${d.isToday ? "text-indigo-300" : "text-slate-400"}`}>
                      {d.isToday ? "Today" : d.short}
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`text-sm font-bold ${d.isToday ? "text-indigo-200" : ""}`}>
                        {d.dayNum} {d.month}
                      </span>
                      {d.closed ? (
                        <span className="text-[9px] rounded-full border border-slate-700 px-1.5 py-px text-slate-500">
                          Closed
                        </span>
                      ) : count > 0 ? (
                        <span className="text-[9px] rounded-full bg-slate-800 border border-slate-700 px-1.5 py-px text-slate-300 font-semibold">
                          {count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* body */}
            <div className="grid grid-cols-[56px_repeat(7,minmax(112px,1fr))]">
              {/* time gutter */}
              <div className="relative" style={{ height: GRID_H }}>
                {hours.map((t) => (
                  <div
                    key={t}
                    className="absolute right-2 -translate-y-1/2 text-[10px] text-slate-500 font-mono"
                    style={{ top: ((t - OPEN_MIN) / 60) * HOUR_PX }}
                  >
                    {t === OPEN_MIN ? "" : fmtTime(t)}
                  </div>
                ))}
              </div>

              {days.map((d) => {
                const dayBookings = weekBookings.filter((b) => b.date === d.iso);
                return (
                  <div
                    key={d.iso}
                    className={`relative border-l border-slate-800 ${d.isToday ? "bg-indigo-500/[0.04]" : ""}`}
                    style={
                      d.closed
                        ? {
                            height: GRID_H,
                            backgroundImage:
                              "repeating-linear-gradient(135deg, rgba(100,116,139,0.08) 0 6px, transparent 6px 14px)",
                          }
                        : { height: GRID_H }
                    }
                  >
                    {/* hour lines */}
                    {hours.slice(1).map((t) => (
                      <div
                        key={t}
                        className="absolute inset-x-0 border-t border-slate-800/70"
                        style={{ top: ((t - OPEN_MIN) / 60) * HOUR_PX }}
                      />
                    ))}

                    {d.closed && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-600 -rotate-90 sm:rotate-0">
                          Closed
                        </span>
                      </div>
                    )}

                    {/* current-time line */}
                    {d.isToday && nowMins >= OPEN_MIN && nowMins <= CLOSE_MIN && (
                      <div
                        className="absolute inset-x-0 z-10 flex items-center pointer-events-none"
                        style={{ top: ((nowMins - OPEN_MIN) / 60) * HOUR_PX }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 -ml-0.5" />
                        <span className="h-px flex-1 bg-rose-400/70" />
                      </div>
                    )}

                    {/* booking blocks */}
                    {dayBookings.map((b) => {
                      const s = SERVICE_MAP[b.serviceId];
                      if (!s) return null;
                      const top = ((b.start - OPEN_MIN) / 60) * HOUR_PX;
                      const height = Math.max((s.mins / 60) * HOUR_PX - 2, 13);
                      const tiny = s.mins <= 15;
                      return (
                        <div
                          key={b.id}
                          title={`${b.ref} · ${b.name} · ${s.name} · ${fmtTime(b.start)} – ${fmtTime(b.start + s.mins)} · ${fmtMoney(s.price)}`}
                          className={`absolute left-1 right-1 rounded-md border-l-2 px-1.5 overflow-hidden cursor-default ${s.block} ${
                            tiny ? "py-0 flex items-center" : "py-1"
                          }`}
                          style={{ top: top + 1, height }}
                        >
                          <div className={`font-semibold truncate leading-tight ${tiny ? "text-[9px]" : "text-[10px]"}`}>
                            {b.name}
                          </div>
                          {!tiny && (
                            <div className="text-[9px] opacity-75 truncate leading-tight">
                              {fmtTime(b.start)} · {s.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500 sm:hidden">
          Swipe horizontally to see the full week →
        </div>
      </div>

      {/* upcoming bookings */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold">Upcoming bookings</h2>
          <span className="text-xs text-slate-500">{upcoming.length} scheduled</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-400">No upcoming bookings.</p>
            <p className="text-xs text-slate-600 mt-1">New customer bookings appear here instantly.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/80 max-h-[420px] overflow-y-auto">
            {upcoming.map((b) => {
              const s = SERVICE_MAP[b.serviceId];
              const d = days.find((x) => x.iso === b.date);
              const confirming = confirmingId === b.id;
              return (
                <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-[88px] shrink-0 text-center rounded-lg border border-slate-800 bg-slate-950/60 py-1.5">
                    <div className="text-[10px] text-slate-500">{d ? (d.isToday ? "Today" : d.short) : b.date}</div>
                    <div className="text-xs font-semibold font-mono text-slate-200">{fmtTime(b.start)}</div>
                  </div>
                  <span className={`h-2 w-2 rounded-full shrink-0 ${s?.dot ?? "bg-slate-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {b.name}
                      <span className="ml-2 font-mono text-[10px] text-slate-500">{b.ref}</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {s?.name} · {s?.mins} min · {b.phone}
                    </div>
                  </div>
                  <div className="hidden sm:block text-sm font-semibold text-slate-300">
                    {s ? fmtMoney(s.price) : ""}
                  </div>
                  {confirming ? (
                    <div className="flex items-center gap-1.5 bk-fade-up">
                      <button
                        onClick={() => {
                          onCancel(b.id);
                          setConfirmingId(null);
                        }}
                        className="rounded-md bg-rose-500/90 hover:bg-rose-500 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors"
                      >
                        Yes, cancel
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="rounded-md border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-slate-500 transition-colors"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(b.id)}
                      className="rounded-md border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-400 hover:border-rose-500/60 hover:text-rose-300 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="px-4 py-2.5 border-t border-slate-800 text-[11px] text-slate-500">
          Cancelling frees the slot instantly — switch to the customer view to re-book it.
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1.5 text-xl font-bold ${accent ? "text-indigo-300" : "text-slate-100"}`}>
        {value}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}
