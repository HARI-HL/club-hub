import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { describeError } from "../utils/errors.js";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SRC = "https://accounts.google.com/gsi/client";

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${SRC}"]`);
    const el = existing || Object.assign(document.createElement("script"), { src: SRC, async: true });
    el.addEventListener("load", () => resolve());
    el.addEventListener("error", () => reject(new Error("Could not load Google sign-in.")));
    if (!existing) document.head.appendChild(el);
  });
}

// Google's own button, rendered into a div. Google returns an ID token, which our backend verifies.
export default function GoogleButton({ onSuccess }) {
  const { loginWithGoogle } = useAuth();
  const box = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let alive = true;
    loadScript()
      .then(() => {
        if (!alive || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            setError(null);
            try {
              await loginWithGoogle(credential);
              onSuccess?.();
            } catch (err) {
              setError(describeError(err));
            }
          },
        });
        window.google.accounts.id.renderButton(box.current, {
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: Math.min(Math.floor(box.current.clientWidth) || 320, 400),
        });
      })
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [loginWithGoogle, onSuccess]);

  if (!CLIENT_ID) return null;

  return (
    <div>
      {/* color-scheme light matches Google's iframe, which removes the opaque white box the browser paints on a mismatch */}
      <div ref={box} className="min-h-[44px] w-full bg-transparent" style={{ colorScheme: "light" }} />
      {error && (
        <p role="alert" className="meta mt-phi-1 normal-case text-ink">
          {error}
        </p>
      )}
      <div className="my-phi-3 flex items-center gap-phi-2" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="meta">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
