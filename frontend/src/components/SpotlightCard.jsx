import { useRef } from "react";

// Sets --mouse-x / --mouse-y on the element so the `.spotlight-card` border light
// in index.css follows the pointer.
export function useSpotlight() {
  const ref = useRef(null);

  const onPointerMove = (event) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
  };

  return { ref, onPointerMove };
}

export default function SpotlightCard({ as: Tag = "div", className = "", children, ...rest }) {
  const { ref, onPointerMove } = useSpotlight();

  return (
    <Tag
      ref={ref}
      onPointerMove={onPointerMove}
      className={`spotlight-card ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
