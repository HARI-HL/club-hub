import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link, useLocation } from "react-router-dom";
import api from "../services/api.js";
import useClubs from "../hooks/useClubs.js";
import { useAuth } from "../context/AuthContext.jsx";
import { describeError, formatDateTime } from "../utils/errors.js";

function Seats({ registered, capacity }) {
  const pct = capacity ? Math.min(100, (registered / capacity) * 100) : 0;
  return (
    <div>
      <p className="font-mono text-base tabular-nums text-ink">
        {registered} <span className="text-muted">/ {capacity}</span>
      </p>
      <div className="mt-[0.4rem] h-px w-full bg-line" aria-hidden="true">
        <div className="h-px bg-accent transition-[width] duration-700 ease-studio" style={{ width: `${pct}%` }} />
      </div>
      <p className="meta mt-[0.4rem]">{capacity - registered} seats left</p>
    </div>
  );
}

function EventRow({ ev, clubName, user, onRegistered }) {
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [mine, setMine] = useState(false);

  const deadlinePassed = new Date(ev.registration_deadline).getTime() < Date.now();
  const full = ev.registered >= ev.capacity;
  const start = new Date(ev.starts_at);

  async function register() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.events.register(ev.id);
      setMine(true);
      onRegistered(ev.id, ev.capacity - res.seats_left);
    } catch (err) {
      if (err.status === 409 && /already registered/i.test(err.message)) setMine(true);
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  let action;
  if (mine) {
    action = <span className="meta border border-accent/60 px-phi-2 py-[0.45rem] text-accent">Registered</span>;
  } else if (deadlinePassed) {
    action = <span className="meta border border-line px-phi-2 py-[0.45rem]">Registration closed</span>;
  } else if (full) {
    action = <span className="meta border border-line px-phi-2 py-[0.45rem]">Full</span>;
  } else if (!user) {
    action = (
      <Link
        to="/login"
        state={{ from: location.pathname }}
        className="meta border border-line-hover px-phi-2 py-[0.45rem] transition-colors hover:border-accent hover:text-accent"
      >
        Log in to register
      </Link>
    );
  } else {
    action = (
      <button
        type="button"
        onClick={register}
        disabled={busy}
        className="border border-accent bg-accent px-phi-3 py-[0.45rem] font-mono text-xs uppercase text-accent-ink transition-colors duration-300 ease-studio hover:bg-transparent hover:text-accent disabled:opacity-40"
      >
        {busy ? "Reserving" : "Register"}
      </button>
    );
  }

  return (
    <li data-event className="grid grid-cols-1 gap-phi-3 border-b border-line py-phi-3 lg:grid-cols-[9rem_1fr_13rem_12rem] lg:items-start lg:gap-phi-4">
      <div>
        <p className="font-display text-lg font-bold leading-none">
          {start.toLocaleString("en-IN", { day: "2-digit" })}
        </p>
        <p className="meta mt-[0.4rem]">
          {start.toLocaleString("en-IN", { month: "short" })} /{" "}
          {start.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </p>
      </div>

      <div>
        <p className="meta text-accent">{clubName}</p>
        <h3 className="mt-[0.2rem] text-lg font-bold">{ev.title}</h3>
        {ev.description && <p className="mt-[0.4rem] max-w-[56ch] text-base text-muted">{ev.description}</p>}
        <p className="meta mt-phi-1">
          {ev.venue ? `${ev.venue} / ` : ""}Register before {formatDateTime(ev.registration_deadline)}
        </p>
      </div>

      <Seats registered={ev.registered} capacity={ev.capacity} />

      <div className="flex flex-col items-start gap-phi-1">
        {action}
        {error && (
          <p role="alert" className="meta normal-case text-ink">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}

export default function EventsSection() {
  const { user } = useAuth();
  const { clubs } = useClubs();
  const [events, setEvents] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(null);
  const list = useRef(null);

  const load = useCallback(() => {
    setLoadError(null);
    setEvents(null);
    api.events
      .list()
      .then(setEvents)
      .catch((err) => setLoadError(describeError(err)));
  }, []);

  useEffect(load, [load]);

  const names = useMemo(() => Object.fromEntries(clubs.map((c) => [c.id, c.name])), [clubs]);

  const onRegistered = useCallback((id, registered) => {
    setEvents((evs) => evs.map((e) => (e.id === id ? { ...e, registered } : e)));
  }, []);

  // Rows fade up as they arrive
  useLayoutEffect(() => {
    if (!events?.length || !list.current) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const ctx = gsap.context(() => {
      gsap.set("[data-event]", { opacity: 0, y: 32 });
      ScrollTrigger.batch("[data-event]", {
        start: "top 92%",
        once: true,
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }),
      });
    }, list);
    return () => ctx.revert();
  }, [events?.length]);

  return (
    <section id="events" className="border-t border-line">
      <div className="mx-auto max-w-[1440px] px-phi-3 py-phi-6 lg:px-phi-5">
        <div className="grid grid-cols-1 items-end gap-phi-3 lg:grid-cols-golden lg:gap-phi-4">
          <div>
            <p className="meta">02 / Events</p>
            <h2 className="mt-phi-2 text-xl font-bold">What is happening next.</h2>
          </div>
          <p className="max-w-[44ch] text-base text-muted lg:justify-self-end">
            Seats are first come first served. The server locks the count while it books, so nobody gets a seat that
            is already gone.
          </p>
        </div>

        <div className="mt-phi-4 border-t border-line-hover">
          {events === null && !loadError && (
            <div aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="border-b border-line py-phi-3">
                  <div className="h-[0.618rem] w-32 animate-pulse bg-line" />
                  <div className="mt-phi-2 h-[1.4rem] w-64 animate-pulse bg-line" />
                </div>
              ))}
            </div>
          )}

          {loadError && (
            <div className="py-phi-4" role="alert">
              <p className="text-lg font-bold">Could not load events</p>
              <p className="mt-phi-1 text-base text-muted">{loadError}</p>
              <button
                onClick={load}
                className="mt-phi-3 border border-accent px-phi-3 py-phi-1 font-mono text-xs uppercase text-accent transition-colors hover:bg-accent hover:text-accent-ink"
              >
                Try again
              </button>
            </div>
          )}

          {events && events.length === 0 && (
            <div className="py-phi-4">
              <p className="text-lg font-bold">No upcoming events</p>
              <p className="mt-phi-1 max-w-[48ch] text-base text-muted">
                Club admins publish events from their dashboard. They show up here the moment they are created.
              </p>
            </div>
          )}

          {events && events.length > 0 && (
            <ol ref={list}>
              {events.map((ev) => (
                <EventRow
                  key={ev.id}
                  ev={ev}
                  clubName={names[ev.club_id] || "Club"}
                  user={user}
                  onRegistered={onRegistered}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
