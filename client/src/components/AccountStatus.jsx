import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Power, Trash2, UserRound } from "lucide-react";
import { api, getSession, logout, saveSession } from "../api";
import "./AccountStatus.css";

const HOME_BY_ROLE = {
  admin: "/dashboard",
  applicant: "/applicant",
  intern: "/intern",
};

// Page shown to deactivated accounts. They can only reactivate or delete
// their account — the server confines them here (every other route is 403).
function AccountStatus() {
  const navigate = useNavigate();
  const session = getSession();
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const fresh = await api("/auth/me");
        setMe(fresh);
        saveSession({ ...fresh, token: getSession()?.token });
        if (fresh && !fresh.deactivated) {
          navigate(HOME_BY_ROLE[fresh.role] ?? "/login", { replace: true });
        }
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [navigate]);

  const goHome = (role) =>
    navigate(HOME_BY_ROLE[role] ?? "/login", { replace: true });

  const reactivate = async () => {
    setBusy("reactivate");
    setError("");
    try {
      const data = await api("/auth/account/reactivate", { method: "PATCH" });
      saveSession(data);
      goHome(data.role);
    } catch (err) {
      setError(err.message);
      setBusy("");
    }
  };

  const deleteAccount = async () => {
    setBusy("delete");
    setError("");
    try {
      await api("/auth/account", { method: "DELETE" });
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy("");
    }
  };

  const name = me?.full_name ?? session?.full_name ?? null;

  return (
    <div className="page account-page">
      <h1 className="page-title">My Account</h1>
      {error && <p className="form-error">{error}</p>}

      <div className="account-banner">
        <AlertTriangle size={20} />
        <span>
          Your account is deactivated. While deactivated you can only reactivate
          or delete your account — the rest of the app is locked until you
          reactivate.
        </span>
      </div>

      <div className="card profile-card">
        <div className="profile-head">
          <div className="avatar-big">
            <UserRound size={36} />
          </div>
          <div>
            <h2>{name ?? "—"}</h2>
            <span className="role-badge capitalize">
              {me?.role ?? session?.role ?? "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="card profile-card">
        <h2>Reactivate My Account</h2>
        <p className="muted">
          Coming back to IAMS? Reactivate your account to sign back in and use
          the app normally again.
        </p>
        <button
          className="btn submit-btn"
          disabled={busy === "reactivate"}
          onClick={reactivate}
        >
          <Power size={16} />
          {busy === "reactivate" ? "Reactivating..." : "Reactivate Account"}
        </button>
      </div>

      <div className="card profile-card danger-card">
        <h2>Delete My Account</h2>
        <p className="muted">
          Permanently remove your account. Soft-deletion keeps your data for
          audit purposes but you can never sign in again — this cannot be
          undone.
        </p>
        {!confirmingDelete ? (
          <button
            className="btn danger-btn"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 size={16} />
            Delete Account
          </button>
        ) : (
          <div className="confirm-row">
            <p className="muted confirm-note account-confirm-note">
              Are you sure you want to permanently delete your account?
            </p>
            <div className="confirm-buttons">
              <button
                className="btn ghost-btn"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy === "delete"}
              >
                Cancel
              </button>
              <button
                className="btn danger-btn"
                onClick={deleteAccount}
                disabled={busy === "delete"}
              >
                {busy === "delete" ? "Deleting..." : "Yes, delete my account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AccountStatus;
