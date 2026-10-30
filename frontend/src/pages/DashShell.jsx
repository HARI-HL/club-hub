import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { linksFor } from "../utils/roles.js";

// Frame for the signed-in screens: logo, role-aware links, log out.
export default function DashShell({ eyebrow, title, intro, children }) {
  const { user, logout } = useAuth();
  const links = linksFor(user);

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-xl">
        <nav aria-label="Account" className="mx-auto flex max-w-[1440px] items-center justify-between gap-phi-3 px-phi-3 py-[0.8rem] lg:px-phi-5">
          <Link to="/" className="font-display text-base font-bold tracking-tight">
            CLUB<span className="text-accent">/</span>HUB
          </Link>

          <div className="flex items-center gap-phi-3 overflow-x-auto">
            <Link to="/" className="meta whitespace-nowrap transition-colors hover:text-ink">
              Clubs
            </Link>
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `meta whitespace-nowrap border-b pb-[2px] transition-colors ${
                    isActive ? "border-accent text-accent" : "border-transparent hover:text-ink"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {user && (
              <button
                type="button"
                onClick={logout}
                className="meta whitespace-nowrap border border-line px-phi-2 py-[0.4rem] transition-colors hover:border-line-hover hover:text-ink"
              >
                Log out
              </button>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-[1440px] px-phi-3 py-phi-5 lg:px-phi-5 lg:py-phi-6">
        <p className="meta">{eyebrow}</p>
        <h1 className="mt-phi-2 text-xl font-bold">{title}</h1>
        {intro && <p className="mt-phi-2 max-w-[56ch] text-base text-muted">{intro}</p>}
        <div className="mt-phi-4">{children}</div>
      </main>
    </div>
  );
}
