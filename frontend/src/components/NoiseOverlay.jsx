// Global film grain. Mount once at the app root.
//
// It is a small tiled SVG (feTurbulence) used as a background image, which is much
// cheaper to paint than an SVG filter stretched over the whole viewport.
// pointer-events: none keeps it from ever blocking a click.

const TILE = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">
     <filter id="n" x="0" y="0" width="100%" height="100%">
       <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
       <feColorMatrix type="saturate" values="0"/>
     </filter>
     <rect width="100%" height="100%" filter="url(#n)"/>
   </svg>`
);

export default function NoiseOverlay() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,${TILE}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "220px 220px",
      }}
    />
  );
}
