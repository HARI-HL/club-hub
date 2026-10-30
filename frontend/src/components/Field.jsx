import { useId } from "react";

// Underlined-box input in the Obsidian style: 1px border, accent on focus, no glow.
export default function Field({ label, hint, error, as: Tag = "input", className = "", ...props }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="meta block">
        {label}
      </label>
      <Tag
        id={id}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={hint || error ? `${id}-note` : undefined}
        className={`mt-[0.4rem] block w-full border bg-glass px-phi-2 py-[0.7rem] font-sans text-base text-ink placeholder:text-muted/60 transition-colors duration-300 ease-studio focus:border-accent focus:outline-none ${
          error ? "border-ink" : "border-line hover:border-line-hover"
        }`}
        {...props}
      />
      {(hint || error) && (
        <p id={`${id}-note`} className={`meta mt-[0.4rem] normal-case ${error ? "text-ink" : ""}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
