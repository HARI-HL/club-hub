const TONES = {
  pending: "border-line-hover text-muted",
  accepted: "border-accent/60 text-accent",
  rejected: "border-ink/50 text-ink",
};

export default function StatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  return (
    <span className={`meta inline-block border px-[0.5rem] py-[0.2rem] ${TONES[key] || TONES.pending}`}>
      [{key.toUpperCase() || "UNKNOWN"}]
    </span>
  );
}
