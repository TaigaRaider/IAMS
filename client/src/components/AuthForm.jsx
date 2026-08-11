import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!isLogin) return;
    const session = getSession();
    if (session?.role) goHome(navigate, session.role);
  }, [isLogin, navigate]);

  const handleSubmit = async (e) => {
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
        <h2>{isLogin ? "Welcome Back" : "Create your account"}</h2>
        <p>
          {isLogin
            ? "Sign in to track your application"
            : "Start your internship application"}
        </p>
        <form className="access-form" onSubmit={handleSubmit}>
        {!isLogin && (
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
        <input
          className="field"
          type="password"
          name="password"
          id="password-field"
          required
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          placeholder={isLogin ? "••••••••" : "At least 8 Characters"}
        />
        {!isLogin && (
          <>
            <label
              className="label password-confirm-label"
              htmlFor="password-confirm-field"
            >
              Confirm Password:
            </label>
            <input
              className="field"
              type="password"
              id="password-confirm-field"
              name="confirm_password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
            />
          </>
        )}
        {error && <p className="form-error">{error}</p>}
        <input
          className="submit-btn"
          type="submit"
          value={
            loading
              ? isLogin
                ? "Signing in..."
                : "Creating Account..."
              : isLogin
                ? "Sign In"
                : "Create Account"
          }
          disabled={loading}
        />
        <div className="reference">
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
        </div>
        </form>
      </div>
    </div>
  );
};
