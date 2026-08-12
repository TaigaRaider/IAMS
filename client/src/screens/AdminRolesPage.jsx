import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Briefcase } from "lucide-react";
import { api, logout } from "../api";
import { compare } from "../utils/compare";
import EmptyState from "../components/EmptyState.jsx";
import { Skeleton, TableSkeleton } from "../components/Skeletons.jsx";
import "./AdminRolesPage.css";

function roleStatusClass(status) {
  return compare(status, "open") ? "accepted" : "rejected";
}

function applicantStatusClass(status) {
  switch (status) {
    case "Shortlisted":
      return "shortlisted";
    case "Rejected":
      return "rejected";
    case "Hired":
      return "accepted";
    default:
      return "pending";
  }
}

function AdminRolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(null);

  const handleUnauthorized = useCallback(
    (err) => {
      if (String(err.message).includes("token") || String(err.message).includes("401")) {
        logout();
        navigate("/login", { replace: true });
        return true;
      }
      return false;
    },
    [navigate],
  );

  const load = useCallback(async () => {
    try {
      const [roleData, appData] = await Promise.all([
        api("/roles"),
        api("/applications"),
      ]);
      setRoles(roleData);
      setApplications(appData);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const toggleRole = async (id, status) => {
    setToggling(id);
    setError("");
    try {
      await api(`/roles/${id}`, {
        method: "PATCH",
        body: { status },
      });
      setRoles((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setToggling(null);
    }
  };

  const appsByRole = new Map();
  for (const app of applications) {
    const key = Number(app.role_id);
    if (!appsByRole.has(key)) appsByRole.set(key, []);
    appsByRole.get(key).push(app);
  }

  if (loading) {
    return (
      <div className="page">
        <Skeleton width="180px" height="28px" />
        <TableSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Roles</h1>
        <Link to="/dashboard/add" className="add-btn">
          <Plus size={16} />
          Add Role
        </Link>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="card table-card roles-table-card">
        {roles.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No roles yet"
            text="Create your first role and open it up to applicants."
          />
        ) : (
          <table className="applicants-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Applicants</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => {
                const roleApps = appsByRole.get(Number(role.id)) ?? [];
                const visible = roleApps.slice(0, 3);
                const rest = roleApps.length - visible.length;
                return (
                  <tr key={role.id}>
                    <td>
                      <strong>{role.title}</strong>
                      {role.description && (
                        <span className="muted-cell role-desc">
                          {role.description}
                        </span>
                      )}
                    </td>
                    <td>{role.department}</td>
                    <td>
                      <span className={`status ${roleStatusClass(role.status)}`}>
                        {role.status}
                      </span>
                    </td>
                    <td>
                      {roleApps.length === 0 ? (
                        <span className="muted-cell">No applicants yet</span>
                      ) : (
                        <div className="role-applicants">
                          <span className="applicant-count">
                            {roleApps.length}{" "}
                            {roleApps.length === 1 ? "applicant" : "applicants"}
                          </span>
                          <ul>
                            {visible.map((app) => (
                              <li key={app.id}>
                                <span
                                  className={`status ${applicantStatusClass(app.status)}`}
                                >
                                  {app.status}
                                </span>
                                <span>{app.applicant_name}</span>
                              </li>
                            ))}
                            {rest > 0 && (
                              <li className="muted-cell">+{rest} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={role.status}
                        disabled={toggling === role.id}
                        onChange={(e) => toggleRole(role.id, e.target.value)}
                      >
                        <option value="open">open</option>
                        <option value="closed">closed</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminRolesPage;
