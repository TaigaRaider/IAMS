import { BadgeCheck, X } from "lucide-react";

export default function AcceptOfferDialog({
  open,
  offer,
  busy,
  error,
  onCancel,
  onAccept,
}) {
  if (!open) return null;
  const rev = offer?.current_revision ?? null;
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <h3>
            <BadgeCheck size={18} /> Accept this offer?
          </h3>
          <button className="modal-close" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="modal-text">
          You&apos;re about to accept the offer for{" "}
          <strong>{rev?.position_title ?? offer?.role_title ?? "this role"}</strong>.
          Would you like to decline all your other active offers at the same
          time?
        </p>
        {rev && (
          <div className="modal-terms">
            <div className="modal-term">
              <span>Position</span>
              <strong>{rev.position_title ?? offer?.role_title ?? "—"}</strong>
            </div>
            <div className="modal-term">
              <span>Compensation</span>
              <strong>{rev.compensation}</strong>
            </div>
            {rev.duration && (
              <div className="modal-term">
                <span>Duration</span>
                <strong>{rev.duration}</strong>
              </div>
            )}
            {rev.start_date && (
              <div className="modal-term">
                <span>Starts</span>
                <strong>{rev.start_date}</strong>
              </div>
            )}
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn-ghost"
            onClick={() => onAccept(false)}
            disabled={busy}
          >
            {busy ? "Accepting…" : "Accept only this offer"}
          </button>
          <button
            className="apply-btn"
            onClick={() => onAccept(true)}
            disabled={busy}
          >
            <BadgeCheck size={16} />
            {busy ? "Accepting…" : "Accept & decline other offers"}
          </button>
        </div>
      </div>
    </div>
  );
}