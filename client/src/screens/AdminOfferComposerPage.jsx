import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, PenLine } from "lucide-react";
import { api, logout } from "../api";
import { compare } from "../utils/compare";
import OfferComposer from "../components/OfferComposer.jsx";
import { Skeleton } from "../components/Skeletons.jsx";
import "./AdminOfferDetail.css";

function AdminOfferComposerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const applicationId = Number(params.get("application"));
  const [applications, setApplications] = useState([]);
  const [roles, setRoles] = useState([]);
  const [existingOffers, setExistingOffers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

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
      setExistingOffers(offerData);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    (async () => await load())();
  }, [load]);

  if (loading) {
    return (
      <div className="page">
        <Skeleton width="200px" height="28px" />
        <Skeleton width="520px" height="300px" />
      </div>
    );
  }

  const app = applications.find((a) => Number(a.id) === applicationId);
  if (!app || !compare(app.status, "Shortlisted")) {
    return (
      <div className="page">
        <Link to="/dashboard/offers" className="back-link">
          <ArrowLeft size={16} /> Offers
        </Link>
        <h1 className="page-title">Offer a role</h1>
        <p className="form-error">
          {app
            ? "Only shortlisted applicants can receive an offer."
            : "Application not found."}
        </p>
      </div>
    );
  }
  if (existingOffers.some((o) => Number(o.application_id) === applicationId)) {
    return (
      <div className="page">
        <Link to="/dashboard/offers" className="back-link">
          <ArrowLeft size={16} /> Offers
        </Link>
        <h1 className="page-title">Offer a role</h1>
        <p className="form-error">An offer already exists for this applicant.</p>
      </div>
    );
  }

  const create = async ({ terms, role_id }) => {
    setBusy(true);
    setError("");
    try {
      const res = await api("/offers", {
        method: "POST",
        body: { application_id: applicationId, role_id, terms },
      });
      navigate(`/dashboard/offers/${res.id}`, { replace: true });
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <Link to="/dashboard/offers" className="back-link">
        <ArrowLeft size={16} /> Offers
      </Link>
      <div className="offer-detail-head">
        <div className="applicant-cell">
          <div className="avatar-mini">{app.applicant_name?.charAt(0)?.toUpperCase()}</div>
          <div>
            <h1 className="page-title">Offer a role to {app.applicant_name}</h1>
            <span className="muted-cell">Applied for {app.role_title}</span>
          </div>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="card">
        <div className="card-head">
          <h2>
            <PenLine size={16} /> Draft the terms
          </h2>
          <span className="view-all">
            Saved as a draft — extend it when you're ready to send it.
          </span>
        </div>
        <OfferComposer
          mode="create"
          roles={roles}
          appliedRoleId={app.role_id}
          onSubmit={create}
          busy={busy}
        />
      </div>
    </div>
  );
}

export default AdminOfferComposerPage;
