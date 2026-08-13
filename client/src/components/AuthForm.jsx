import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api, saveSession, getSession } from "../api";

const HOME_BY_ROLE = {
  admin: "/dashboard",
  intern: "/intern",
  applicant: "/applicant",
};

const goHome = (navigate, role) =>
  navigate(HOME_BY_ROLE[role] ?? "/login", { replace: true });

export const AuthForm = ({ mode }) => {
  const navigate = useNavigate();
  const isLogin = mode === "login";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLogin) return;
    const session = getSession();
    if (session?.role) goHome(navigate, session.role);
  }, [isLogin, navigate]);

  const handleReset = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResetSent(true);
    }, 1000);
  };

  const handleSubmit = async (e) => {
    if (resetMode) return handleReset(e);
    e.preventDefault();
    setError("");
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const body = isLogin
        ? { username, password }
        : { full_name: fullName, email, username, password };
      const data = await api(isLogin ? "/auth/login" : "/auth/signup", {
        method: "POST",
        body,
      });
      if (isLogin) {
        saveSession(data);
        if (data.deactivated) {
          navigate("/account", { replace: true });
        } else {
          goHome(navigate, data.role);
        }
      } else {
        navigate("/login");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`form ${isLogin ? "login-form" : "signup-form"}`}>
      <div className="form-card">
        <h2>
          {resetMode 
            ? "Reset Password" 
            : isLogin ? "Welcome Back" : "Create your account"}
        </h2>
        <p>
          {resetMode
            ? "Enter your email to receive a password reset link."
            : isLogin
              ? "Sign in to track your application"
              : "Start your internship application"}
        </p>
        
        {resetMode && resetSent ? (
          <div className="access-form">
            <p className="form-success" style={{ color: "var(--success-color)", background: "rgba(34, 197, 94, 0.1)", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
              Password reset link sent! (UI only — backend integration required)
            </p>
            <button className="submit-btn" onClick={() => { setResetMode(false); setResetSent(false); }}>
              Return to Login
            </button>
          </div>
        ) : (
        <form className="access-form" onSubmit={handleSubmit}>
        {!isLogin && !resetMode && (
          <>
            <label className="label username-label" htmlFor="full-name-field">
              Full name:
            </label>
            <input
              className="field"
              type="text"
              id="full-name-field"
              name="full_name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Anomalous"
            />
          </>
        )}
        
        {(!isLogin || resetMode) && (
          <>
            <label className="label email-label" htmlFor="email-field">
              Email:
            </label>
            <input
              className="field"
              type="text"
              id="email-field"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anomalous@intern.com"
            />
          </>
        )}
        
        {!resetMode && (
          <>
            <label
              className="label username-label"
              htmlFor={isLogin ? "username-field" : "signup-username-field"}
            >
              Username:
            </label>
            <input
              className="field"
              type="text"
              id={isLogin ? "username-field" : "signup-username-field"}
              name="username"
              required
              onChange={(e) => setUsername(e.target.value)}
              value={username}
              placeholder="Anomalous"
            />
            <label className="label password-label" htmlFor="password-field">
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                className="field"
                type={showPassword ? "text" : "password"}
                name="password"
                id="password-field"
                required
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                placeholder={isLogin ? "••••••••" : "At least 8 Characters"}
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
          </>
        )}
        {!isLogin && (
          <>
            <label
              className="label password-confirm-label"
              htmlFor="password-confirm-field"
            >
              Confirm Password:
            </label>
            <div className="password-input-wrapper">
              <input
                className="field"
                type={showPassword ? "text" : "password"}
                id="password-confirm-field"
                name="confirm_password"
                required
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
          </>
        )}
        {error && <p className="form-error">{error}</p>}
        <input
          className="submit-btn"
          type="submit"
          value={
            loading
              ? resetMode
                ? "Sending Link..."
                : isLogin
                  ? "Signing in..."
                  : "Creating Account..."
              : resetMode
                ? "Send Reset Link"
                : isLogin
                  ? "Sign In"
                  : "Create Account"
          }
          disabled={loading}
        />
        <div className="reference">
          {resetMode ? (
            <span className="signup-reference">
               <button type="button" className="forgot-password-btn" onClick={() => setResetMode(false)}>Return to Login</button>
            </span>
          ) : (
            <>
              <span className="signup-reference">
                {isLogin ? (
                  <>
                    Don't have an account? <Link to="/signup">Sign up</Link>
                  </>
                ) : (
                  <>
                    Already have an account? <Link to="/login">Sign in</Link>
                  </>
                )}
              </span>
              {isLogin && (
                <button type="button" className="forgot-password-btn" onClick={() => setResetMode(true)}>
                  Forgot Password?
                </button>
              )}
            </>
          )}
        </div>
        </form>
        )}
      </div>
    </div>
  );
};
