import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, Menu, FileText, LogOut } from "lucide-react";
import { logout } from "../api";
import ApplicantPage from "../screens/ApplicantPage.jsx";

function ApplicantDashboard() {
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
          <svg className="avatar" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="24" r="14" fill="#f0e6ff" />
            <path d="M10 58c4-14 12-18 22-18s18 4 22 18" fill="#f0e6ff" />
          </svg>
          <button className="logout-btn" onClick={handleLogout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>
      {!collapsed && <div className="backdrop" onClick={closeOnMobile} />}
      <div className="layout">
        <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
          <nav>
            <NavLink
              to="/applicant"
              end
              onClick={closeOnMobile}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
            >
              <FileText />
              <span>My Application</span>
            </NavLink>
          </nav>
        </aside>
        <main className="content">
          <ApplicantPage />
        </main>
      </div>
    </>
  );
}

export default ApplicantDashboard;
