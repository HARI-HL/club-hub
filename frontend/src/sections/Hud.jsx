import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Link } from "react-router-dom";
import { useLenis } from "../lib/SmoothScroll.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { linksFor } from "../utils/roles.js";
import useClubs from "../hooks/useClubs.js";

const LINKS = [
  ["01", "Clubs", "#domains"],
  ["02", "Events", "#events"],
  ["03", "Process", "#timeline"],
];

function MagneticButton({ children, onClick, href }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(hover: none)").matches) return undefined;
    const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    const move = (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.3);
      y((e.clientY - (r.top + r.height / 2)) * 0.4);
    };
    const leave = () => {
      x(0);
      y(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <a
      ref={ref}
      href={href}
      onClick={onClick}
      className="inline-block border border-accent bg-accent px-phi-3 py-[0.55rem] font-mono text-xs uppercase text-accent-ink transition-colors duration-300 ease-studio hover:bg-transparent hover:text-accent"
    >
      {children}
    </a>
  );
}

export default function Hud() {
  const lenis = useLenis();
  const { clubs, status } = useClubs();
  const { user, ready, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const roleLinks = linksFor(user);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (hash) => (e) => {
    e.preventDefault();
    const target = document.querySelector(hash);
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: -56, duration: 1.4 });
    else target.scrollIntoView({ behavior: "smooth" });
  };

  const open = clubs.filter((c) => c.recruitment_open).length;
  const badge =
    status === "loading" ? "SYNCING" : status === "error" ? "OFFLINE" : `${open} OPEN / ${clubs.length} CLUBS`;
  const live = status === "ready" && open > 0;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ease-studio ${
        scrolled ? "border-line bg-[#070709]/85 backdrop-blur-md" : "border-line/60 bg-[#070709]/85 backdrop-blur-md"
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-phi-3 px-phi-3 lg:px-phi-5"
      >
        <a href="#hero" onClick={goTo("#hero")} className="font-display text-base font-bold tracking-tight">
          CLUB<span className="text-accent">/</span>HUB
        </a>

        <ul className="hidden items-center gap-phi-4 lg:flex">
          {LINKS.map(([n, label, hash]) => (
            <li key={hash}>
              <a href={hash} onClick={goTo(hash)} className="group meta transition-colors hover:text-ink">
                <span className="text-accent">{n}</span> {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-phi-3">
          <span className="meta hidden items-center gap-phi-1 sm:flex" role="status">
            <span
              className={`inline-block h-[6px] w-[6px] ${live ? "bg-accent" : "bg-muted"}`}
              style={live ? { animation: "hudpulse 2s ease-in-out infinite" } : undefined}
            />
            {badge}
          </span>
          {!ready ? (
            <span className="meta animate-pulse" role="status">
              Checking session
            </span>
          ) : user ? (
            <div className="flex items-center gap-phi-2">
              {roleLinks.map((l) => (
                <Link key={l.to} to={l.to} className="meta hidden whitespace-nowrap transition-colors hover:text-accent md:block">
                  {l.label}
                </Link>
              ))}
              <span className="meta hidden max-w-[12ch] truncate text-ink md:block" title={user.name}>
                {user.name}
              </span>
              <button
                type="button"
                onClick={logout}
                className="meta border border-line px-phi-2 py-[0.45rem] transition-colors hover:border-line-hover hover:text-ink"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link to="/login" className="meta border border-line px-phi-2 py-[0.45rem] transition-colors hover:border-line-hover hover:text-ink">
              Log in
            </Link>
          )}
          <MagneticButton href="#domains" onClick={goTo("#domains")}>
            Apply now
          </MagneticButton>
          <button
            type="button"
            aria-expanded={menu}
            aria-controls="hud-menu"
            onClick={() => setMenu((m) => !m)}
            className="meta border border-line px-phi-2 py-[0.45rem] md:hidden"
          >
            {menu ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      {menu && (
        <div id="hud-menu" className="border-t border-line bg-canvas/95 px-phi-3 py-phi-2 backdrop-blur-xl md:hidden">
          <ul className="flex flex-col gap-phi-2">
            {LINKS.map(([n, label, hash]) => (
              <li key={hash}>
                <a
                  href={hash}
                  onClick={(e) => {
                    setMenu(false);
                    goTo(hash)(e);
                  }}
                  className="meta"
                >
                  <span className="text-accent">{n}</span> {label}
                </a>
              </li>
            ))}
            {roleLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="meta text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
            {!user && (
              <li>
                <Link to="/register" className="meta text-ink">
                  Create account
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
