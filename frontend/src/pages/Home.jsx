import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Hud from "../sections/Hud.jsx";
import Hero from "../sections/Hero.jsx";
import DomainsBento from "../sections/DomainsBento.jsx";
import EventsSection from "../sections/EventsSection.jsx";
import RecruitmentTimeline from "../sections/RecruitmentTimeline.jsx";
import HallOfBuilders from "../sections/HallOfBuilders.jsx";
import ApplyDrawer from "../sections/ApplyDrawer.jsx";

export default function Home() {
  const [applyTo, setApplyTo] = useState(null);
  const close = useCallback(() => setApplyTo(null), []);
  const main = useRef(null);

  // Clubs and events load after first paint and change the page height. Re-measure every
  // trigger whenever <main ref={main}> changes size so the timeline never drifts.
  useEffect(() => {
    const el = main.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    let timer;
    let last = el.offsetHeight;
    const ro = new ResizeObserver(() => {
      const h = el.offsetHeight;
      if (Math.abs(h - last) < 2) return;
      last = h;
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 120);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      <a
        href="#domains"
        className="sr-only focus:not-sr-only focus:fixed focus:left-phi-2 focus:top-phi-2 focus:z-[60] focus:bg-accent focus:px-phi-2 focus:py-phi-1 focus:text-accent-ink"
      >
        Skip to clubs
      </a>
      <Hud />
      <main ref={main}>
        <Hero />
        <DomainsBento onApply={setApplyTo} />
        <EventsSection />
        <RecruitmentTimeline />
        <HallOfBuilders onInspect={setApplyTo} />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-phi-2 px-phi-3 py-phi-3 lg:px-phi-5">
          <span className="meta">Club Hub / Built with React, Flask and Postgres</span>
          <a href="https://github.com/HARI-HL/club-hub" className="meta transition-colors hover:text-accent">
            Source on GitHub
          </a>
        </div>
      </footer>
      <ApplyDrawer club={applyTo} onClose={close} />
    </>
  );
}
