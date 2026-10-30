// The backend does not return images (logo_url exists in the database but is not exposed yet).
// Map a club NAME (as stored in the clubs table) to Cloudinary public IDs.
// Upload a short looping clip to Cloudinary, then add its public ID here.
// Clubs without an entry fall back to a generated motif, so nothing breaks while assets are missing.
//
// Example:
//   "Movie Club": { video: "club-hub/movie-club-loop", poster: "club-hub/movie-club-poster" },
export const CLUB_ASSETS = {};

export function assetsFor(clubName) {
  return CLUB_ASSETS[clubName] || {};
}

// Hero scene: optional frame sequence for the Cloudinary canvas scroller (used only if WebGL is unavailable).
// Upload frames named `${prefix}_000`, `${prefix}_001`, ...
export const HERO_FRAMES = { prefix: "", count: 0 };
