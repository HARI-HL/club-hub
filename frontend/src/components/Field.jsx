import { useId, useState } from "react";

// Recessed dark glass well: sharp corners, 1px border, accent focus ring. Password fields get a SHOW / HIDE toggle.
export default function Field({ label, hint, error, as: Tag = "input", className = "", type, ...props }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = Tag === "input" && type === "password";
  const single = Tag === "input" || Tag === "select";

  return (
    <div className={className}>
      <label htmlFor={id} className="meta block">
        {label}
      </label>
      <div className="relative mt-[0.4rem]">
        <Tag
          id={id}
          type={isPassword ? (shown ? "text" : "password") : type}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={hint || error ? `${id}-note` : undefined}
          style={{ colorScheme: "dark" }}
          className={`block w-full rounded-none border bg-black/60 px-phi-2 font-sans text-base text-ink placeholder:text-muted/60 transition-[border-color,box-shadow] duration-300 ease-studio focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 ${
            single ? "h-12" : "py-[0.7rem]"
          } ${isPassword ? "pr-[4.5rem]" : ""} ${error ? "border-ink" : "border-white/10 hover:border-white/25"}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            className="meta absolute inset-y-0 right-0 px-phi-2 text-muted transition-colors hover:text-accent"
          >
            {shown ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {(hint || error) && (
        <p id={`${id}-note`} className={`meta mt-[0.4rem] normal-case ${error ? "text-ink" : ""}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
