import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell.jsx";
import Field from "../components/Field.jsx";
import Notice from "../components/Notice.jsx";
import GoogleButton from "../components/GoogleButton.jsx";
import api from "../services/api.js";
import { describeError, useCooldown } from "../utils/errors.js";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useCooldown();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = "Enter a valid email address.";
    if (form.password.length < 8) errs.password = "Use at least 8 characters.";
    if (form.confirm !== form.password) errs.confirm = "Passwords do not match.";
    return errs;
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const res = await api.auth.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      const mailFailed = /could not be sent/i.test(res?.message || "");
      navigate("/verify-email", { replace: true, state: { email: form.email.trim(), mailFailed, from } });
    } catch (err) {
      if (err.status === 429) setCooldown(60);
      setError({ message: describeError(err), status: err.status });
    } finally {
      setBusy(false);
    }
  }

  const locked = cooldown > 0;

  return (
    <AuthShell
      eyebrow="Access / Create account"
      title="Join the hub."
      intro="One account for every club on campus. We email you a link to confirm it is really you."
      aside={
        <p className="meta normal-case">
          Your password is hashed with bcrypt on the server. It is never stored or logged in plain text.
        </p>
      }
    >
      <GoogleButton onSuccess={() => navigate(from, { replace: true })} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-phi-3">
        <Field label="Full name" autoComplete="name" value={form.name} onChange={set("name")} error={fieldErrors.name} />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
          error={fieldErrors.email}
        />
        <div className="grid grid-cols-1 gap-phi-3 md:grid-cols-2">
          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
            hint="8 characters minimum"
            error={fieldErrors.password}
          />
          <Field
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set("confirm")}
            error={fieldErrors.confirm}
          />
        </div>

        {error && (
          <Notice tone="error" title={error.status ? `Error ${error.status}` : "Error"}>
            {error.message}
            {error.status === 409 && (
              <>
                {" "}
                <Link to="/login" className="text-accent underline underline-offset-4">
                  Sign in instead
                </Link>
              </>
            )}
          </Notice>
        )}

        <button
          type="submit"
          disabled={busy || locked}
          className="border border-accent bg-accent px-phi-3 py-phi-1 font-mono text-xs uppercase text-accent-ink transition-colors duration-300 ease-studio hover:bg-transparent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent disabled:hover:text-accent-ink"
        >
          {busy ? "Creating account" : locked ? `Retry in ${cooldown}s` : "Create account"}
        </button>

        <p className="meta normal-case">
          Already registered?{" "}
          <Link to="/login" state={{ from }} className="text-accent underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
