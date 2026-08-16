import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { compare } from "../utils/compare";
import AcceptOfferDialog from "./AcceptOfferDialog.jsx";
import "./OfferCard.css";

// Self-contained offer card for candidates. Owns the accept/decline/request
// flow (including the accept confirmation dialog) and reports status changes
// back to the parent so lists stay in sync.
function OfferCard({ offer, onStatusChange, onAuthError }) {
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");

  const fail = (err) => {
    if (!onAuthError?.(err)) setError(err.message);
  };

  const acceptOffer = async (declineOthers) => {
    setAccepting(true);
    setError("");
    try {
      await api(`/offers/${offer.id}/accept`, {
        method: "POST",
        body: { decline_others: declineOthers },
      });
      setDialogOpen(false);
      onStatusChange?.(offer.id, "Accepted");
    } catch (err) {
      fail(err);
    } finally {
      setAccepting(false);
    }
  };

  const declineOffer = async () => {
    setDeclining(true);
    setError("");
    try {
      await api(`/offers/${offer.id}/decline`, { method: "POST" });
      onStatusChange?.(offer.id, "Declined");
    } catch (err) {
      fail(err);
    } finally {
      setDeclining(false);
    }
  };

  const requestChanges = async () => {
    if (!requestMessage.trim()) return;
    setRequesting(true);
    setError("");
    try {
      await api(`/offers/${offer.id}/request-changes`, {
        method: "POST",
        body: { message: requestMessage.trim() },
      });
      onStatusChange?.(offer.id, "In Negotiation");
      setRequestMessage("");
      setRequestOpen(false);
    } catch (err) {
      fail(err);
    } finally {
      setRequesting(false);
    }
  };

  const rev = offer?.current_revision ?? null;
  const roleTitle = rev?.position_title ?? offer?.role_title ?? "";

  return (
    <section className="card offer-card">
      <div className="card-head">
        <h2>Job Offer — {roleTitle}</h2>
        <span
          className={`status ${
            compare(offer.status, "Accepted") || compare(offer.status, "Confirmed")
              ? "accepted"
              : compare(offer.status, "Declined")
                ? "rejected"
                : "pending"
          }`}
        >
          {offer.status}
        </span>
      </div>

      {error && <p className="form-error">{error}</p>}

      {rev && (
        <div className="offer-terms">
          <div className="term-line">
            <span className="term-label">Position</span>
            <strong className="term-value">{roleTitle}</strong>
          </div>
          <div className="term-line">
            <span className="term-label">Compensation</span>
            <strong className="term-value">{rev.compensation}</strong>
          </div>
          {rev.duration && (
            <div className="term-line">
              <span className="term-label">Duration</span>
              <strong className="term-value">{rev.duration}</strong>
            </div>
          )}
          {rev.start_date && (
            <div className="term-line">
              <span className="term-label">Start date</span>
              <strong className="term-value">{rev.start_date}</strong>
            </div>
          )}
          {rev.expiry_date && (
            <div className="term-line">
              <span className="term-label">Respond by</span>
              <strong className="term-value">{rev.expiry_date}</strong>
            </div>
          )}
          <div className="term-section">
            <span className="term-label">Task narration</span>
            <p>{rev.narration}</p>
          </div>
          <div className="term-section">
            <span className="term-label">Limitations &amp; expectations</span>
            <p>{rev.terms}</p>
          </div>
        </div>
      )}

      {compare(offer.status, "Extended") && (
        <>
          <p>
            An offer has been extended for <strong>{roleTitle}</strong>. Review
            the terms above. You can accept, decline, or request changes before
            deciding.
          </p>
          <div className="offer-actions">
            <button
              className="apply-btn"
              onClick={() => setDialogOpen(true)}
              disabled={accepting || declining}
            >
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

      {compare(offer.status, "In Negotiation") && (
        <>
          <p>
            The team is reviewing your request. You can still accept the
            current terms, or decline the offer.
          </p>
          <div className="offer-actions">
            <button
              className="apply-btn"
              onClick={() => setDialogOpen(true)}
              disabled={accepting || declining}
            >
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

      {compare(offer.status, "Final") && (
        <>
          <p>
            This is the team's final offer. Accept it to become an intern — it
            can no longer be negotiated.
          </p>
          <div className="offer-actions">
            <button
              className="apply-btn"
              onClick={() => setDialogOpen(true)}
              disabled={accepting || declining}
            >
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

      {compare(offer.status, "Accepted") && (
        <p>
          Offer accepted! We're waiting on the final confirmation from the team
          before you become an intern. This page reloads automatically once it
          goes through.
        </p>
      )}

      {compare(offer.status, "Confirmed") && (
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

      {compare(offer.status, "Declined") && <p>This offer was declined.</p>}

      <AcceptOfferDialog
        open={dialogOpen}
        offer={offer}
        busy={accepting}
        error={error}
        onCancel={() => setDialogOpen(false)}
        onAccept={acceptOffer}
      />
    </section>
  );
}

export default OfferCard;