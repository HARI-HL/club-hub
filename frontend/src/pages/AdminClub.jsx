import { useCallback, useEffect, useMemo, useState } from "react";
import DashShell from "./DashShell.jsx";
import Field from "../components/Field.jsx";
import Notice from "../components/Notice.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SpotlightCard from "../components/SpotlightCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useClubs, { invalidateClubs } from "../hooks/useClubs.js";
import api from "../services/api.js";
import { describeError, formatDateTime } from "../utils/errors.js";

// datetime-local gives "2026-11-20T18:00" with no offset, which the backend rejects.
// Convert to an exact instant and send it with an explicit +00:00 offset.
const toApiTime = (local) => new Date(local).toISOString().replace("Z", "+00:00");

function RecruitmentToggle({ club, isOpen, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function toggle() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.clubs.setRecruitment(club.id, !isOpen);
      invalidateClubs();
      onChange(res.recruitment_open);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SpotlightCard className="p-phi-3">
      <p className="meta">Recruitment</p>
      <div className="mt-phi-2 flex items-center justify-between gap-phi-3">
        <p className={`font-mono text-base ${isOpen ? "text-accent" : "text-muted"}`}>
          [RECRUITMENT: {isOpen ? "OPEN" : "CLOSED"}]
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={isOpen}
          aria-label={`Recruitment for ${club.name}`}
          onClick={toggle}
          disabled={busy}
          className={`relative h-[1.9rem] w-[3.6rem] shrink-0 border transition-colors duration-300 ease-studio disabled:opacity-40 ${
            isOpen ? "border-accent bg-accent/20" : "border-line-hover bg-glass"
          }`}
        >
          <span
            className={`absolute top-[3px] h-[calc(1.9rem-8px)] w-[1.3rem] transition-all duration-300 ease-studio ${
              isOpen ? "left-[calc(100%-1.3rem-3px)] bg-accent" : "left-[3px] bg-muted"
            }`}
          />
        </button>
      </div>
      <p className="mt-phi-1 text-base text-muted">
        {isOpen ? "Students can apply right now." : "Applications are paused. Students see the club as closed."}
      </p>
      {error && (
        <p role="alert" className="meta mt-phi-1 normal-case text-ink">
          {error}
        </p>
      )}
    </SpotlightCard>
  );
}

