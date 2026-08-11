import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  UserRound,
  Send,
} from "lucide-react";
import { api, getSession, logout } from "../api";
import { compare } from "../utils/compare";
import EmptyState from "./EmptyState.jsx";
import { Skeleton, TableSkeleton } from "./Skeletons.jsx";
import "./InterviewPage.css";

const STATUS_META = {
  Pending: { label: "Requested", className: "pending" },
  Confirmed: { label: "Confirmed", className: "shortlisted" },
  Done: { label: "Done", className: "accepted" },
  Cancelled: { label: "Cancelled", className: "rejected" },
};

const ACTIVE_STATUSES = ["Pending", "Confirmed"];

const initials = (name) =>
  (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function useUnauthorized(navigate) {
  return useCallback(
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
}

function ApplicantInterviews() {
  const navigate = useNavigate();
  const handleUnauthorized = useUnauthorized(navigate);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [apps, ints] = await Promise.all([
        api("/applications"),
        api("/interviews"),
      ]);
      setApplications(apps);
      setInterviews(ints);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const requestInterview = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedApp || !scheduledAt) {
      setError("Pick an application and a preferred date & time");
      return;
    }
    setSubmitting(true);
    try {
      await api("/interviews", {
        method: "POST",
        body: {
          application_id: Number(selectedApp),
          scheduled_at: new Date(scheduledAt).toISOString(),
        },
      });
      setSelectedApp("");
      setScheduledAt("");
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelInterview = async (id) => {
    setCancelling(id);
    setError("");
    try {
      await api(`/interviews/${id}`, {
        method: "PATCH",
        body: { status: "Cancelled" },
      });
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="page interview-page">
        <Skeleton width="220px" height="28px" />
        <div className="card table-card skeleton-block">
          <Skeleton width="100%" height="16px" />
          <Skeleton width="100%" height="16px" />
          <Skeleton width="100%" height="16px" />
          <Skeleton width="70%" height="16px" />
        </div>
      </div>
    );
  }

  const activeApplicationIds = new Set(
    interviews
      .filter((i) => ACTIVE_STATUSES.includes(i.status))
      .map((i) => i.application_id),
  );
  const eligible = applications.filter((a) => !activeApplicationIds.has(a.id));

  return (
    <div className="page interview-page">
      <h1 className="page-title">My Interviews</h1>
      {error && <p className="form-error">{error}</p>}

      {eligible.length > 0 ? (
        <section className="card request-card">
          <h2>Request an Interview</h2>
          <p className="muted">
            Applied for a role? Pick it below and choose a time that suits you.
            The team will confirm your availability.
          </p>
          <form className="request-form" onSubmit={requestInterview}>
            <select
              className="field"
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value)}
            >
              <option value="">Select an application…</option>
              {eligible.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.role_title} — {a.status}
                </option>
              ))}
            </select>
            <input
              className="field"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <button className="apply-btn" type="submit" disabled={submitting}>
              <Send size={16} />
              {submitting ? "Requesting..." : "Request Interview"}
            </button>
          </form>
        </section>
      ) : (
        <section className="card request-card">
          <h2>Request an Interview</h2>
          <p className="muted">
            Pick a role you applied for, choose a time that suits you, and the
            team will confirm your availability.
          </p>
          <div className="request-empty">
            {applications.length === 0 ? (
              <p>
                You haven't applied to a role yet.{" "}
                <Link to="/applicant">Go to My Application</Link> to apply, then
                request an interview here.
              </p>
            ) : (
              <p>
                You already have an active interview request for every
                application. Check the list below for updates.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="card table-card">
        {interviews.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No interviews yet"
            text="Once you apply for a role, you can request an interview here."
          />
        ) : (
          <table className="applicants-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Preferred Time</th>
                <th>Status</th>
                <th>Interviewer</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((i) => {
                const meta = STATUS_META[i.status] ?? STATUS_META.Pending;
                return (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.role_title ?? "—"}</strong>
                    </td>
                    <td>{formatDateTime(i.scheduled_at)}</td>
                    <td>
                      <span className={`status ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td>
                      <div className="interviewer-cell">
                        <UserRound size={16} />
                        <span>{i.interviewer_name ?? "Not assigned yet"}</span>
                      </div>
                    </td>
                    <td>
                      {!compare(i.status, "Done") &&
                        !compare(i.status, "Cancelled") && (
                          <button
                            className="iv-btn cancel-btn"
                            onClick={() => cancelInterview(i.id)}
                            disabled={cancelling === i.id}
                          >
                            <CalendarX size={14} />
                            {cancelling === i.id ? "Cancelling..." : "Cancel"}
                          </button>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function AdminInterviews() {
  const navigate = useNavigate();
  const handleUnauthorized = useUnauthorized(navigate);
  const [interviews, setInterviews] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [ints, ivs] = await Promise.all([
        api("/interviews"),
        api("/interviews/interviewers"),
      ]);
      setInterviews(ints);
      setInterviewers(ivs);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const setStatus = async (id, status) => {
    setBusy(`${id}-${status}`);
    setError("");
    try {
      await api(`/interviews/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const assignInterviewer = async (id, interviewerId) => {
    setBusy(`${id}-iv`);
    setError("");
    try {
      await api(`/interviews/${id}/interviewer`, {
        method: "PATCH",
        body: { interviewer_id: interviewerId || null },
      });
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="page interview-page">
        <Skeleton width="200px" height="28px" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="page interview-page">
      <h1 className="page-title">Interviews</h1>
      {error && <p className="form-error">{error}</p>}
      <div className="card table-card">
        {interviews.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No interview requests yet"
            text="When applicants request an interview, it will appear here."
          />
        ) : (
          <table className="applicants-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Role</th>
                <th>Preferred Time</th>
                <th>Status</th>
                <th>Interviewer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((i) => {
                const meta = STATUS_META[i.status] ?? STATUS_META.Pending;
                return (
                  <tr key={i.id}>
                    <td>
                      <div className="applicant-cell">
                        <div className="avatar-mini">
                          {initials(i.applicant_name)}
                        </div>
                        <strong>{i.applicant_name}</strong>
                      </div>
                    </td>
                    <td>{i.role_title ?? "—"}</td>
                    <td>{formatDateTime(i.scheduled_at)}</td>
                    <td>
                      <span className={`status ${meta.className}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={i.interviewer_id ?? ""}
                        disabled={busy === `${i.id}-iv`}
                        onChange={(e) => assignInterviewer(i.id, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {interviewers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} · {u.user_role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="action-btns">
                        {compare(i.status, "Pending") && (
                          <button
                            className="iv-btn confirm-btn"
                            onClick={() => setStatus(i.id, "Confirmed")}
                            disabled={busy === `${i.id}-Confirmed`}
                          >
                            <CalendarCheck size={14} /> Confirm
                          </button>
                        )}
                        {!compare(i.status, "Done") &&
                          !compare(i.status, "Cancelled") && (
                            <>
                              <button
                                className="iv-btn"
                                onClick={() => setStatus(i.id, "Done")}
                                disabled={busy === `${i.id}-Done`}
                              >
                                <CheckCircle2 size={14} /> Done
                              </button>
                              <button
                                className="iv-btn cancel-btn"
                                onClick={() => setStatus(i.id, "Cancelled")}
                                disabled={busy === `${i.id}-Cancelled`}
                              >
                                <CalendarX size={14} /> Cancel
                              </button>
                            </>
                          )}
                      </div>
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

export default function InterviewPage() {
  const session = getSession();
  return compare(session?.role, "admin") ? <AdminInterviews /> : <ApplicantInterviews />;
}
