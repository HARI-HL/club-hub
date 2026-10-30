import SmoothScroll, { useLenis } from "./lib/SmoothScroll.jsx";
import Hud from "./sections/Hud.jsx";
import Hero from "./sections/Hero.jsx";
import DomainsBento from "./sections/DomainsBento.jsx";
import RecruitmentTimeline from "./sections/RecruitmentTimeline.jsx";

function Page() {
  const lenis = useLenis();

  // "How to apply" explains the flow for now; the account and apply screens come next.
  const explain = () => {
    const t = document.querySelector("#timeline");
    if (lenis) lenis.scrollTo(t, { offset: -56, duration: 1.4 });
    else t.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <a
        href="#domains"
        className="sr-only focus:not-sr-only focus:fixed focus:left-phi-2 focus:top-phi-2 focus:z-[60] focus:bg-accent focus:px-phi-2 focus:py-phi-1 focus:text-accent-ink"
      >
        Skip to clubs
      </a>
      <Hud />
      <main>
        <Hero />
        <DomainsBento onApply={explain} />
        <RecruitmentTimeline />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-phi-2 px-phi-3 py-phi-3 lg:px-phi-5">
          <span className="meta">Club Hub / Built with React, Flask and Postgres</span>
          <a href="https://github.com/HARI-HL/club-hub" className="meta transition-colors hover:text-accent">
            Source on GitHub
          </a>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <SmoothScroll>
      <Page />
    </SmoothScroll>
  );
}
