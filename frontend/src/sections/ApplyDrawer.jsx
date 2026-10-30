import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLenis } from "../lib/SmoothScroll.jsx";
import Notice from "../components/Notice.jsx";
import api from "../services/api.js";
import { describeError } from "../utils/errors.js";

const MAX = 1000;

// Slide-over for applying to one club. Mounted by the home page with the selected club, or null to close.
export default function ApplyDrawer({ club, onClose }) {
  const { user } = useAuth();
  const lenis = useLenis();
  const location = useLocation();
  const panel = useRef(null);
  const [shown, setShown] = useState(false); // drives the slide transition
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [overview, setOverview] = useState(null);

  const open = Boolean(club);

  // Reset when a different club is opened
  useEffect(() => {
    if (!club) return;
    setStatement("");
    setError(null);
    setDone(false);
    setOverview(null);
    const raf = requestAnimationFrame(() => setShown(true));
    return () => {
      cancelAnimationFrame(raf);
      setShown(false);
    };
  }, [club]);

  // Pre-check with the user's own record so we can explain a rejection before they type
  useEffect(() => {
    if (!club || !user) return;
    let alive = true;
    api.me
      .overview()
      .then((o) => alive && setOverview(o))
      .catch(() => {}); // the backend still enforces every rule, so a failure here is harmless
    return () => {
      alive = false;
    };
  }, [club, user]);

  // Freeze page scroll, close on Escape, keep focus inside
  useEffect(() => {
    if (!open) return undefined;
    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const opener = document.activeElement;
    panel.current?.querySelector("[data-autofocus]")?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const nodes = panel.current.querySelectorAll("a[href],button:not([disabled]),textarea,input");
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lenis?.start();
      opener?.focus?.();
    };
  }, [open, lenis, onClose]);

  if (!club) return null;

  const technical = club.category === "technical";
  const existing = overview?.applications?.find((a) => a.club === club.name);
  const sameCategory = overview?.memberships?.find((m) => m.category === club.category);
  const isSiteAdmin = user?.role === "site_admin";
  const blocked = Boolean(existing) || Boolean(sameCategory) || isSiteAdmin;

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.clubs.apply(club.id, statement.trim());
      setDone(true);
    } catch (err) {
      setError({ message: describeError(err), status: err.status });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="apply-title">
      <button
        type="button"
        aria-label="Close application panel"
        tabIndex={-1}
        onClick={onClose}
        className={`absolute inset-0 bg-canvas/70 backdrop-blur-sm transition-opacity duration-500 ease-studio ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        ref={panel}
        data-lenis-prevent
        className={`absolute inset-y-0 right-0 flex w-full max-w-[34rem] flex-col overflow-y-auto border-l border-line-hover bg-surface transition-transform duration-500 ease-studio ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-phi-3 py-phi-2">
          <span className="meta">Application / {technical ? "Technical" : "Non technical"}</span>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="meta border border-line px-phi-2 py-[0.35rem] transition-colors hover:border-line-hover hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-phi-3 p-phi-3 lg:p-phi-4">
          <div>
            <h2 id="apply-title" className="text-xl font-bold">
              {club.name}
            </h2>
            {club.description && <p className="mt-phi-1 text-base text-muted">{club.description}</p>}
          </div>

          <div className="flex flex-wrap gap-phi-1">
            <span className="meta border border-accent/60 px-[0.5rem] py-[0.2rem] text-accent">
              [RECRUITMENT: {club.recruitment_open ? "OPEN" : "CLOSED"}]
            </span>
            <span className="meta border border-line-hover px-[0.5rem] py-[0.2rem] text-ink">
              [RULE: 1 CLUB MAX PER CATEGORY]
            </span>
          </div>

          {!user && (
            <div className="flex flex-col gap-phi-2 border-t border-line pt-phi-3">
              <Notice title="Sign in required">You need an account to apply. It takes under a minute.</Notice>
              <div className="flex gap-phi-2">
                <Link
                  to="/login"
                  state={{ from: location.pathname }}
                  className="border border-accent bg-accent px-phi-3 py-phi-1 font-mono text-xs uppercase text-accent-ink transition-colors duration-300 ease-studio hover:bg-transparent hover:text-accent"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  state={{ from: location.pathname }}
                  className="border border-line-hover px-phi-3 py-phi-1 font-mono text-xs uppercase transition-colors duration-300 ease-studio hover:border-accent hover:text-accent"
                >
                  Create account
                </Link>
              </div>
            </div>
          )}

          {user && done && (
            <Notice tone="ok" title="Application submitted">
              {club.name} will review it. Check the status any time under your account overview once that screen is
              added, or ask the club admin.
            </Notice>
          )}

          {user && !done && (
            <form onSubmit={submit} className="flex flex-col gap-phi-3 border-t border-line pt-phi-3">
              {isSiteAdmin && (
                <Notice title="Admin account">Site admins review and manage clubs but cannot apply to them.</Notice>
              )}
              {existing && (
                <Notice title={`Already applied / ${existing.status}`}>
                  You applied to {club.name} already. One application per club.
                </Notice>
              )}
              {!existing && sameCategory && (
                <Notice title="Category taken">
                  You are already in {sameCategory.club}, which is {technical ? "a technical" : "a non technical"} club.
                  You can hold one club per category.
                </Notice>
              )}

              <div>
                <label htmlFor="statement" className="meta block">
                  Why do you want to join? (optional)
                </label>
                <textarea
                  id="statement"
                  rows={6}
                  maxLength={MAX}
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  disabled={blocked}
                  placeholder="Skills, projects, what you want to build or learn."
                  className="mt-[0.4rem] block w-full resize-none border border-line bg-glass px-phi-2 py-[0.7rem] text-base text-ink placeholder:text-muted/60 transition-colors duration-300 ease-studio hover:border-line-hover focus:border-accent focus:outline-none disabled:opacity-40"
                />
                <p className="meta mt-[0.4rem] text-right tabular-nums">
                  {statement.length} / {MAX}
                </p>
              </div>

              {error && (
                <Notice tone="error" title={`Error ${error.status || ""}`.trim()}>
                  {error.message}
                </Notice>
              )}

              <button
                type="submit"
                disabled={busy || blocked}
                className="border border-accent bg-accent px-phi-3 py-phi-1 font-mono text-xs uppercase text-accent-ink transition-colors duration-300 ease-studio hover:bg-transparent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent disabled:hover:text-accent-ink"
              >
                {busy ? "Submitting" : "Submit application"}
              </button>
            </form>
          )}
        </div>
      </aside>
    </div>
  );
}
