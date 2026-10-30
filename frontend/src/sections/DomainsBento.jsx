import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useClubs from "../hooks/useClubs.js";
import { useSpotlight } from "../components/SpotlightCard.jsx";
import { assetsFor } from "../config/clubAssets.js";
import { getCloudinaryUrl, getCloudinaryVideoUrl } from "../utils/cloudinary.js";

// Asymmetric 12 column pattern, repeated. 7x2 anchor, two 5s, then a full width strip.
const PATTERN = [
  "lg:col-span-7 lg:row-span-2",
  "lg:col-span-5",
  "lg:col-span-5",
  "lg:col-span-12",
];

const FILTERS = [
  ["all", "All"],
  ["technical", "Technical"],
  ["non_technical", "Non technical"],
];

// Deterministic motif per club, used when no Cloudinary clip is configured.
function seeded(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function Motif({ id, tall }) {
  const arcs = useMemo(() => {
    const rnd = seeded(id + 3);
    return Array.from({ length: 9 }, (_, i) => ({
      r: 14 + i * 9 + rnd() * 4,
      start: rnd() * 360,
      sweep: 40 + rnd() * 200,
      w: i % 3 === 0 ? 1.5 : 1,
    }));
  }, [id]);

  const point = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r];
  };

  return (
    <svg
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid slice"
      className={`absolute right-0 top-0 h-full w-full transition-transform duration-[1400ms] ease-studio group-hover:rotate-[14deg] group-hover:scale-110 ${
        tall ? "opacity-70" : "opacity-50"
      }`}
      aria-hidden="true"
    >
      {arcs.map((a, i) => {
        const [x1, y1] = point(a.r, a.start);
        const [x2, y2] = point(a.r, a.start + a.sweep);
        const large = a.sweep > 180 ? 1 : 0;
        return (
          <path
            key={i}
            d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${a.r} ${a.r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
            fill="none"
            stroke={i % 4 === 0 ? "rgb(var(--accent-rgb))" : "rgba(255,255,255,0.18)"}
            strokeWidth={a.w}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}

function ClubCard({ club, index, onApply }) {
  const { ref, onPointerMove } = useSpotlight();
  const videoRef = useRef(null);
  const assets = assetsFor(club.name);
  const videoSrc = getCloudinaryVideoUrl(assets.video, { width: 960 });
  const poster = getCloudinaryUrl(assets.poster, { width: 960 });
  const [armed, setArmed] = useState(false); // only start downloading the clip after first hover
  const tall = index % PATTERN.length === 0;

  const enter = () => {
    if (!videoSrc) return;
    setArmed(true);
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
  };
  const leave = () => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  const technical = club.category === "technical";

  return (
    <article
      ref={ref}
      data-card
      onPointerMove={onPointerMove}
      onPointerEnter={enter}
      onPointerLeave={leave}
      className={`spotlight-card group min-h-[15rem] overflow-hidden ${PATTERN[index % PATTERN.length]}`}
    >
      {/* media layer */}
      <div className="absolute inset-0 -z-[1] overflow-hidden">
        {videoSrc ? (
          <>
            {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" loading="lazy" />}
            {armed && (
              <video
                ref={videoRef}
                src={videoSrc}
                poster={poster || undefined}
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 ease-studio group-hover:opacity-60"
              />
            )}
          </>
        ) : (
          <Motif id={club.id} tall={tall} />
        )}
        <div className="absolute inset-0 bg-canvas/40 transition-colors duration-500 group-hover:bg-canvas/10" />
      </div>

      <div className="flex h-full min-h-[inherit] flex-col justify-between p-phi-3 lg:p-phi-4">
        <div className="flex items-start justify-between gap-phi-2">
          <span className="meta">
            {String(index + 1).padStart(2, "0")} / {technical ? "Technical" : "Non technical"}
          </span>
          <span
            className={`meta flex items-center gap-[0.4rem] border px-[0.5rem] py-[0.2rem] ${
              club.recruitment_open ? "border-accent/60 text-accent" : "border-line text-muted"
            }`}
          >
            <span className={`inline-block h-[5px] w-[5px] ${club.recruitment_open ? "bg-accent" : "bg-muted"}`} />
            {club.recruitment_open ? "Recruiting" : "Closed"}
          </span>
        </div>

        <div>
          <h3 className={`font-bold ${tall ? "text-xl" : "text-lg"}`}>{club.name}</h3>
          {club.description && (
            <p className="mt-phi-1 line-clamp-3 max-w-[44ch] text-base text-muted">{club.description}</p>
          )}
          <button
            type="button"
            onClick={() => onApply(club)}
            className="meta mt-phi-2 inline-flex items-center gap-phi-1 text-ink transition-colors hover:text-accent"
          >
            {club.recruitment_open ? "How to apply" : "How recruitment works"}
            <span aria-hidden="true" className="transition-transform duration-300 ease-studio group-hover:translate-x-1">
              &rarr;
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-phi-2 lg:grid-cols-12 lg:auto-rows-[15rem]" aria-busy="true">
      {PATTERN.map((cls, i) => (
        <div key={i} className={`border border-line bg-surface ${cls}`} style={{ minHeight: "15rem" }}>
          <div className="m-phi-3 h-[0.618rem] w-24 animate-pulse bg-line" />
        </div>
      ))}
    </div>
  );
}

export default function DomainsBento({ onApply }) {
  const root = useRef(null);
  const grid = useRef(null);
  const { clubs, status, error } = useClubs();
  const [filter, setFilter] = useState("all");

  const shown = clubs.filter((c) => filter === "all" || c.category === filter);

  // Reveal cards as they enter the viewport. Re-run when the visible set changes.
  useLayoutEffect(() => {
    if (!grid.current || !shown.length) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const ctx = gsap.context(() => {
      gsap.set("[data-card]", { opacity: 0, y: 48 });
      ScrollTrigger.batch("[data-card]", {
        start: "top 90%",
        once: true,
        onEnter: (els) =>
          gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.1, overwrite: true }),
      });
    }, grid);
    return () => ctx.revert();
  }, [shown.length, filter]);

  return (
    <section id="domains" ref={root} className="mx-auto max-w-[1440px] px-phi-3 py-phi-6 lg:px-phi-5">
      <div className="grid grid-cols-1 items-end gap-phi-3 lg:grid-cols-golden lg:gap-phi-4">
        <div>
          <p className="meta">01 / Domains</p>
          <h2 className="mt-phi-2 text-xl font-bold">Pick a lane. Or two.</h2>
          <p className="mt-phi-2 max-w-[48ch] text-base text-muted">
            You can hold one club per category, one technical and one non technical. Choose with that in mind.
          </p>
        </div>

        <div role="tablist" aria-label="Filter clubs by category" className="flex flex-wrap gap-phi-1 lg:justify-end">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`meta border px-phi-2 py-[0.4rem] transition-colors duration-300 ease-studio ${
                filter === value ? "border-accent text-accent" : "border-line hover:border-line-hover hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-phi-4">
        {status === "loading" && <SkeletonGrid />}

        {status === "error" && (
          <div className="border border-line p-phi-4" role="alert">
            <p className="text-lg font-bold">Could not reach the server</p>
            <p className="mt-phi-1 text-base text-muted">
              {error?.message || "Unknown error"}. The free backend sleeps after inactivity and takes up to a minute
              to wake.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-phi-3 border border-accent px-phi-3 py-phi-1 font-mono text-xs uppercase text-accent transition-colors hover:bg-accent hover:text-accent-ink"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && shown.length === 0 && (
          <div className="border border-line p-phi-4">
            <p className="text-lg font-bold">No clubs here yet</p>
            <p className="mt-phi-1 text-base text-muted">
              A site admin can create clubs through the API. They will appear here without a redeploy.
            </p>
          </div>
        )}

        {status === "ready" && shown.length > 0 && (
          <div ref={grid} className="grid grid-cols-1 gap-phi-2 lg:grid-cols-12 lg:auto-rows-[15rem]">
            {shown.map((club, i) => (
              <ClubCard key={club.id} club={club} index={i} onApply={onApply} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
