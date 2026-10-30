import { createContext, useContext, useEffect, useState } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext(null);

/** Access the Lenis instance (null until mounted, or when reduced motion is on). */
export function useLenis() {
  return useContext(LenisContext);
}

/**
 * Lenis drives the scroll position. GSAP's ticker drives Lenis. ScrollTrigger is told about every
 * Lenis scroll event. One clock for everything, so pinned and scrubbed sections never fight the smoothing.
 */
export default function SmoothScroll({ children }) {
  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return undefined; // native scrolling, ScrollTrigger still works

    const instance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    instance.on("scroll", ScrollTrigger.update);

    const tick = (time) => instance.raf(time * 1000); // gsap ticker is in seconds, Lenis wants ms
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    setLenis(instance);
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
