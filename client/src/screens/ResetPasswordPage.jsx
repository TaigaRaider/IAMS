import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { BrandSide } from "../components/BrandSide";
import { api } from "../api";
import "./Auth.css";
import "./ResetPasswordPage.css";

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialEmail = params.get("email") ?? "";

  const [step, setStep] = useState(initialEmail ? "password" : "email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: { email } });
      setStep("password");
      setNotice(
        "If an account exists for this email, a 6-digit reset code has been sent. It expires in 30 minutes.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError("Password must be at least 8 characters and contain a letter and a number");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: { email, code, new_password: newPassword },
      });
      setStep("done");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="entry-page reset-page">
      <BrandSide />
      <div className="form">
        <div className="form-card">
          {step === "email" && (
            <>
              <h2>Forgot your password?</h2>
              <p>Enter your email and we'll send you a 6-digit code to reset your password.</p>
              {error && <p className="form-error">{error}</p>}
              <form className="access-form" onSubmit={requestCode}>
                <label className="label email-label" htmlFor="reset-email-field">
                  Email:
                </label>
                <input
                  className="field"
                  type="text"
                  id="reset-email-field"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anomalous@intern.com"
                />
                <input
                  className="submit-btn"
                  type="submit"
                  value={loading ? "Sending..." : "Send Reset Code"}
                  disabled={loading}
                />
              </form>
              <div className="reference">
                <span className="signup-reference">
                  Remembered it? <Link to="/login">Back to login</Link>
                </span>
              </div>
            </>
          )}

          {step === "password" && (
            <>
              <h2>Set a new password</h2>
              <p>
                Enter the 6-digit code emailed to <strong>{email}</strong>, then choose your new password.
              </p>
              {error && <p className="form-error">{error}</p>}
              {notice && <p className="verify-notice">{notice}</p>}
              <form className="access-form" onSubmit={resetPassword}>
                <label className="label code-label" htmlFor="reset-code-field">
                  Reset code:
                </label>
                <input
                  className="field code-field"
                  type="text"
                  id="reset-code-field"
                  name="code"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  minLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                />
                <label className="label password-label" htmlFor="reset-new-password-field">
                  New password
                </label>
                <div className="password-input-wrapper">
                  <input
                    className="field"
                    type={showPassword ? "text" : "password"}
                    id="reset-new-password-field"
                    name="new_password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 Characters"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <label className="label password-confirm-label" htmlFor="reset-confirm-password-field">
                  Confirm new password:
                </label>
                <div className="password-input-wrapper">
                  <input
                    className="field"
                    type={showPassword ? "text" : "password"}
                    id="reset-confirm-password-field"
                    name="confirm_password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <input
                  className="submit-btn"
                  type="submit"
                  value={loading ? "Updating..." : "Change Password"}
                  disabled={loading}
                />
                <div className="reference reset-req-new">
                  <button
                    type="button"
                    className="forgot-password-btn"
                    onClick={async () => {
                      setError("");
                      setNotice("");
                      try {
                        await api("/auth/forgot-password", { method: "POST", body: { email } });
                        setNotice("A new code has been sent to your email.");
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                  >
                    Didn't get a code? Request a new one
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "done" && (
            <>
              <div className="reset-done">
                <span className="reset-done-icon">
                  <CheckCircle2 size={40} />
                </span>
                <h2>Password changed</h2>
                <p>
                  Your password has been updated successfully. You can now sign in with your new
                  password.
                </p>
                <input
                  className="submit-btn"
                  type="button"
                  value="Back to Login"
                  onClick={() => navigate("/login", { replace: true })}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ResetPasswordPage;