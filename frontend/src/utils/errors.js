import { useEffect, useState } from "react";

/** Turn an ApiError into one clean line for the user. Backend messages pass through untouched. */
export function describeError(err) {
  if (!err) return "Something went wrong. Try again.";
  if (err.status === 429) return "Too many attempts. Wait a minute, then try again.";
  return err.message || "Something went wrong. Try again.";
}

/** Counts down after a rate limit so the submit button can stay disabled. */
export function useCooldown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft];
}

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
