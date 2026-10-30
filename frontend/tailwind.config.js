/** @type {import('tailwindcss').Config} */

// Golden ratio. Every size, split and spacing step below is derived from it.
const PHI = 1.618;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // Replaced (not extended) on purpose: only the five sizes from the PRD exist.
    // If a class like `text-sm` or `text-2xl` does nothing, that is the guardrail working.
    fontSize: {
      // Monospace uppercase metadata
      xs: ["0.618rem", { lineHeight: "1.618", letterSpacing: "0.12em" }],
      // Body copy
      base: ["1rem", { lineHeight: "1.618" }],
      // Card headings
      lg: ["1.618rem", { lineHeight: "1.25" }],
      // Section titles
      xl: ["2.618rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      // Display headlines (6.854 = phi^4)
      hero: [
        "clamp(3.2rem, 6.854vw, 6.854rem)",
        { lineHeight: "0.95", letterSpacing: "-0.04em" },
      ],
    },

    // Replaced on purpose: the PRD forbids generic shadows (shadow-md, shadow-xl).
    // Depth comes from borders, blur and light, not drop shadows.
    boxShadow: {
      none: "none",
      hairline: "inset 0 0 0 1px rgba(255, 255, 255, 0.07)",
      specular: "inset 0 1px 0 0 rgba(255, 255, 255, 0.12)",
    },

    extend: {
      colors: {
        canvas: "#070709",
        surface: "#0D0E12",
        glass: "rgba(255, 255, 255, 0.03)",
        line: "rgba(255, 255, 255, 0.07)",
        "line-hover": "rgba(255, 255, 255, 0.22)",
        ink: "#F3F4F6",
        muted: "#8E929F",
        // One accent for the whole site. Change --accent in src/index.css to swap it.
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        "accent-ink": "#070709",
      },

      fontFamily: {
        display: ['"Syne"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },

      // Golden ratio layout splits. Use as `grid-cols-golden` (62 / 38).
      // They collapse to one column below `lg`, so build laptop first and stack on phones.
      gridTemplateColumns: {
        golden: `${PHI}fr 1fr`,
        "golden-reverse": `1fr ${PHI}fr`,
      },

      // phi spacing steps: 0.618, 1, 1.618, 2.618, 4.236, 6.854, 11.09 rem
      spacing: {
        "phi-1": "0.618rem",
        "phi-2": "1rem",
        "phi-3": "1.618rem",
        "phi-4": "2.618rem",
        "phi-5": "4.236rem",
        "phi-6": "6.854rem",
        "phi-7": "11.09rem",
      },

      transitionTimingFunction: {
        // Slow settle, used for reveals and the magnetic button
        studio: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
