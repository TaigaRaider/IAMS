import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { api, logout } from "../api";
import NotificationBell from "./NotificationBell.jsx";
import "./DashboardShell.css";

function DashboardShell({ navItems, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 768);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // The header avatar mirrors the profile picture uploaded on the profile
  // page: load it once per mount and live-update via the "avatar-updated"
  // event dispatched after a successful upload.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api("/auth/me");
        if (!cancelled) setAvatarUrl(me.avatar_url ?? null);
      } catch {
        // Cosmetic only — the placeholder icon is a fine fallback.
      }
    })();
    const onAvatarUpdated = (e) =>
      setAvatarUrl(e.detail?.avatar_url ?? null);
    window.addEventListener("avatar-updated", onAvatarUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("avatar-updated", onAvatarUpdated);
    };
  }, []);

  const closeOnMobile = () => {
    if (window.innerWidth <= 768) setCollapsed(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = e.currentTarget.query.value.trim();
    if (!q) return;
    const root = "/" + (location.pathname.split("/")[1] ?? "");
    if (!["/dashboard", "/applicant", "/intern"].includes(root)) return;
    navigate(`${root}/search?q=${encodeURIComponent(q)}`);
  };

  // Clicking the logo acts as a manual refresh: bumping the key remounts the
  // page subtree below the header so every data effect re-runs.
  const refreshPage = () => setRefreshNonce((n) => n + 1);

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
        <img
          src="/iamslogo.png"
          alt="Logo — click to refresh"
          className="logo logo-refresh"
          title="Refresh page"
          onClick={refreshPage}
        />
        <form className="search-form" role="search" onSubmit={handleSearch}>
          <input
            name="query"
            type="text"
            placeholder="Search..."
            defaultValue={searchParams.get("q") ?? ""}
            aria-label="Search"
          />
        </form>
        <div className="actions">
          <NotificationBell />
          <Link to="/profile" className="avatar-link" aria-label="Go to profile">
            {avatarUrl ? (
              <img className="avatar" src={avatarUrl} alt="Your profile" />
            ) : (
              <svg className="avatar" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="24" r="14" fill="#f0e6ff" />
                <path d="M10 58c4-14 12-18 22-18s18 4 22 18" fill="#f0e6ff" />
              </svg>
            )}
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
        <main className="content">
          <div key={refreshNonce} className="content-scope">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default DashboardShell;