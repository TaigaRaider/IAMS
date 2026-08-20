import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { api, logout } from "../api";
import "./InternFormsPage.css";

const FORM_FIELDS = [
  { key: "phone", label: "Phone number", type: "tel", max: 30 },
  { key: "location", label: "Location / City", type: "text", max: 120 },
  { key: "nationality", label: "Nationality", type: "text", max: 60 },
  { key: "date_of_birth", label: "Date of birth", type: "date", max: 30 },
  { key: "education", label: "Education", type: "textarea", max: 500 },
  { key: "experience", label: "Work experience", type: "textarea", max: 2000 },
  { key: "skills", label: "Skills", type: "textarea", max: 500 },
];

export default function InternFormsPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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

  useEffect(() => {
    (async () => {
      try {
        const me = await api("/auth/me");
        const biodata = me.biodata ?? {};
        const next = {};
        for (const f of FORM_FIELDS) next[f.key] = biodata[f.key] ?? "";
        setForm(next);
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [handleUnauthorized]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const me = await api("/auth/me");
      await api("/auth/account/profile", {
        method: "PATCH",
        body: { full_name: me.full_name ?? "", ...form },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="page">
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate("/intern")}>
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="page-title">Onboarding Forms</h1>
      </div>

      {error && <p className="form-error">{error}</p>}
      {saved && (
        <p className="form-success">Onboarding forms saved successfully!</p>
      )}

      <div className="card docs-card">
        <h2 className="cute-section-title">Your details</h2>
        <p className="muted">
          This doubles as your onboarding paperwork — fill in every field and
          double-check before saving. Your application details are prefilled.
        </p>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <form className="access-form forms-grid" onSubmit={save}>
            {FORM_FIELDS.map((f) => (
              <div className="cute-form-group" key={f.key}>
                <label htmlFor={`form-${f.key}`}>{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    id={`form-${f.key}`}
                    className="field cute-input"
                    rows={4}
                    maxLength={f.max}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    id={`form-${f.key}`}
                    className="field cute-input"
                    type={f.type}
                    maxLength={f.max}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
            <div className="cute-form-actions">
              <button className="btn cute-btn-primary" type="submit" disabled={busy}>
                <Save size={16} />
                {busy ? "Saving..." : "Save Forms"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}