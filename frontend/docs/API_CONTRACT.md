# Club Hub API contract

Read from `backend/app.py` (commit "Add event registration with seat locking" plus the later recruitment, overview, rate limit and error handler changes). Nothing in the backend was modified. The frontend adapter for all of this is `src/services/api.js`.

## Conventions

- Base URL: `http://127.0.0.1:5000` locally, set through `VITE_API_URL`.
- Auth: `Authorization: Bearer <token>`. The token comes from `POST /api/auth/login` and expires after about 15 minutes. There is no refresh route.
- Request and response bodies are JSON.
- Times in responses are ISO 8601 in UTC, for example `2026-11-20T12:30:00+00:00`.
- Times you send must include an offset, for example `2026-11-20T18:00:00+05:30`.
- Roles: `student`, `club_admin`, `site_admin`.
- "Manages this club" means the user has a row in `club_admins` for that club. A `site_admin` passes this check for every club.

## Error shapes

| Source | Shape | Example |
|---|---|---|
| Application code | `{"error": "message"}` | `{"error": "Email already registered"}` |
| JWT library (missing or expired token) | `{"msg": "message"}` | `{"msg": "Missing Authorization Header"}` |
| Rate limit | `{"error": "Too many requests, please slow down"}` with status 429 | |

`api.js` turns both shapes into one `ApiError` with `.status` and `.message`.

Rate limits per IP: register 5 per minute, login 10 per minute.

## Endpoints

### Health

| Method and path | Auth | Response |
|---|---|---|
| `GET /api/health` | none | `200 {"status": "ok", "database": "connected"}` |

### Authentication

**`POST /api/auth/register`** (no auth)

Request: `{"name": "Hari", "email": "a@b.com", "password": "min8chars"}`

| Status | Body |
|---|---|
| 201 | `{"message": "Account created. Check your email to verify.", "id": 3}` |
| 201 | `{"message": "Account created, but the verification email could not be sent", "id": 3}` (account exists, email failed) |
| 400 | `{"error": "Name, email and password are required"}` or `{"error": "Password must be at least 8 characters"}` |
| 409 | `{"error": "Email already registered"}` |
| 429 | rate limit |

New accounts start with role `student` and `is_verified: false`.

**`POST /api/auth/login`** (no auth)

Request: `{"email": "a@b.com", "password": "..."}`

| Status | Body |
|---|---|
| 200 | `{"token": "eyJ...", "role": "student", "name": "Hari"}` |
| 401 | `{"error": "Invalid email or password"}` (same message for unknown email and wrong password) |
| 403 | `{"error": "This account has been disabled"}` or `{"error": "Please verify your email first"}` |
| 429 | rate limit |

**`GET /api/auth/me`** (any logged-in user)

200: `{"id": 2, "name": "Hari", "email": "a@b.com", "role": "site_admin"}`

**`GET /api/auth/verify/<token>`** (no auth)

Opened from the email link, which points at the backend (`BACKEND_URL`, default `http://127.0.0.1:5000`). The token lasts 24 hours.

| Status | Body |
|---|---|
| 200 | `{"message": "Email verified. You can now log in."}` |
| 400 | `{"error": "This link has expired"}` or `{"error": "Invalid verification link"}` |
| 404 | `{"error": "User not found"}` |

### Clubs

**`GET /api/clubs`** (public)

200: `[{"id": 1, "name": "Movie Club", "category": "non_technical", "description": "...", "recruitment_open": true}]`

Sorted by name. `category` is `technical` or `non_technical`.

**`POST /api/clubs`** (`site_admin`)

Request: `{"name": "Movie Club", "category": "non_technical", "description": "..."}`

| Status | Body |
|---|---|
| 201 | `{"message": "Club created", "id": 1}` |
| 400 | `{"error": "Name and a valid category are required"}` |
| 409 | `{"error": "A club with this name already exists"}` |

**`POST /api/clubs/<club_id>/admins`** (`site_admin`)

Request: `{"email": "person@college.edu"}`

| Status | Body |
|---|---|
| 201 | `{"message": "<name> is now an admin of <club>"}` |
| 400 | `{"error": "That user has not verified their email"}` |
| 404 | `{"error": "Club not found"}` or `{"error": "No user with that email"}` |
| 409 | `{"error": "Already an admin of this club"}` |

A `student` is promoted to `club_admin`. Other roles keep their role.

**`POST /api/clubs/<club_id>/recruitment`** (`club_admin` of this club, or `site_admin`)

Request: `{"open": true}` (must be a real boolean)

| Status | Body |
|---|---|
| 200 | `{"message": "Recruitment updated", "recruitment_open": true}` |
| 400 | `{"error": "'open' must be true or false"}` |
| 403 | `{"error": "You do not manage this club"}` |
| 404 | `{"error": "Club not found"}` |

### Applications (recruitment)

**`POST /api/clubs/<club_id>/apply`** (`student` or `club_admin`)

Request: `{"statement": "Why I want to join"}` (optional text)

| Status | Body |
|---|---|
| 201 | `{"message": "Application submitted", "id": 1}` |
| 400 | `{"error": "Recruitment is closed for this club"}` or `{"error": "You manage this club"}` |
| 404 | `{"error": "Club not found"}` |
| 409 | `{"error": "You are already a member of a club in this category"}` or `{"error": "You have already applied to this club"}` |

