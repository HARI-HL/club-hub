import { Link } from "react-router-dom";

// Shared frame for login, register and verify. 38 / 62 split: context on the left, form on the right.
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
          </div>
          {aside}
        </div>

        <div className="border border-line bg-surface p-phi-3 shadow-specular lg:p-phi-5">{children}</div>
      </main>
    </div>
  );
}
