import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, logout } from "../api";

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
        const data = await api("/applications");
        setApplicants(data);
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

  return (
    <div className="page">
      <h1 className="page-title">Applicants</h1>
      {error && <p className="form-error">{error}</p>}
      <div className="card table-card">
        {applicants.length === 0 ? (
          <p>No applications yet.</p>
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
              {applicants.map((a) => (
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
