import Skeleton from "../components/Skeleton.jsx";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import api from "../services/api.js";
import useClubs from "../hooks/useClubs.js";
import { useLenis } from "../lib/SmoothScroll.jsx";
import { assetsFor } from "../config/clubAssets.js";
import { getCloudinaryUrl, getCloudinaryVideoUrl } from "../utils/cloudinary.js";
import { Motif } from "./DomainsBento.jsx";

const pad = (n) => String(n).padStart(2, "0");

// Writes the cursor position into CSS variables. No React state, so moving the mouse never re-renders.
function useStripPointer() {
  const ref = useRef(null);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onPointerMove = (e) => {
    if (e.pointerType === "touch") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = clientX - r.left;
      const y = clientY - r.top;
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
      el.style.setProperty("--px", String(((x / r.width) - 0.5) * 12)); // max 8px either way
      el.style.setProperty("--py", String(((y / r.height) - 0.5) * 12));
    });
  };

  const onPointerLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  };

  return { ref, onPointerMove, onPointerLeave };
}

function Strip({ club, index, stats, onInspect }) {
  const { ref, onPointerMove, onPointerLeave } = useStripPointer();
  const videoRef = useRef(null);
  const [armed, setArmed] = useState(false);
  const assets = assetsFor(club.name);
  const videoSrc = getCloudinaryVideoUrl(assets.video, { width: 640 });
  const poster = getCloudinaryUrl(assets.poster, { width: 640 });
  const technical = club.category === "technical";

  const enter = (e) => {
    if (e.pointerType === "touch" || !videoSrc) return;
    setArmed(true);
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
  };
  const leave = () => {
    onPointerLeave();
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  return (
    <li
      ref={ref}
      data-strip
      onPointerMove={onPointerMove}
      onPointerEnter={enter}
      onPointerLeave={leave}
      className="strip group relative isolate overflow-visible border-b border-white/[0.08] bg-[#0A0B0E]"
    >
      <div className="strip-glow" aria-hidden="true" />
      <div className="strip-border" aria-hidden="true" />

      <div className="relative z-[1] grid grid-cols-1 gap-phi-2 px-phi-3 py-phi-3 lg:grid-cols-[3.5rem_1fr_15rem_11rem] lg:items-center lg:gap-phi-3 lg:px-phi-4">
        <span className="font-mono text-xs uppercase text-muted">{pad(index + 1)} //</span>

        <div>
          <h3 className="text-lg font-bold">{club.name}</h3>
          <p className="meta mt-[0.4rem]">
            <span className="border border-white/15 px-[0.5rem] py-[0.2rem] text-ink">
              [{technical ? "TECHNICAL" : "NON-TECHNICAL"}]
            </span>
            <span className={`ml-phi-1 ${club.recruitment_open ? "text-accent" : ""}`}>
              [{club.recruitment_open ? "RECRUITING" : "CLOSED"}]
            </span>
          </p>
        </div>

        <div className="font-mono text-xs uppercase">
          <p className="text-ink tabular-nums">
            {pad(stats.events)} EVENTS <span className="text-muted">//</span> {pad(stats.seats)} SEATS BOOKED
          </p>
          {assets.flagship && <p className="mt-[0.3rem] normal-case text-muted">Flagship: {assets.flagship}</p>}
        </div>

        <button
          type="button"
          onClick={() => onInspect(club)}
          className="meta justify-self-start text-ink transition-colors duration-300 ease-studio hover:text-accent focus-visible:text-accent lg:justify-self-end"
        >
          [INSPECT / APPLY &#8599;]
        </button>
      </div>

      {/* Floating preview. Hidden until a real mouse hovers or keyboard focus lands on the strip. */}
      <div
        className="strip-preview pointer-events-none absolute bottom-2 top-2 z-[2] hidden w-[15rem] lg:block"
        style={{ left: "40%" }}
        aria-hidden="true"
      >
        <div className="relative h-full w-full overflow-hidden border border-white/20 bg-canvas">
          {poster || videoSrc ? (
            <>
              {poster && <img src={poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
              {videoSrc && armed && (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  poster={poster || undefined}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </>
          ) : (
            <Motif id={club.id} tall />
          )}
          <span className="meta absolute left-[0.5rem] top-[0.4rem] text-ink">FIG. {pad(index + 1)}</span>
        </div>
      </div>
    </li>
  );
}

export default function HallOfBuilders({ onInspect }) {
  const lenis = useLenis();
  const { clubs, status } = useClubs();
  const [events, setEvents] = useState(null);
  const list = useRef(null);

  useEffect(() => {
    let alive = true;
    api.events
      .list()
      .then((e) => alive && setEvents(e))
      .catch(() => alive && setEvents([]));
    return () => {
      alive = false;
    };
  }, []);

  const statsByClub = useMemo(() => {
    const map = {};
    (events || []).forEach((e) => {
      const s = (map[e.club_id] ||= { events: 0, seats: 0 });
      s.events += 1;
      s.seats += e.registered;
    });
    return map;
  }, [events]);

  const openClubs = clubs.filter((c) => c.recruitment_open).length;
  const upcoming = (events || []).filter((e) => new Date(e.starts_at).getTime() > Date.now()).length;

  const scrollTo = (hash) => (e) => {
    e.preventDefault();
    const t = document.querySelector(hash);
    if (!t) return;
    if (lenis) lenis.scrollTo(t, { offset: -56, duration: 1.4 });
    else t.scrollIntoView({ behavior: "smooth" });
  };

  // Closed clubs cannot take applications, so inspecting one takes you to the clubs grid instead
  const inspect = (club) => {
    if (club.recruitment_open) onInspect(club);
    else scrollTo("#domains")({ preventDefault() {} });
  };

  // One time entrance as rows scroll into view. Nothing moves while idle.
  useLayoutEffect(() => {
    if (!clubs.length || !list.current) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const ctx = gsap.context(() => {
      gsap.set("[data-strip]", { opacity: 0, y: 32 });
      ScrollTrigger.batch("[data-strip]", {
        start: "top 92%",
        once: true,
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }),
      });
    }, list);
    return () => ctx.revert();
  }, [clubs.length]);

  return (
    <section id="builders" className="border-t border-line">
      <div className="mx-auto max-w-[1440px] px-phi-3 pt-phi-6 lg:px-phi-5">
        <div className="grid grid-cols-1 items-end gap-phi-3 lg:grid-cols-golden lg:gap-phi-4">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted">
              04 / HALL OF BUILDERS &#8212; CAMPUS OUTPUT
            </p>
            <h2 className="mt-phi-2 text-xl font-bold">What happens after you get in.</h2>
          </div>
          <p className="max-w-[44ch] text-base text-muted lg:justify-self-end">
            Short films, hackathon deployments, robotics rigs, and cultural stages, built by verified club members.
          </p>
        </div>

        <div className="mt-phi-4 border-t border-white/[0.08]">
          {status === "loading" && (
            <div aria-busy="true" role="status">
              <span className="sr-only">Loading clubs</span>
              {[0, 1, 2].map((i) => (
                <div key={i} className="border-b border-white/[0.08] bg-[#0A0B0E]">
                  <div className="grid grid-cols-1 gap-phi-2 px-phi-3 py-phi-3 lg:grid-cols-[3.5rem_1fr_15rem_11rem] lg:items-center lg:gap-phi-3 lg:px-phi-4">
                    <Skeleton className="h-[0.8rem] w-8" />
                    <div>
                      <Skeleton className="h-[1.7rem] w-2/5 max-w-[16rem]" />
                      <Skeleton className="mt-[0.4rem] h-[1.4rem] w-44" />
                    </div>
                    <Skeleton className="h-[0.8rem] w-full" />
                    <Skeleton className="h-[0.8rem] w-28 lg:justify-self-end" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {status === "error" && (
            <p className="meta py-phi-4" role="alert">
              Clubs could not be loaded. The server may be waking up, reload in a minute.
            </p>
          )}
          {status === "ready" && clubs.length === 0 && (
            <p className="py-phi-4 text-base text-muted">No clubs yet. They will appear here as soon as a site admin creates them.</p>
          )}
          {status === "ready" && clubs.length > 0 && (
            <ul ref={list}>
              {clubs.map((club, i) => (
                <Strip
                  key={club.id}
                  club={club}
                  index={i}
                  stats={statsByClub[club.id] || { events: 0, seats: 0 }}
                  onInspect={inspect}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Closing terminal bar */}
      <div className="mt-phi-5 border-y border-line-hover bg-[#0A0B0E]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-phi-3 px-phi-3 py-phi-4 lg:flex-row lg:items-center lg:justify-between lg:px-phi-5">
          <p className="font-display text-lg font-extrabold uppercase leading-none tabular-nums" role="status">
            <span className="text-accent">{status === "ready" ? pad(openClubs) : "--"}</span> OPEN CLUBS{" "}
            <span className="text-muted">//</span>{" "}
            <span className="text-accent">{events ? pad(upcoming) : "--"}</span> UPCOMING EVENTS{" "}
            <span className="text-muted">//</span> SEAT LOCK ACTIVE
          </p>
          <a
            href="#domains"
            onClick={scrollTo("#domains")}
            className="inline-block self-start border border-accent bg-accent px-phi-4 py-phi-2 font-mono text-xs uppercase text-accent-ink transition-colors duration-300 ease-studio hover:bg-transparent hover:text-accent lg:self-auto"
          >
            [APPLY NOW &rarr;]
          </a>
        </div>
      </div>
    </section>
  );
}
