import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
<<<<<<< HEAD
import {
  BadgeCheck,
  Bell,
  BellRing,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  FileText,
  Inbox,
  User,
} from "lucide-react";
=======
import { Bell } from "lucide-react";
>>>>>>> 4ccedddf7cad4e9719e92047c6894a5bb392f654
import { api, getSession } from "../api";
import { compare } from "../utils/compare";
import "./NotificationBell.css";

// How often the bell re-checks for changes. 15s keeps notifications feeling
// live without hammering the API.
const POLL_INTERVAL_MS = 15_000;

<<<<<<< HEAD
const KIND_META = {
  application: { title: "Application update", icon: FileText },
  interview: { title: "Interview", icon: CalendarDays },
  offer: { title: "Offer", icon: BadgeCheck },
  task: { title: "Task", icon: ClipboardList },
  account: { title: "Account", icon: User },
};

const DEFAULT_META = { title: "Update", icon: Bell };

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

=======
const KIND_TITLES = {
  application: "Application update",
  interview: "Interview",
  offer: "Offer",
  task: "Task",
  account: "Account",
};

>>>>>>> 4ccedddf7cad4e9719e92047c6894a5bb392f654
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
<<<<<<< HEAD
  const wrapRef = useRef(null);
=======
>>>>>>> 4ccedddf7cad4e9719e92047c6894a5bb392f654
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

<<<<<<< HEAD
  // Close on outside click or Escape while the panel is open.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAllRead = async () => {
    setUnread(0);
    setItems((prev) => prev.map((it) => ({ ...it, is_read: 1 })));
    try {
      await api("/notifications/read-all", { method: "PATCH" });
    } catch {
      // best effort — the next poll corrects the badge
    }
  };

  const openItem = (item) => {
    setOpen(false);
    if (!item.is_read) {
      api(`/notifications/${item.id}/read`, { method: "PATCH" }).catch(() => {});
    }
    navigate(navigateTo(getSession()?.role, item.kind));
  };

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button
        className="bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
=======
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
>>>>>>> 4ccedddf7cad4e9719e92047c6894a5bb392f654
        <Bell className="bell" />
        {unread > 0 && <span className="bell-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="bell-panel">
          <div className="bell-panel-head">
<<<<<<< HEAD
            <div className="bell-panel-title">
              <BellRing size={15} />
              <strong>Notifications</strong>
            </div>
            {unread > 0 ? (
              <button className="bell-mark-all" onClick={markAllRead}>
                <CheckCheck size={14} />
                Mark all read
              </button>
            ) : (
              <span className="bell-all-clear">All caught up</span>
            )}
          </div>
          {items.length === 0 ? (
            <div className="bell-empty">
              <Inbox size={28} />
              <p>No notifications yet</p>
              <span>
                Updates about your applications, offers and tasks will show up
                here.
              </span>
            </div>
          ) : (
            <ul className="bell-list">
              {items.slice(0, 20).map((item) => {
                const meta = KIND_META[item.kind] ?? DEFAULT_META;
                const Icon = meta.icon;
                const isRead = !!item.is_read;
                return (
                  <li key={item.id} className={`bell-item${isRead ? "" : " unread"}`}>
                    <button className="bell-item-btn" onClick={() => openItem(item)}>
                      <span className="bell-item-icon">
                        <Icon size={15} />
                      </span>
                      <span className="bell-item-body">
                        <span className="bell-item-top">
                          <strong>{meta.title}</strong>
                          <time>{timeAgo(item.created_at)}</time>
                        </span>
                        <span className="bell-item-msg">{item.message}</span>
                      </span>
                      {!isRead && <span className="bell-item-dot" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
=======
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
>>>>>>> 4ccedddf7cad4e9719e92047c6894a5bb392f654
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;