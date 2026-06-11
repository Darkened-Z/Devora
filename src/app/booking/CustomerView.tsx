"use client";

import { useMemo, useState } from "react";
import type { Booking, DayInfo, Service, ServiceId } from "./lib";
import {
  SERVICES,
  SERVICE_MAP,
  findConflict,
  fmtMoney,
  fmtTime,
  nextRef,
  nowMinutes,
  slotsForService,
} from "./lib";

const STEPS = ["Service", "Date & time", "Your details"];

export function ServiceIcon({ id, className = "h-6 w-6" }: { id: ServiceId; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (id) {
    case "haircut": // scissors
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
        </svg>
      );
    case "beard": // clipper
      return (
        <svg {...common}>
          <rect x="9" y="9" width="6" height="12" rx="2" />
          <path d="M9 9V7h6v2M10 4.5V7M12 3.5V7M14 4.5V7" />
        </svg>
      );
    case "facial": // sparkles
      return (
        <svg {...common}>
          <path d="M9.94 15.5a2 2 0 0 0-1.44-1.44L2.37 12.5a.5.5 0 0 1 0-.96l6.13-1.58a2 2 0 0 0 1.44-1.44l1.58-6.13a.5.5 0 0 1 .96 0l1.58 6.13a2 2 0 0 0 1.44 1.44l6.13 1.58a.5.5 0 0 1 0 .96l-6.13 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z" />
          <path d="M19 3.5v3M20.5 5h-3" />
        </svg>
      );
    case "color": // droplet
      return (
        <svg {...common}>
          <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
        </svg>
      );
    case "massage": // heart
      return (
        <svg {...common}>
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      );
  }
}