function ReviewRow({ app, onReviewed }) {
  const [busy, setBusy] = useState(null); // "accepted" | "rejected"
  const [error, setError] = useState(null);

  async function decide(decision) {
    setError(null);
    setBusy(decision);
    try {
      await api.applications.review(app.id, decision);
      onReviewed(app.id, decision);
    } catch (err) {
      setError(describeError(err)); // for example the one-club-per-category conflict
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="border-t border-line py-phi-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-phi-2">
        <div>
          <p className="text-base font-semibold">{app.name}</p>
          <p className="meta mt-[0.2rem] normal-case">
            {app.email} / applied {formatDateTime(app.applied_at)}
          </p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {app.statement ? (
        <p className="mt-phi-2 max-w-[60ch] border-l border-line-hover pl-phi-2 text-base text-muted">{app.statement}</p>
      ) : (
        <p className="meta mt-phi-2">No statement written</p>
      )}

      {app.status === "pending" && (
        <div className="mt-phi-2 flex gap-phi-2">
          <button
            type="button"
            onClick={() => decide("accepted")}
            disabled={Boolean(busy)}
            className="border border-accent bg-accent px-phi-3 py-[0.45rem] font-mono text-xs uppercase text-accent-ink transition-colors duration-300 ease-studio hover:bg-transparent hover:text-accent disabled:opacity-40"
          >
            {busy === "accepted" ? "Accepting" : "[ACCEPT]"}
          </button>
          <button
            type="button"
            onClick={() => decide("rejected")}
            disabled={Boolean(busy)}
            className="border border-line-hover px-phi-3 py-[0.45rem] font-mono text-xs uppercase transition-colors duration-300 ease-studio hover:border-ink hover:text-ink disabled:opacity-40"
          >
            {busy === "rejected" ? "Rejecting" : "[REJECT]"}
          </button>
        </div>
      )}
      {error && (
        <div className="mt-phi-2">
          <Notice tone="error" title="Could not save the decision">
            {error}
          </Notice>
        </div>
      )}
    </li>
  );
}

function CreateEventForm({ club }) {
  const empty = { title: "", description: "", venue: "", starts_at: "", registration_deadline: "", capacity: "" };
  const [form, setForm] = useState(empty);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);

  // A different club means a fresh form
  useEffect(() => {
    setForm(empty);
    setFieldErrors({});
    setError(null);
    setOk(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club.id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = "Enter a title.";
    if (!form.starts_at) errs.starts_at = "Pick a start time.";
    else if (new Date(form.starts_at) <= new Date()) errs.starts_at = "Start must be in the future.";
    if (!form.registration_deadline) errs.registration_deadline = "Pick a deadline.";
    else if (form.starts_at && new Date(form.registration_deadline) >= new Date(form.starts_at))
      errs.registration_deadline = "Deadline must be before the start.";
    const cap = Number(form.capacity);
    if (!Number.isInteger(cap) || cap < 1) errs.capacity = "Capacity must be a whole number, 1 or more.";
    return errs;
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      await api.clubs.createEvent(club.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        venue: form.venue.trim(),
        starts_at: toApiTime(form.starts_at),
        registration_deadline: toApiTime(form.registration_deadline),
        capacity: Number(form.capacity),
      });
      setOk(`"${form.title.trim()}" is live for ${club.name}.`);
      setForm(empty);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SpotlightCard as="section" className="p-phi-3 lg:p-phi-4">
      <p className="meta">New event</p>
      <h2 className="mt-[0.4rem] text-lg font-bold">Create an event</h2>
      <form onSubmit={submit} noValidate className="mt-phi-3 flex flex-col gap-phi-3">
        <Field label="Title" value={form.title} onChange={set("title")} error={fieldErrors.title} />
        <Field label="Description" as="textarea" rows={3} value={form.description} onChange={set("description")} />
        <Field label="Venue" value={form.venue} onChange={set("venue")} />
        <div className="grid grid-cols-1 gap-phi-3 md:grid-cols-2">
          <Field label="Starts" type="datetime-local" value={form.starts_at} onChange={set("starts_at")} error={fieldErrors.starts_at} />
          <Field
            label="Registration deadline"
            type="datetime-local"
            value={form.registration_deadline}
            onChange={set("registration_deadline")}
            error={fieldErrors.registration_deadline}
          />
        </div>
        <Field
          label="Capacity (seats)"
          type="number"
          min="1"
          inputMode="numeric"
          value={form.capacity}
          onChange={set("capacity")}
          error={fieldErrors.capacity}
        />

        {error && (
          <Notice tone="error" title="Event not created">
            {error}
          </Notice>
        )}
        {ok && (
          <Notice tone="ok" title="Event created">
            {ok}
          </Notice>
        )}

        <button
          type="submit"
          disabled={busy}
          className="border border-accent bg-accent px-phi-3 py-phi-1 font-mono text-xs uppercase text-accent-ink transition-colors duration-300 ease-studio hover:bg-transparent hover:text-accent disabled:opacity-40"
        >
          {busy ? "Creating" : "Create event"}
        </button>
      </form>
    </SpotlightCard>
  );
}

const FILTERS = ["pending", "accepted", "rejected", "all"];

export default function AdminClub() {
  const { user } = useAuth();
  const { clubs, status: clubStatus, error: clubError } = useClubs();

  const [managed, setManaged] = useState(null); // club ids this person can manage, null while checking
  const [apps, setApps] = useState({}); // club id -> applications
  const [appsError, setAppsError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [openOverride, setOpenOverride] = useState({});
  const [filter, setFilter] = useState("pending");

  // Work out which clubs this person manages. There is no "my clubs" route, so a club admin is
  // detected by asking for each club's applications: 200 means managed, 403 means not theirs.
  useEffect(() => {
    if (clubStatus !== "ready") return;
    let alive = true;
    if (user.role === "site_admin") {
      setManaged(clubs.map((c) => c.id));
      setSelectedId((cur) => cur ?? clubs[0]?.id ?? null);
      return undefined;
    }
    Promise.allSettled(clubs.map((c) => api.clubs.applications(c.id))).then((results) => {
      if (!alive) return;
      const ids = [];
      const map = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          ids.push(clubs[i].id);
          map[clubs[i].id] = r.value;
        }
      });
      setApps(map);
      setManaged(ids);
      setSelectedId(ids[0] ?? null);
    });
    return () => {
      alive = false;
    };
  }, [clubStatus, clubs, user.role]);

  // Site admins load a club's applications when they pick it
  useEffect(() => {
    if (selectedId == null || apps[selectedId] !== undefined) return;
    let alive = true;
    setAppsError(null);
    api.clubs
      .applications(selectedId)
      .then((list) => alive && setApps((a) => ({ ...a, [selectedId]: list })))
      .catch((err) => alive && setAppsError(describeError(err)));
    return () => {
      alive = false;
    };
  }, [selectedId, apps]);

  const managedClubs = useMemo(() => clubs.filter((c) => managed?.includes(c.id)), [clubs, managed]);
  const club = managedClubs.find((c) => c.id === selectedId);
  const list = apps[selectedId];
  const isOpen = club ? (club.id in openOverride ? openOverride[club.id] : club.recruitment_open) : false;

  const onReviewed = useCallback(
    (id, decision) => {
      setApps((a) => ({ ...a, [selectedId]: a[selectedId].map((x) => (x.id === id ? { ...x, status: decision } : x)) }));
    },
    [selectedId]
  );

  const counts = useMemo(() => {
    const c = { pending: 0, accepted: 0, rejected: 0, all: list?.length || 0 };
    (list || []).forEach((a) => (c[a.status] = (c[a.status] || 0) + 1));
    return c;
  }, [list]);

  const visible = (list || []).filter((a) => filter === "all" || a.status === filter);

  return (
    <DashShell
      eyebrow="Club admin"
      title="Run your club."
      intro="Open or close recruitment, review applicants and publish events. Only clubs you manage appear here."
    >
      {clubStatus === "loading" && <p className="meta" role="status">Loading clubs</p>}
      {clubStatus === "error" && <Notice tone="error" title="Could not load clubs">{describeError(clubError)}</Notice>}

      {clubStatus === "ready" && managed === null && <p className="meta" role="status">Checking which clubs you manage</p>}

      {managed && managedClubs.length === 0 && (
        <Notice title="No clubs yet">
          {user.role === "site_admin"
            ? "No clubs exist yet. Create one from the Site admin screen."
            : "You are not an admin of any club. A site admin can assign you to one."}
        </Notice>
      )}

      {club && (
        <>
          <div role="tablist" aria-label="Choose a club" className="flex flex-wrap gap-phi-1">
            {managedClubs.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={c.id === selectedId}
                onClick={() => {
                  setSelectedId(c.id);
                  setFilter("pending");
                }}
                className={`meta border px-phi-2 py-[0.4rem] transition-colors duration-300 ease-studio ${
                  c.id === selectedId ? "border-accent text-accent" : "border-line hover:border-line-hover hover:text-ink"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="mt-phi-4 grid grid-cols-1 gap-phi-3 lg:grid-cols-golden lg:gap-phi-4">
            {/* 62%: review queue */}
            <SpotlightCard as="section" className="p-phi-3 lg:p-phi-4 lg:self-start">
              <p className="meta">Applications</p>
              <h2 className="mt-[0.4rem] text-lg font-bold">Review queue</h2>

              <div role="tablist" aria-label="Filter applications" className="mt-phi-3 flex flex-wrap gap-phi-1">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={`meta border px-phi-2 py-[0.35rem] ${
                      filter === f ? "border-accent text-accent" : "border-line hover:border-line-hover hover:text-ink"
                    }`}
                  >
                    {f} {counts[f] ?? 0}
                  </button>
                ))}
              </div>

              <div className="mt-phi-3">
                {appsError && <Notice tone="error" title="Could not load applications">{appsError}</Notice>}
                {!appsError && list === undefined && <p className="meta" role="status">Loading applications</p>}
                {list && visible.length === 0 && (
                  <p className="text-base text-muted">
                    {filter === "pending" ? "Nothing waiting for review." : `No ${filter === "all" ? "" : filter + " "}applications.`}
                  </p>
                )}
                {list && visible.length > 0 && (
                  <ul>
                    {visible.map((a) => (
                      <ReviewRow key={a.id} app={a} onReviewed={onReviewed} />
                    ))}
                  </ul>
                )}
              </div>
            </SpotlightCard>

            {/* 38%: toggle and event form */}
            <div className="flex flex-col gap-phi-3 lg:gap-phi-4">
              <RecruitmentToggle
                club={club}
                isOpen={isOpen}
                onChange={(open) => setOpenOverride((o) => ({ ...o, [club.id]: open }))}
              />
              <CreateEventForm club={club} />
            </div>
          </div>
        </>
      )}
    </DashShell>
  );
}
