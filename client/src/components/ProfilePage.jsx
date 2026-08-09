import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, UserRound } from "lucide-react";
import { api, getSession, logout } from "../api";

function ProfilePage() {
  const navigate = useNavigate();
  const session = getSession();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

  const deleteAccount = async () => {
    setDeleting(true);
    setError("");
    try {
      await api("/auth/account", { method: "DELETE" });
      sessionStorage.removeItem("iams_session");
      navigate("/login", { replace: true });
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
      setDeleting(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      const role = session?.role ?? "applicant";
      navigate(
        role === "admin" ? "/dashboard" : role === "intern" ? "/intern" : "/applicant",
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

      <div className="card profile-card danger-card">
        <h2>Danger Zone</h2>
        <p className="muted danger-note">
          Deleting your account permanently removes your profile, applications,
          interviews, offers and tasks. This cannot be undone.
        </p>
        {!confirming ? (
          <button
            className="btn danger-btn"
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={16} />
            Delete Account
          </button>
        ) : (
          <div className="confirm-row">
            <p className="muted confirm-note">
              Are you sure? This is permanent.
            </p>
            <div className="confirm-buttons">
              <button
                className="btn ghost-btn"
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn danger-btn"
                onClick={deleteAccount}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, delete my account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;