import { useEffect, useState } from "react";
import { NavLink, Link, Routes, Route, useNavigate } from "react-router-dom";
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
  LogOut,
} from "lucide-react";
import { api, logout } from "../api";
import AdminApplicantsPage from "./AdminApplicantsPage.jsx";

function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [statData, appData] = await Promise.all([
          api("/dashboard/stats"),
          api("/applications"),
        ]);
        setStats(statData);
        setApplications(appData);
      } catch (err) {
        if (String(err.message).includes("token") || String(err.message).includes("401")) {
          logout();
          navigate("/login", { replace: true });
        } else {
          setError(err.message);
        }
      }
    })();
  }, [navigate]);

  if (error) return <p className="form-error">{error}</p>;
  if (!stats) return <p>Loading...</p>;

  const recent = applications.slice(0, 4);
  const depts = stats.applicationsByDepartment;
  const maxDeptCount = depts.length
    ? Math.max(...depts.map((d) => Number(d.count)))
    : 0;

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
          <h1>{stats.totalApplications}</h1>
        </div>
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Open Roles</span>
            <span className="card-icon">
              <Briefcase />
            </span>
          </div>
          <h1>{stats.openRoles}</h1>
        </div>
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Pending Interviews</span>
            <span className="card-icon">
              <CalendarClock />
            </span>
          </div>
          <h1>{stats.pendingInterviews}</h1>
        </div>
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Offers Extended</span>
            <span className="card-icon">
              <BadgeCheck />
            </span>
          </div>
          <h1>{stats.offersExtended}</h1>
        </div>
      </div>
      <div className="dash-grid">
        <div className="card">
          <div className="card-head">
            <h2>Recent Applicants</h2>
            <Link to="/dashboard/applicants" className="view-all">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p>No applications yet.</p>
          ) : (
            <ul className="applicant-list">
              {recent.map((app) => (
                <li key={app.id}>
                  <div className="avatar-mini">
                    {(app.applicant_name ?? "?")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="applicant-info">
                    <strong>{app.applicant_name}</strong>
                    <span>{app.role_title}</span>
                  </div>
                  <span
                    className={`status ${
                      app.status === "Shortlisted"
                        ? "shortlisted"
                        : app.status === "Rejected"
                          ? "rejected"
                          : app.status === "Hired"
                            ? "accepted"
                            : "pending"
                    }`}
                  >
                    {app.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2>Applications by Department</h2>
          {depts.length === 0 ? (
            <p>No data yet.</p>
          ) : (
            <ul className="dept-list">
              {depts.map((dept) => (
                <li key={dept.department}>
                  <span>{dept.department}</span>
                  <div className="bar">
                    <div
                      style={{
                        width: `${maxDeptCount ? (Number(dept.count) / maxDeptCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <span className="count">{dept.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function OffersPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/offers");
        setOffers(data);
      } catch (err) {
        if (String(err.message).includes("token") || String(err.message).includes("401")) {
          logout();
          navigate("/login", { replace: true });
        } else {
          setError(err.message);
        }
      }
    })();
  }, [navigate]);

  return (
    <div className="page">
      <h1 className="page-title">Offers</h1>
      {error && <p className="form-error">{error}</p>}
      <div className="card table-card">
        {offers.length === 0 ? (
          <p>No offers extended yet.</p>
        ) : (
          <table className="applicants-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Status</th>
                <th>Extended On</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="applicant-cell">
                      <div className="avatar-mini">
                        {(o.applicant_name ?? "?")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <strong>{o.applicant_name}</strong>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`status ${
                        o.status === "Accepted"
                          ? "accepted"
                          : o.status === "Declined"
                            ? "rejected"
                            : "pending"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td>{o.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AddRolePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await api("/roles", {
        method: "POST",
        body: { title, department, description: description || null },
      });
      setSuccess("Role created successfully.");
      setTitle("");
      setDepartment("");
      setDescription("");
    } catch (err) {
      if (String(err.message).includes("token") || String(err.message).includes("401")) {
        logout();
        navigate("/login", { replace: true });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Add Role</h1>
      <div className="card" style={{ maxWidth: 520 }}>
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}
        <form className="access-form" onSubmit={handleSubmit}>
          <label className="label" htmlFor="role-title-field">
            Title:
          </label>
          <input
            className="field"
            type="text"
            id="role-title-field"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Software Engineer"
          />
          <label className="label" htmlFor="role-department-field">
            Department:
          </label>
          <input
            className="field"
            type="text"
            id="role-department-field"
            name="department"
            required
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Engineering"
          />
          <label className="label" htmlFor="role-description-field">
            Description (optional):
          </label>
          <textarea
            className="field"
            id="role-description-field"
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will the intern do?"
          />
          <input
            className="submit-btn"
            type="submit"
            value={loading ? "Creating..." : "Create Role"}
            disabled={loading}
          />
        </form>
      </div>
    </div>
  );
}

function AdminDashboard() {
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
              to="/dashboard"
              end
              onClick={closeOnMobile}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
            >
              <LayoutDashboard />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/dashboard/applicants"
              onClick={closeOnMobile}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
            >
              <Users />
              <span>Applicants</span>
            </NavLink>
            <NavLink
              to="/dashboard/offers"
              onClick={closeOnMobile}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
            >
              <Briefcase />
              <span>Offers</span>
            </NavLink>
            <NavLink
              to="/dashboard/add"
              onClick={closeOnMobile}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
            >
              <Plus />
              <span>Add</span>
            </NavLink>
          </nav>
        </aside>
        <main className="content">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="applicants" element={<AdminApplicantsPage />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="add" element={<AddRolePage />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default AdminDashboard;
