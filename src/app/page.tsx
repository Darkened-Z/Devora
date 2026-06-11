import Link from "next/link";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

type Demo = {
  href: string;
  emoji: string;
  name: string;
  outcome: string;
  bullets: string[];
  accent: string;
  glow: string;
};

const demos: Demo[] = [
  {
    href: "/pos",
    emoji: "🧾",
    name: "Point of Sale",
    outcome: "Checkout in 3 taps — the sales log builds itself.",
    bullets: [
      "Touch-friendly cart built for busy counters",
      "Instant receipts, no calculator, no mistakes",
      "Every sale recorded automatically",
    ],
    accent: "border-indigo-500/25 hover:border-indigo-400/60",
    glow: "from-indigo-500/15",
  },
  {
    href: "/money-tracker",
    emoji: "💰",
    name: "Money Tracker",
    outcome: "Know exactly where the cash goes — without a spreadsheet.",
    bullets: [
      "Income and expenses sorted into categories",
      "Monthly dashboard you can read at a glance",
      "Spot the leaks before they hurt",
    ],
    accent: "border-emerald-500/25 hover:border-emerald-400/60",
    glow: "from-emerald-500/15",
  },
  {
    href: "/order-bot",
    emoji: "🤖",
    name: "WhatsApp Order Bot",
    outcome: "Takes customer orders 24/7 — even while you sleep.",
    bullets: [
      "Chats with customers like a trained employee",
      "Menu, cart and confirmation, fully hands-off",
      "Never misses a late-night order again",
    ],
    accent: "border-green-500/25 hover:border-green-400/60",
    glow: "from-green-500/15",
  },
  {
    href: "/booking",
    emoji: "📅",
    name: "Booking System",
    outcome: "Customers book themselves in — zero double-bookings.",
    bullets: [
      "Real-time slots, no back-and-forth messages",
      "Built for salons, clinics and services",
      "Your calendar fills up while you work",
    ],
    accent: "border-sky-500/25 hover:border-sky-400/60",
    glow: "from-sky-500/15",
  },
  {
    href: "/erp",
    emoji: "📦",
    name: "ERP / Business Manager",
    outcome: "Inventory, sales and staff — one screen runs the shop.",
    bullets: [
      "Low-stock alerts before you run out",
      "Sales and stock always in sync",
      "Replace three notebooks with one dashboard",
    ],
    accent: "border-amber-500/25 hover:border-amber-400/60",
    glow: "from-amber-500/15",
  },
];

const stats = [
  { value: "5", label: "live products" },
  { value: "100%", label: "working demos" },
  { value: "Solo", label: "built end-to-end" },
  { value: "Fast", label: "delivery, no agencies" },
];

