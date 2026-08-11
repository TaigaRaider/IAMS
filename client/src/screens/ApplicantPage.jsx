import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Clock, X, Briefcase, FileText, UserCheck } from "lucide-react";
import { api, logout } from "../api";
import { compare } from "../utils/compare";
import EmptyState from "../components/EmptyState.jsx";
import "./ApplicantPage.css";

const STATUS_INFO = {
  "In Review": {
    className: "pending",
    icon: Clock,
    title: "In Review",
    text: "Your application is currently under review.",
  },
  Shortlisted: {
    className: "shortlisted",
    icon: UserCheck,
    title: "Shortlisted",
    text: "You have been shortlisted for this role — the team will reach out about next steps.",
  },
  Hired: {
    className: "accepted",
    icon: Check,
    title: "Hired",
    text: "Congratulations! You have been hired.",
  },
  Rejected: {
    className: "rejected",
    icon: X,
    title: "Rejected",
    text: "Unfortunately, this application was not successful.",
  },
};

const statusClass = (status) => STATUS_INFO[status]?.className ?? "pending";

function ApplicantPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [offers, setOffers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(null);
  const [accepting, setAccepting] = useState(false);

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
        const [apps, offerData, roleData] = await Promise.all([
          api("/applications"),
          api("/offers"),
          api("/roles"),
        ]);
        setApplications(apps);
        setOffers(offerData);
        setRoles(roleData);
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      }
    })();
  }, [handleUnauthorized]);

  const latest = applications[0] ?? null;
  const current = latest ? STATUS_INFO[latest.status] ?? STATUS_INFO["In Review"] : null;
  const StatusIcon = current?.icon ?? Clock;
  const latestOffer = latest
    ? offers.find((o) => o.application_id === latest.id) ?? null
    : null;

  const apply = async (roleId) => {
    setApplying(roleId);
    setError("");
    try {
      await api("/applications", {
        method: "POST",
        body: { role_id: roleId },
      });
      const apps = await api("/applications");
      setApplications(apps);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setApplying(null);
    }
  };

  const acceptOffer = async () => {
    if (!latestOffer) return;
    setAccepting(true);
    setError("");
    try {
      await api(`/offers/${latestOffer.id}/accept`, { method: "POST" });
      setOffers((prev) =>
        prev.map((o) =>
          o.id === latestOffer.id ? { ...o, status: "Accepted" } : o,
        ),
      );
      navigate("/intern", { replace: true });
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const appliedRoleIds = new Set(applications.map((a) => a.role_id));

  return (
    <div className="applicant-page">
      <div className="applicant-header">
        <div>
          <h1 className="page-title">My Application</h1>
          <p className="applicant-subtitle">
            Track your internship application from here.
          </p>
        </div>
        {latest && (
          <span className={`status ${statusClass(latest.status)}`}>
            {latest.status}
          </span>
        )}
        {compare(latest?.status, "Hired") && (
          <button
            className="apply-btn"
            onClick={() => navigate("/intern", { replace: true })}
          >
            Open intern dashboard
          </button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      {latestOffer && (
        <section className="card offer-card">
          <div className="card-head">
            <h2>Job Offer</h2>
            {compare(latestOffer.status, "Rejected") || compare(latestOffer.status, "Accepted") ? (
              <span
                className={`status ${
                  compare(latestOffer.status, "Accepted") ? "accepted" : "rejected"
                }`}
              >
                {latestOffer.status}
              </span>
            ) : (
              <span className="status pending">{latestOffer.status}</span>
            )}
          </div>
          {compare(latestOffer.status, "Extended") && (
            <>
              <p>
                Congratulations! An offer has been extended for{" "}
                <strong>{latest.role_title}</strong>. Accept it to become an
                intern and continue to your intern dashboard.
              </p>
              <button
                className="apply-btn"
                onClick={acceptOffer}
                disabled={accepting}
              >
                {accepting ? "Accepting..." : "Accept Offer"}
              </button>
            </>
          )}
          {compare(latestOffer.status, "Accepted") && (
            <>
              <p>Offer accepted — welcome aboard!</p>
              <button
                className="apply-btn"
                onClick={() => navigate("/intern", { replace: true })}
              >
                Go to intern dashboard
              </button>
            </>
          )}
          {compare(latestOffer.status, "Declined") && (
            <p>This offer was declined.</p>
          )}
        </section>
      )}

      <div className="applicant-grid">
        <section className="card progress-card">
          <h2>Current Status</h2>
          {latest && current ? (
            <div className="current-status">
              <div className={`current-status-icon ${current.className}`}>
                <StatusIcon size={22} />
              </div>
              <div className="current-status-info">
                <strong>{current.title}</strong>
                <p>{current.text}</p>
                <span className="current-status-meta">
                  {latest.role_title} · Applied {latest.applied_at}
                </span>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No application yet"
              text="Pick an open role below to get started."
              compact
            />
          )}
        </section>

        <section className="card roles-card">
          <h2>Open Roles</h2>
          <ul className="roles-list">
            {roles.length === 0 && (
              <li>
                <EmptyState
                  icon={Briefcase}
                  title="No roles available"
                  text="Check back soon — new roles open regularly."
                  compact
                />
              </li>
            )}
            {roles
              .filter((role) => compare(role.status, "open"))
              .map((role) => (
                <li key={role.id} className="role-item">
                  <div className="event-icon">
                    <Briefcase size={18} />
                  </div>
                  <div className="event-info">
                    <strong>{role.title}</strong>
                    <span>{role.department}</span>
                  </div>
                  {appliedRoleIds.has(role.id) ? (
                    <span className="status accepted">Applied</span>
                  ) : (
                    <button
                      className="apply-btn"
                      onClick={() => apply(role.id)}
                      disabled={applying === role.id}
                    >
                      {applying === role.id ? "Applying..." : "Apply"}
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </section>
      </div>

      {applications.length > 0 && (
        <section className="card messages-card">
          <div className="card-head">
            <h2>My Applications</h2>
            <span className="view-all">{applications.length} total</span>
          </div>
          <ul className="messages-list">
            {applications.map((app) => (
              <li key={app.id} className="message-item">
                <div className="avatar-mini">
                  <FileText size={16} />
                </div>
                <div className="message-content">
                  <div className="message-meta">
                    <strong>{app.role_title}</strong>
                    <span>{app.applied_at}</span>
                  </div>
                  <p>
                    Applied for <strong>{app.role_title}</strong>
                  </p>
                </div>
                <span className={`status ${statusClass(app.status)}`}>
                  {app.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default ApplicantPage;
