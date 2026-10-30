import { useMemo, useState } from "react";
import DashShell from "./DashShell.jsx";
import Field from "../components/Field.jsx";
import Notice from "../components/Notice.jsx";
import SpotlightCard from "../components/SpotlightCard.jsx";
import useClubs, { invalidateClubs } from "../hooks/useClubs.js";
import api from "../services/api.js";
import { describeError } from "../utils/errors.js";

function CreateClubForm({ onCreated }) {
  const empty = { name: "", category: "technical", description: "", image: "" };
  const [form, setForm] = useState(empty);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    if (!form.name.trim()) {
      setFieldErrors({ name: "Enter a club name." });
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const res = await api.clubs.create({
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
      });
      invalidateClubs();
      setCreated({ id: res.id, name: form.name.trim(), image: form.image.trim(), message: res.message });
      onCreated({ id: res.id, name: form.name.trim(), category: form.category });
      setForm(empty);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SpotlightCard as="section" className="p-phi-3 lg:p-phi-4">
      <p className="meta">01 / Clubs</p>
      <h2 className="mt-[0.4rem] text-lg font-bold">Create a club</h2>
      <form onSubmit={submit} noValidate className="mt-phi-3 flex flex-col gap-phi-3">
        <Field label="Club name" value={form.name} onChange={set("name")} error={fieldErrors.name} />

        <Field label="Category" as="select" value={form.category} onChange={set("category")}>
          <option value="technical">Technical</option>
          <option value="non_technical">Non-Technical</option>
        </Field>

        <Field label="Description" as="textarea" rows={3} value={form.description} onChange={set("description")} />

        <Field
          label="Cloudinary image URL or public ID (optional)"
          value={form.image}
          onChange={set("image")}
          placeholder="club-hub/movie-club-poster"
          hint="The server does not store images yet. After creating, you get one line to paste into clubAssets.js."
        />

        {error && (
          <Notice tone="error" title="Club not created">
            {error}
          </Notice>
        )}
        {created && (
          <Notice tone="ok" title={`Created / id ${created.id}`}>
            {created.message || "Club created"}: {created.name}.
          </Notice>
        )}
        {created?.image && (
          <div className="border border-line p-phi-2">
            <p className="meta">Add to src/config/clubAssets.js</p>
            <pre className="mt-phi-1 overflow-x-auto font-mono text-xs normal-case tracking-normal text-ink">
              {`"${created.name}": { poster: "${created.image}" },`}
            </pre>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="border border-accent bg-accent px-phi-3 py-phi-1 font-mono text-xs uppercase text-accent-ink transition-colors duration-300 ease-studio hover:bg-transparent hover:text-accent disabled:opacity-40"
        >
          {busy ? "Creating" : "Create club"}
        </button>
      </form>
    </SpotlightCard>
  );
}

function AssignAdminForm({ clubs }) {
  const [clubId, setClubId] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const errs = {};
    if (!clubId) errs.club = "Choose a club.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const res = await api.clubs.addAdmin(clubId, email.trim());
      setOk(res.message);
      setEmail("");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SpotlightCard as="section" className="p-phi-3 lg:p-phi-4">
      <p className="meta">02 / Admins</p>
      <h2 className="mt-[0.4rem] text-lg font-bold">Assign a club admin</h2>
      <p className="mt-phi-1 text-base text-muted">The person needs a registered, verified account first.</p>
      <form onSubmit={submit} noValidate className="mt-phi-3 flex flex-col gap-phi-3">
        <Field label="Club" as="select" value={clubId} onChange={(e) => setClubId(e.target.value)} error={fieldErrors.club}>
          <option value="">Select a club</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Field>
        <Field
          label="User email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />

        {error && (
          <Notice tone="error" title="Could not assign">
            {error}
          </Notice>
        )}
        {ok && (
          <Notice tone="ok" title="Assigned">
            {ok}
          </Notice>
        )}

        <button
          type="submit"
          disabled={busy}
          className="border border-accent bg-accent px-phi-3 py-phi-1 font-mono text-xs uppercase text-accent-ink transition-colors duration-300 ease-studio hover:bg-transparent hover:text-accent disabled:opacity-40"
        >
          {busy ? "Assigning" : "Assign admin"}
        </button>
      </form>
    </SpotlightCard>
  );
}

export default function AdminSite() {
  const { clubs, status } = useClubs();
  const [added, setAdded] = useState([]);

  const all = useMemo(() => {
    const ids = new Set(clubs.map((c) => c.id));
    return [...clubs, ...added.filter((a) => !ids.has(a.id))];
  }, [clubs, added]);

  return (
    <DashShell
      eyebrow="Site admin"
      title="Set up the hub."
      intro="Create clubs and give people the keys to run them. Only site admins can do either."
    >
      <div className="grid grid-cols-1 gap-phi-3 lg:grid-cols-golden lg:gap-phi-4">
        <CreateClubForm onCreated={(c) => setAdded((a) => [...a, c])} />
        <div className="flex flex-col gap-phi-3 lg:gap-phi-4">
          <AssignAdminForm clubs={all} />
          <SpotlightCard as="section" className="p-phi-3">
            <p className="meta">Existing clubs / {status === "ready" ? all.length : "..."}</p>
            <ul className="mt-phi-2">
              {all.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-phi-2 border-t border-line py-[0.6rem] first:border-t-0">
                  <span className="text-base">{c.name}</span>
                  <span className="meta">[{c.category === "technical" ? "TECHNICAL" : "NON-TECHNICAL"}]</span>
                </li>
              ))}
              {status === "ready" && all.length === 0 && <li className="text-base text-muted">None yet.</li>}
            </ul>
          </SpotlightCard>
        </div>
      </div>
    </DashShell>
  );
}