const steps = [
  {
    number: "01",
    title: "Tell me the problem",
    body: "A 15-minute conversation in plain language. What eats your time? What keeps going wrong? No tech talk needed — just describe a normal day.",
  },
  {
    number: "02",
    title: "I build it fast",
    body: "I work solo, so nothing gets lost between teams. You get a working first version in days, not months — and you see progress as it happens.",
  },
  {
    number: "03",
    title: "You watch it work first",
    body: "Click through the real thing yourself, just like the demos on this page. You only move forward once you've seen it solve your problem.",
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip">
      {/* Smooth scrolling for anchor links */}
      <style>{`html { scroll-behavior: smooth; }`}</style>

      {/* ---------------------------------------------------------- */}
      {/* Sticky header                                               */}
      {/* ---------------------------------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/25">
              D
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Devora
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#demos" className="transition-colors hover:text-white">
              Demos
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-white"
            >
              How it works
            </a>
            <a href="#contact" className="transition-colors hover:text-white">
              Contact
            </a>
          </nav>

          <a
            href="#demos"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-400 hover:shadow-indigo-400/30"
          >
            Try the demos
          </a>
        </div>
      </header>

      <main id="top">
        {/* -------------------------------------------------------- */}
        {/* Hero                                                      */}
        {/* -------------------------------------------------------- */}
        <section className="relative">
          {/* Decorative background: gradient glow + grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute left-1/2 top-[-220px] h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/25 via-violet-600/20 to-indigo-600/25 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(99,102,241,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.12) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
            <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-indigo-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              5 live demos — open right now
            </p>

            <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
              Your business runs on manual work.
              <br className="hidden sm:block" />{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
                I turn it into software that runs itself.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
              Point of sale, bookings, inventory, order-taking bots — built for
              small businesses that are tired of notebooks, spreadsheets and
              missed messages.{" "}
              <span className="font-medium text-slate-200">
                Every demo below is real — click and use it.
              </span>
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#demos"
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-indigo-400/40 sm:w-auto"
              >
                Explore live demos
              </a>
              <a
                href="#contact"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-8 py-3.5 text-base font-semibold text-slate-200 transition-all hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800/80 sm:w-auto"
              >
                Get in touch
              </a>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* Stat strip                                                */}
        {/* -------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/5 bg-slate-900/40 p-4 sm:grid-cols-4 sm:p-6">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-1 rounded-xl px-3 py-4 text-center"
              >
                <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                  {s.value}
                </span>
                <span className="text-xs uppercase tracking-wider text-slate-400 sm:text-sm">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* Demos                                                     */}
        {/* -------------------------------------------------------- */}
        <section id="demos" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-400">
                The proof, not the pitch
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Don&apos;t take my word for it — use the software
              </h2>
              <p className="mt-4 text-lg text-slate-400">
                Five working products. No screenshots, no mockups. Open any of
                them and run a real workflow, start to finish.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {demos.map((demo) => (
                <Link
                  key={demo.href}
                  href={demo.href}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-slate-900/50 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:bg-slate-900/80 hover:shadow-2xl hover:shadow-indigo-500/10 ${demo.accent}`}
                >
                  {/* hover glow */}
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${demo.glow}`}
                  />

                  <div className="relative">
                    <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-slate-800/80 text-2xl shadow-inner">
                      {demo.emoji}
                    </span>
                    <h3 className="text-xl font-semibold tracking-tight text-white">
                      {demo.name}
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-indigo-200/90">
                      {demo.outcome}
                    </p>

                    <ul className="mt-4 space-y-2">
                      {demo.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-2 text-sm leading-relaxed text-slate-400"
                        >
                          <svg
                            className="mt-1 h-3.5 w-3.5 shrink-0 text-indigo-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.3a1 1 0 0 1-1.42.004L4.29 10.21a1 1 0 1 1 1.42-1.408l3.087 3.112 6.493-6.585a1 1 0 0 1 1.414-.038Z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="relative mt-6 flex items-center gap-1.5 pt-2 text-sm font-semibold text-indigo-300 transition-colors group-hover:text-indigo-200">
                    Open live demo
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </Link>
              ))}

              {/* "Yours next?" filler card keeps the grid balanced */}
              <a
                href="#contact"
                className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-transparent p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-500/50 hover:bg-slate-900/40"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-slate-800/60 text-2xl">
                  ✨
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-white">
                  Your tool goes here
                </h3>
                <p className="max-w-[24ch] text-sm leading-relaxed text-slate-400">
                  Got a process running on paper or WhatsApp? It probably fits
                  in this grid.
                </p>
                <span className="text-sm font-semibold text-indigo-300 transition-colors group-hover:text-indigo-200">
                  Tell me about it →
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* How it works                                              */}
        {/* -------------------------------------------------------- */}
        <section id="how-it-works" className="scroll-mt-24 border-y border-white/5 bg-slate-900/30">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-indigo-400">
                How it works
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Three steps. No surprises.
              </h2>
              <p className="mt-4 text-lg text-slate-400">
                The same way every demo on this page got built — and the same
                way yours would.
              </p>
            </div>

            <ol className="grid gap-6 md:grid-cols-3">
              {steps.map((step, i) => (
                <li
                  key={step.number}
                  className="relative rounded-2xl border border-white/5 bg-slate-950/60 p-7"
                >
                  <div className="mb-5 flex items-center gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-base font-bold text-indigo-300 ring-1 ring-indigo-500/30">
                      {step.number}
                    </span>
                    {i < steps.length - 1 && (
                      <span
                        aria-hidden
                        className="hidden h-px flex-1 bg-gradient-to-r from-indigo-500/40 to-transparent md:block"
                      />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* Contact                                                   */}
        {/* -------------------------------------------------------- */}
        <section id="contact" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-slate-900/60 px-6 py-14 text-center sm:px-12">
              {/* glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-0 h-64 w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-600/30 to-violet-600/30 blur-3xl"
              />

              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                  Got a process that should run itself?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
                  Send one message describing the problem. I&apos;ll reply with
                  whether software can fix it — and how fast.
                </p>

                <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <a
                    href="mailto:7eeshan.ahmad@gmail.com"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-indigo-400/40 sm:w-auto"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                    Email me the problem
                  </a>
                  <a
                    href="https://www.linkedin.com/in/zeeshan-khan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-8 py-3.5 text-base font-semibold text-slate-200 transition-all hover:-translate-y-0.5 hover:border-slate-500 sm:w-auto"
                  >
                    Connect on LinkedIn
                  </a>
                </div>

                <p className="mt-8 text-sm text-slate-500">
                  Based in Pakistan, working with businesses anywhere.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------- */}
      {/* Footer                                                      */}
      {/* ---------------------------------------------------------- */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
              D
            </span>
            <span>© 2026 Devora · Built by Zeeshan Khan</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#demos" className="transition-colors hover:text-slate-300">
              Demos
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-slate-300"
            >
              How it works
            </a>
            <a
              href="#contact"
              className="transition-colors hover:text-slate-300"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
