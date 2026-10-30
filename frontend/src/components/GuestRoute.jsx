import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// For /login and /register. A signed-in person never sees them: they go straight back to where they came from, or home.
export default function GuestRoute({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  const [slow, setSlow] = useState(false);

  // The free backend can take a while to wake up, so say so instead of looking frozen
  useEffect(() => {
    if (ready) return undefined;
    const t = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(t);
  }, [ready]);

  if (!ready) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-phi-3">
        <div className="text-center" role="status">
          <p className="font-display text-base font-bold tracking-tight">
            CLUB<span className="text-accent">/</span>HUB
          </p>
          <p className="meta mt-phi-2 animate-pulse">Checking session</p>
          {slow && <p className="meta mt-phi-1 normal-case">The server is waking up. This can take up to a minute.</p>}
        </div>
      </div>
    );
  }
  if (user) return <Navigate to={location.state?.from || "/"} replace />;
  return children;
}
