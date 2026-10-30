import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell.jsx";
import Field from "../components/Field.jsx";
import Notice from "../components/Notice.jsx";
import GoogleButton from "../components/GoogleButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { describeError, useCooldown } from "../utils/errors.js";

export default function Login() {
  const { login, expired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { message, status }
  const [cooldown, setCooldown] = useCooldown();

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!form.email.trim() || !form.password) {
      setError({ message: "Enter your email and password." });
      return;
    }
    setBusy(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(from, { replace: true });
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
      eyebrow="Access / Sign in"
      title="Welcome back."
      intro="Sign in to apply to clubs, track your applications and reserve event seats."
      aside={<p className="meta">Sessions last about 15 minutes, then you sign in again.</p>}
    >
      <GoogleButton onSuccess={() => navigate(from, { replace: true })} />
      <form onSubmit={submit} noValidate className="flex flex-col gap-phi-3">
        {expired && !error && <Notice title="Session expired">Your session timed out. Sign in again to continue.</Notice>}

        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={set("password")}
        />

        {error && (
          <Notice tone="error" title={error.status ? `Error ${error.status}` : "Error"}>
            {error.message}
            {error.status === 403 && /verify/i.test(error.message) && (
              <>
                {" "}
                <Link to="/verify-email" className="text-accent underline underline-offset-4">
                  How to verify
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
          {busy ? "Signing in" : locked ? `Retry in ${cooldown}s` : "Sign in"}
        </button>

        <p className="meta normal-case">
          New here?{" "}
          <Link to="/register" state={{ from }} className="text-accent underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
