import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { api } from "../api";

export const SignUpForm = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api("/auth/signup", {
        method: "POST",
        body: { full_name: fullName, email, username, password },
      });
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form signup-form">
      <h2>Create your account</h2>
      <p>Start your internship application</p>
      <form className="access-form" onSubmit={handleSubmit}>
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
        <label className="label username-label" htmlFor="signup-username-field">
          Username:
        </label>
        <input
          className="field"
          type="text"
          id="signup-username-field"
          name="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 Characters"
        />
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
        {error && <p className="form-error">{error}</p>}
        <input
          className="submit-btn"
          type="submit"
          value={loading ? "Creating Account..." : "Create Account"}
          disabled={loading}
        />
        <div className="reference">
          <span className="signup-reference">
            Already have an account? <Link to="/login">Sign in</Link>
          </span>
        </div>
      </form>
    </div>
  );
};