export default function CustomerView({
  bookings,
  days,
  onBook,
  onViewOwner,
}: {
  bookings: Booking[];
  days: DayInfo[];
  onBook: (b: Booking) => void;
  onViewOwner: () => void;
}) {
  const [step, setStep] = useState(1);
  const [service, setService] = useState<Service | null>(null);
  const [dateIso, setDateIso] = useState<string>(
    () => days.find((d) => !d.closed)?.iso ?? days[0].iso
  );
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [shakeSlot, setShakeSlot] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const nowMins = nowMinutes();
  const day = days.find((d) => d.iso === dateIso) ?? days[0];
  const slots = useMemo(
    () => (service ? slotsForService(service.mins) : []),
    [service]
  );
  const countByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of bookings) m[b.date] = (m[b.date] ?? 0) + 1;
    return m;
  }, [bookings]);

  const pickService = (s: Service) => {
    setService(s);
    setSlot(null);
    setSlotError(null);
    setStep(2);
  };

  const pickDay = (d: DayInfo) => {
    if (d.closed) return;
    setDateIso(d.iso);
    setSlot(null);
    setSlotError(null);
  };

  const tryPickSlot = (start: number, taken: boolean, past: boolean) => {
    if (past) return;
    if (taken) {
      // The key demo moment: the system refuses the double-booking.
      setSlotError(
        `${fmtTime(start)} on ${day.weekday} is already booked — the system blocks double-bookings automatically. Pick a free slot instead.`
      );
      setShakeSlot(start);
      window.setTimeout(() => setShakeSlot(null), 450);
      return;
    }
    setSlotError(null);
    setSlot(start);
  };

  const confirm = () => {
    if (!service || slot === null) return;
    if (name.trim().length < 2) {
      setFormError("Please enter your full name.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 7) {
      setFormError("Please enter a valid phone number.");
      return;
    }
    // Final server-style guard — even if state changed since the slot was picked.
    if (findConflict(bookings, dateIso, slot, service.mins)) {
      setFormError(null);
      setSlot(null);
      setStep(2);
      setSlotError("Sorry — that slot was just taken. Please pick another time.");
      return;
    }
    const booking: Booking = {
      id: `bk-${Date.now()}`,
      ref: nextRef(),
      serviceId: service.id,
      date: dateIso,
      start: slot,
      name: name.trim(),
      phone: phone.trim(),
      createdAt: Date.now(),
    };
    onBook(booking);
    setConfirmed(booking);
    setFormError(null);
  };

  const reset = () => {
    setConfirmed(null);
    setService(null);
    setSlot(null);
    setName("");
    setPhone("");
    setStep(1);
  };

  /* ---------------- success screen ---------------- */
  if (confirmed) {
    const s = SERVICE_MAP[confirmed.serviceId];
    const d = days.find((x) => x.iso === confirmed.date);
    return (
      <div className="max-w-md mx-auto bk-pop">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-emerald-400 bk-draw">
              <path d="M4 12.5 9.5 18 20 6.5" pathLength={1} />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Appointment confirmed</h2>
          <p className="mt-1 text-sm text-slate-400">
            Your booking reference is{" "}
            <span className="font-mono font-semibold text-indigo-400">{confirmed.ref}</span>
          </p>
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/60 divide-y divide-slate-800 text-left text-sm">
            <Row label="Service" value={`${s.name} · ${s.mins} min`} />
            <Row label="Date" value={d ? `${d.weekday}, ${d.dayNum} ${d.month}` : confirmed.date} />
            <Row label="Time" value={`${fmtTime(confirmed.start)} – ${fmtTime(confirmed.start + s.mins)}`} />
            <Row label="Booked for" value={confirmed.name} />
            <Row label="Total" value={fmtMoney(s.price)} strong />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            In production an SMS/WhatsApp confirmation and a reminder before the visit are sent automatically.
          </p>
          <div className="mt-6 grid gap-2">
            <button onClick={reset} className="w-full rounded-lg bg-indigo-500 hover:bg-indigo-400 py-2.5 text-sm font-semibold transition-colors">
              Book another appointment
            </button>
            <button onClick={onViewOwner} className="w-full rounded-lg border border-slate-700 hover:border-indigo-500/60 py-2.5 text-sm text-slate-300 transition-colors">
              See it on the owner&apos;s calendar →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- wizard ---------------- */
  return (
    <div className="max-w-3xl mx-auto">
      {/* step indicator */}
      <ol className="flex items-center justify-center gap-0 mb-8">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <li key={label} className="flex items-center">
              {i > 0 && (
                <div className={`h-px w-8 sm:w-16 ${step > i ? "bg-indigo-500" : "bg-slate-800"}`} />
              )}
              <button
                onClick={() => done && setStep(n)}
                disabled={!done && !active}
                className={`flex items-center gap-2 px-2 ${done ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${
                    done
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : active
                        ? "border-indigo-400 text-indigo-300 bg-indigo-500/10"
                        : "border-slate-700 text-slate-500"
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    n
                  )}
                </span>
                <span className={`hidden sm:block text-xs font-medium ${active ? "text-slate-100" : "text-slate-500"}`}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* STEP 1 — service */}
      {step === 1 && (
        <div key="step1" className="bk-fade-up">
          <h2 className="text-lg font-semibold">What would you like done?</h2>
          <p className="text-sm text-slate-400 mt-1 mb-5">Pick a service — slot length adjusts to its duration.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => pickService(s)}
                className={`group rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                  service?.id === s.id
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-slate-800 bg-slate-900 hover:border-indigo-500/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="h-10 w-10 rounded-lg bg-slate-800/80 text-indigo-300 flex items-center justify-center group-hover:bg-indigo-500/15 transition-colors">
                    <ServiceIcon id={s.id} className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] rounded-full border border-slate-700 px-2 py-0.5 text-slate-400">
                    {s.mins} min
                  </span>
                </div>
                <div className="mt-3 font-semibold text-sm">{s.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
                <div className="mt-2 text-sm font-semibold text-indigo-300">{fmtMoney(s.price)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2 — date & time */}
      {step === 2 && service && (
        <div key="step2" className="bk-fade-up">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Pick a day &amp; time</h2>
              <p className="text-sm text-slate-400 mt-1">
                {service.name} · {service.mins} min · {fmtMoney(service.price)}
              </p>
            </div>
            <button onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-indigo-300 transition-colors">
              ← Change service
            </button>
          </div>

          {/* day chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {days.map((d) => {
              const selected = d.iso === dateIso;
              const count = countByDay[d.iso] ?? 0;
              return (
                <button
                  key={d.iso}
                  onClick={() => pickDay(d)}
                  disabled={d.closed}
                  className={`relative shrink-0 w-[72px] rounded-xl border px-2 py-2.5 text-center transition-all ${
                    d.closed
                      ? "border-slate-800/60 bg-slate-900/40 text-slate-600 cursor-not-allowed"
                      : selected
                        ? "border-indigo-500 bg-indigo-500/15"
                        : "border-slate-800 bg-slate-900 hover:border-indigo-500/50"
                  }`}
                >
                  <div className={`text-[11px] font-medium ${selected ? "text-indigo-300" : "text-slate-400"}`}>
                    {d.isToday ? "Today" : d.short}
                  </div>
                  <div className="text-base font-bold leading-tight">{d.dayNum}</div>
                  <div className="text-[10px] text-slate-500">{d.closed ? "Closed" : d.month}</div>
                  {!d.closed && count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-slate-700 text-[9px] font-semibold text-slate-200 flex items-center justify-center border border-slate-600">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* slot grid */}
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-slate-300">
                {day.weekday}, {day.dayNum} {day.month} · open 10:00 AM – 8:00 PM
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-700" /> Free</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-500/40" /> Booked</span>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slots.map((start) => {
                const conflict = findConflict(bookings, dateIso, start, service.mins);
                const past = day.isToday && start < nowMins;
                const selected = slot === start;
                return (
                  <button
                    key={start}
                    onClick={() => tryPickSlot(start, !!conflict, past)}
                    aria-disabled={!!conflict || past}
                    title={conflict ? "Already booked" : past ? "Time has passed" : `Book ${fmtTime(start)}`}
                    className={`rounded-lg py-2 text-sm transition-all ${shakeSlot === start ? "bk-shake" : ""} ${
                      past
                        ? "bg-slate-950/40 text-slate-700 cursor-not-allowed"
                        : conflict
                          ? "bg-rose-500/10 border border-rose-500/30 text-rose-300/70 line-through decoration-rose-400/60 cursor-not-allowed"
                          : selected
                            ? "bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/25"
                            : "bg-slate-800/70 border border-slate-700/60 text-slate-200 hover:border-indigo-400/70 hover:bg-slate-800"
                    }`}
                  >
                    {fmtTime(start)}
                  </button>
                );
              })}
            </div>
            {slotError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200 bk-fade-up">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                {slotError}
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={() => slot !== null && setStep(3)}
              disabled={slot === null}
              className="rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-semibold transition-colors"
            >
              Continue {slot !== null && `· ${fmtTime(slot)}`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — details */}
      {step === 3 && service && slot !== null && (
        <div key="step3" className="bk-fade-up grid md:grid-cols-5 gap-5">
          <div className="md:col-span-3">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-semibold">Your details</h2>
              <button onClick={() => setStep(2)} className="text-xs text-slate-400 hover:text-indigo-300 transition-colors">
                ← Change time
              </button>
            </div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hamza Sheikh"
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <label className="block text-xs font-medium text-slate-400 mb-1.5 mt-4">Phone number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03xx xxxxxxx"
              inputMode="tel"
              className="w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {formError && (
              <p className="mt-3 text-sm text-rose-300 bk-fade-up">{formError}</p>
            )}
            <button
              onClick={confirm}
              className="mt-5 w-full rounded-lg bg-indigo-500 hover:bg-indigo-400 py-3 text-sm font-semibold transition-colors"
            >
              Confirm booking · {fmtMoney(service.price)}
            </button>
            <p className="mt-2 text-[11px] text-slate-500 text-center">Pay at the studio — no card needed.</p>
          </div>
          <div className="md:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sticky top-20">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Summary</div>
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-lg bg-indigo-500/15 text-indigo-300 flex items-center justify-center">
                  <ServiceIcon id={service.id} className="h-4.5 w-4.5" />
                </span>
                <div>
                  <div className="text-sm font-semibold">{service.name}</div>
                  <div className="text-xs text-slate-500">{service.mins} minutes</div>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm border-t border-slate-800 pt-3">
                <div className="flex justify-between"><span className="text-slate-400">Date</span><span>{day.weekday}, {day.dayNum} {day.month}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Time</span><span>{fmtTime(slot)} – {fmtTime(slot + service.mins)}</span></div>
                <div className="flex justify-between font-semibold border-t border-slate-800 pt-2"><span className="text-slate-300">Total</span><span className="text-indigo-300">{fmtMoney(service.price)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-slate-400">{label}</span>
      <span className={strong ? "font-semibold text-indigo-300" : "text-slate-200"}>{value}</span>
    </div>
  );
}
