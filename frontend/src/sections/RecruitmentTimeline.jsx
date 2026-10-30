import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Each step maps to something the backend really does, so the story is true.
const STEPS = [
  {
    code: "01",
    title: "Create an account",
    body: "Register with your email and a password. We send a verification link that lasts 24 hours.",
    tag: "POST /api/auth/register",
  },
  {
    code: "02",
    title: "Verify and sign in",
    body: "Open the link in the email, then log in. Sessions last about 15 minutes, then you sign in again.",
    tag: "GET /api/auth/verify",
  },
  {
    code: "03",
    title: "Apply to a club",
    body: "Pick a club with recruitment open and write a short statement. One application per club.",
    tag: "POST /api/clubs/:id/apply",
  },
  {
    code: "04",
    title: "Club admins review",
    body: "Admins accept or reject. Acceptance creates your membership in the same database transaction.",
    tag: "POST /api/applications/:id/review",
  },
  {
    code: "05",
    title: "Register for events",
    body: "Seats are first come first served and locked in the database, so a full event can never be oversold.",
    tag: "POST /api/events/:id/register",
  },
];

const ROW = 168; // px between steps on the SVG path
const TOP = 24;

export default function RecruitmentTimeline() {
  const root = useRef(null);
  const path = useRef(null);
  const height = TOP * 2 + ROW * (STEPS.length - 1);

  useLayoutEffect(() => {
    const el = path.current;
    const len = el.getTotalLength();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set(el, { strokeDasharray: len, strokeDashoffset: 0 });
        return;
      }
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });

      // The line draws as the list scrolls through the viewport
      gsap.to(el, {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: { trigger: "[data-track]", start: "top 65%", end: "bottom 65%", scrub: 0.6 },
      });

      // Each step lights up when the line reaches it
      gsap.utils.toArray("[data-step]").forEach((step) => {
        const dot = step.querySelector("[data-dot]");
        const copy = step.querySelector("[data-copy]");
        gsap.set(copy, { opacity: 0.25, x: 12 });
        ScrollTrigger.create({
          trigger: step,
          start: "top 65%",
          onEnter: () => {
            gsap.to(copy, { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" });
            gsap.to(dot, { backgroundColor: "rgb(226 255 50)", borderColor: "rgb(226 255 50)", scale: 1.25, duration: 0.4 });
          },
          onLeaveBack: () => {
            gsap.to(copy, { opacity: 0.25, x: 12, duration: 0.5 });
            gsap.to(dot, { backgroundColor: "#070709", borderColor: "rgba(255,255,255,0.22)", scale: 1, duration: 0.4 });
          },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="timeline" ref={root} className="border-t border-line">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-phi-4 px-phi-3 py-phi-6 lg:grid-cols-golden-reverse lg:gap-phi-5 lg:px-phi-5">
        {/* 38.2%: sticky heading */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="meta">02 / Process</p>
          <h2 className="mt-phi-2 text-xl font-bold">From sign up to seat booked.</h2>
          <p className="mt-phi-2 max-w-[36ch] text-base text-muted">
            Five steps, each one a real request to the server. Nothing here is decoration.
          </p>
        </div>

        {/* 61.8%: the track */}
        <div data-track className="relative" style={{ minHeight: height + 120 }}>
          <svg
            className="absolute left-[11px] top-0 h-full w-[2px] overflow-visible"
            viewBox={`0 0 2 ${height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ height }}
          >
            <line x1="1" y1="0" x2="1" y2={height} stroke="rgba(255,255,255,0.09)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <path
              ref={path}
              d={`M 1 ${TOP} L 1 ${height - TOP}`}
              stroke="rgb(226 255 50)"
              strokeWidth="1.5"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <ol>
            {STEPS.map((s, i) => (
              <li
                key={s.code}
                data-step
                className="absolute left-0 right-0 flex gap-phi-3"
                style={{ top: TOP + i * ROW - 12 }}
              >
                <span
                  data-dot
                  className="mt-[2px] block h-[24px] w-[24px] shrink-0 border border-line-hover bg-canvas"
                  aria-hidden="true"
                />
                <div data-copy className="max-w-[52ch] pb-phi-3">
                  <p className="meta">
                    {s.code} <span className="text-ink">/</span> {s.tag}
                  </p>
                  <h3 className="mt-[0.4rem] text-lg font-bold">{s.title}</h3>
                  <p className="mt-[0.4rem] text-base text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
