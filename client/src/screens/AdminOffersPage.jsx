import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Send } from "lucide-react";
import { api, logout } from "../api";
import { compare } from "../utils/compare";
import EmptyState from "../components/EmptyState.jsx";
import { Skeleton, TableSkeleton } from "../components/Skeletons.jsx";
import "./AdminOffersPage.css";

const OFFER_STATUSES = ["Extended", "Accepted", "Declined"];

const initials = (name) =>
  (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function OfferRoles({ applications, roles, offers, offering, selections, onSelect, onOffer }) {
  const shortlisted = applications.filter((a) => compare(a.status, "Shortlisted"));
  const offersByApplication = new Map(
    offers.map((o) => [Number(o.application_id), o]),
  );
  const openRoles = roles.filter((r) => compare(r.status, "open"));

  return (
    <div className="card table-card roles-table-card">
      <div className="section-head">
        <h2>Offer a Role</h2>
        <p>
          Give shortlisted applicants a role different from the one they applied
          for.
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
              <th>Offer Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shortlisted.map((app) => {
              const already = offersByApplication.get(Number(app.id));
              const offeredRoleId = selections[app.id] ?? "";
              const eligibleRoles = openRoles.filter(
                (r) => Number(r.id) !== Number(app.role_id),
              );
              return (
                <tr key={app.id}>
                  <td>
                    <div className="applicant-cell">
                      <div className="avatar-mini">
                        {initials(app.applicant_name)}
                      </div>
                      <strong>{app.applicant_name}</strong>
                    </div>
                  </td>
                  <td>
                    <strong>{app.role_title}</strong>
                  </td>
                  <td>
                    {already ? (
                      <span className="status accepted">Offered</span>
                    ) : eligibleRoles.length === 0 ? (
                      <span className="muted-cell">No other open roles</span>
                    ) : (
                      <select
                        className="status-select offer-role-select"
                        value={offeredRoleId}
                        onChange={(e) => onSelect(app.id, e.target.value)}
                      >
                        <option value="">Select a role…</option>
                        {eligibleRoles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title} · {r.department}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    {!already && eligibleRoles.length > 0 && (
                      <button
                        className="apply-btn"
                        disabled={offering === app.id || !offeredRoleId}
                        onClick={() => onOffer(app.id)}
                      >
                        <Send size={14} />
                        {offering === app.id ? "Offering..." : "Offer"}
                      </button>
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

function OffersList({ applications, offers, updating, onChangeStatus }) {
  const appById = new Map(
    applications.map((a) => [Number(a.id), a]),
  );

  return (
    <div className="card table-card roles-table-card">
      <div className="section-head">
        <h2>Offers</h2>
        <p>
          Track every role offered to shortlisted applicants. An applicant can
          hold more than one offer.
        </p>
      </div>
      {offers.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="No offers yet"
          text="Offer a role above and it will appear here."
        />
      ) : (
        <table className="applicants-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Applied For</th>
              <th>Status</th>
              <th>Extended On</th>
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
                      <div className="avatar-mini">
                        {initials(offer.applicant_name)}
                      </div>
                      <strong>{offer.applicant_name}</strong>
                    </div>
                  </td>
                  <td>{appliedRole?.role_title ?? "—"}</td>
                  <td>
                    <span
                      className={`status ${
                        compare(offer.status, "Accepted")
                          ? "accepted"
                          : compare(offer.status, "Declined")
                            ? "rejected"
                            : "pending"
                      }`}
                    >
                      {offer.status}
                    </span>
                  </td>
                  <td>{offer.created_at}</td>
                  <td>
                    <select
                      className="status-select"
                      value={offer.status}
                      disabled={updating === offer.id}
                      onChange={(e) => onChangeStatus(offer.id, e.target.value)}
                    >
                      {OFFER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
  const [offering, setOffering] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [selections, setSelections] = useState({});

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
    (async () => {
      await load();
    })();
  }, [load]);

  const offerRole = async (applicationId) => {
    const roleId = selections[applicationId];
    if (!roleId) {
      setError("Pick a role to offer first.");
      return;
    }
    setOffering(applicationId);
    setError("");
    try {
      await api("/offers", {
        method: "POST",
        body: {
          application_id: Number(applicationId),
          role_id: Number(roleId),
        },
      });
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setOffering(null);
    }
  };

  const changeOfferStatus = async (id, status) => {
    setUpdating(id);
    setError("");
    try {
      await api(`/offers/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setOffers((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o)),
      );
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Skeleton width="180px" height="28px" />
        <TableSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Offers</h1>
      {error && <p className="form-error">{error}</p>}

      <OfferRoles
        applications={applications}
        roles={roles}
        offers={offers}
        offering={offering}
        selections={selections}
        onSelect={(applicationId, roleId) =>
          setSelections((prev) => ({ ...prev, [applicationId]: roleId }))
        }
        onOffer={offerRole}
      />

      <OffersList
        applications={applications}
        offers={offers}
        updating={updating}
        onChangeStatus={changeOfferStatus}
      />
    </div>
  );
}

export default AdminOffersPage;
