import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ShieldCheck,
  GraduationCap,
  X,
  Mail,
  Briefcase,
  Building2,
  ListTodo,
  CalendarDays,
} from "lucide-react";
import { api, logout } from "../api";
import EmptyState from "../components/EmptyState.jsx";
import "./AdminInternsPage.css";

const initials = (name) =>
  (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function AdminInternsPage() {
  const navigate = useNavigate();
  const [interns, setInterns] = useState([]);
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState("");
  const [promoting, setPromoting] = useState(null);
  const [selectedIntern, setSelectedIntern] = useState(null);

  const handleUnauthorized = useCallback(
    (err) => {
      if (
        String(err.message).includes("token") ||
        String(err.message).includes("401")
      ) {
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
      const [internData, offerData] = await Promise.all([
        api("/interns"),
        api("/offers"),
      ]);
      setInterns(internData);
      setOffers(offerData);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const promoteAdmin = async (intern) => {
    setPromoting(intern.id);
    setError("");
    try {
      await api(`/interns/users/${intern.id}/role`, {
        method: "PATCH",
        body: { role: "admin" },
      });
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setPromoting(null);
    }
  };

  const offerCountFor = (internId) =>
    offers.filter((o) => Number(o.applicant_id) === Number(internId)).length;

  return (
    <div className="page">
      <h1 className="page-title">Interns</h1>
      {error && <p className="form-error">{error}</p>}
      {interns.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={GraduationCap}
            title="No interns yet"
            text='Mark an application as "Hired" and the applicant is promoted to intern automatically.'
          />
        </div>
      ) : (
        <div className="card table-card">
          <table className="applicants-table interns-table">
            <thead>
              <tr>
                <th>Intern</th>
                <th>Offers</th>
                <th>Task Progress</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {interns.map((intern) => {
                const offerCount = offerCountFor(intern.id);
                return (
                  <tr key={intern.id}>
                    <td>
                      <button
                        className="applicant-cell applicant-link"
                        onClick={() => setSelectedIntern(intern)}
                        title="View profile"
                      >
                        <div className="avatar-mini">
                          {initials(intern.full_name)}
                        </div>
                        <div className="intern-identity">
                          <strong>{intern.full_name}</strong>
                          <span className="muted-cell">
                            {intern.role_title ?? "—"}
                            {intern.department ? ` · ${intern.department}` : ""}
                          </span>
                        </div>
                      </button>
                    </td>
                    <td>
                      <span
                        className={`status ${offerCount > 0 ? "accepted" : "pending"}`}
                      >
                        {offerCount === 0
                          ? "None"
                          : `${offerCount} offer${offerCount > 1 ? "s" : ""}`}
                      </span>
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div className="bar">
                          <div style={{ width: `${intern.progress}%` }}></div>
                        </div>
                        <span>
                          {intern.tasks_done}/{intern.tasks_total}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button
                        className="promote-btn"
                        onClick={() => promoteAdmin(intern)}
                        disabled={promoting === intern.id}
                      >
                        <ShieldCheck size={14} />{" "}
                        {promoting === intern.id
                          ? "Promoting..."
                          : "Make admin"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedIntern && (
        <div
          className="profile-modal-backdrop"
          onClick={() => setSelectedIntern(null)}
        >
          <div
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="profile-modal-close"
              onClick={() => setSelectedIntern(null)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <div className="profile-hero">
              <div className="profile-avatar-ring">
                <div className="profile-avatar">
                  {initials(selectedIntern.full_name)}
                </div>
              </div>
              <div className="profile-info">
                <h2>{selectedIntern.full_name}</h2>
                <div className="profile-sub">{selectedIntern.email}</div>
                <span className="profile-badge">
                  {selectedIntern.role_title ?? "Intern"}
                </span>
              </div>
            </div>
            <div className="profile-content">
              <div className="profile-details">
                <div className="profile-detail-row">
                  <span>
                    <Briefcase size={14} /> Role
                  </span>
                  <span>{selectedIntern.role_title ?? "—"}</span>
                </div>
                <div className="profile-detail-row">
                  <span>
                    <Building2 size={14} /> Department
                  </span>
                  <span>{selectedIntern.department ?? "—"}</span>
                </div>
                <div className="profile-detail-row">
                  <span>
                    <ListTodo size={14} /> Tasks Progress
                  </span>
                  <span>{selectedIntern.progress}%</span>
                </div>
                <div className="profile-detail-row">
                  <span>
                    <CalendarDays size={14} /> Tasks Completed
                  </span>
                  <span>
                    {selectedIntern.tasks_done} / {selectedIntern.tasks_total}
                  </span>
                </div>
                <div className="profile-detail-row">
                  <span>
                    <Mail size={14} /> Email
                  </span>
                  <span>{selectedIntern.email ?? "—"}</span>
                </div>
              </div>

              <div className="profile-modal-actions">
                <button
                  className="popup-btn popup-btn-ghost"
                  onClick={() => setSelectedIntern(null)}
                >
                  Close
                </button>
                <button
                  className="popup-btn popup-btn-primary"
                  onClick={() =>
                    navigate(`/dashboard/tasks?assignee=${selectedIntern.id}`)
                  }
                >
                  <Plus size={16} /> Add task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInternsPage;
