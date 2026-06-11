// ---------------------------------------------------------------------------
// Crusty Crust Pizza — WhatsApp order bot engine
// Pure, well-typed state machine. No React, no side effects: the UI feeds it
// user input + current state, it returns replies + the next state.
// ---------------------------------------------------------------------------

export type Category = "Pizzas" | "Sides" | "Drinks";

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: Category;
}

export interface CartLine {
  itemId: number;
  qty: number;
}

export type OrderType = "delivery" | "pickup";

export type Stage = "idle" | "ordering" | "choosing_type" | "awaiting_address";

export interface Session {
  stage: Stage;
  cart: CartLine[];
}

export interface Order {
  id: string;
  number: number; // e.g. 1042 → "CC-1042"
  lines: CartLine[];
  total: number;
  type: OrderType;
  address?: string;
  placedAt: number; // epoch ms
  etaMinutes: number;
}

export type OrderStatus =
  | "received"
  | "preparing"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "cancelled";

export interface BotResult {
  session: Session;
  replies: string[];
  newOrder?: Order;
  cancelOrderId?: string;
}

// --- Menu -------------------------------------------------------------------

export const MENU: MenuItem[] = [
  { id: 1, name: "Margherita", price: 899, category: "Pizzas" },
  { id: 2, name: "Chicken Tikka", price: 1199, category: "Pizzas" },
  { id: 3, name: "Chicken Fajita", price: 1199, category: "Pizzas" },
  { id: 4, name: "Pepperoni", price: 1399, category: "Pizzas" },
  { id: 5, name: "Crusty BBQ Special", price: 1499, category: "Pizzas" },
  { id: 6, name: "Garlic Bread", price: 349, category: "Sides" },
  { id: 7, name: "Chicken Wings (6 pcs)", price: 499, category: "Sides" },
  { id: 8, name: "Loaded Fries", price: 399, category: "Sides" },
  { id: 9, name: "Soft Drink (1L)", price: 199, category: "Drinks" },
  { id: 10, name: "Mineral Water", price: 99, category: "Drinks" },
];

export function findItem(id: number): MenuItem | undefined {
  return MENU.find((m) => m.id === id);
}

export function formatRs(n: number): string {
  return "Rs " + n.toLocaleString("en-US");
}

export function orderNo(order: Order): string {
  return `CC-${order.number}`;
}

// --- Status progression (based on elapsed time since placement) -------------

const RECEIVED_WINDOW_MS = 45_000; // 0–45s   → received
const PREPARING_WINDOW_MS = 150_000; // 45s–2.5m → preparing, then out/ready

export interface PersistedOrder extends Order {
  cancelled?: boolean;
}

export function orderStatus(order: PersistedOrder, now: number): OrderStatus {
  if (order.cancelled) return "cancelled";
  const elapsed = now - order.placedAt;
  if (elapsed < RECEIVED_WINDOW_MS) return "received";
  if (elapsed < PREPARING_WINDOW_MS) return "preparing";
  return order.type === "delivery" ? "out_for_delivery" : "ready_for_pickup";
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Received",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  ready_for_pickup: "Ready for pickup",
  cancelled: "Cancelled",
};

// --- Cart helpers ------------------------------------------------------------

export function addToCart(cart: CartLine[], itemId: number, qty: number): CartLine[] {
  const existing = cart.find((l) => l.itemId === itemId);
  if (existing) {
    return cart.map((l) =>
      l.itemId === itemId ? { ...l, qty: l.qty + qty } : l
    );
  }
  return [...cart, { itemId, qty }];
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => {
    const item = findItem(l.itemId);
    return sum + (item ? item.price * l.qty : 0);
  }, 0);
}

export function cartLinesText(lines: CartLine[]): string {
  return lines
    .map((l) => {
      const item = findItem(l.itemId);
      if (!item) return "";
      return `${l.qty}x ${item.name} — ${formatRs(item.price * l.qty)}`;
    })
    .filter(Boolean)
    .join("\n");
}

// --- Canned texts -------------------------------------------------------------

export const GREETING =
  "Salam! 👋 Welcome to *Crusty Crust Pizza* 🍕\n" +
  "I'm the automated order assistant — I take orders 24/7, even at 3 AM.\n\n" +
  "Type *menu* to see today's menu, or *status* to track an order.";

