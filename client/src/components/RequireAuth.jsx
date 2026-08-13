import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, getSession, logout, saveSession } from "../api";
import { ShellSkeleton } from "./Skeletons.jsx";

const HOME_BY_ROLE = {
  admin: "/dashboard",
  applicant: "/applicant",
  intern: "/intern",
};

function RequireAuth({ roles, children }) {
  const location = useLocation();
  const [state, setState] = useState({ checking: true, role: null, deactivated: false });
  // The same Guarded element is reconciled across sibling routes, so this
  // component instance outlives a route change with stale state (e.g.
  // deactivated:true after reactivating from /account). Reset to "checking"
  // during render the moment the route changes — otherwise the stale branch
  // emits a <Navigate> before the async /auth/me re-check can finish, and the
  // two bounce off each other forever.
  const pathRef = useRef(location.pathname);
  // Only transitions between top-level guarded routes can outlive this
  // instance (sibling <Guarded> elements reconcile into the same fiber);
  // in-dashboard navigation keeps the same route subtree alive instead.
  const rootPath = "/" + (location.pathname.split("/")[1] ?? "");
  if (pathRef.current !== rootPath) {
    pathRef.current = rootPath;
    setState({ checking: true, role: null, deactivated: false });
  }

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const local = getSession();
      if (!local?.role) {
        await logout();
        if (!cancelled) setState({ checking: false, role: null, deactivated: false });
        return;
      }
      try {
        // Verify against the server so a stale or forged local session can't
        // be used just by typing a URL. Keep this tab's token — /auth/me
        // doesn't return one, and dropping it would make later requests fall
        // back to the shared httpOnly cookie (last login wins).
        const fresh = await api("/auth/me");
        saveSession({ ...fresh, token: getSession()?.token });
        if (fresh.deactivated) {
          // Deactivated accounts are confined to the account page.
          if (!cancelled) setState({ checking: false, role: null, deactivated: true });
          return;
        }
        if (!cancelled) setState({ checking: false, role: fresh.role, deactivated: false });
      } catch {
        await logout();
        if (!cancelled) setState({ checking: false, role: null, deactivated: false });
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state.checking) {
    return <ShellSkeleton />;
  }

  if (state.deactivated) {
    // The account page is the one place deactivated users are allowed to be —
    // render it directly so AccountStatus can actually mount instead of
    // looping on a Navigate to the same guarded route.
    if (location.pathname === "/account") return children;
    return <Navigate to="/account" replace state={{ from: location.pathname }} />;
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