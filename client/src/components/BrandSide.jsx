import "./BrandSide.css";

export const BrandSide = () => {
  return (
    <div className="brandside-wrap">
      <div className="brandside-eyebrow">
        <img src="./iamslogo.png" alt="IAMS Logo" className="brand-logo" />
        <span className="brand-name">IAMS</span>
      </div>
      <div className="brandside-central">
        <h1>Your internship, tracked from apply to offer.</h1>
        <p>
          One place for students to apply and follow their status, and for teams
          to review every candidate.
        </p>
        <div className="wrap status-demo">
          <div className="status-demo-header">
            <span className="status-demo-role">
              Software Engineering Intern
            </span>
            <div className="current-status">
              <span className="current-status-text">Screening</span>
            </div>
          </div>
          <div className="status-bars">
            <div className="status-bar"></div>
            <div className="status-bar"></div>
            <div
              className="status-bar"
              style={{ "background-color": "rgba(255,255, 255, 0.23)" }}
            ></div>
            <div
              className="status-bar"
              style={{ "background-color": "rgba(255,255, 255, 0.23)" }}
            ></div>
          </div>
        </div>
      </div>
      <span className="brand-copy">© 2026 IAMS · Internship Program</span>
    </div>
  );
};
