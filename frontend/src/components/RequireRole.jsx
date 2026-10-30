import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import DashShell from "../pages/DashShell.jsx";
import Notice from "./Notice.jsx";

// Sends logged-out visitors to /login and shows a plain message to the wrong role.
// This only hides screens. Real protection is the backend role checks on every request.
export default function RequireRole({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <p className="meta" role="status">
          Loading
        </p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <DashShell eyebrow="Access" title="Not allowed">
        <Notice tone="error" title="Forbidden">
          Your account role is {user.role.replace("_", " ")}. This screen is for {roles.map((r) => r.replace("_", " ")).join(" or ")}.
        </Notice>
      </DashShell>
    );
  }
  return children;
}
