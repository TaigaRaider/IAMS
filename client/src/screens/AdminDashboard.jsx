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
  ListTodo,
} from "lucide-react";
import { api, logout } from "../api";
import { compare } from "../utils/compare";
import EmptyState from "../components/EmptyState.jsx";
import ExportButton from "../components/ExportButton.jsx";
import { OverviewSkeleton } from "../components/Skeletons.jsx";import AddRoleForm from "../components/AddRoleForm.jsx";
import DashboardShell from "../components/DashboardShell.jsx";
import DeptDoughnut from "../components/DeptDoughnut.jsx";
import InterviewPage from "../components/InterviewPage.jsx";
import SearchResults from "../components/SearchResults.jsx";
import AdminApplicantsPage from "./AdminApplicantsPage.jsx";
import AdminInternsPage from "./AdminInternsPage.jsx";
import AdminTasksPage from "./AdminTasksPage.jsx";
import AdminRolesPage from "./AdminRolesPage.jsx";
import AdminOffersPage from "./AdminOffersPage.jsx";
import AdminOfferDetail from "./AdminOfferDetail.jsx";
import AdminOfferComposerPage from "./AdminOfferComposerPage.jsx";
import "./AdminDashboard.css";

const ADMIN_NAV = [
  { to: "/dashboard", end: true, icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/applicants", icon: Users, label: "Applicants" },
  { to: "/dashboard/interns", icon: GraduationCap, label: "Interns" },
  { to: "/dashboard/tasks", icon: ListTodo, label: "Tasks" },
  { to: "/dashboard/interviews", icon: CalendarClock, label: "Interviews" },
  { to: "/dashboard/roles", icon: Briefcase, label: "Roles" },
  { to: "/dashboard/offers", icon: BadgeCheck, label: "Offers" },
  { to: "/profile", icon: UserRound, label: "Profile" },
];

const PIPELINE_STATUSES = ["In Review", "Shortlisted", "Rejected", "Hired"];

function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [statData, appData, pipeData] = await Promise.all([
          api("/dashboard/stats"),
          api("/applications"),
          api("/dashboard/pipeline"),
        ]);
        setStats(statData);
        setApplications(appData);
        setPipeline(pipeData.roles ?? []);
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
            <DeptDoughnut depts={depts} />
            
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>Pipeline by Role</h2>
          <div className="card-head-actions">
            <ExportButton
              path="/export/pipeline.csv"
              filename="pipeline.csv"
              label="CSV"
            />
            <ExportButton
              path="/export/pipeline.pdf"
              filename="pipeline.pdf"
              label="PDF"
            />
            <Link to="/dashboard/roles" className="view-all">
              Manage roles
            </Link>
          </div>
        </div>
        {pipeline.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No pipeline data yet"
            text="Application counts per role and stage will show here."
            compact
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table pipeline-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Department</th>
                  {PIPELINE_STATUSES.map((s) => (
                    <th key={s}>{s}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.map((r) => (
                  <tr key={r.role_id}>
                    <td>
                      <strong>{r.role_title}</strong>
                    </td>
                    <td className="capitalize">{r.department || "—"}</td>
                    {PIPELINE_STATUSES.map((s) => (
                      <td key={s} className="num">
                        {r.statuses[s] ?? 0}
                      </td>
                    ))}
                    <td className="num total">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        <Route path="tasks" element={<AdminTasksPage />} />
        <Route path="interviews" element={<InterviewPage />} />
        <Route path="roles" element={<AdminRolesPage />} />
        <Route path="roles/edit" element={<EditRolePage />} />
        <Route path="offers" element={<AdminOffersPage />} />
        <Route path="offers/new" element={<AdminOfferComposerPage />} />
        <Route path="offers/:id" element={<AdminOfferDetail />} />
        <Route path="search" element={<SearchResults />} />
        <Route path="add" element={<AddRolePage />} />
      </Routes>
    </DashboardShell>
  );
}

export default AdminDashboard;
