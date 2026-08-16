import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { api, logout } from "../api";
import EmptyState from "../components/EmptyState.jsx";
import OfferCard from "../components/OfferCard.jsx";
import { Skeleton } from "../components/Skeletons.jsx";

function ApplicantOffersPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setOffers(await api("/offers"));
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const onStatusChange = async () => {
    await load();
  };

  if (loading) {
    return (
      <div className="page">
        <Skeleton width="160px" height="28px" />
        <Skeleton width="100%" height="180px" />
        <Skeleton width="100%" height="180px" />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">My Offers</h1>
      <p className="applicant-subtitle">
        Monitor and respond to every offer you&apos;ve received.
      </p>
      {error && <p className="form-error">{error}</p>}

      {offers.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="No offers yet"
          text="When a team extends an offer to you it will appear here for you to review and respond."
        />
      ) : (
        <div className="offers-list">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onStatusChange={onStatusChange}
              onAuthError={handleUnauthorized}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ApplicantOffersPage;