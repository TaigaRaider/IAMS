import { Link } from "react-router-dom";

export const LoginForm = () => {
  return (
    <div className="form login-form">
      <h2>Welcome Back👋</h2>
      <p>Sign in to track your application</p>
      <form className="access-form" method="POST">
        <label className="label username-label" htmlFor="username-field">
          Username:
        </label>
        <input
          className="field"
          type="text"
          id="username-field"
          name="username"
          required
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
          placeholder="••••••••"
        />
        <input className="submit-btn" type="submit" value="Sign In" />

        <div className="reference">
          <span className="signup-reference">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </span>
        </div>
      </form>
    </div>
  );
};
