import { useEffect } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import SmoothScroll, { useLenis } from "./lib/SmoothScroll.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Account from "./pages/Account.jsx";
import AdminClub from "./pages/AdminClub.jsx";
import AdminSite from "./pages/AdminSite.jsx";
import RequireRole from "./components/RequireRole.jsx";

// New page, new scroll position. A link like /#events scrolls to that section once the page has mounted.
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const lenis = useLenis();
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => {
        const el = document.querySelector(hash);
        if (!el) return;
        if (lenis) lenis.scrollTo(el, { offset: -56, duration: 1.2 });
        else el.scrollIntoView({ behavior: "smooth" });
      }, 350);
      return () => clearTimeout(t);
    }
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
    return undefined;
  }, [pathname, hash, lenis]);
  return null;
}

// Shown on every page when the 15 minute token runs out
function SessionNotice() {
  const { expired, dismissExpired } = useAuth();
  const { pathname } = useLocation();
  if (!expired || pathname === "/login") return null;
  return (
    <div role="alert" className="fixed bottom-phi-3 left-phi-3 z-[80] max-w-[22rem] border border-line-hover bg-surface p-phi-2">
      <p className="meta text-ink">Session expired</p>
      <p className="mt-[0.2rem] text-base text-muted">Your login timed out. Sign in again to continue.</p>
      <div className="mt-phi-2 flex gap-phi-2">
        <Link to="/login" className="meta text-accent underline underline-offset-4">
          Sign in
        </Link>
        <button onClick={dismissExpired} className="meta hover:text-ink">
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SmoothScroll>
          <ScrollToTop />
          <SessionNotice />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/account" element={<RequireRole><Account /></RequireRole>} />
            <Route path="/admin/club" element={<RequireRole roles={["club_admin", "site_admin"]}><AdminClub /></RequireRole>} />
            <Route path="/admin/site" element={<RequireRole roles={["site_admin"]}><AdminSite /></RequireRole>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SmoothScroll>
      </AuthProvider>
    </BrowserRouter>
  );
}
