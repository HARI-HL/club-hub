// Inline message block. tone "error" is announced to screen readers immediately.
export default function Notice({ tone = "info", title, children }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`border px-phi-2 py-phi-1 ${tone === "error" ? "border-ink/60" : tone === "ok" ? "border-accent/60" : "border-line"}`}
    >
      {title && <p className={`meta ${tone === "ok" ? "text-accent" : "text-ink"}`}>{title}</p>}
      <p className="mt-[0.2rem] text-base text-muted">{children}</p>
    </div>
  );
}
