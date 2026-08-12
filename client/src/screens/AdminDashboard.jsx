import { useEffect, useState } from "react";
import { Link, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
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
import AdminRolesPage from "./AdminRolesPage.jsx";
import AdminOffersPage from "./AdminOffersPage.jsx";
import AdminOfferDetail from "./AdminOfferDetail.jsx";
import AdminOfferComposerPage from "./AdminOfferComposerPage.jsx";
import "./AdminDashboard.css";

const ADMIN_NAV = [
  { to: "/dashboard", end: true, icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/applicants", icon: Users, label: "Applicants" },
  { to: "/dashboard/interns", icon: GraduationCap, label: "Interns" },
  { to: "/dashboard/interviews", icon: CalendarClock, label: "Interviews" },
  { to: "/dashboard/roles", icon: Briefcase, label: "Roles" },
  { to: "/dashboard/offers", icon: BadgeCheck, label: "Offers" },
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

function AddRolePage() {
  return (
    <div className="page">
      <h1 className="page-title">Add Role</h1>
      <AddRoleForm />
    </div>
  );
}

function EditRolePage() {
  const { state } = useLocation();
  const role = state?.role ?? null;
  return (
    <div className="page">
      <h1 className="page-title">Edit Role</h1>
      {role ? (
        <AddRoleForm initial={role} />
      ) : (
        <p className="form-error">No role selected. Choose Edit from the Roles page.</p>
      )}
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
        <Route path="roles" element={<AdminRolesPage />} />
        <Route path="roles/edit" element={<EditRolePage />} />
        <Route path="offers" element={<AdminOffersPage />} />
        <Route path="offers/new" element={<AdminOfferComposerPage />} />
        <Route path="offers/:id" element={<AdminOfferDetail />} />
        <Route path="add" element={<AddRolePage />} />
      </Routes>
    </DashboardShell>
  );
}

export default AdminDashboard;
