import { useEffect, useState } from "react";
import api from "../services/api.js";

// Module level cache so the hero, bento grid and drawer share one request.
let cache = null;
let inflight = null;

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api.clubs
      .list()
      .then((rows) => {
        cache = rows;
        return rows;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Forget the cached list so the next page that mounts fetches fresh clubs (after create or toggle). */
export function invalidateClubs() {
  cache = null;
}

/** Returns { clubs, status } where status is "loading" | "ready" | "error". */
export default function useClubs() {
  const [state, setState] = useState(
    cache ? { clubs: cache, status: "ready", error: null } : { clubs: [], status: "loading", error: null }
  );

  useEffect(() => {
    let alive = true;
    if (cache) return undefined;
    load()
      .then((clubs) => alive && setState({ clubs, status: "ready", error: null }))
      .catch((error) => alive && setState({ clubs: [], status: "error", error }));
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
