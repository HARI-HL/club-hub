import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Component } from "react";
import useClubs from "../hooks/useClubs.js";
import { useLenis } from "../lib/SmoothScroll.jsx";
// three.js is the heaviest dependency, so it loads in its own chunk after first paint
const HeroScene = lazy(() => import("./HeroScene.jsx"));
import FrameScroller from "./FrameScroller.jsx";

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// If the 3D scene throws (old GPU, blocked WebGL), fall back instead of blanking the hero.
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Readout({ label, value }) {
  return (
    <div>
      <dt className="meta">{label}</dt>
      <dd className="mt-1 font-mono text-base tabular-nums text-ink">{value}</dd>
    </div>
  );
}

export default function Hero() {
  const root = useRef(null);
  const sceneBox = useRef(null);
  const pointer = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);
  const [inView, setInView] = useState(true);
  const [gl] = useState(webglAvailable);
  const lenis = useLenis();
  const { clubs, status } = useClubs();

  const open = clubs.filter((c) => c.recruitment_open).length;
  const technical = clubs.filter((c) => c.category === "technical").length;

  // Entrance and scroll linkage
  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (!reduced) {
        gsap.from("[data-line] > span", {
          yPercent: 110,
          duration: 1.1,
          ease: "power4.out",
          stagger: 0.12,
          delay: 0.1,
        });
        gsap.from("[data-fade]", { opacity: 0, y: 16, duration: 0.9, ease: "power3.out", stagger: 0.08, delay: 0.5 });
        gsap.from(sceneBox.current, { opacity: 0, scale: 0.94, duration: 1.4, ease: "power3.out", delay: 0.2 });
      }

      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => {
          scroll.current = self.progress;
        },
        onToggle: (self) => setInView(self.isActive),
      });

      if (!reduced) {
        gsap.to("[data-headline]", {
          yPercent: -12,
          opacity: 0.2,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
      }
    }, root);
    return () => ctx.revert();
  }, []);

  // Pointer tilt (normalised -1..1 around the hero centre)
  useEffect(() => {
    const el = root.current;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, []);

  const jump = (e) => {
    e.preventDefault();
    const t = document.querySelector("#domains");
    if (lenis) lenis.scrollTo(t, { offset: -56, duration: 1.4 });
    else t.scrollIntoView({ behavior: "smooth" });
  };

  const fallback = <FrameScroller scroll={scroll} />;

  return (
    <section id="hero" ref={root} className="relative min-h-[100dvh] overflow-hidden border-b border-line">
      <div className="mx-auto grid min-h-[100dvh] max-w-[1440px] grid-cols-1 px-phi-3 pt-[calc(3.5rem+2.618rem)] lg:grid-cols-golden lg:gap-phi-4 lg:px-phi-5 lg:pt-0">
        {/* 61.8%: the argument */}
        <div className="relative z-10 flex flex-col justify-center pb-phi-4 lg:pb-0">
          <p data-fade className="meta">
            SRM Tiruchirappalli / Student clubs / Recruitment 2026
          </p>

          <h1 data-headline className="mt-phi-3 text-hero font-extrabold">
            <span data-line className="block overflow-hidden pb-[0.08em]">
              <span className="block">Every club.</span>
            </span>
            <span data-line className="block overflow-hidden pb-[0.08em]">
              <span className="block">
                One <span className="text-accent">door.</span>
              </span>
            </span>
          </h1>

          <p data-fade className="mt-phi-3 max-w-[38ch] text-base text-muted">
            Browse every club on campus, see who is recruiting right now, apply once and track the answer. No forms
            in group chats, no missed deadlines.
          </p>

          <div data-fade className="mt-phi-4 flex flex-wrap items-center gap-phi-3">
            <a
              href="#domains"
              onClick={jump}
              className="border border-accent bg-accent px-phi-3 py-phi-1 font-mono text-xs uppercase text-accent-ink transition-colors duration-300 ease-studio hover:bg-transparent hover:text-accent"
            >
              Browse clubs
            </a>
            <span className="meta">Scroll to see how it works</span>
          </div>

          <dl data-fade className="mt-phi-5 grid max-w-[34rem] grid-cols-3 gap-phi-3 border-t border-line pt-phi-3">
            <Readout label="Clubs" value={status === "ready" ? String(clubs.length).padStart(2, "0") : "--"} />
            <Readout label="Recruiting" value={status === "ready" ? String(open).padStart(2, "0") : "--"} />
            <Readout label="Technical" value={status === "ready" ? String(technical).padStart(2, "0") : "--"} />
          </dl>
          {status === "error" && (
            <p className="meta mt-phi-2 text-ink" role="alert">
              Backend unreachable. It may be waking up, retry in a minute.
            </p>
          )}
        </div>

        {/* 38.2%: the instrument */}
        <div ref={sceneBox} className="relative h-[52vh] min-h-[22rem] lg:h-auto lg:min-h-[100dvh]">
          <div className="absolute inset-0 lg:-left-[18%] lg:-right-[6%]">
            {gl ? (
              <SceneBoundary fallback={fallback}>
                <Suspense fallback={null}>
                  <HeroScene clubCount={clubs.length} pointer={pointer} scroll={scroll} active={inView} />
                </Suspense>
              </SceneBoundary>
            ) : (
              fallback
            )}
          </div>
          <p className="meta pointer-events-none absolute bottom-phi-3 right-0 hidden text-right lg:block">
            Fig. 01
            <br />
            Each node is a club
          </p>
        </div>
      </div>
    </section>
  );
}
