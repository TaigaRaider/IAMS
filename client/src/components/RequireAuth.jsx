import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, getSession, logout, saveSession } from "../api";
import LoadingScreen from "./LoadingScreen.jsx";

const HOME_BY_ROLE = {
  admin: "/dashboard",
  applicant: "/applicant",
  intern: "/intern",
};

function RequireAuth({ roles, children }) {
  const location = useLocation();
  const [state, setState] = useState({ checking: true, role: null });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const local = getSession();
      if (!local?.role) {
        await logout();
        if (!cancelled) setState({ checking: false, role: null });
        return;
      }
      try {
        // Verify against the server so a stale or forged local session can't
        // be used just by typing a URL.
        const fresh = await api("/auth/me");
        saveSession(fresh);
        if (!cancelled) setState({ checking: false, role: fresh.role });
      } catch {
        await logout();
        if (!cancelled) setState({ checking: false, role: null });
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.checking) {
    return <LoadingScreen text="Signing you in..." />;
  }

  if (!state.role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!roles.includes(state.role)) {
    return <Navigate to={HOME_BY_ROLE[state.role] ?? "/login"} replace />;
  }

  return children;
}

export default RequireAuth;