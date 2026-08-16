import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { BrandSide } from "../components/BrandSide";
import { api } from "../api";
import "./Auth.css";
import "./VerifyPage.css";

const COOLDOWN_START = 60;

export const VerifyPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialEmail = params.get("email") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [hasEmail, setHasEmail] = useState(!!initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLeft, setResendLeft] = useState(0);

  useEffect(() => {
    if (resendLeft <= 0) return;
    const t = setTimeout(() => setResendLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendLeft]);

  const submitEmail = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await api("/auth/resend-verification", { method: "POST", body: { email } });
      setHasEmail(true);
      setResendLeft((s) => Math.max(s, COOLDOWN_START));
      setNotice("A verification code has been sent. Check your inbox.");
    } catch (err) {
      if (err.status === 429 && err.retryAfter) {
        setResendLeft(Number(err.retryAfter));
        setError(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    try {
      await api("/auth/verify-email", { method: "POST", body: { email, code } });
      navigate("/login?verified=1", { replace: true });
    } catch (err) {
      setError(err.message);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    setNotice("");
    try {
      await api("/auth/resend-verification", { method: "POST", body: { email } });
      setResendLeft(COOLDOWN_START);
      setNotice("A new code has been sent. Check your inbox.");
    } catch (err) {
      if (err.status === 429 && err.retryAfter) {
        setResendLeft(Number(err.retryAfter));
      }
      setError(err.message);
    }
  };

  return (
    <section className="entry-page verify-page">
      <BrandSide />
      <div className="form">
        <div className="form-card">
          <h2>{hasEmail ? "Verify your email" : "Verify your email"}</h2>
          <p>
            {hasEmail
              ? `We emailed a 6-digit code to ${email}. Enter it below to activate your account.`
              : "Enter the email you signed up with and we'll send you a verification code."}
          </p>

          {error && <p className="form-error">{error}</p>}
          {notice && <p className="verify-notice">{notice}</p>}

          {!hasEmail ? (
            <form className="access-form" onSubmit={submitEmail}>
              <label className="label email-label" htmlFor="verify-email-field">
                Email:
              </label>
              <input
                className="field"
                type="text"
                id="verify-email-field"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="anomalous@intern.com"
              />
              <input
                className="submit-btn"
                type="submit"
                value={loading ? "Sending..." : "Send Verification Code"}
                disabled={loading}
              />
            </form>
          ) : (
            <form className="access-form" onSubmit={submitCode}>
              <label className="label code-label" htmlFor="verify-code-field">
                Verification code:
              </label>
              <input
                className="field code-field"
                type="text"
                id="verify-code-field"
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
              <input
                className="submit-btn"
                type="submit"
                value={loading ? "Verifying..." : "Verify Email"}
                disabled={loading}
              />
              <div className="verify-resend-row">
                <button
                  type="button"
                  className="forgot-password-btn verify-resend"
                  onClick={resend}
                  disabled={resendLeft > 0}
                >
                  <MailCheck size={14} />
                  {resendLeft > 0
                    ? `Resend code in ${resendLeft}s`
                    : "Resend code"}
                </button>
                <Link to="/login" className="verify-login-link">Back to login</Link>
              </div>
            </form>
          )}
          <div className="reference verify-footer">
            <span className="signup-reference">
              Wrong email?{" "}
              <button
                type="button"
                className="forgot-password-btn"
                onClick={() => {
                  setHasEmail(false);
                  setError("");
                  setNotice("");
                  setCode("");
                }}
              >
                Change it
              </button>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VerifyPage;