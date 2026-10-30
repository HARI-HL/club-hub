import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { UNAUTHORIZED_EVENT } from "../services/api.js";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, name, email, role }
  const [ready, setReady] = useState(!api.auth.isLoggedIn());
  const [expired, setExpired] = useState(false);

  // If a token is already stored, find out who it belongs to
  useEffect(() => {
    if (!api.auth.isLoggedIn()) return;
    api.auth
      .me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // api.js fires this when the server rejects our token (about 15 minutes after login)
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setExpired(true);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onExpired);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await api.auth.login(credentials); // stores the token
    setUser({ name: data.name, role: data.role });
    setExpired(false);
    api.auth.me().then(setUser).catch(() => {});
    return data;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const data = await api.auth.google(credential); // stores the token
    setUser({ name: data.name, role: data.role });
    setExpired(false);
    api.auth.me().then(setUser).catch(() => {});
    return data;
  }, []);

  const logout = useCallback(() => {
    api.auth.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, expired, dismissExpired: () => setExpired(false), login, loginWithGoogle, logout }),
    [user, ready, expired, login, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
