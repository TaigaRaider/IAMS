import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  MessageSquare,
  PenLine,
  Send,
  Flag,
  History,
  UserRound,
} from "lucide-react";
import { api, logout } from "../api";
import { compare } from "../utils/compare";
import { celebrate } from "../utils/celebrate.js";
import { useToast } from "../components/toast-context.js";
import OfferComposer from "../components/OfferComposer.jsx";
import ConfirmHireDialog from "../components/ConfirmHireDialog.jsx";
import { Skeleton } from "../components/Skeletons.jsx";
import "./AdminOfferDetail.css";

const KIND_LABEL = {
  initial: "Initial offer",
  counter: "Counter-offer",
  final: "Final offer",
  reoffer: "Re-offer",
};

function TermsCard({ rev, appliedRoleTitle }) {
  if (!rev) {
    return (
      <p className="muted-cell">
        This offer has no terms on file yet. Add terms below, then extend it.
      </p>
    );
  }
  const rows = [
    ["Position", rev.position_title ?? appliedRoleTitle ?? "—"],
    ["Compensation", rev.compensation],
    ["Duration", rev.duration ?? "—"],
    ["Start date", rev.start_date ?? "—"],
    ["Response deadline", rev.expiry_date ?? "—"],
  ].filter(([, v]) => v !== null && v !== undefined);
  return (
    <div className="offer-terms">
      {rows.map(([label, value]) => (
        <div className="term-line" key={label}>
          <span className="term-label">{label}</span>
          <strong className="term-value">{value}</strong>
        </div>
      ))}
      <div className="term-section">
        <div className="term-label">Task narration</div>
        <p>{rev.narration}</p>
      </div>
      <div className="term-section">
        <div className="term-label">Limitations &amp; expectations</div>
        <p>{rev.terms}</p>
      </div>
    </div>
  );
}

function ActionBar({ status, onExtend, onToggleFinal, finalMode, onOpenConfirm }) {
  if (compare(status, "Draft")) {
    return (
      <div className="action-bar">
        <button className="apply-btn" onClick={onExtend}>
          <Send size={16} /> Extend Offer
        </button>
      </div>
    );
  }
  if (["Extended", "In Negotiation"].includes(status)) {
    return (
      <div className="action-bar">
        <button className="btn-ghost" onClick={onToggleFinal}>
          <Flag size={16} />
          {finalMode ? "Amend terms instead" : "Draw Final Offer"}
        </button>
      </div>
    );
  }
  if (compare(status, "Accepted")) {
    return (
      <div className="action-bar">
        <button className="apply-btn" onClick={onOpenConfirm}>
          <BadgeCheck size={16} /> Confirm Hire
        </button>
      </div>
    );
  }
  return null;
}

function AdminOfferDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [offer, setOffer] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [finalMode, setFinalMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      const [offerData, roleData] = await Promise.all([api(`/offers/${id}`), api("/roles")]);
      setOffer(offerData);
      setRoles(roleData);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    }
  }, [id, handleUnauthorized]);

  useEffect(() => {
    (async () => await load())();
  }, [load]);

  const submitTerms = async ({ terms, role_id, message }) => {
    setBusy(true);
    setError("");
    try {
      const mode = offer.status === "Declined" ? "reoffer" : finalMode ? "final" : "counter";
      const path =
        mode === "counter" || mode === "reoffer"
          ? `/offers/${id}/counter`
          : `/offers/${id}/final`;
      await api(path, { method: "POST", body: { terms, role_id, message } });
      setFinalMode(false);
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const editDraft = async ({ terms, role_id }) => {
    setBusy(true);
    setError("");
    try {
      await api(`/offers/${id}`, { method: "PATCH", body: { terms, role_id } });
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const extend = async () => {
    setBusy(true);
    setError("");
    try {
      await api(`/offers/${id}/extend`, { method: "POST" });
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmHire = async () => {
    setBusy(true);
    setError("");
    try {
      await api(`/offers/${id}/confirm`, { method: "POST" });
      setConfirmOpen(false);
      await load();
      celebrate();
      toast(`${offer.applicant_name ?? "Candidate"} is now an intern!`, "success");
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !offer) return <p className="form-error">{error}</p>;
  if (!offer) return <Skeleton width="200px" height="28px" />;

  const status = offer.status;
  const current = offer.revisions?.[0] ?? null;
  const appliedRoleTitle = offer.role_title ?? "—";
  const isDraft = compare(status, "Draft");
  const showComposer =
    isDraft || ["Extended", "In Negotiation", "Declined"].includes(status);
  const composerMode = isDraft
    ? "create"
    : compare(status, "Declined")
      ? "reoffer"
      : finalMode
        ? "final"
        : "counter";

  return (
    <div className="page">
      <Link to="/dashboard/offers" className="back-link">
        <ArrowLeft size={16} /> Offers
      </Link>

      <div className="offer-detail-head">
        <div className="applicant-cell">
          <div className="avatar-mini">
            {(offer.applicant_name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="page-title">{offer.applicant_name}</h1>
            <span className="muted-cell">
              <UserRound size={14} /> Applied for {appliedRoleTitle}
            </span>
          </div>
        </div>
        <span
          className={`status ${
            compare(status, "Accepted") || compare(status, "Confirmed")
              ? "accepted"
              : compare(status, "Declined")
                ? "rejected"
                : "pending"
          }`}
        >
          {status}
        </span>
      </div>
      {error && <p className="form-error">{error}</p>}

      <div className="offer-detail-grid">
        <div className="card">
          <div className="card-head">
            <h2>Current terms</h2>
            {current && current.version && (
              <span className="view-all">v{current.version}</span>
            )}
          </div>
          <TermsCard rev={current} appliedRoleTitle={appliedRoleTitle} />
        </div>

        <div className="card">
          <div className="card-head">
            <h2>
              <MessageSquare size={16} /> Negotiation
            </h2>
            <span className="view-all">{offer.messages?.length ?? 0} messages</span>
          </div>
          {(offer.messages?.length ?? 0) === 0 ? (
            <p className="muted-cell">No messages yet — this is where the back-and-forth will live.</p>
          ) : (
            <ul className="thread">
              {[...(offer.messages ?? [])].reverse().map((m) => (
                <li key={m.id} className={`thread-item ${m.sender_role}`}>
                  <strong>{compare(m.sender_role, "admin") ? "Admin" : "Candidate"}</strong>
                  <p>{m.message}</p>
                  <span className="muted-cell">{m.created_at}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>
            <History size={16} /> Offer history
          </h2>
        </div>
        {!offer.revisions?.length ? (
          <p className="muted-cell">No revisions recorded.</p>
        ) : (
          <ul className="revision-list">
            {offer.revisions.map((rev) => (
              <li key={rev.id}>
                <div className="revision-head">
                  <strong>
                    v{rev.version} · {KIND_LABEL[rev.kind] ?? rev.kind}
                  </strong>
                  <span className={`status ${rev.status === "accepted" ? "accepted" : rev.status === "declined" ? "rejected" : rev.status === "superseded" ? "" : "pending"} status-${rev.status}`}>
                    {rev.status}
                  </span>
                </div>
                <div className="revision-meta">
                  <span className="muted-cell">
                    {rev.position_title ?? appliedRoleTitle} · {rev.compensation}
                  </span>
                  <span className="muted-cell">
                    {rev.duration ? `${rev.duration}` : ""}
                    {rev.start_date ? ` · starts ${rev.start_date}` : ""}
                  </span>
                </div>
                {rev.narration && <p className="revision-narration">{rev.narration}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showComposer && (
        <div className="card">
          <div className="card-head">
            <h2>
              <PenLine size={16} />
              {isDraft ? "Edit draft terms" : "Compose your response"}
            </h2>
          </div>
          <ActionBar
            status={status}
            onExtend={extend}
            onToggleFinal={() => setFinalMode((v) => !v)}
            finalMode={finalMode}
            onOpenConfirm={() => setConfirmOpen(true)}
          />
          <OfferComposer
            mode={composerMode}
            initial={current ?? null}
            roles={roles}
            appliedRoleId={current?.role_id ?? null}
            onSubmit={isDraft ? editDraft : submitTerms}
            busy={busy}
          />
        </div>
      )}

      <ConfirmHireDialog
        open={confirmOpen}
        offer={offer}
        busy={busy}
        error={error}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmHire}
      />
    </div>
  );
}

export default AdminOfferDetail;
