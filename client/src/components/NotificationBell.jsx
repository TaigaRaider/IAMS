import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api, getSession } from "../api";
import { compare } from "../utils/compare";
import "./NotificationBell.css";

// How often the bell re-checks for changes. 15s keeps notifications feeling
// live without hammering the API.
const POLL_INTERVAL_MS = 15_000;

const KIND_TITLES = {
  application: "Application update",
  interview: "Interview",
  offer: "Offer",
  task: "Task",
  account: "Account",
};

// Where each notification kind leads, per role.
function navigateTo(role, kind) {
  if (compare(role, "admin")) {
    if (compare(kind, "application")) return "/dashboard/applicants";
    if (compare(kind, "interview")) return "/dashboard/interviews";
    if (compare(kind, "offer")) return "/dashboard/offers";
    if (compare(kind, "task")) return "/dashboard/tasks";
    return "/dashboard";
  }
  if (compare(role, "applicant")) {
    if (compare(kind, "interview")) return "/applicant/interviews";
    if (compare(kind, "offer")) return "/applicant/offers";
    if (compare(kind, "account")) return "/profile";
    return "/applicant";
  }
  if (compare(kind, "account")) return "/profile";
  return "/intern";
}

function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const lastRefetchRef = useRef(0);

  const poll = useCallback(async () => {
    const session = getSession();
    if (!session?.role || !session?.token) return;
    try {
      const data = await api("/notifications");
      setItems(data.items ?? []);
      setUnread(Number(data.unread) || 0);
    } catch {
      return; // transient — the next tick will retry
    }
  }, []);

  const refetchSoon = useCallback(() => {
    const now = Date.now();
    if (now - lastRefetchRef.current < 3_000) return;
    lastRefetchRef.current = now;
    poll();
  }, [poll]);

  useEffect(() => {
    const tick = () => refetchSoon();
    timerRef.current = setInterval(tick, POLL_INTERVAL_MS);
    // Deferred so the first load isn't a synchronous setState in the effect
    // body (keeps react-hooks/set-state-in-effect happy).
    const initial = setTimeout(tick, 0);
    const onActive = () => {
      if (document.visibilityState === "visible") refetchSoon();
    };
    window.addEventListener("focus", onActive);
    document.addEventListener("visibilitychange", onActive);
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(initial);
      window.removeEventListener("focus", onActive);
      document.removeEventListener("visibilitychange", onActive);
    };
  }, [poll, refetchSoon]);

  const openBell = async () => {
    setOpen((v) => !v);
    if (unread > 0) {
      setUnread(0);
      try {
        await api("/notifications/read-all", { method: "PATCH" });
      } catch {
        // best effort — the next poll corrects the badge
      }
    }
  };

  const role = getSession()?.role;

  return (
    <div className="bell-wrap">
      <button className="bell-btn" onClick={openBell} aria-label="Notifications">
        <Bell className="bell" />
        {unread > 0 && <span className="bell-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="bell-panel">
          <div className="bell-panel-head">
            <strong>Notifications</strong>
            <span className="muted">{items.length} total</span>
          </div>
          {items.length === 0 ? (
            <p className="bell-empty">Nothing to show yet.</p>
          ) : (
            <ul className="bell-list">
              {items.slice(0, 20).map((item) => (
                <li key={item.id}>
                  <button
                    className="bell-item"
                    onClick={() => {
                      setOpen(false);
                      navigate(navigateTo(role, item.kind));
                    }}
                  >
                    <strong>{KIND_TITLES[item.kind] ?? "Update"}</strong>
                    <span>{item.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;