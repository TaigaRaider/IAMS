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
  FileText,
  Globe,
  Check,
  Circle,
} from "lucide-react";
import { api, logout } from "../api";
import ExportButton from "../components/ExportButton.jsx";
import { celebrate } from "../utils/celebrate.js";
import { useToast } from "../components/toast-context.js";
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
  const { toast } = useToast();
  const [interns, setInterns] = useState([]);
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState("");
  const [promoting, setPromoting] = useState(null);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [onboardingBusy, setOnboardingBusy] = useState(false);

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
      celebrate();
      toast(`${intern.full_name} is now an admin`, "success");
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setPromoting(null);
    }
  };

  const offerCountFor = (internId) =>
    offers.filter((o) => Number(o.applicant_id) === Number(internId)).length;

  const loadOnboarding = async (intern) => {
    setOnboarding(null);
    setOnboardingBusy(false);
    try {
      const data = await api(`/onboarding?user_id=${intern.id}`);
      setOnboarding(data);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    }
  };

  const toggleOnboardingStep = async (step) => {
    if (!selectedIntern || onboardingBusy) return;
    setOnboardingBusy(true);
    try {
      const data = await api(`/onboarding/${step.step_key}`, {
        method: "PATCH",
        body: { done: !step.done, user_id: selectedIntern.id },
      });
      setOnboarding((prev) => ({
        ...prev,
        steps: prev.steps.map((s) =>
          s.step_key === data.step_key ? { ...s, done: data.done } : s,
        ),
        done: prev.done + (data.done ? 1 : -1),
        progress: Math.round(
          ((prev.done + (data.done ? 1 : -1)) / prev.total) * 100,
        ),
      }));
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setOnboardingBusy(false);
    }
  };

  const openIntern = (intern) => {
    setSelectedIntern(intern);
    loadOnboarding(intern);
  };

  return (
    <div className="page">
      <h1 className="page-title">Interns</h1>
      <div className="page-title-row">
        <ExportButton path="/export/interns.csv" filename="interns.csv" label="Export CSV" />
      </div>
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
                        onClick={() => openIntern(intern)}
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
                    <ListTodo size={14} /> Tasks Completed
                  </span>
                  <span>
                    {selectedIntern.tasks_done} / {selectedIntern.tasks_total}
                  </span>
                </div>
                <div className="profile-detail-row">
                  <span>
                    <CalendarDays size={14} /> Onboarding Progress
                  </span>
                  <span>
                    {selectedIntern.onboarding_done} /{" "}
                    {selectedIntern.onboarding_total}
                  </span>
                </div>
                <div className="profile-detail-row">
                  <span>
                    <Mail size={14} /> Email
                  </span>
                  <span>{selectedIntern.email ?? "—"}</span>
                </div>
                {selectedIntern.resume_url && (
                  <div className="profile-detail-row">
                    <span>
                      <FileText size={14} /> Resume
                    </span>
                    <span>
                      <a
                        href={selectedIntern.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="profile-resume-link"
                      >
                        View Resume
                      </a>
                    </span>
                  </div>
                )}
                {selectedIntern.date_of_birth && (
                  <div className="profile-detail-row">
                    <span>
                      <CalendarDays size={14} /> Date of Birth
                    </span>
                    <span>{selectedIntern.date_of_birth}</span>
                  </div>
                )}
                {selectedIntern.nationality && (
                  <div className="profile-detail-row">
                    <span>
                      <Globe size={14} /> Nationality
                    </span>
                    <span>{selectedIntern.nationality}</span>
                  </div>
                )}
              </div>

              <div className="onboarding-admin-section">
                <h4 className="onboarding-admin-title">
                  <ListTodo size={14} /> Onboarding Checklist
                </h4>
                {!onboarding ? (
                  <p className="muted">Loading…</p>
                ) : (
                  <ul className="onboarding-admin-list">
                    {onboarding.steps.map((step) => (
                      <li
                        key={step.step_key}
                        className={step.done ? "done" : ""}
                      >
                        <button
                          className="onboarding-toggle"
                          onClick={() => toggleOnboardingStep(step)}
                          disabled={onboardingBusy}
                          aria-label={`Mark ${step.label} ${step.done ? "incomplete" : "complete"}`}
                        >
                          {step.done ? <Check size={14} /> : <Circle size={14} />}
                        </button>
                        <div className="onboarding-step-info">
                          <span>{step.label}</span>
                          {step.guide && (
                            <small className="onboarding-step-guide">
                              {step.guide}
                            </small>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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
