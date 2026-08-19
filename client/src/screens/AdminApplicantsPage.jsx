import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  X,
  Mail,
  Briefcase,
  CalendarDays,
  Globe,
} from "lucide-react";
import { api, logout } from "../api";
import ExportButton from "../components/ExportButton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Select from "../components/Select.jsx";
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

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function ApplicantsPage() {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedApplicant, setSelectedApplicant] = useState(null);

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
      <div className="page-title-row">
        <ExportButton path="/export/applicants.csv" filename="applicants.csv" label="Export CSV" />
      </div>
      {error && <p className="form-error">{error}</p>}
      {applicants.length > 0 && (
        <div className="filters-row">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "", label: "All statuses" },
              ...STATUSES.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: "", label: "All roles" },
              ...roles.map((r) => ({ value: r.id, label: r.title })),
            ]}
          />
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
                    <button
                      className="applicant-cell applicant-link"
                      onClick={() => setSelectedApplicant(a)}
                      title="View profile"
                    >
                      <div className="avatar-mini">{initials(a.applicant_name)}</div>
                      <strong>{a.applicant_name}</strong>
                    </button>
                  </td>
                  <td>{a.role_title}</td>
                  <td>{formatDate(a.applied_at)}</td>
                  <td>
                    <span className={`status ${statusClass(a.status)}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    <Select
                      value={a.status}
                      disabled={updating === a.id}
                      onChange={(v) => changeStatus(a.id, v)}
                      options={STATUSES.map((s) => ({ value: s, label: s }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedApplicant && (
        <div
          className="profile-modal-backdrop"
          onClick={() => setSelectedApplicant(null)}
        >
          <div
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="profile-modal-close"
              onClick={() => setSelectedApplicant(null)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <div className="profile-hero">
              <div className="profile-avatar-ring">
                <div className="profile-avatar">
                  {initials(selectedApplicant.applicant_name)}
                </div>
              </div>
              <div className="profile-info">
                <h2>{selectedApplicant.applicant_name}</h2>
                <div className="profile-sub">{selectedApplicant.applicant_email}</div>
                <span className={`profile-badge ${statusClass(selectedApplicant.status)}`}>
                  {selectedApplicant.status}
                </span>
              </div>
            </div>
            <div className="profile-content">

              <div className="profile-details">
                <div className="profile-detail-row">
                  <span>
                    <Briefcase size={14} /> Applied For
                  </span>
                  <span>{selectedApplicant.role_title ?? "—"}</span>
                </div>
                <div className="profile-detail-row">
                  <span>
                    <CalendarDays size={14} /> Applied On
                  </span>
                  <span>{formatDate(selectedApplicant.applied_at)}</span>
                </div>
                <div className="profile-detail-row">
                  <span>
                    <Mail size={14} /> Email
                  </span>
                  <span>{selectedApplicant.applicant_email ?? "—"}</span>
                </div>
                {selectedApplicant.resume_url && (
                  <div className="profile-detail-row">
                    <span>
                      <FileText size={14} /> Resume
                    </span>
                    <span>
                      <a href={selectedApplicant.resume_url} target="_blank" rel="noreferrer" className="profile-resume-link">View Resume</a>
                    </span>
                  </div>
                )}
                {selectedApplicant.applicant_dob && (
                  <div className="profile-detail-row">
                    <span>
                      <CalendarDays size={14} /> Date of Birth
                    </span>
                    <span>{formatDate(selectedApplicant.applicant_dob)}</span>
                  </div>
                )}
                {selectedApplicant.applicant_nationality && (
                  <div className="profile-detail-row">
                    <span>
                      <Globe size={14} /> Nationality
                    </span>
                    <span>{selectedApplicant.applicant_nationality}</span>
                  </div>
                )}
              </div>

              <div className="profile-modal-actions">
                <button
                  className="popup-btn popup-btn-ghost"
                  onClick={() => setSelectedApplicant(null)}
                >
                  Close
                </button>
                {selectedApplicant.status === "Hired" && (
                  <button
                    className="popup-btn popup-btn-primary"
                    onClick={() =>
                      navigate(
                        `/dashboard/tasks?assignee=${selectedApplicant.applicant_id}`,
                      )
                    }
                  >
                    <Plus size={16} /> Add task
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantsPage;