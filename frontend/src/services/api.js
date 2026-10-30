// API adapter for the existing Flask backend (backend/app.py).
//
// Rule: no component calls fetch() directly. Every backend call lives here, so the
// frontend never needs to know route shapes and the backend never needs to change.
//
// Backend facts this file is built around:
//  - Auth is a JWT sent as `Authorization: Bearer <token>`. Tokens expire after ~15 minutes
//    (Flask-JWT-Extended default), and there is no refresh route, so users log in again.
//  - App errors come back as { "error": "..." }.
//    Errors raised by the JWT library come back as { "msg": "..." } (missing or expired token).
//    Both are normalised into ApiError below.
//  - Login is limited to 10/min and register to 5/min per IP (HTTP 429).
//  - Times are ISO 8601 strings in UTC. When SENDING a time, include an offset
//    like "+05:30" or the backend answers 400.

const BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

// A free Render backend can take 30 to 60 seconds to wake up after sitting idle.
const TIMEOUT_MS = 60_000;

const TOKEN_KEY = "clubhub_token";

// ---------------------------------------------------------------- token storage
// localStorage can throw (private windows, blocked site data), so every access is guarded.

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

// ---------------------------------------------------------------- errors

export class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status; // HTTP status, or 0 for network failure / timeout
    this.data = data;
  }
}

// Fired when the server rejects a token we sent (expired or invalid).
// A top-level provider can listen for this and send the user to the login page.
export const UNAUTHORIZED_EVENT = "clubhub:unauthorized";

// ---------------------------------------------------------------- core request

async function request(path, { method = "GET", body, auth = false, query } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = tokenStore.get();
  if (auth) {
    if (!token) throw new ApiError(401, "Please log in to continue.");
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError(0, "The server took too long to respond. It may be waking up, try again.");
    }
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  // Parse JSON when there is any. A proxy or host error page can return HTML instead.
  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.error || data.msg)) || `Request failed (${response.status}).`;

    if (response.status === 401 && auth) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(response.status, message, data);
  }

  return data;
}

// ---------------------------------------------------------------- endpoints
// Each function maps to exactly one route in backend/app.py.

export const api = {
  // GET /api/health
  health: () => request("/api/health"),

  auth: {
    // POST /api/auth/register  { name, email, password }  -> 201 { message, id }
    // Password must be 8+ characters. A verification email is sent.
    register: ({ name, email, password }) =>
      request("/api/auth/register", { method: "POST", body: { name, email, password } }),

    // POST /api/auth/login  { email, password }  -> 200 { token, role, name }
    // 401 wrong email or password, 403 disabled or email not verified.
    // Saves the token so later calls with auth: true work.
    login: async ({ email, password }) => {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      tokenStore.set(data.token);
      return data;
    },

    logout: () => tokenStore.clear(),

    isLoggedIn: () => Boolean(tokenStore.get()),

    // GET /api/auth/me  (auth)  -> { id, name, email, role }
    me: () => request("/api/auth/me", { auth: true }),

    // GET /api/auth/verify/<token>  -> { message } or { error }
    // The email link opens this URL on the backend directly. This function exists for a
    // future frontend "verify" page if the link is ever pointed at the frontend.
    verifyEmail: (token) => request(`/api/auth/verify/${encodeURIComponent(token)}`),
  },

  clubs: {
    // GET /api/clubs  -> [{ id, name, category, description, recruitment_open }]
    // category is "technical" or "non_technical". Public.
    list: () => request("/api/clubs"),

    // POST /api/clubs  (site_admin)  { name, category, description }  -> 201 { message, id }
    create: ({ name, category, description }) =>
      request("/api/clubs", { method: "POST", auth: true, body: { name, category, description } }),

    // POST /api/clubs/<id>/admins  (site_admin)  { email }  -> 201 { message }
    addAdmin: (clubId, email) =>
      request(`/api/clubs/${clubId}/admins`, { method: "POST", auth: true, body: { email } }),

    // POST /api/clubs/<id>/apply  (student, club_admin)  { statement }  -> 201 { message, id }
    // 400 recruitment closed, 409 already applied or already in a club of this category.
    apply: (clubId, statement = "") =>
      request(`/api/clubs/${clubId}/apply`, { method: "POST", auth: true, body: { statement } }),

    // GET /api/clubs/<id>/applications?status=pending  (club_admin of this club, or site_admin)
    // -> [{ id, name, email, statement, status, applied_at }]
    applications: (clubId, status) =>
      request(`/api/clubs/${clubId}/applications`, { auth: true, query: { status } }),

    // POST /api/clubs/<id>/recruitment  (club_admin of this club, or site_admin)  { open: boolean }
    // -> { message, recruitment_open }
    setRecruitment: (clubId, open) =>
      request(`/api/clubs/${clubId}/recruitment`, { method: "POST", auth: true, body: { open } }),

    // POST /api/clubs/<id>/events  (club_admin of this club, or site_admin)  -> 201 { message, id }
    // starts_at / ends_at / registration_deadline are ISO strings WITH an offset,
    // for example "2026-11-20T18:00:00+05:30". Deadline must be before the start,
    // and the start must be in the future.
    createEvent: (clubId, event) =>
      request(`/api/clubs/${clubId}/events`, { method: "POST", auth: true, body: event }),
  },

  applications: {
    // POST /api/applications/<id>/review  (club_admin of that club, or site_admin)
    // { decision: "accepted" | "rejected" }  -> { message }
    // Accepting creates the membership. 409 if already reviewed or applicant is already
    // in a club of this category.
    review: (applicationId, decision) =>
      request(`/api/applications/${applicationId}/review`, {
        method: "POST",
        auth: true,
        body: { decision },
      }),
  },

  events: {
    // GET /api/events?club_id=1  -> [{ id, club_id, title, description, venue,
    //   starts_at, registration_deadline, capacity, registered }]   Public.
    // Seats left = capacity - registered.
    list: (clubId) => request("/api/events", { query: { club_id: clubId } }),

    // POST /api/events/<id>/register  (any logged-in role)  -> 201 { message, seats_left }
    // 400 deadline passed, 409 already registered or event is full.
    register: (eventId) =>
      request(`/api/events/${eventId}/register`, { method: "POST", auth: true }),
  },

  me: {
    // GET /api/me/overview  (auth)
    // -> { applications: [{ club, status, applied_at }],
    //      memberships:  [{ club, category, joined_at }],
    //      events:       [{ title, starts_at, venue }] }
    // Note: club is a NAME here, not an id.
    overview: () => request("/api/me/overview", { auth: true }),
  },
};

export default api;
