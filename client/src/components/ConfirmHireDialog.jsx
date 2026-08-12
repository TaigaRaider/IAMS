import { ShieldCheck, X, BadgeCheck } from "lucide-react";

export default function ConfirmHireDialog({ open, offer, busy, error, onCancel, onConfirm }) {
  if (!open) return null;
  const rev = offer?.current_revision ?? null;
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <h3>
            <ShieldCheck size={18} /> Confirm hire
          </h3>
          <button className="modal-close" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="modal-text">
          <strong>{offer?.applicant_name}</strong> accepted this offer. Confirming
          promotes them to an intern and marks their application as{" "}
          <strong>Hired</strong>.
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
          <button className="apply-btn" onClick={onConfirm} disabled={busy}>
            <BadgeCheck size={16} />
            {busy ? "Confirming…" : "Confirm and hire"}
          </button>
        </div>
      </div>
    </div>
  );
}
