import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { api, saveSession, getSession } from "../api";

export const LoginForm = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session?.role) {
      navigate(
        session.role === "admin"
          ? "/dashboard"
          : session.role === "intern"
            ? "/intern"
            : "/applicant",
        { replace: true },
      );
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: { username, password },
      });
      saveSession(data);
      navigate(
        data.role === "admin"
          ? "/dashboard"
          : data.role === "intern"
            ? "/intern"
            : "/applicant",
        { replace: true },
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form login-form">
      <h2>Welcome Back👋</h2>
      <p>Sign in to track your application</p>
      <form className="access-form" onSubmit={handleSubmit}>
        <label className="label username-label" htmlFor="username-field">
          Username:
        </label>
        <input
          className="field"
          type="text"
          id="username-field"
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
          placeholder="••••••••"
        />
        {error && <p className="form-error">{error}</p>}
        <input
          className="submit-btn"
          type="submit"
          value={loading ? "Signing in..." : "Sign In"}
          disabled={loading}
        />

        <div className="reference">
          <span className="signup-reference">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </span>
        </div>
      </form>
    </div>
  );
};
