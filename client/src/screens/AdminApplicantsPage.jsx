import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { api, logout } from "../api";
import EmptyState from "../components/EmptyState.jsx";
import "./AdminApplicantsPage.css";

const STATUSES = ["In Review", "Shortlisted", "Rejected", "Hired"];

const initials = (name) =>
  (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function statusClass(status) {
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

function ApplicantsPage() {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

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
        const [appData, roleData] = await Promise.all([
          api("/applications"),
          api("/roles"),
        ]);
        setApplicants(appData);
        setRoles(roleData);
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      }
    })();
  }, [handleUnauthorized]);

  const changeStatus = async (id, status) => {
    setUpdating(id);
    setError("");
    try {
      await api(`/applications/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setApplicants((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = applicants.filter(
    (a) =>
      (!statusFilter || a.status === statusFilter) &&
      (!roleFilter || String(a.role_id) === roleFilter),
  );

  return (
    <div className="page">
      <h1 className="page-title">Applicants</h1>
      {error && <p className="form-error">{error}</p>}
      {applicants.length > 0 && (
        <div className="filters-row">
          <select
            className="status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="status-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="card table-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={applicants.length === 0 ? "No applications yet" : "No matches"}
            text={
              applicants.length === 0
                ? "Applications will appear here once candidates apply."
                : "No applicants match the selected filters."
            }
          />
        ) : (
          <table className="applicants-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Applied For</th>
                <th>Applied On</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="applicant-cell">
                      <div className="avatar-mini">{initials(a.applicant_name)}</div>
                      <strong>{a.applicant_name}</strong>
                    </div>
                  </td>
                  <td>{a.role_title}</td>
                  <td>{a.applied_at}</td>
                  <td>
                    <span className={`status ${statusClass(a.status)}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="status-select"
                      value={a.status}
                      disabled={updating === a.id}
                      onChange={(e) => changeStatus(a.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
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

export default ApplicantsPage;
