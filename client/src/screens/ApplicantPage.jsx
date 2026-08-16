import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Clock, X, Briefcase, FileText, UserCheck } from "lucide-react";
import { api, logout } from "../api";
import { compare } from "../utils/compare";
import EmptyState from "../components/EmptyState.jsx";
import OfferCard from "../components/OfferCard.jsx";
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
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const handleUnauthorized = useCallback((err) => {
    if (String(err.message).includes("token") || String(err.message).includes("401")) {
      logout();
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  }, [navigate]);

  const loadAll = useCallback(async () => {
    try {
      const [apps, offerData, roleData] = await Promise.all([
        api("/applications"),
        api("/offers"),
        api("/roles"),
      ]);
      setApplications(apps);
      setOffers(offerData);
      setRoles(roleData);
      return offerData;
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
      return [];
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    (async () => {
      await loadAll();
    })();
  }, [loadAll]);

  // Once the admin confirms the accepted offer the account becomes an intern,
  // so the /applicant guard will redirect to /intern on the next load. Refresh
  // when the tab regains focus to pick that up. Throttled so rapid tab
  // switching can't hammer the API (each refetch re-pulls 3 endpoints).
  const MIN_REFETCH_INTERVAL = 10_000;
  const lastRefetchRef = useRef(0);
  useEffect(() => {
    let reloading = false;
    const onActive = async () => {
      if (document.visibilityState !== "visible" || reloading) return;
      const now = Date.now();
      if (now - lastRefetchRef.current < MIN_REFETCH_INTERVAL) return;
      lastRefetchRef.current = now;
      const offersRefreshed = await loadAll();
      if (offersRefreshed.some((o) => compare(o.status, "Confirmed"))) {
        reloading = true;
        window.location.reload();
      }
    };
    window.addEventListener("focus", onActive);
    document.addEventListener("visibilitychange", onActive);
    return () => {
      window.removeEventListener("focus", onActive);
      document.removeEventListener("visibilitychange", onActive);
    };
  }, [loadAll]);

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

  const appliedRoleIds = new Set(applications.map((a) => a.role_id));

  const withdraw = async (app) => {
    setWithdrawing(true);
    setError("");
    try {
      await api(`/applications/${app.id}`, { method: "DELETE" });
      setApplications(await api("/applications"));
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setWithdrawing(false);
      setConfirmingWithdraw(null);
    }
  };

  const onOfferStatusChange = async () => {
    try {
      setOffers(await api("/offers"));
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    }
  };

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
        {offers.length > 0 && (
          <Link to="/applicant/offers" className="view-all">
            View all offers ({offers.length})
          </Link>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      {latestOffer && (
        <OfferCard
          offer={latestOffer}
          onStatusChange={onOfferStatusChange}
          onAuthError={handleUnauthorized}
        />
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
                {compare(app.status, "In Review") &&
                  confirmingWithdraw === app.id ? (
                  <div className="withdraw-confirm">
                    <span className="muted">Withdraw this application?</span>
                    <button
                      className="withdraw-btn"
                      onClick={() => withdraw(app)}
                      disabled={withdrawing}
                    >
                      {withdrawing ? "Withdrawing..." : "Yes, withdraw"}
                    </button>
                    <button
                      className="btn ghost-btn"
                      onClick={() => setConfirmingWithdraw(null)}
                      disabled={withdrawing}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="message-actions">
                    <span className={`status ${statusClass(app.status)}`}>
                      {app.status}
                    </span>
                    {compare(app.status, "In Review") && (
                      <button
                        className="withdraw-btn"
                        onClick={() => setConfirmingWithdraw(app.id)}
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default ApplicantPage;
