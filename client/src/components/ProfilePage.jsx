import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Power, Smile, PenLine, Sparkles, User, BadgeCheck } from "lucide-react";
import { api, getSession, logout, saveSession } from "../api";
import "./ProfilePage.css";

function ProfilePage() {
  const navigate = useNavigate();
  const session = getSession();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  
  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

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
        setProfile(me);
        setEditName(me.full_name ?? "");
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      }
    })();
  }, [handleUnauthorized]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setBusy(true);
    // Simulate an API call
    setTimeout(() => {
      setProfile((prev) => ({ ...prev, full_name: editName }));
      // Also update local session so it reflects globally until page refresh
      const currSession = getSession();
      if (currSession) {
        saveSession({ ...currSession, full_name: editName });
      }
      setBusy(false);
      setIsEditing(false);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    }, 600);
  };

  const deactivateAccount = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/auth/account/deactivate", { method: "PATCH" });
      // Stay signed in but confined to the account page until reactivated.
      saveSession({ ...getSession(), deactivated: true });
      navigate("/account", { replace: true });
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
      setBusy(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      const role = session?.role ?? "applicant";
      navigate(
        role === "admin"
          ? "/dashboard"
          : role === "intern"
            ? "/intern"
            : "/applicant",
        { replace: true },
      );
    }
  };

  return (
    <div className="page profile-page">
      <div className="profile-header">
        <button className="back-btn" onClick={goBack}>
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="page-title">My Profile</h1>
      </div>
      {error && <p className="form-error">{error}</p>}
      {editSuccess && (
        <p className="form-success" style={{ color: "var(--success-color, #15803d)", background: "var(--success-bg, #dcfce7)", padding: "12px", borderRadius: "8px" }}>
          Profile updated successfully! (UI only)
        </p>
      )}

      <div className="card cute-profile-card">
        <div className="profile-banner"></div>
        <div className="cute-profile-content">
          <div className="cute-avatar-wrapper">
            <div className="cute-avatar">
              <Smile size={42} strokeWidth={2.5} />
            </div>
          </div>
          <div className="cute-profile-info">
            <h2>{profile?.full_name ?? session?.full_name ?? "—"}</h2>
            <span className="cute-badge capitalize">
              <Sparkles size={14} />
              {profile?.role ?? session?.role ?? "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="card profile-card cute-details-card">
        <div className="cute-details-header">
          <h2 className="cute-section-title">
            <User size={18} className="title-icon" />
            Account Details
          </h2>
          {!isEditing && (
            <button className="cute-inline-edit-btn" onClick={() => setIsEditing(true)}>
              <PenLine size={14} /> Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="access-form cute-edit-form">
            <div className="cute-form-group">
              <label htmlFor="edit-name">Full name</label>
              <input 
                id="edit-name"
                className="field cute-input"
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="cute-form-actions">
              <button type="button" className="btn ghost-btn cute-btn-secondary" onClick={() => { setIsEditing(false); setEditName(profile?.full_name ?? ""); }}>Cancel</button>
              <button type="submit" className="btn cute-btn-primary" disabled={busy}>
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="profile-details cute-dl">
            <div className="detail-row">
              <dt>Full name</dt>
              <dd>{profile?.full_name ?? "—"}</dd>
            </div>
            <div className="detail-row">
              <dt>Role</dt>
              <dd className="capitalize flex-dd">
                {profile?.role ?? "—"}
                <BadgeCheck size={16} className="verified-icon" />
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="card profile-card deactivate-danger-card">
        <div className="danger-header">
          <Power size={18} className="danger-icon" />
          <h2>Deactivate My Account</h2>
        </div>
        <p className="muted danger-note">
          Deactivating keeps your account for you till you're ready to come
          back. While deactivated you'll be moved to the account page, where you
          can reactivate or permanently delete your account — the rest of the
          app is locked until you reactivate.
        </p>

        {!confirmingDeactivate ? (
          <button
            className="btn deactivate-danger-btn"
            onClick={() => setConfirmingDeactivate(true)}
          >
            Deactivate Account
          </button>
        ) : (
          <div className="confirm-row">
            <p className="muted confirm-note">Are you sure?</p>
            <div className="confirm-buttons">
              <button
                className="btn ghost-btn cute-btn-secondary"
                onClick={() => setConfirmingDeactivate(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="btn deactivate-danger-btn"
                onClick={deactivateAccount}
                disabled={busy}
              >
                {busy ? "Deactivating..." : "Yes, deactivate my account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
