import { useNavigate, Link } from "react-router-dom";

export const SignUpForm = () => {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="form signup-form">
      <h2>Create your account</h2>
      <p>Start your internship application</p>
      <form className="access-form" method="POST" onSubmit={handleSubmit}>
        <label className="label username-label" htmlFor="ful-name-field">
          Full name:
        </label>
        <input
          className="field"
          type="text"
          id="full-name-field"
          name="full name"
          required
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
          placeholder="anomalous@intern.com"
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
          name="Confirm PassWord"
          required
          placeholder="Confirm Password"
        />
        <input className="submit-btn" type="submit" value="Create Account" />
        <div className="reference"></div>
        <div className="reference">
          <span className="signup-reference">
            Already have an account? <Link to="/login">Sign in</Link>
          </span>
        </div>
      </form>
    </div>
  );
};
