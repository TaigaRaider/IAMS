import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu } from "lucide-react";
import { logout } from "../api";
import "./DashboardShell.css";

function DashboardShell({ navItems, children }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 768);

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
          <Bell className="bell" />
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
