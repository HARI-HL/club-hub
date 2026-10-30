// Central place for every Cloudinary URL. Components never build these by hand.
//
// Always applied: f_auto (best format per browser) and q_auto (best quality/size trade-off).
// Set VITE_CLOUDINARY_CLOUD_NAME in .env.local (find it on the Cloudinary dashboard).

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

let warned = false;

/**
 * Build a delivery URL for an image or video stored in Cloudinary.
 *
 * @param {string} publicId  The public ID, for example "clubs/movie-club/banner".
 *                           A full http(s) URL is returned unchanged.
 * @param {object} [options]
 * @param {"image"|"video"} [options.type="image"]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @param {string} [options.crop]     e.g. "fill", "fit", "limit" (defaults to "fill" when width or height is set)
 * @param {string} [options.gravity]  e.g. "auto", "face"
 * @param {number|string} [options.quality]  overrides q_auto, e.g. 80
 * @param {string} [options.format]   overrides f_auto, e.g. "webp" or "mp4"
 * @param {string} [options.extra]    extra raw transformations, e.g. "e_blur:200"
 * @param {number} [options.version]  Cloudinary version number, to bust the cache
 * @returns {string}
 */
export function getCloudinaryUrl(publicId, options = {}) {
  if (!publicId) return "";
  if (/^https?:\/\//i.test(publicId)) return publicId;

  if (!CLOUD_NAME) {
    if (!warned) {
      console.warn("[cloudinary] VITE_CLOUDINARY_CLOUD_NAME is not set, so media URLs are empty.");
      warned = true;
    }
    return "";
  }

  const {
    type = "image",
    width,
    height,
    crop,
    gravity,
    quality,
    format,
    extra,
    version,
  } = options;

  const transforms = [];
  transforms.push(`f_${format || "auto"}`);
  transforms.push(`q_${quality || "auto"}`);
  if (type === "video") transforms.push("vc_auto");
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop || "fill"}`);
  if (gravity) transforms.push(`g_${gravity}`);
  transforms.push("dpr_auto");
  if (extra) transforms.push(extra);

  const versionPart = version ? `/v${version}` : "";
  const cleanId = String(publicId).replace(/^\/+/, "");

  return `https://res.cloudinary.com/${CLOUD_NAME}/${type}/upload/${transforms.join(",")}${versionPart}/${cleanId}`;
}

/** Shortcut for hover-loop videos in the bento grid. */
export function getCloudinaryVideoUrl(publicId, options = {}) {
  return getCloudinaryUrl(publicId, { ...options, type: "video" });
}

/**
 * URLs for a numbered frame sequence (the 2D canvas fallback for the 3D centrepiece).
 * Frames are expected as `${prefix}_000`, `${prefix}_001`, ... in Cloudinary.
 */
export function getFrameSequence(prefix, count, options = {}) {
  const pad = String(count - 1).length < 3 ? 3 : String(count - 1).length;
  return Array.from({ length: count }, (_, i) =>
    getCloudinaryUrl(`${prefix}_${String(i).padStart(pad, "0")}`, options)
  );
}
