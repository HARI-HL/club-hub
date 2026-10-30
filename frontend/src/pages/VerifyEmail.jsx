import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import AuthShell from "./AuthShell.jsx";
import Field from "../components/Field.jsx";
import Notice from "../components/Notice.jsx";
import api from "../services/api.js";
import { describeError } from "../utils/errors.js";

// The backend email link is /api/auth/verify/<token> on the Flask server, which answers with JSON.
// This page handles three cases:
//   1. ?token=...  in the address (if the email link is ever pointed at the frontend): verifies automatically.
//   2. Just registered: tells the user to check their inbox.
//   3. The user opened the raw link and saw JSON: they can paste the code (last part of that address) here.
function extractToken(text) {
  const t = text.trim();
  const match = t.match(/\/verify\/([^/?#\s]+)/);
  return match ? decodeURIComponent(match[1]) : t;
}

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { state } = useLocation();
  const urlToken = params.get("token");

  const [phase, setPhase] = useState(urlToken ? "working" : "idle"); // idle | working | ok | fail
  const [message, setMessage] = useState("");
  const [pasted, setPasted] = useState("");

  async function verify(token) {
    setPhase("working");
    try {
      const res = await api.auth.verifyEmail(token);
      setMessage(res?.message || "Email verified. You can now log in.");
      setPhase("ok");
    } catch (err) {
      setMessage(describeError(err));
      setPhase("fail");
    }
  }

  useEffect(() => {
    if (urlToken) verify(urlToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken]);

  return (
    <AuthShell
      eyebrow="Access / Verify email"
      title={phase === "ok" ? "You are verified." : "Check your inbox."}
      intro="We sent a confirmation link that stays valid for 24 hours. Open it, then sign in."
      aside={<p className="meta normal-case">Look in spam too. The sender is the Club Hub Gmail account.</p>}
    >
      <div className="flex flex-col gap-phi-3">
        {state?.email && phase === "idle" && (
          <Notice tone={state.mailFailed ? "error" : "ok"} title={state.mailFailed ? "Account created" : "Email sent"}>
            {state.mailFailed
              ? `Your account exists, but the email to ${state.email} could not be sent. Ask a site admin to verify you, or try again later.`
              : `We sent a link to ${state.email}.`}
          </Notice>
        )}

        {phase === "working" && <Notice title="Verifying">Checking your link...</Notice>}
        {phase === "ok" && <Notice tone="ok" title="Done">{message}</Notice>}
        {phase === "fail" && <Notice tone="error" title="Could not verify">{message}</Notice>}

        {phase !== "ok" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pasted.trim()) verify(extractToken(pasted));
            }}
            className="flex flex-col gap-phi-2 border-t border-line pt-phi-3"
          >
            <p className="text-base text-muted">
              Clicked the link and saw plain text instead of this page? Copy the whole address from the browser bar and
              paste it here.
            </p>
            <Field
              label="Verification link or code"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="http://.../api/auth/verify/..."
            />
            <button
              type="submit"
              disabled={phase === "working" || !pasted.trim()}
              className="self-start border border-line-hover px-phi-3 py-phi-1 font-mono text-xs uppercase text-ink transition-colors duration-300 ease-studio hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Verify
            </button>
          </form>
        )}

        <Link
          to="/login"
          state={{ from: state?.from }}
          className={`self-start border px-phi-3 py-phi-1 font-mono text-xs uppercase transition-colors duration-300 ease-studio ${
            phase === "ok"
              ? "border-accent bg-accent text-accent-ink hover:bg-transparent hover:text-accent"
              : "border-line text-muted hover:text-ink"
          }`}
        >
          {phase === "ok" ? "Sign in" : "Go to sign in"}
        </Link>
      </div>
    </AuthShell>
  );
}
