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
    body: "Open the link in the email, then log in. Your session stays signed in for about 30 days on this device.",
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

export default function RecruitmentTimeline() {
  const root = useRef(null);
  const fill = useRef(null);

  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set(fill.current, { scaleY: 1 });
        gsap.set("[data-copy]", { opacity: 1, x: 0 });
        gsap.set("[data-dot]", { backgroundColor: "rgb(226 255 50)", borderColor: "rgb(226 255 50)" });
        return;
      }
      gsap.set(fill.current, { scaleY: 0, transformOrigin: "top center" });

      // The lime fill grows with scroll. The rail is a normal in-flow box, so its height is always right.
      gsap.to(fill.current, {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-track]",
          start: "top 65%",
          end: "bottom 65%",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
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
            gsap.to(copy, { opacity: 1, x: 0, duration: 0.7, ease: "power3.out", overwrite: true });
            gsap.to(dot, { backgroundColor: "rgb(226 255 50)", borderColor: "rgb(226 255 50)", scale: 1.25, duration: 0.4, overwrite: true });
          },
          onLeaveBack: () => {
            gsap.to(copy, { opacity: 0.25, x: 12, duration: 0.5, overwrite: true });
            gsap.to(dot, { backgroundColor: "#070709", borderColor: "rgba(255,255,255,0.22)", scale: 1, duration: 0.4, overwrite: true });
          },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="timeline" ref={root} className="border-t border-line">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-phi-4 px-phi-3 py-phi-6 lg:grid-cols-golden-reverse lg:gap-phi-5 lg:px-phi-5">
        {/* 38.2%: sticky heading (CSS only, no pin) */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="meta">03 / Process</p>
          <h2 className="mt-phi-2 text-xl font-bold">From sign up to seat booked.</h2>
          <p className="mt-phi-2 max-w-[36ch] text-base text-muted">
            Five steps, each one a real request to the server. Nothing here is decoration.
          </p>
        </div>

        {/* 61.8%: the track. Steps flow normally, the rail simply fills the whole height. */}
        <div data-track className="relative">
          <div className="pointer-events-none absolute bottom-0 left-[11px] top-0 w-[1px] bg-white/10" aria-hidden="true">
            <div ref={fill} className="absolute inset-0 origin-top scale-y-0 bg-accent" />
          </div>

          <ol className="relative">
            {STEPS.map((s) => (
              <li key={s.code} data-step className="flex gap-phi-3 pb-phi-5 last:pb-0">
                <span
                  data-dot
                  className="relative z-[1] mt-[2px] block h-[24px] w-[24px] shrink-0 border border-line-hover bg-canvas"
                  aria-hidden="true"
                />
                <div data-copy className="max-w-[52ch]">
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