A `site_admin` is not allowed to apply (403 `You do not have permission`).

**`GET /api/clubs/<club_id>/applications?status=pending`** (`club_admin` of this club, or `site_admin`)

`status` is optional: `pending`, `accepted` or `rejected`.

200: `[{"id": 1, "name": "Test User", "email": "test@example.com", "statement": "...", "status": "pending", "applied_at": "2026-10-26T20:00:00+00:00"}]`

403 `{"error": "You do not manage this club"}`

**`POST /api/applications/<application_id>/review`** (`club_admin` of that application's club, or `site_admin`)

Request: `{"decision": "accepted"}` or `{"decision": "rejected"}`

| Status | Body |
|---|---|
| 200 | `{"message": "Application accepted"}` |
| 400 | `{"error": "Decision must be accepted or rejected"}` |
| 403 | `{"error": "You do not manage this club"}` |
| 404 | `{"error": "Application not found"}` |
| 409 | `{"error": "This application was already reviewed"}` or `{"error": "The applicant is already in a club of this category"}` or `{"error": "Could not save, a conflict occurred"}` |

Accepting creates the membership in the same transaction. Rejected applicants cannot reapply to the same club.

### Events

**`POST /api/clubs/<club_id>/events`** (`club_admin` of this club, or `site_admin`)

Request:

```json
{
  "title": "Movie Night",
  "description": "Screening and discussion",
  "venue": "Main Auditorium",
  "starts_at": "2026-11-20T18:00:00+05:30",
  "ends_at": "2026-11-20T21:00:00+05:30",
  "capacity": 50,
  "registration_deadline": "2026-11-19T18:00:00+05:30"
}
```

Required: `title`, `starts_at`, `registration_deadline`, `capacity`. Optional: `description`, `venue`, `ends_at`.

| Status | Body |
|---|---|
| 201 | `{"message": "Event created", "id": 1}` |
| 400 | `{"error": "Invalid input: ..."}` (bad date or time without an offset, or missing capacity) |
| 400 | `{"error": "Title, start time and registration deadline are required"}` |
| 400 | `{"error": "Capacity must be at least 1"}` |
| 400 | `{"error": "Start time must be in the future"}` |
| 400 | `{"error": "Registration deadline must be before the start time"}` |
| 400 | `{"error": "End time must be after the start time"}` |
| 403 | `{"error": "You do not manage this club"}` |
| 404 | `{"error": "Club not found"}` |

**`GET /api/events?club_id=1`** (public)

`club_id` is optional. Removed events are excluded. Sorted by start time.

200:

```json
[
  {
    "id": 1,
    "club_id": 1,
    "title": "Movie Night",
    "description": "Screening and discussion",
    "venue": "Main Auditorium",
    "starts_at": "2026-11-20T12:30:00+00:00",
    "registration_deadline": "2026-11-19T12:30:00+00:00",
    "capacity": 2,
    "registered": 0
  }
]
```

Seats left = `capacity - registered`.

**`POST /api/events/<event_id>/register`** (any of the three roles)

No body.

| Status | Body |
|---|---|
| 201 | `{"message": "You are registered", "seats_left": 1}` |
| 400 | `{"error": "Registration has closed for this event"}` |
| 404 | `{"error": "Event not found"}` |
| 409 | `{"error": "You are already registered"}` or `{"error": "This event is full"}` or `{"error": "Could not register, please try again"}` |

### Profile

**`GET /api/me/overview`** (any logged-in user)

```json
{
  "applications": [{"club": "Movie Club", "status": "accepted", "applied_at": "..."}],
  "memberships": [{"club": "Movie Club", "category": "non_technical", "joined_at": "..."}],
  "events": [{"title": "Movie Night", "starts_at": "...", "venue": "Main Auditorium"}]
}
```

Clubs here are names, not ids.

## Gaps the frontend has to work around

These are things the PRD or the UI would want that the backend does not provide. None of them need a backend change to start building.

| Gap | Effect on the frontend |
|---|---|
| `logo_url` exists on the `clubs` table but is not returned by `GET /api/clubs` and cannot be set through `POST /api/clubs` | Club images and banners come from a local map of club id to Cloudinary public ID (`src/config/clubAssets.js`, to be created with the pages) |
| No `GET /api/clubs/<id>` | Find a club by filtering the list from `GET /api/clubs` |
| No route that says which clubs a club admin manages | The admin dashboard cannot list "my clubs" directly. Options: try `GET /api/clubs/<id>/applications` per club and treat 403 as "not mine", or add a small route later |
| No resume or portfolio upload route. Applications carry only a text `statement` | The PRD's file upload step is not possible yet. Use the text statement now, and decide later between a Cloudinary unsigned upload (URL pasted into the statement) or a new backend field |
| Application status tracking is only in `GET /api/me/overview`, by club name | The "track my application" view uses that route |
| No resend-verification and no forgot-password routes | Login screen shows the 403 message and points the user to their email |
| No routes to edit or delete clubs and events, and no event attendee list | Not part of version 1 screens |
| The verification email links to the backend, which answers with raw JSON | After clicking, the user sees JSON. A friendlier page needs `BACKEND_URL` pointed at a frontend route plus a backend redirect, which is a later change |
| Tokens last about 15 minutes with no refresh | The adapter clears the token and fires `clubhub:unauthorized` on any 401 with a token, so the app can send the user back to login |
