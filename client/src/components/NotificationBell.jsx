import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api, getSession } from "../api";
import { compare } from "../utils/compare";
import "./NotificationBell.css";

// How often the bell re-checks for changes. 15s keeps notifications feeling
// live without hammering the API (3 small requests per tick for admins).
const POLL_INTERVAL_MS = 15_000;

const SEEN_KEY = "iams_notifications_seen";

function loadSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveSeen(seen) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
}

const IN_OFFER_STATUSES = ["Extended", "In Negotiation", "Final", "Accepted", "Confirmed", "Declined"];
const ADMIN_OFFER_STATUSES = ["Extended", "In Negotiation", "Accepted"];
const INTERVIEW_STATUSES = ["Pending", "Confirmed"];

function buildItems(role, apps, interviews, offers, tasks) {
  const items = [];
  if (compare(role, "admin")) {
    for (const app of apps ?? []) {
      items.push({
        key: `app:${app.id}`,
        title: "New application",
        body: `${app.applicant_name ?? "Someone"} applied for ${app.role_title ?? "a role"}`,
        to: "/dashboard/applicants",
      });
    }
    for (const iv of interviews ?? []) {
      if (!INTERVIEW_STATUSES.includes(iv.status)) continue;
      items.push({
        key: `interview:${iv.id}:${iv.status}`,
        title: compare(iv.status, "Confirmed") ? "Interview confirmed" : "Interview requested",
        body: `${iv.applicant_name ?? "An applicant"} · ${iv.role_title ?? "a role"}`,
        to: "/dashboard/interviews",
      });
    }
    for (const offer of offers ?? []) {
      if (!ADMIN_OFFER_STATUSES.includes(offer.status)) continue;
      items.push({
        key: `offer:${offer.id}:${offer.status}`,
        title: compare(offer.status, "Accepted")
          ? "Offer accepted — confirm hire"
          : compare(offer.status, "Extended")
            ? "Offer extended"
            : "Offer in negotiation",
        body: `${offer.applicant_name ?? "A candidate"} · ${offer.role_title ?? "a role"}`,
        to: `/dashboard/offers/${offer.id}`,
      });
    }
    return items;
  }

  if (compare(role, "applicant")) {
    for (const app of apps ?? []) {
      if (compare(app.status, "In Review")) continue;
      items.push({
        key: `app:${app.id}:${app.status}`,
        title: `Application ${app.status}`,
        body: `Your application for ${app.role_title ?? "the role"} is now ${app.status}`,
        to: "/applicant",
      });
    }
    for (const iv of interviews ?? []) {
      items.push({
        key: `interview:${iv.id}:${iv.status}`,
        title: compare(iv.status, "Confirmed")
          ? "Interview confirmed"
          : compare(iv.status, "Cancelled")
            ? "Interview cancelled"
            : `Interview ${iv.status}`,
        body: `${iv.role_title ?? "A role"} · ${iv.scheduled_at ?? ""}`,
        to: "/applicant/interviews",
      });
    }
    for (const offer of offers ?? []) {
      if (!IN_OFFER_STATUSES.includes(offer.status)) continue;
      items.push({
        key: `offer:${offer.id}:${offer.status}`,
        title: `Offer ${offer.status}`,
        body: `Your offer for ${offer.role_title ?? "the role"} is now ${offer.status}`,
        to: "/applicant",
      });
    }
    return items;
  }

  for (const task of tasks ?? []) {
    items.push({
      key: `task:${task.id}`,
      title: "New task assigned",
      body: task.title ?? "Untitled task",
      to: "/intern",
    });
  }
  return items;
}

function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(loadSeen);
  const timerRef = useRef(null);
  const lastRefetchRef = useRef(0);

  const poll = useCallback(async () => {
    const session = getSession();
    if (!session?.role) return;
    let apps, interviews, offers, tasks;
    try {
      if (compare(session.role, "admin")) {
        [apps, interviews, offers] = await Promise.all([
          api("/applications"),
          api("/interviews"),
          api("/offers"),
        ]);
      } else if (compare(session.role, "applicant")) {
        [apps, interviews, offers] = await Promise.all([
          api("/applications"),
          api("/interviews"),
          api("/offers"),
        ]);
      } else {
        tasks = await api("/interns/tasks");
      }
    } catch {
      return; // transient — the next tick will retry
    }
    setItems(buildItems(session.role, apps, interviews, offers, tasks));
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

  const unseenCount = items.filter((i) => !seen[i.key]).length;

  const openBell = () => {
    setOpen((v) => !v);
    if (items.length) {
      const next = { ...seen };
      for (const i of items) next[i.key] = true;
      setSeen(next);
      saveSeen(next);
    }
  };

  return (
    <div className="bell-wrap">
      <button className="bell-btn" onClick={openBell} aria-label="Notifications">
        <Bell className="bell" />
        {unseenCount > 0 && <span className="bell-badge">{unseenCount > 9 ? "9+" : unseenCount}</span>}
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
              {items.slice(0, 15).map((item) => (
                <li key={item.key}>
                  <button
                    className={`bell-item${seen[item.key] ? "" : " unread"}`}
                    onClick={() => {
                      setOpen(false);
                      navigate(item.to);
                    }}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
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