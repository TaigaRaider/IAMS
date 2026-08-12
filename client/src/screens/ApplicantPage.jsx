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
  const [declining, setDeclining] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

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
  // when the tab regains focus to pick that up.
  useEffect(() => {
    let reloading = false;
    const onActive = async () => {
      if (document.visibilityState !== "visible" || reloading) return;
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
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const declineOffer = async () => {
    if (!latestOffer) return;
    setDeclining(true);
    setError("");
    try {
      await api(`/offers/${latestOffer.id}/decline`, { method: "POST" });
      setOffers((prev) =>
        prev.map((o) =>
          o.id === latestOffer.id ? { ...o, status: "Declined" } : o,
        ),
      );
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setDeclining(false);
    }
  };

  const requestChanges = async () => {
    if (!latestOffer || !requestMessage.trim()) return;
    setRequesting(true);
    setError("");
    try {
      await api(`/offers/${latestOffer.id}/request-changes`, {
        method: "POST",
        body: { message: requestMessage.trim() },
      });
      setOffers((prev) =>
        prev.map((o) =>
          o.id === latestOffer.id ? { ...o, status: "In Negotiation" } : o,
        ),
      );
      setRequestMessage("");
      setRequestOpen(false);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setRequesting(false);
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
            <span
              className={`status ${
                compare(latestOffer.status, "Accepted") ||
                compare(latestOffer.status, "Confirmed")
                  ? "accepted"
                  : compare(latestOffer.status, "Declined")
                    ? "rejected"
                    : "pending"
              }`}
            >
              {latestOffer.status}
            </span>
          </div>

          {latestOffer.current_revision && (
            <div className="offer-terms">
              <div className="term-line">
                <span className="term-label">Position</span>
                <strong className="term-value">
                  {latestOffer.current_revision.position_title ?? latest.role_title}
                </strong>
              </div>
              <div className="term-line">
                <span className="term-label">Compensation</span>
                <strong className="term-value">
                  {latestOffer.current_revision.compensation}
                </strong>
              </div>
              {latestOffer.current_revision.duration && (
                <div className="term-line">
                  <span className="term-label">Duration</span>
                  <strong className="term-value">
                    {latestOffer.current_revision.duration}
                  </strong>
                </div>
              )}
              {latestOffer.current_revision.start_date && (
                <div className="term-line">
                  <span className="term-label">Start date</span>
                  <strong className="term-value">
                    {latestOffer.current_revision.start_date}
                  </strong>
                </div>
              )}
              {latestOffer.current_revision.expiry_date && (
                <div className="term-line">
                  <span className="term-label">Respond by</span>
                  <strong className="term-value">
                    {latestOffer.current_revision.expiry_date}
                  </strong>
                </div>
              )}
              <div className="term-section">
                <span className="term-label">Task narration</span>
                <p>{latestOffer.current_revision.narration}</p>
              </div>
              <div className="term-section">
                <span className="term-label">Limitations &amp; expectations</span>
                <p>{latestOffer.current_revision.terms}</p>
              </div>
            </div>
          )}

          {compare(latestOffer.status, "Extended") && (
            <>
              <p>
                An offer has been extended for <strong>{latest.role_title}</strong>.
                Review the terms above. You can accept, decline, or request
                changes before deciding.
              </p>
              <div className="offer-actions">
                <button className="apply-btn" onClick={acceptOffer} disabled={accepting}>
                  {accepting ? "Accepting..." : "Accept Offer"}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setRequestOpen((v) => !v)}
                  disabled={accepting || declining}
                >
                  Request changes
                </button>
                <button
                  className="btn-ghost"
                  onClick={declineOffer}
                  disabled={accepting || declining}
                >
                  {declining ? "Declining..." : "Decline"}
                </button>
              </div>
              {requestOpen && (
                <div className="request-box">
                  <textarea
                    className="field"
                    rows={3}
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Tell the team what you'd like reviewed or changed…"
                  />
                  <button
                    className="submit-btn"
                    onClick={requestChanges}
                    disabled={requesting || !requestMessage.trim()}
                  >
                    {requesting ? "Sending..." : "Send request"}
                  </button>
                </div>
              )}
            </>
          )}

          {compare(latestOffer.status, "In Negotiation") && (
            <>
              <p>
                The team is reviewing your request. You can still accept the
                current terms, or decline the offer.
              </p>
              <div className="offer-actions">
                <button className="apply-btn" onClick={acceptOffer} disabled={accepting}>
                  {accepting ? "Accepting..." : "Accept Offer"}
                </button>
                <button
                  className="btn-ghost"
                  onClick={declineOffer}
                  disabled={accepting || declining}
                >
                  {declining ? "Declining..." : "Decline"}
                </button>
              </div>
            </>
          )}

          {compare(latestOffer.status, "Final") && (
            <>
              <p>
                This is the team's final offer. Accept it to become an intern —
                it can no longer be negotiated.
              </p>
              <div className="offer-actions">
                <button className="apply-btn" onClick={acceptOffer} disabled={accepting}>
                  {accepting ? "Accepting..." : "Accept Offer"}
                </button>
                <button
                  className="btn-ghost"
                  onClick={declineOffer}
                  disabled={accepting || declining}
                >
                  {declining ? "Declining..." : "Decline"}
                </button>
              </div>
            </>
          )}

          {compare(latestOffer.status, "Accepted") && (
            <>
              <p>
                Offer accepted! We're waiting on the final confirmation from the
                team before you become an intern. This page reloads automatically
                once it goes through.
              </p>
            </>
          )}

          {compare(latestOffer.status, "Confirmed") && (
            <>
              <p>Offer confirmed — you're hired! Welcome aboard.</p>
              <button
                className="apply-btn"
                onClick={() => navigate("/intern", { replace: true })}
              >
                Open intern dashboard
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
