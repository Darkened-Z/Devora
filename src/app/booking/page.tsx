"use client";

import { useEffect, useMemo, useState } from "react";
import DemoShell from "@/components/DemoShell";
import CustomerView from "./CustomerView";
import OwnerView from "./OwnerView";
import type { Booking } from "./lib";
import { loadBookings, nextDays, saveBookings } from "./lib";

type View = "customer" | "owner";

export default function BookingDemo() {
  const days = useMemo(() => nextDays(7), []);
  const [view, setView] = useState<View>("customer");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage on the client only (seeds the week on first visit).
  useEffect(() => {
    setBookings(loadBookings(days));
    setReady(true);
  }, [days]);

  const handleBook = (b: Booking) => {
    setBookings((prev) => {
      const next = [...prev, b];
      saveBookings(next);
      return next;
    });
  };

  const handleCancel = (id: string) => {
    setBookings((prev) => {
      const next = prev.filter((b) => b.id !== id);
      saveBookings(next);
      return next;
    });
  };

  return (
    <DemoShell
      title="Salon Booking System"
      tagline="Real-time slots · double-booking is impossible"
    >
      <style>{`
        @keyframes bkFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes bkPop { 0% { opacity: 0; transform: scale(.92); } 70% { transform: scale(1.02); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes bkShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes bkDraw { to { stroke-dashoffset: 0; } }
        .bk-fade-up { animation: bkFadeUp .35s ease both; }
        .bk-pop { animation: bkPop .4s cubic-bezier(.22, 1.1, .36, 1) both; }
        .bk-shake { animation: bkShake .4s ease; }
        .bk-draw path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: bkDraw .55s ease .15s forwards; }
      `}</style>

      {/* business header + view toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white">
            L
          </div>
          <div>
            <div className="font-semibold leading-tight">Luxe Studio</div>
            <div className="text-xs text-slate-500">
              Clifton, Karachi · Mon–Sat, 10 AM – 8 PM · Closed Sunday
            </div>
          </div>
        </div>
        <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-sm">
          <button
            onClick={() => setView("customer")}
            className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
              view === "customer"
                ? "bg-indigo-500 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Customer view
          </button>
          <button
            onClick={() => setView("owner")}
            className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
              view === "owner"
                ? "bg-indigo-500 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Owner view
          </button>
        </div>
      </div>

      {!ready ? (
        /* lightweight skeleton while localStorage hydrates — avoids SSR date mismatch */
        <div className="space-y-4 animate-pulse" aria-hidden>
          <div className="h-8 w-64 mx-auto rounded-lg bg-slate-900" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl border border-slate-800 bg-slate-900" />
            ))}
          </div>
        </div>
      ) : view === "customer" ? (
        <CustomerView
          bookings={bookings}
          days={days}
          onBook={handleBook}
          onViewOwner={() => setView("owner")}
        />
      ) : (
        <OwnerView bookings={bookings} days={days} onCancel={handleCancel} />
      )}
    </DemoShell>
  );
}
