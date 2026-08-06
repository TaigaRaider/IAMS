import { useState } from "react";
import { Routes, Route, NavLink, Link } from "react-router-dom";
import {
  Bell,
  LayoutDashboard,
  Users,
  Briefcase,
  Plus,
  Menu,
  FileText,
  CalendarClock,
  BadgeCheck,
} from "lucide-react";
import ApplicantsPage from "./screens/ApplicantsPage.jsx";
import "./App.css";

function Dashboard() {
  return (
    <>
      <div className="intcards">
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Total Applications</span>
            <span className="card-icon">
              <FileText />
            </span>
          </div>
          <h1>15</h1>
        </div>
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Open Roles</span>
            <span className="card-icon">
              <Briefcase />
            </span>
          </div>
          <h1>8</h1>
        </div>
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Pending Interviews</span>
            <span className="card-icon">
              <CalendarClock />
            </span>
          </div>
          <h1>5</h1>
        </div>
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Offers Extended</span>
            <span className="card-icon">
              <BadgeCheck />
            </span>
          </div>
          <h1>3</h1>
        </div>
      </div>
      <div className="dash-grid">
        <div className="card">
          <div className="card-head">
            <h2>Recent Applicants</h2>
            <Link to="/applicants" className="view-all">
              View all
            </Link>
          </div>
          <ul className="applicant-list">
            <li>
              <div className="avatar-mini">JD</div>
              <div className="applicant-info">
                <strong>John Doe</strong>
                <span>Software Engineer</span>
              </div>
              <span className="status pending">In Review</span>
            </li>
            <li>
              <div className="avatar-mini">JS</div>
              <div className="applicant-info">
                <strong>Jane Smith</strong>
                <span>Product Designer</span>
              </div>
              <span className="status shortlisted">Shortlisted</span>
            </li>
            <li>
              <div className="avatar-mini">AK</div>
              <div className="applicant-info">
                <strong>Alex Kim</strong>
                <span>Data Analyst</span>
              </div>
              <span className="status rejected">Rejected</span>
            </li>
            <li>
              <div className="avatar-mini">MG</div>
              <div className="applicant-info">
                <strong>Maria Garcia</strong>
                <span>HR Coordinator</span>
              </div>
              <span className="status accepted">Hired</span>
            </li>
          </ul>
        </div>
        <div className="card">
          <h2>Applications by Department</h2>
          <ul className="dept-list">
            <li>
              <span>Engineering</span>
              <div className="bar"><div style={{ width: "75%" }}></div></div>
              <span className="count">6</span>
            </li>
            <li>
              <span>Design</span>
              <div className="bar"><div style={{ width: "50%" }}></div></div>
              <span className="count">4</span>
            </li>
            <li>
              <span>Data</span>
              <div className="bar"><div style={{ width: "38%" }}></div></div>
              <span className="count">3</span>
            </li>
            <li>
              <span>HR</span>
              <div className="bar"><div style={{ width: "25%" }}></div></div>
              <span className="count">2</span>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

function App() {
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

export default App;
