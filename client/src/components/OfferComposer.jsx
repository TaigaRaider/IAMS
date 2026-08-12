import { useState } from "react";

const MODE_META = {
  create: { submit: "Create Offer", withMessage: false, heading: "Draft an offer" },
  counter: { submit: "Send Counter-offer", withMessage: true, heading: "Amend the terms" },
  final: { submit: "Draw Final Offer", withMessage: true, heading: "Close the negotiation" },
  reoffer: { submit: "Re-offer", withMessage: true, heading: "Re-offer after decline" },
};

export default function OfferComposer({
  mode = "create",
  initial = null,
  roles = [],
  appliedRoleId = null,
  submitLabel,
  onSubmit,
  busy = false,
  internalError = "",
}) {
  const meta = MODE_META[mode] ?? MODE_META.create;
  const [positionTitle, setPositionTitle] = useState(initial?.position_title ?? "");
  const [roleId, setRoleId] = useState(
    initial?.role_id != null ? String(initial.role_id) : appliedRoleId != null ? String(appliedRoleId) : "",
  );
  const [compensation, setCompensation] = useState(initial?.compensation ?? "");
  const [duration, setDuration] = useState(initial?.duration ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [narration, setNarration] = useState(initial?.narration ?? "");
  const [constraints, setConstraints] = useState(initial?.terms ?? "");
  const [expiryDate, setExpiryDate] = useState(initial?.expiry_date ?? "");
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      terms: {
        position_title: positionTitle.trim() || null,
        compensation: compensation.trim(),
        duration: duration.trim() || null,
        start_date: startDate.trim() || null,
        narration: narration.trim(),
        terms: constraints.trim(),
        expiry_date: expiryDate.trim() || null,
      },
      role_id: roleId ? Number(roleId) : null,
      message: message.trim() || null,
    };
    if (!payload.terms.compensation || !payload.terms.narration || !payload.terms.terms) {
      setLocalError("Compensation, task narration and terms are required.");
      return;
    }
    setLocalError("");
    onSubmit(payload);
  };

  return (
    <form className="access-form offer-composer" onSubmit={handleSubmit}>
      {(localError || internalError) && (
        <p className="form-error">{localError || internalError}</p>
      )}

      <label className="label" htmlFor="oc-position">
        Position title {initial?.position_title ? "(overrides the applied role)" : "(optional)"}
      </label>
      <input
        className="field"
        id="oc-position"
        type="text"
        value={positionTitle}
        onChange={(e) => setPositionTitle(e.target.value)}
        placeholder="e.g. Frontend Engineer"
      />

      {roles.length > 0 && (
        <>
          <label className="label" htmlFor="oc-role">
            Offered role {appliedRoleId ? "(defaults to the role applied for)" : ""}
          </label>
          <select
            className="field"
            id="oc-role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
          >
            <option value="">
              {appliedRoleId ? "Applied role" : "Select a role…"}
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} · {r.department}
              </option>
            ))}
          </select>
        </>
      )}

      <label className="label" htmlFor="oc-compensation">
        Compensation (required)
      </label>
      <input
        className="field"
        id="oc-compensation"
        type="text"
        required
        value={compensation}
        onChange={(e) => setCompensation(e.target.value)}
        placeholder="e.g. KSh 30,000/month stipend"
      />

      <div className="composer-row">
        <div>
          <label className="label" htmlFor="oc-duration">
            Duration (optional)
          </label>
          <input
            className="field"
            id="oc-duration"
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 12 weeks"
          />
        </div>
        <div>
          <label className="label" htmlFor="oc-start">
            Start date (optional)
          </label>
          <input
            className="field"
            id="oc-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>

      <label className="label" htmlFor="oc-narration">
        Task narration (required)
      </label>
      <textarea
        className="field"
        id="oc-narration"
        rows={3}
        required
        value={narration}
        onChange={(e) => setNarration(e.target.value)}
        placeholder="What will the intern actually work on?"
      />

      <label className="label" htmlFor="oc-terms">
        Limitations &amp; expectations (required)
      </label>
      <textarea
        className="field"
        id="oc-terms"
        rows={3}
        required
        value={constraints}
        onChange={(e) => setConstraints(e.target.value)}
        placeholder="Working hours, reporting lines, commitments, ground rules…"
      />

      <label className="label" htmlFor="oc-expiry">
        Response deadline (optional)
      </label>
      <input
        className="field"
        id="oc-expiry"
        type="date"
        value={expiryDate}
        onChange={(e) => setExpiryDate(e.target.value)}
      />

      {meta.withMessage && (
        <>
          <label className="label" htmlFor="oc-message">
            Message to candidate (optional)
          </label>
          <textarea
            className="field"
            id="oc-message"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Context for the revised terms…"
          />
        </>
      )}

      <input
        className="submit-btn"
        type="submit"
        value={busy ? "Saving…" : submitLabel ?? meta.submit}
        disabled={busy}
      />
    </form>
  );
}
