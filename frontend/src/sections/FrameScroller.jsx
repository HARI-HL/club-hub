import { useEffect, useRef } from "react";
import { getFrameSequence } from "../utils/cloudinary.js";
import { HERO_FRAMES } from "../config/clubAssets.js";

// Fallback for devices without WebGL: a Cloudinary image sequence drawn to a canvas and scrubbed by scroll.
// Needs HERO_FRAMES filled in src/config/clubAssets.js. Without frames it draws a static lattice instead.
export default function FrameScroller({ scroll }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const urls = HERO_FRAMES.count ? getFrameSequence(HERO_FRAMES.prefix, HERO_FRAMES.count, { width: 1200 }) : [];
    const images = urls.filter(Boolean).map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });

    let raf;
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== width * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      if (images.length) {
        const idx = Math.min(images.length - 1, Math.floor(scroll.current * images.length));
        const img = images[idx];
        if (img.complete && img.naturalWidth) {
          const r = Math.min(width / img.naturalWidth, height / img.naturalHeight);
          const w = img.naturalWidth * r;
          const h = img.naturalHeight * r;
          ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
        }
      } else {
        // static lattice: concentric hexagons, rotated by scroll
        ctx.strokeStyle = "rgba(226,255,50,0.7)";
        ctx.lineWidth = 1;
        const cx = width / 2;
        const cy = height / 2;
        for (let ring = 1; ring <= 4; ring++) {
          ctx.beginPath();
          for (let i = 0; i <= 6; i++) {
            const a = (i / 6) * Math.PI * 2 + scroll.current * 2 + ring * 0.2;
            const r = ring * Math.min(width, height) * 0.1;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [scroll]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />;
}
