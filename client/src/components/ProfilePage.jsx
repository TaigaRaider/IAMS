import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Power,
  Smile,
  PenLine,
  Sparkles,
  User,
  BadgeCheck,
  KeyRound,
  Mail,
} from "lucide-react";
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

  // Avatar upload state
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Change password state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // Email change state
  const [emailStep, setEmailStep] = useState("idle"); // idle | sent | done
  const [emailForm, setEmailForm] = useState({ newEmail: "", code: "" });
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    setEditSuccess(false);
    try {
      const updated = await api("/auth/account/profile", {
        method: "PATCH",
        body: { full_name: editName },
      });
      setProfile((prev) => ({ ...prev, full_name: updated.full_name }));
      const currSession = getSession();
      if (currSession) {
        saveSession({ ...currSession, full_name: updated.full_name });
      }
      setIsEditing(false);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("avatar", file);
      const updated = await api("/auth/account/avatar", {
        method: "POST",
        body: form,
      });
      setProfile((prev) => ({ ...prev, avatar_url: updated.avatar_url }));
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: "error", text: "New passwords don't match" });
      return;
    }
    setPwBusy(true);
    setPwMsg(null);
    try {
      await api("/auth/account/password", {
        method: "PATCH",
        body: { current_password: pwForm.current, new_password: pwForm.next },
      });
      // The change revokes this session server-side — sign in again with the
      // new password.
      setPwMsg({
        type: "success",
        text: "Password changed — signing you out...",
      });
      setTimeout(() => {
        logout();
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err) {
      if (!handleUnauthorized(err))
        setPwMsg({ type: "error", text: err.message });
    } finally {
      setPwBusy(false);
    }
  };

  const requestEmailChange = async (e) => {
    e.preventDefault();
    setEmailMsg(null);
    setEmailBusy(true);
    try {
      await api("/auth/account/email", {
        method: "POST",
        body: { new_email: emailForm.newEmail.trim() },
      });
      setEmailStep("sent");
      setEmailMsg({
        type: "success",
        text: `A verification code was sent to ${emailForm.newEmail.trim()}`,
      });
    } catch (err) {
      if (!handleUnauthorized(err))
        setEmailMsg({ type: "error", text: err.message });
    } finally {
      setEmailBusy(false);
    }
  };

  const confirmEmailChange = async (e) => {
    e.preventDefault();
    setEmailMsg(null);
    setEmailBusy(true);
    try {
      const updated = await api("/auth/account/email/confirm", {
        method: "POST",
        body: {
          new_email: emailForm.newEmail.trim(),
          code: emailForm.code.trim(),
        },
      });
      setProfile((prev) => ({ ...prev, email: updated.email }));
      setEmailStep("done");
      setEmailForm({ newEmail: "", code: "" });
      setEmailMsg({
        type: "success",
        text: "Email updated successfully!",
      });
    } catch (err) {
      if (!handleUnauthorized(err))
        setEmailMsg({ type: "error", text: err.message });
    } finally {
      setEmailBusy(false);
    }
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
        <p
          className="form-success"
          style={{
            color: "var(--success-color, #15803d)",
            background: "var(--success-bg, #dcfce7)",
            padding: "12px",
            borderRadius: "8px",
          }}
        >
          Profile updated successfully!
        </p>
      )}

      <div className="card cute-profile-card">
        <div className="profile-banner"></div>
        <div className="cute-profile-content">
          <div className="cute-avatar-wrapper" style={{ position: "relative" }}>
            <div className="cute-avatar">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile picture"
                  className="cute-avatar-img"
                />
              ) : (
                <Smile size={42} strokeWidth={2.5} />
              )}
            </div>
            <label
              className="upload-avatar-btn"
              title="Upload new picture"
              style={{ pointerEvents: avatarBusy ? "none" : "auto", opacity: avatarBusy ? 0.6 : 1 }}
            >
              <input
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: "none" }}
                onChange={handleAvatarUpload}
                disabled={avatarBusy}
              />
              <div className="upload-icon-wrapper">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              </div>
            </label>
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
            <button
              className="cute-inline-edit-btn"
              onClick={() => setIsEditing(true)}
            >
              <PenLine size={14} /> Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form
            onSubmit={handleSaveProfile}
            className="access-form cute-edit-form"
          >
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
              <button
                type="button"
                className="btn ghost-btn cute-btn-secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditName(profile?.full_name ?? "");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn cute-btn-primary"
                disabled={busy}
              >
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
              <dt>Email</dt>
              <dd>{profile?.email ?? "—"}</dd>
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

      <div className="card profile-card email-card">
        <div className="security-header">
          <Mail size={18} className="security-icon" />
          <h2 className="cute-section-title">Email Address</h2>
        </div>
        <p className="muted security-note">
          {emailStep === "done"
            ? "Your email is up to date."
            : "Changing your email sends a verification code to the new address before it takes effect."}
        </p>
        {emailMsg && <p className={`security-msg ${emailMsg.type}`}>{emailMsg.text}</p>}
        {emailStep !== "done" && (
          <form
            onSubmit={emailStep === "sent" ? confirmEmailChange : requestEmailChange}
            className="access-form security-form"
          >
            <div className="cute-form-group">
              <label htmlFor="new-email">New email</label>
              <input
                id="new-email"
                className="field cute-input"
                type="email"
                value={emailForm.newEmail}
                onChange={(e) =>
                  setEmailForm((f) => ({ ...f, newEmail: e.target.value }))
                }
                placeholder="you@example.com"
                required
              />
            </div>
            {emailStep === "sent" && (
              <div className="cute-form-group">
                <label htmlFor="email-code">Verification code</label>
                <input
                  id="email-code"
                  className="field cute-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={emailForm.code}
                  onChange={(e) =>
                    setEmailForm((f) => ({ ...f, code: e.target.value }))
                  }
                  placeholder="6-digit code"
                  required
                />
              </div>
            )}
            <div className="cute-form-actions">
              {emailStep === "sent" && (
                <button
                  type="button"
                  className="btn ghost-btn cute-btn-secondary"
                  onClick={() => {
                    setEmailStep("idle");
                    setEmailMsg(null);
                    setEmailForm({ newEmail: "", code: "" });
                  }}
                >
                  Start over
                </button>
              )}
              <button
                type="submit"
                className="btn cute-btn-primary"
                disabled={emailBusy}
              >
                {emailBusy
                  ? "Working..."
                  : emailStep === "sent"
                    ? "Confirm Email"
                    : "Send Code"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card profile-card security-card">
        <div className="security-header">
          <KeyRound size={18} className="security-icon" />
          <h2 className="cute-section-title">Security</h2>
        </div>
        <p className="muted security-note">
          Change your password. You'll be asked for your current password to
          confirm it's really you.
        </p>
        {pwMsg && <p className={`security-msg ${pwMsg.type}`}>{pwMsg.text}</p>}
        <form onSubmit={changePassword} className="access-form security-form">
          <div className="cute-form-group">
            <label htmlFor="pw-current">Current password</label>
            <input
              id="pw-current"
              className="field cute-input"
              type="password"
              value={pwForm.current}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, current: e.target.value }))
              }
              required
              autoComplete="current-password"
            />
          </div>
          <div className="cute-form-group">
            <label htmlFor="pw-new">New password</label>
            <input
              id="pw-new"
              className="field cute-input"
              type="password"
              value={pwForm.next}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, next: e.target.value }))
              }
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="cute-form-group">
            <label htmlFor="pw-confirm">Confirm new password</label>
            <input
              id="pw-confirm"
              className="field cute-input"
              type="password"
              value={pwForm.confirm}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, confirm: e.target.value }))
              }
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="cute-form-actions">
            <button
              type="submit"
              className="btn cute-btn-primary"
              disabled={pwBusy}
            >
              {pwBusy ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
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