function menuText(): string {
  const groups: { label: string; emoji: string; cat: Category }[] = [
    { label: "PIZZAS", emoji: "🍕", cat: "Pizzas" },
    { label: "SIDES", emoji: "🍟", cat: "Sides" },
    { label: "DRINKS", emoji: "🥤", cat: "Drinks" },
  ];
  const body = groups
    .map(
      (g) =>
        `${g.emoji} *${g.label}*\n` +
        MENU.filter((m) => m.category === g.cat)
          .map((m) => `${m.id}. ${m.name} — ${formatRs(m.price)}`)
          .join("\n")
    )
    .join("\n\n");
  return (
    `Here's today's menu 📋\n\n${body}\n\n` +
    `Reply with an item number to add it (e.g. *2*),\n` +
    `or *2x 3* for two of item 3.\n` +
    `Type *done* when you're finished.`
  );
}

const HELP_TEXT =
  "Sorry, I didn't quite catch that 🤔\nHere's what I understand:\n\n" +
  "• *menu* — see the menu\n" +
  "• *3* — add item 3 to your order\n" +
  "• *2x 3* — add two of item 3\n" +
  "• *done* — checkout\n" +
  "• *status* — track your order\n" +
  "• *cancel* — cancel order";

// --- Engine -------------------------------------------------------------------

export interface ProcessArgs {
  input: string;
  session: Session;
  orders: PersistedOrder[];
  nextOrderNumber: number;
  now: number;
}

const FRESH: Session = { stage: "idle", cart: [] };

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function confirmationText(order: Order): string {
  const where =
    order.type === "delivery"
      ? `🛵 Delivering to: ${order.address}`
      : "🛍️ Pickup from: Crusty Crust, Shop 14, Gulberg Main Blvd";
  return (
    `Order confirmed! 🎉\n\n` +
    `🧾 *Order #CC-${order.number}*\n` +
    `${cartLinesText(order.lines)}\n` +
    `———\n` +
    `*Total: ${formatRs(order.total)}*\n\n` +
    `${where}\n` +
    `⏱️ ETA: ~${order.etaMinutes} minutes\n\n` +
    `Type *status* anytime to track it. Shukriya! 🙏`
  );
}

function statusReply(orders: PersistedOrder[], now: number): string {
  const latest = [...orders].reverse().find((o) => !o.cancelled);
  if (!latest) {
    return "You don't have an active order yet 🙂\nType *menu* to place one!";
  }
  const status = orderStatus(latest, now);
  const elapsedMin = Math.floor((now - latest.placedAt) / 60_000);
  const remaining = Math.max(latest.etaMinutes - elapsedMin, 5);
  const no = `*Order #${orderNo(latest)}*`;
  switch (status) {
    case "received":
      return `✅ ${no} — received!\nThe kitchen has your ticket and will start any second.`;
    case "preparing":
      return `👨‍🍳 ${no} — being prepared.\nYour pizza is in the oven right now. ~${remaining} min to go.`;
    case "out_for_delivery":
      return `🛵 ${no} — out for delivery!\nThe rider just left with your order. Should reach you in ~${Math.min(remaining, 15)} minutes.`;
    case "ready_for_pickup":
      return `🛍️ ${no} — ready for pickup!\nIt's hot and waiting at the counter. See you soon!`;
    default:
      return `${no} was cancelled.`;
  }
}

/** Parse "3", "2x 3", "2 x 3", "2x3" → { qty, itemId } */
function parseItemInput(text: string): { qty: number; itemId: number } | null {
  const qtyMatch = text.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
  if (qtyMatch) {
    return { qty: parseInt(qtyMatch[1], 10), itemId: parseInt(qtyMatch[2], 10) };
  }
  const plain = text.match(/^(\d+)$/);
  if (plain) return { qty: 1, itemId: parseInt(plain[1], 10) };
  return null;
}

