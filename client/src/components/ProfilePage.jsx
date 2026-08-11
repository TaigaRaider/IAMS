import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Power, UserRound } from "lucide-react";
import { api, getSession, logout, saveSession } from "../api";
import "./ProfilePage.css";

function ProfilePage() {
  const navigate = useNavigate();
  const session = getSession();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);

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
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      }
    })();
  }, [handleUnauthorized]);

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
      <button className="back-btn" onClick={goBack}>
        <ArrowLeft size={16} />
        Back
      </button>
      <h1 className="page-title">My Profile</h1>
      {error && <p className="form-error">{error}</p>}

      <div className="card profile-card">
        <div className="profile-head">
          <div className="avatar-big">
            <UserRound size={36} />
          </div>
          <div>
            <h2>{profile?.full_name ?? session?.full_name ?? "—"}</h2>
            <span className="role-badge capitalize">
              {profile?.role ?? session?.role ?? "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="card profile-card">
        <h2>Account Details</h2>
        <dl className="profile-details">
          <div className="detail-row">
            <dt>Full name</dt>
            <dd>{profile?.full_name ?? "—"}</dd>
          </div>
          <div className="detail-row">
            <dt>Role</dt>
            <dd className="capitalize">{profile?.role ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="card profile-card deactivate-danger-card">
        <h2>Deactivate My Account</h2>
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
            <Power size={16} />
            Deactivate Account
          </button>
        ) : (
          <div className="confirm-row">
            <p className="muted confirm-note">Are you sure?</p>
            <div className="confirm-buttons">
              <button
                className="btn ghost-btn"
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
