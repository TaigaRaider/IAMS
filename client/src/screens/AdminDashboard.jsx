import { useEffect, useState, useCallback } from "react";
import { Link, Routes, Route, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Plus,
  FileText,
  CalendarClock,
  BadgeCheck,
  GraduationCap,
  UserRound,
  BarChart3,
} from "lucide-react";
import { api, logout } from "../api";
import { compare } from "../utils/compare";
import EmptyState from "../components/EmptyState.jsx";
import { OverviewSkeleton } from "../components/Skeletons.jsx";import AddRoleForm from "../components/AddRoleForm.jsx";
import DashboardShell from "../components/DashboardShell.jsx";
import InterviewPage from "../components/InterviewPage.jsx";
import AdminApplicantsPage from "./AdminApplicantsPage.jsx";
import AdminInternsPage from "./AdminInternsPage.jsx";
import "./AdminDashboard.css";

const ADMIN_NAV = [
  { to: "/dashboard", end: true, icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/applicants", icon: Users, label: "Applicants" },
  { to: "/dashboard/interns", icon: GraduationCap, label: "Interns" },
  { to: "/dashboard/interviews", icon: CalendarClock, label: "Interviews" },
  { to: "/dashboard/offers", icon: Briefcase, label: "Offers" },
  { to: "/profile", icon: UserRound, label: "Profile" },
];

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
  if (!stats) return <OverviewSkeleton />;

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
            <EmptyState
              icon={Users}
              title="No applications yet"
              text="Applications will appear here once candidates apply."
              compact
            />
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
                      compare(app.status, "Shortlisted")
                        ? "shortlisted"
                        : compare(app.status, "Rejected")
                          ? "rejected"
                          : compare(app.status, "Hired")
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
            <EmptyState
              icon={BarChart3}
              title="No data yet"
              text="Application data by department will show here."
              compact
            />
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
  const [updating, setUpdating] = useState(null);

  const handleUnauthorized = useCallback((err) => {
    if (String(err.message).includes("token") || String(err.message).includes("401")) {
      logout();
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  }, [navigate]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/offers");
        setOffers(data);
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      }
    })();
  }, [handleUnauthorized]);

  const changeStatus = async (id, status) => {
    setUpdating(id);
    setError("");
    try {
      await api(`/offers/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setOffers((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o)),
      );
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Offers</h1>
        <Link to="/dashboard/add" className="add-btn">
          <Plus size={16} />
          Add Role
        </Link>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="card table-card">
        {offers.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="No offers extended yet"
            text="Offers you extend to applicants will appear here."
          />
        ) : (
          <table className="applicants-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Status</th>
                <th>Extended On</th>
                <th></th>
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
                        compare(o.status, "Accepted")
                          ? "accepted"
                          : compare(o.status, "Declined")
                            ? "rejected"
                            : "pending"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td>{o.created_at}</td>
                  <td>
                    <select
                      className="status-select"
                      value={o.status}
                      disabled={updating === o.id}
                      onChange={(e) => changeStatus(o.id, e.target.value)}
                    >
                      <option value="Extended">Extended</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Declined">Declined</option>
                    </select>
                  </td>
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
  return (
    <div className="page">
      <h1 className="page-title">Add Role</h1>
      <AddRoleForm />
    </div>
  );
}

function AdminDashboard() {
  return (
    <DashboardShell navItems={ADMIN_NAV}>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="applicants" element={<AdminApplicantsPage />} />
        <Route path="interns" element={<AdminInternsPage />} />
        <Route path="interviews" element={<InterviewPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="add" element={<AddRolePage />} />
      </Routes>
    </DashboardShell>
  );
}

export default AdminDashboard;
