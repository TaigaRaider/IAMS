import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Send, Flag, PenLine, Eye } from "lucide-react";
import { api, logout } from "../api";
import { compare } from "../utils/compare";
import EmptyState from "../components/EmptyState.jsx";
import ConfirmHireDialog from "../components/ConfirmHireDialog.jsx";
import { Skeleton, TableSkeleton } from "../components/Skeletons.jsx";
import "./AdminOffersPage.css";

const initials = (name) =>
  (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const STATUS_CLASS = {
  Draft: "pending",
  Extended: "pending",
  "In Negotiation": "shortlisted",
  Final: "pending",
  Accepted: "accepted",
  Confirmed: "accepted",
  Declined: "rejected",
};

function OfferRoles({ applications, roles, offers }) {
  const shortlisted = applications.filter((a) => compare(a.status, "Shortlisted"));
  const offered = new Map(offers.map((o) => [Number(o.application_id), o]));
  const openRoles = roles.filter((r) => compare(r.status, "open"));

  return (
    <div className="card table-card roles-table-card">
      <div className="section-head">
        <h2>Offer a role</h2>
        <p>
          Draft an offer for a shortlisted applicant. You can offer a different
          role from the one they applied for.
        </p>
      </div>
      {shortlisted.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="No shortlisted applicants"
          text="Shortlist applicants on the Applicants page, then come back to offer them a role."
        />
      ) : (
        <table className="applicants-table offer-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Applied For</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shortlisted.map((app) => {
              const already = offered.get(Number(app.id));
              return (
                <tr key={app.id}>
                  <td>
                    <div className="applicant-cell">
                      <div className="avatar-mini">{initials(app.applicant_name)}</div>
                      <strong>{app.applicant_name}</strong>
                    </div>
                  </td>
                  <td>
                    <strong>{app.role_title}</strong>
                  </td>
                  <td>
                    {already ? (
                      <span className="status accepted">
                        {already.status === "Draft" ? "Drafted" : "Offered"}
                      </span>
                    ) : openRoles.length === 0 ? (
                      <span className="muted-cell">No open roles</span>
                    ) : (
                      <Link
                        className="apply-btn"
                        to={`/dashboard/offers/new?application=${app.id}`}
                      >
                        <PenLine size={14} /> Draft
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const COMPLETED_STATUSES = ["Final", "Confirmed", "Declined"];

function OfferRowActions({ offer, busyId, onAction }) {
  if (COMPLETED_STATUSES.includes(offer.status)) {
    return (
      <Link className="btn-ghost view-offer-btn" to={`/dashboard/offers/${offer.id}`}>
        <Eye size={14} /> View
      </Link>
    );
  }
  if (compare(offer.status, "Draft")) {
    return (
      <button
        className="apply-btn"
        disabled={busyId === offer.id}
        onClick={() => onAction("extend", offer)}
      >
        <Send size={14} />
        {busyId === offer.id ? "Extending…" : "Extend"}
      </button>
    );
  }
  if (["Extended", "In Negotiation"].includes(offer.status)) {
    return (
      <Link className="apply-btn" to={`/dashboard/offers/${offer.id}`}>
        <Flag size={14} /> Respond
      </Link>
    );
  }
  if (compare(offer.status, "Accepted")) {
    return (
      <button className="apply-btn" onClick={() => onAction("confirm", offer)}>
        <BadgeCheck size={14} /> Confirm Hire
      </button>
    );
  }
  return null;
}

function OffersList({ applications, offers, busyId, onAction }) {
  const appById = new Map(applications.map((a) => [Number(a.id), a]));

  return (
    <div className="card table-card roles-table-card">
      <div className="section-head">
        <h2>Offers</h2>
        <p>
          Drafts are only visible to you. Active offers can be followed through
          here; completed offers open into a full review.
        </p>
      </div>
      {offers.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="No offers yet"
          text="Draft an offer for a shortlisted applicant above and it will appear here."
        />
      ) : (
        <table className="applicants-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Applied For</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const appliedRole = appById.get(Number(offer.application_id));
              return (
                <tr key={offer.id}>
                  <td>
                    <div className="applicant-cell">
                      <div className="avatar-mini">{initials(offer.applicant_name)}</div>
                      <strong>{offer.applicant_name}</strong>
                    </div>
                  </td>
                  <td>{appliedRole?.role_title ?? "—"}</td>
                  <td>
                    <span className={`status ${STATUS_CLASS[offer.status] ?? "pending"}`}>
                      {offer.status}
                    </span>
                  </td>
                  <td>
                    <OfferRowActions
                      offer={offer}
                      busyId={busyId}
                      onAction={onAction}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AdminOffersPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [roles, setRoles] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

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
      const [appData, roleData, offerData] = await Promise.all([
        api("/applications"),
        api("/roles"),
        api("/offers"),
      ]);
      setApplications(appData);
      setRoles(roleData);
      setOffers(offerData);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    (async () => await load())();
  }, [load]);

  const extend = async (offer) => {
    setBusyId(offer.id);
    setError("");
    try {
      await api(`/offers/${offer.id}/extend`, { method: "POST" });
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmHire = async () => {
    if (!confirmTarget) return;
    setBusyId(confirmTarget.id);
    setError("");
    try {
      await api(`/offers/${confirmTarget.id}/confirm`, { method: "POST" });
      setConfirmTarget(null);
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const onAction = (action, offer) => {
    if (action === "extend") extend(offer);
    if (action === "confirm") setConfirmTarget(offer);
  };

  if (loading) {
    return (
      <div className="page">
        <Skeleton width="180px" height="28px" />
        <TableSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Offers</h1>
      {error && <p className="form-error">{error}</p>}

      <OfferRoles applications={applications} roles={roles} offers={offers} />

      <OffersList
        applications={applications}
        offers={offers}
        busyId={busyId}
        onAction={onAction}
      />

      <ConfirmHireDialog
        open={Boolean(confirmTarget)}
        offer={confirmTarget}
        busy={busyId === confirmTarget?.id}
        error={error}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={confirmHire}
      />
    </div>
  );
}

export default AdminOffersPage;