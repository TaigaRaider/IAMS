import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, getSession, logout, saveSession } from "../api";
import { ShellSkeleton } from "./Skeletons.jsx";

const HOME_BY_ROLE = {
  admin: "/dashboard",
  applicant: "/applicant",
  intern: "/intern",
};

// How many times to retry /auth/me after a transient failure (429 / 5xx /
// network drop) before giving up and showing a retry screen instead of
// silently logging the user out.
const MAX_TRANSIENT_ATTEMPTS = 3;

function RequireAuth({ roles, children }) {
  const location = useLocation();
  const [tick, setTick] = useState(0);
  const attemptsRef = useRef(0);
  const [state, setState] = useState({
    checking: true,
    role: null,
    deactivated: false,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const local = getSession();
      if (!local?.role) {
        await logout();
        if (!cancelled) {
          attemptsRef.current = 0;
          setState({ checking: false, role: null, deactivated: false, error: "" });
        }
        return;
      }
      try {
        // Verify against the server so a stale or forged local session can't
        // be used just by typing a URL. Keep this tab's token — /auth/me
        // doesn't return one, and dropping it would make later requests fall
        // back to the shared httpOnly cookie (last login wins).
        const fresh = await api("/auth/me");
        saveSession({ ...fresh, token: getSession()?.token });
        attemptsRef.current = 0;
        if (fresh.deactivated) {
          // Deactivated accounts are confined to the account page.
          if (!cancelled) setState({ checking: false, role: null, deactivated: true, error: "" });
          return;
        }
        if (!cancelled) setState({ checking: false, role: fresh.role, deactivated: false, error: "" });
      } catch (err) {
        if (cancelled) return;
        const status = err?.status;
        const isAuthFailure =
          status === 401 ||
          /token|expired|sign in/i.test(String(err?.message ?? ""));
        if (isAuthFailure) {
          // Genuinely invalid/expired session — clear it and send to login.
          await logout();
          if (!cancelled) {
            attemptsRef.current = 0;
            setState({ checking: false, role: null, deactivated: false, error: "" });
          }
          return;
        }
        // Transient (429 rate limit, 5xx, network drop): retry with backoff
        // rather than kicking the user out, then surface a retry screen.
        if (attemptsRef.current < MAX_TRANSIENT_ATTEMPTS - 1) {
          attemptsRef.current += 1;
          const wait = 800 * attemptsRef.current;
          setTimeout(() => {
            if (!cancelled) setTick((t) => t + 1);
          }, wait);
          return;
        }
        attemptsRef.current = 0;
        setState({
          checking: false,
          role: null,
          deactivated: false,
          error:
            err?.message ||
            "Can't reach the server. Please check your connection and try again.",
        });
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const retry = () => {
    attemptsRef.current = 0;
    setState({ checking: true, role: null, deactivated: false, error: "" });
    setTick((t) => t + 1);
  };

  if (state.checking) {
    return <ShellSkeleton />;
  }

  if (state.error) {
    return (
      <div className="gate-error">
        <p className="form-error">{state.error}</p>
        <button type="button" className="task-btn" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  if (!state.role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (state.deactivated) {
    return <Navigate to="/account" replace state={{ from: location.pathname }} />;
  }

  if (!roles.includes(state.role)) {
    return <Navigate to={HOME_BY_ROLE[state.role] ?? "/login"} replace />;
  }

  return children;
}

export default RequireAuth;