export function processInput(args: ProcessArgs): BotResult {
  const { session, orders, nextOrderNumber, now } = args;
  const text = args.input.trim().toLowerCase();

  // -- Global commands (work in any stage) -----------------------------------
  if (/^(hi|hello|hey|salam|assalam|aoa)\b/.test(text)) {
    return { session, replies: [GREETING] };
  }

  if (text === "menu") {
    return {
      session: { ...session, stage: "ordering" },
      replies: [menuText()],
    };
  }

  if (text === "status") {
    return { session, replies: [statusReply(orders, now)] };
  }

  if (text === "cancel") {
    if (session.cart.length > 0 || session.stage !== "idle") {
      return {
        session: FRESH,
        replies: [
          "No problem — I've cleared that order ✅\nType *menu* whenever you're hungry again 🍕",
        ],
      };
    }
    const latest = [...orders].reverse().find((o) => !o.cancelled);
    if (latest && orderStatus(latest, now) === "received") {
      return {
        session,
        replies: [`Done — *Order #${orderNo(latest)}* has been cancelled ✅\nNo charges. Hope to see you again soon!`],
        cancelOrderId: latest.id,
      };
    }
    if (latest) {
      return {
        session,
        replies: [
          `Sorry, *Order #${orderNo(latest)}* is already being prepared 👨‍🍳 — it's too late to cancel here.\nCall us at 0301-CRUSTY1 and we'll sort it out.`,
        ],
      };
    }
    return {
      session,
      replies: ["There's nothing to cancel right now 🙂\nType *menu* to start an order."],
    };
  }

  // -- Stage: choosing delivery or pickup -------------------------------------
  if (session.stage === "choosing_type") {
    const isDelivery = text === "delivery" || text === "1";
    const isPickup = text === "pickup" || text === "2";
    if (isDelivery) {
      return {
        session: { ...session, stage: "awaiting_address" },
        replies: ["Great — delivery it is 🛵\nWhat's the delivery address? (house, street, area)"],
      };
    }
    if (isPickup) {
      const order: Order = {
        id: makeId(),
        number: nextOrderNumber,
        lines: session.cart,
        total: cartTotal(session.cart),
        type: "pickup",
        placedAt: now,
        etaMinutes: 20,
      };
      return { session: FRESH, replies: [confirmationText(order)], newOrder: order };
    }
    return {
      session,
      replies: ['Just reply *delivery* (or *1*) 🛵 or *pickup* (or *2*) 🛍️'],
    };
  }

  // -- Stage: waiting for the delivery address --------------------------------
  if (session.stage === "awaiting_address") {
    if (text === "done") {
      return { session, replies: ["Almost there! I just need the delivery address 🙂"] };
    }
    if (args.input.trim().length < 5) {
      return {
        session,
        replies: ["That address looks a bit short 🤏 — could you send the full one? (house, street, area)"],
      };
    }
    const order: Order = {
      id: makeId(),
      number: nextOrderNumber,
      lines: session.cart,
      total: cartTotal(session.cart),
      type: "delivery",
      address: args.input.trim(),
      placedAt: now,
      etaMinutes: 40,
    };
    return { session: FRESH, replies: [confirmationText(order)], newOrder: order };
  }

  // -- Checkout ----------------------------------------------------------------
  if (text === "done") {
    if (session.cart.length === 0) {
      return {
        session,
        replies: ["Your order is empty so far 🙂\nType *menu* to see what we've got!"],
      };
    }
    return {
      session: { ...session, stage: "choosing_type" },
      replies: [
        `Here's your order 🧾\n\n${cartLinesText(session.cart)}\n———\n*Total: ${formatRs(
          cartTotal(session.cart)
        )}*\n\nIs this *delivery* (1) 🛵 or *pickup* (2) 🛍️?`,
      ],
    };
  }

  // -- Adding items (works from idle or ordering) ------------------------------
  const parsed = parseItemInput(text);
  if (parsed) {
    const item = findItem(parsed.itemId);
    if (!item) {
      return {
        session,
        replies: [`Hmm, there's no item *${parsed.itemId}* on the menu 🤔\nType *menu* to see the list again.`],
      };
    }
    const qty = Math.min(Math.max(parsed.qty, 1), 20);
    const cart = addToCart(session.cart, item.id, qty);
    return {
      session: { stage: "ordering", cart },
      replies: [
        `Added *${qty}x ${item.name}* ✅\n\nYour order so far:\n${cartLinesText(cart)}\n———\n*Total: ${formatRs(
          cartTotal(cart)
        )}*\n\nAdd more, or type *done* to checkout.`,
      ],
    };
  }

  // -- Fallback -----------------------------------------------------------------
  return { session, replies: [HELP_TEXT] };
}
