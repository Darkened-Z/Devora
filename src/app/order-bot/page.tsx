"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DemoShell from "@/components/DemoShell";
import {
  GREETING,
  OrderStatus,
  PersistedOrder,
  Session,
  STATUS_LABEL,
  findItem,
  formatRs,
  orderNo,
  orderStatus,
  processInput,
} from "./bot";

// ---------------------------------------------------------------------------
// Types & storage
// ---------------------------------------------------------------------------

type Tick = "sent" | "read";

interface ChatMsg {
  id: string;
  from: "bot" | "user";
  text: string;
  time: string; // "2:47 AM"
  tick?: Tick;
}

const LS_CHAT = "devora-bot-chat";
const LS_ORDERS = "devora-bot-orders";
const LS_SESSION = "devora-bot-session";

const FRESH_SESSION: Session = { stage: "idle", cart: [] };
const FIRST_ORDER_NUMBER = 1042;

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / blocked — demo keeps working in memory */
  }
}

function clockTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function msgId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

/** Render WhatsApp-style *bold* markers inside message text. */
function FormattedText({ text }: { text: string }) {
  return (
    <>
      {text.split("*").map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function DoubleTick({ read }: { read: boolean }) {
  return (
    <svg
      viewBox="0 0 16 11"
      className={`inline-block w-4 h-3 ml-0.5 ${read ? "text-[#53bdeb]" : "text-[#8696a0]"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={read ? "read" : "sent"}
    >
      <path d="M1 5.5 4 8.5 9.5 1.5" />
      <path d="M6.5 5.5 9.5 8.5 15 1.5" />
    </svg>
  );
}

function BubbleTail({ side }: { side: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 8 13"
      className={`absolute top-0 w-2 h-[13px] ${
        side === "right" ? "-right-[7px] text-[#005c4b]" : "-left-[7px] text-[#202c33] -scale-x-100"
      }`}
      aria-hidden
    >
      <path fill="currentColor" d="M0 0h8L2.8 7.8C1.4 9.8 0 9.2 0 6.7V0Z" />
    </svg>
  );
}

const STATUS_BADGE: Record<OrderStatus, string> = {
  received: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  preparing: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  out_for_delivery: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  ready_for_pickup: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const STATUS_STEP: Record<OrderStatus, number> = {
  received: 1,
  preparing: 2,
  out_for_delivery: 3,
  ready_for_pickup: 3,
  cancelled: 0,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrderBotDemo() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [orders, setOrders] = useState<PersistedOrder[]>([]);
  const [session, setSession] = useState<Session>(FRESH_SESSION);
  const [orderCounter, setOrderCounter] = useState(FIRST_ORDER_NUMBER);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [, setClock] = useState(0); // periodic re-render so status badges advance

  const chatRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);

  // -- Bot reply queue: typing dots for 600–1200ms before each reply ----------
  const queueReplies = useCallback((replies: string[]) => {
    let delay = 350;
    for (const text of replies) {
      timersRef.current.push(
        window.setTimeout(() => {
          setTyping(true);
          // the bot "read" the user's messages
          setMessages((m) =>
            m.map((msg) =>
              msg.from === "user" && msg.tick === "sent" ? { ...msg, tick: "read" as Tick } : msg
            )
          );
        }, delay)
      );
      delay += 600 + Math.random() * 600;
      timersRef.current.push(
        window.setTimeout(() => {
          setTyping(false);
          setMessages((m) => [
            ...m,
            { id: msgId(), from: "bot", text, time: clockTime() },
          ]);
        }, delay)
      );
      delay += 300;
    }
  }, []);

  // -- Hydrate from localStorage (SSR-safe: runs only in the browser) ---------
  useEffect(() => {
    const savedChat = loadJSON<ChatMsg[]>(LS_CHAT, []);
    const savedOrders = loadJSON<PersistedOrder[]>(LS_ORDERS, []);
    const savedSession = loadJSON<{ session: Session; counter: number }>(LS_SESSION, {
      session: FRESH_SESSION,
      counter: FIRST_ORDER_NUMBER,
    });
    setOrders(savedOrders);
    setSession(savedSession.session);
    setOrderCounter(savedSession.counter);
    setHydrated(true);
    if (savedChat.length > 0) {
      setMessages(savedChat);
    } else {
      queueReplies([GREETING]);
    }
    const timers = timersRef.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [queueReplies]);

  // -- Persist ------------------------------------------------------------------
  useEffect(() => {
    if (hydrated) saveJSON(LS_CHAT, messages);
  }, [messages, hydrated]);
  useEffect(() => {
    if (hydrated) saveJSON(LS_ORDERS, orders);
  }, [orders, hydrated]);
  useEffect(() => {
    if (hydrated) saveJSON(LS_SESSION, { session, counter: orderCounter });
  }, [session, orderCounter, hydrated]);

  // -- Auto-scroll + status clock -------------------------------------------------
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    const t = window.setInterval(() => setClock((c) => c + 1), 5000);
    return () => window.clearInterval(t);
  }, []);

  // -- Sending ---------------------------------------------------------------------
  function send(raw: string) {
    const text = raw.trim();
    if (!text || typing) return;
    setMessages((m) => [
      ...m,
      { id: msgId(), from: "user", text, time: clockTime(), tick: "sent" },
    ]);
    setInput("");

    const result = processInput({
      input: text,
      session,
      orders,
      nextOrderNumber: orderCounter,
      now: Date.now(),
    });

    setSession(result.session);
    if (result.newOrder) {
      setOrders((o) => [...o, result.newOrder as PersistedOrder]);
      setOrderCounter((c) => c + 1);
    }
    if (result.cancelOrderId) {
      setOrders((o) =>
        o.map((ord) => (ord.id === result.cancelOrderId ? { ...ord, cancelled: true } : ord))
      );
    }
    queueReplies(result.replies);
  }

  function resetDemo() {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_CHAT);
      window.localStorage.removeItem(LS_ORDERS);
      window.localStorage.removeItem(LS_SESSION);
    }
    setMessages([]);
    setOrders([]);
    setSession(FRESH_SESSION);
    setOrderCounter(FIRST_ORDER_NUMBER);
    setInput("");
    setTyping(false);
    queueReplies([GREETING]);
  }

  // -- Owner stats --------------------------------------------------------------------
  const now = Date.now();
  const activeOrders = orders.filter((o) => !o.cancelled);
  const revenue = activeOrders.reduce((s, o) => s + o.total, 0);
  const avgOrder = activeOrders.length ? Math.round(revenue / activeOrders.length) : 0;

  return (
    <DemoShell
      title="WhatsApp Order Bot"
      tagline="A bot that takes customer orders 24/7 — try placing one."
    >
      <style>{`
        @keyframes msg-in {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dot-pulse {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
          30%           { transform: translateY(-3px); opacity: 1; }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start justify-center">
        {/* ================= LEFT: phone ================= */}
        <div className="mx-auto w-full max-w-[400px]">
          <div className="rounded-[2.6rem] border border-slate-700/80 bg-slate-900 p-2.5 shadow-2xl shadow-black/60">
            {/* camera notch */}
            <div className="relative">
              <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900 border border-slate-800" />
            </div>
            <div className="overflow-hidden rounded-[2.1rem] bg-[#0b141a]">
              {/* WhatsApp header */}
              <div className="flex items-center gap-2.5 bg-[#202c33] px-3 pb-2.5 pt-7">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#aebac1]" fill="currentColor" aria-hidden>
                  <path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z" />
                </svg>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-red-500 text-lg shadow">
                  🍕
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="flex items-center gap-1 truncate text-[15px] font-medium text-[#e9edef]">
                    Crusty Crust Pizza
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#00a884]" fill="currentColor" aria-label="verified business">
                      <path d="M12 2 9.6 4.2l-3.2-.3-.3 3.2L3 9.6 4.7 12 3 14.4l3.1 2.5.3 3.2 3.2-.3L12 22l2.4-2.2 3.2.3.3-3.2 3.1-2.5L19.3 12 21 9.6l-3.1-2.5-.3-3.2-3.2.3L12 2zm-1.2 13.6-3-3 1.2-1.2 1.8 1.8 4.2-4.2 1.2 1.2-5.4 5.4z" />
                    </svg>
                  </div>
                  <div className="text-[12px] text-[#8696a0]">
                    {typing ? "typing…" : "online"}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[#aebac1]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                    <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
                  </svg>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" />
                  </svg>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                    <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                  </svg>
                </div>
              </div>

              {/* Chat scroll area */}
              <div
                ref={chatRef}
                className="h-[420px] space-y-1 overflow-y-auto px-3 py-3 sm:h-[460px]"
                style={{
                  backgroundColor: "#0b141a",
                  backgroundImage:
                    "radial-gradient(rgba(255,255,255,0.028) 1px, transparent 1.4px)",
                  backgroundSize: "20px 20px",
                }}
              >
                {/* encryption + date chips */}
                <div className="flex justify-center pb-1">
                  <span className="max-w-[85%] rounded-lg bg-[#182229] px-3 py-1.5 text-center text-[11px] leading-snug text-[#ffd279]">
                    🔒 Messages are end-to-end encrypted. This business uses a bot to
                    respond automatically.
                  </span>
                </div>
                <div className="flex justify-center pb-2">
                  <span className="rounded-lg bg-[#182229] px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-[#8696a0]">
                    Today
                  </span>
                </div>

                {messages.map((m, i) => {
                  const isUser = m.from === "user";
                  const firstOfGroup = i === 0 || messages[i - 1].from !== m.from;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"} ${
                        firstOfGroup ? "pt-1.5" : ""
                      }`}
                      style={{ animation: "msg-in 0.22s ease-out" }}
                    >
                      <div
                        className={`relative max-w-[82%] px-2.5 py-1.5 text-[13.5px] leading-[1.45] text-[#e9edef] shadow-sm ${
                          isUser
                            ? `bg-[#005c4b] ${firstOfGroup ? "rounded-lg rounded-tr-none" : "rounded-lg"}`
                            : `bg-[#202c33] ${firstOfGroup ? "rounded-lg rounded-tl-none" : "rounded-lg"}`
                        }`}
                      >
                        {firstOfGroup && <BubbleTail side={isUser ? "right" : "left"} />}
                        <span className="whitespace-pre-line break-words">
                          <FormattedText text={m.text} />
                        </span>
                        <span className="float-right ml-2 mt-2 flex items-center text-[10px] leading-none text-[#8696a0]">
                          {m.time}
                          {isUser && <DoubleTick read={m.tick === "read"} />}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {typing && (
                  <div className="flex justify-start pt-1.5" style={{ animation: "msg-in 0.22s ease-out" }}>
                    <div className="relative rounded-lg rounded-tl-none bg-[#202c33] px-4 py-3">
                      <BubbleTail side="left" />
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((d) => (
                          <span
                            key={d}
                            className="h-1.5 w-1.5 rounded-full bg-[#8696a0]"
                            style={{ animation: `dot-pulse 1.1s ${d * 0.18}s infinite ease-in-out` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick replies */}
              <div className="flex gap-1.5 overflow-x-auto bg-[#0b141a] px-3 pb-1.5 pt-1 [scrollbar-width:none]">
                {["menu", "1", "2", "done", "status"].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => send(chip)}
                    className="shrink-0 rounded-full border border-[#2a3942] bg-[#202c33] px-3.5 py-1 text-[12px] font-medium text-[#00a884] transition-colors hover:bg-[#2a3942] active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input row */}
              <div className="flex items-center gap-2 bg-[#0b141a] px-2.5 pb-3 pt-1">
                <div className="flex flex-1 items-center gap-2 rounded-full bg-[#2a3942] px-4 py-2">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#8696a0]" fill="currentColor" aria-hidden>
                    <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.5 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-7.4 2.5h7.8a4 4 0 0 1-7.8 0z" />
                  </svg>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send(input)}
                    placeholder="Message"
                    aria-label="Type a message"
                    className="w-full bg-transparent text-[14px] text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => send(input)}
                  aria-label="Send message"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-lg transition-transform hover:bg-[#06b797] active:scale-95"
                >
                  <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden>
                    <path d="M3.4 20.4 21.8 12 3.4 3.6 3.4 10.2 16.2 12 3.4 13.8z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            This is the exact flow the bot runs on the WhatsApp Business API — connected
            to a real number, it takes orders while the owner sleeps.
          </p>
        </div>

        {/* ================= RIGHT: owner dashboard ================= */}
        <div className="w-full">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                Behind the scenes — what the owner sees
              </h2>
              <p className="text-xs text-slate-500">
                Every order placed in the chat lands here in real time.
              </p>
            </div>
            <button
              onClick={resetDemo}
              className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-indigo-500 hover:text-indigo-400"
            >
              Reset demo
            </button>
          </div>

          {/* Stats */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              { label: "Orders today", value: String(activeOrders.length) },
              { label: "Revenue", value: formatRs(revenue) },
              { label: "Avg order", value: formatRs(avgOrder) },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
              >
                <div className="truncate text-lg font-semibold text-slate-100">{s.value}</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Order cards */}
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 px-6 py-12 text-center">
              <div className="mb-2 text-2xl">🧾</div>
              <p className="text-sm text-slate-400">No orders yet.</p>
              <p className="mt-1 text-xs text-slate-500">
                Place one in the chat — try <span className="text-indigo-400">menu</span> →{" "}
                <span className="text-indigo-400">2</span> →{" "}
                <span className="text-indigo-400">done</span>.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...orders].reverse().map((order) => {
                const status = orderStatus(order, now);
                const step = STATUS_STEP[status];
                return (
                  <div
                    key={order.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                    style={{ animation: "card-in 0.3s ease-out" }}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-100">
                        #{orderNo(order)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(order.placedAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                      <span className="ml-auto flex items-center gap-2">
                        <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-[11px] text-slate-300">
                          {order.type === "delivery" ? "🛵 Delivery" : "🛍️ Pickup"}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </span>
                    </div>

                    {/* progress dots */}
                    {status !== "cancelled" && (
                      <div className="mb-3 flex items-center gap-1.5">
                        {[1, 2, 3].map((s) => (
                          <span
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                              s <= step ? "bg-emerald-500/70" : "bg-slate-800"
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    <ul className="mb-2 space-y-0.5 text-[13px] text-slate-300">
                      {order.lines.map((l) => {
                        const item = findItem(l.itemId);
                        return (
                          <li key={l.itemId} className="flex justify-between gap-3">
                            <span>
                              {l.qty}x {item?.name ?? `Item ${l.itemId}`}
                            </span>
                            <span className="text-slate-500">
                              {item ? formatRs(item.price * l.qty) : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                      {order.address ? (
                        <span className="mr-3 truncate text-[11px] text-slate-500">
                          📍 {order.address}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Counter pickup</span>
                      )}
                      <span className="text-sm font-semibold text-slate-100">
                        {formatRs(order.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DemoShell>
  );
}

