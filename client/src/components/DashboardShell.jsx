import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Menu,
  CheckCheck,
  Users,
  CalendarClock,
  BadgeCheck,
  Briefcase,
  ListTodo,
  FileText,
} from "lucide-react";
import { api, getSession, logout } from "../api";
import { compare } from "../utils/compare";
import "./DashboardShell.css";

const SEEN_KEY = "iams_notifs_seen";

function useNotifications() {
  const navigate = useNavigate();
  const session = getSession();
  const role = session?.role ?? "applicant";
  const [items, setItems] = useState(null);
  const [unread, setUnread] = useState(
    () => localStorage.getItem(SEEN_KEY) !== role,
  );

  const markSeen = useCallback(() => {
    localStorage.setItem(SEEN_KEY, role);
    setUnread(false);
  }, [role]);

  const load = useCallback(async () => {
    try {
      let list = [];
      if (compare(role, "admin")) {
        const stats = await api("/dashboard/stats");
        const rows = [
          Number(stats.totalApplications) > 0 && {
            icon: Users,
            title: `${stats.totalApplications} application${
              Number(stats.totalApplications) > 1 ? "s" : ""
            } to review`,
            sub: "View them on the Applicants page",
            to: "/dashboard/applicants",
          },
          Number(stats.pendingInterviews) > 0 && {
            icon: CalendarClock,
            title: `${stats.pendingInterviews} pending interview${
              Number(stats.pendingInterviews) > 1 ? "s" : ""
            }`,
            sub: "Schedule or follow up in Interviews",
            to: "/dashboard/interviews",
          },
          Number(stats.offersExtended) > 0 && {
            icon: BadgeCheck,
            title: `${stats.offersExtended} extended offer${
              Number(stats.offersExtended) > 1 ? "s" : ""
            }`,
            sub: "Track them from the Offers page",
            to: "/dashboard/offers",
          },
          Number(stats.openRoles) > 0 && {
            icon: Briefcase,
            title: `${stats.openRoles} open role${
              Number(stats.openRoles) > 1 ? "s" : ""
            }`,
            sub: "Manage roles when you're ready",
            to: "/dashboard/roles",
          },
        ].filter(Boolean);
        list = rows;
      } else if (compare(role, "intern")) {
        const tasks = await api("/interns/tasks");
        const open = tasks.filter(
          (t) => !compare(t.status, "done") && !compare(t.status, "cancelled"),
        );
        if (open.length > 0) {
          list = [
            {
              icon: ListTodo,
              title: `${open.length} task${open.length > 1 ? "s" : ""} need your attention`,
              sub: open
                .slice(0, 2)
                .map((t) => t.title)
                .join(", "),
              to: "/intern",
            },
          ];
        }
      } else {
        const applications = await api("/applications");
        if (applications.length > 0) {
          list = [
            {
              icon: FileText,
              title: `${applications.length} application${
                applications.length > 1 ? "s" : ""
              } ${applications.length > 1 ? "are" : "is"} in review`,
              sub: applications
                .slice(0, 2)
                .map((a) => a.role_title)
                .join(", "),
              to: "/applicant",
            },
          ];
        }
      }
      setItems(list);
    } catch {
      setItems([]);
    }
  }, [role]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const openItem = (to) => {
    markSeen();
    navigate(to);
  };

  return { items, unread, markSeen, openItem };
}

function DashboardShell({ navItems, children }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 768);
  const [notifOpen, setNotifOpen] = useState(false);
  const { items, unread, markSeen, openItem } = useNotifications();

  const closeOnMobile = () => {
    if (window.innerWidth <= 768) setCollapsed(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header>
        <button
          className="menu-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          <Menu />
        </button>
        <img src="/iamslogo.png" alt="Logo" className="logo" />
        <input type="text" placeholder="Search..." />
        <div className="actions">
          <div className="notif-wrap">
            <button
              className="bell-btn"
              onClick={() => {
                setNotifOpen((v) => !v);
                if (!notifOpen) markSeen();
              }}
              aria-label="Notifications"
            >
              <Bell />
              {unread && <span className="notif-dot" />}
            </button>
            {notifOpen && (
              <>
                <div className="notif-backdrop" onClick={() => setNotifOpen(false)} />
                <div className="notif-popup">
                  <div className="notif-head">
                    <h3>Notifications</h3>
                    <button className="notif-mark-read" onClick={markSeen}>
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  </div>
                  {items === null ? (
                    <p className="notif-empty">Loading…</p>
                  ) : items.length === 0 ? (
                    <p className="notif-empty">You&apos;re all caught up.</p>
                  ) : (
                    <ul className="notif-list">
                      {items.map((n, idx) => (
                        <li key={idx}>
                          <button
                            className="notif-item"
                            onClick={() => {
                              setNotifOpen(false);
                              openItem(n.to);
                            }}
                          >
                            <span className="notif-item-icon">
                              <n.icon size={16} />
                            </span>
                            <span className="notif-item-text">
                              <strong>{n.title}</strong>
                              <span>{n.sub}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
          <Link to="/profile" className="avatar-link" aria-label="Go to profile">
            <svg className="avatar" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="24" r="14" fill="#f0e6ff" />
              <path d="M10 58c4-14 12-18 22-18s18 4 22 18" fill="#f0e6ff" />
            </svg>
          </Link>
        </div>
      </header>
      {!collapsed && <div className="backdrop" onClick={closeOnMobile} />}
      <div className="layout">
        <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
          <nav>
            {navItems.map(({ to, end, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={closeOnMobile}
                className={({ isActive }) =>
                  `nav-item${isActive ? " active" : ""}`
                }
              >
                <Icon />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="nav-item logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </div>
        </aside>
        <main className="content">{children}</main>
      </div>
    </>
  );
}

export default DashboardShell;