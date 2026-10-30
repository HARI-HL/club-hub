import { Link } from "react-router-dom";

const SPECS = [
  ["01", "VERIFIED CAMPUS IDENTITY"],
  ["02", "ONE-CLUB-PER-CATEGORY GUARD"],
  ["03", "ROW-LOCKED EVENT SEATING"],
];

// Shared frame for login, register and verify. 38 / 62 split: context on the left, a smoked glass vault on the right.
export default function AuthShell({ eyebrow, title, intro, children, aside }) {
  return (
    <div className="min-h-[100dvh]">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-phi-3 lg:px-phi-5">
          <Link to="/" className="font-display text-base font-bold tracking-tight">
            CLUB<span className="text-accent">/</span>HUB
          </Link>
          <Link to="/" className="meta transition-colors hover:text-ink">
            &larr; Back to clubs
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-phi-4 px-phi-3 py-phi-5 lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-golden-reverse lg:gap-phi-5 lg:px-phi-5 lg:py-phi-6">
        <div className="flex flex-col justify-between gap-phi-4">
          <div>
            <p className="meta">{eyebrow}</p>
            <h1 className="mt-phi-2 text-xl font-bold">{title}</h1>
            <p className="mt-phi-2 max-w-[36ch] text-base text-muted">{intro}</p>

            <ol className="mt-phi-5 hidden border-t border-line lg:block">
              {SPECS.map(([n, text]) => (
                <li key={n} className="flex gap-phi-2 border-b border-line py-phi-2 font-mono text-xs uppercase">
                  <span className="text-accent">{n} /</span>
                  <span className="text-ink">{text}</span>
                </li>
              ))}
            </ol>
          </div>
          {aside}
        </div>

        {/* Smoked glass vault. A faint accent glow sits behind it so the glass has something to catch. */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[12%]"
            style={{ background: "radial-gradient(closest-side, rgba(226,255,50,0.04), transparent 75%)" }}
          />
          <div
            className="relative overflow-hidden rounded-none border border-white/10 bg-[#0D0E12]/80 p-phi-3 backdrop-blur-2xl lg:p-phi-5"
            style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.20), 0 30px 60px rgba(0,0,0,0.85)" }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)" }}
            />
            <div className="relative mx-auto w-full max-w-[400px]">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
