import { useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import {
  Bell,
  LayoutDashboard,
  Users,
  Briefcase,
  Plus,
  Menu,
} from "lucide-react";
import Dashboard from "../screens/AdminDashboard.jsx";
import ApplicantsPage from "../screens/AdminApplicantsPage.jsx";

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

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
        </div>
      </header>
      <div className="layout">
        <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
          <nav>
            <NavLink
              to="/"
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <LayoutDashboard />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/applicants"
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <Users />
              <span>Applicants</span>
            </NavLink>
            <NavLink
              to="/offers"
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <Briefcase />
              <span>Offers</span>
            </NavLink>
            <NavLink
              to="/add"
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <Plus />
              <span>Add</span>
            </NavLink>
          </nav>
        </aside>
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/applicants" element={<ApplicantsPage />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default DashboardLayout;
