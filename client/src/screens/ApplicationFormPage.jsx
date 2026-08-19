import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, logout } from "../api.js";
import {
  FileText,
  Send,
  ArrowLeft,
  Upload,
  CheckCircle2,
  X,
  PartyPopper,
} from "lucide-react";
import "./ApplicationFormPage.css";

function ApplicationFormPage() {
  const [searchParams] = useSearchParams();
  const initialRoleId = searchParams.get("role") || "";

  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState(initialRoleId);
  const [file, setFile] = useState(null);
  const [biodata, setBiodata] = useState({
    phone: "",
    location: "",
    nationality: "",
    date_of_birth: "",
    education: "",
    experience: "",
    skills: "",
  });
  const [coverLetter, setCoverLetter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleUnauthorized = useCallback(
    (err) => {
      if (
        String(err.message).includes("token") ||
        String(err.message).includes("401")
      ) {
        logout();
        navigate("/login", { replace: true });
        return true;
      }
      return false;
    },
    [navigate],
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/roles");
        setRoles(
          data.filter((r) => r.status === "open" || r.status === "Open"),
        );
        const me = await api("/auth/me");
        const prefill = me.biodata ?? {};
        setBiodata({
          phone: prefill.phone ?? "",
          location: prefill.location ?? "",
          nationality: prefill.nationality ?? "",
          date_of_birth: prefill.date_of_birth ?? "",
          education: prefill.education ?? "",
          experience: prefill.experience ?? "",
          skills: prefill.skills ?? "",
        });
        setCoverLetter(prefill.cover_letter ?? "");
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      }
    })();
  }, [handleUnauthorized]);

  const setBiodataField = (key) => (e) =>
    setBiodata((prev) => ({ ...prev, [key]: e.target.value }));

  // Close the success modal — X button or backdrop click — and land back on
  // the applicant dashboard.
  const closeSuccess = useCallback(() => {
    navigate("/applicant", { replace: true });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData();
    form.append("role_id", String(roleId));
    if (file) form.append("resume", file);
    for (const [key, value] of Object.entries(biodata)) {
      if (value) form.append(key, value);
    }
    if (coverLetter) form.append("cover_letter", coverLetter);

    try {
      await api("/applications", { method: "POST", body: form });
      setSubmitted(true);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page application-form-page">
      <button
        className="back-btn"
        onClick={() => navigate("/applicant")}
        aria-label="Go back"
        disabled={busy}
      >
        <ArrowLeft size={20} />
      </button>
      <div className="page-head">
        <h1 className="page-title">Submit Application</h1>
      </div>

      <div className="card form-card">
        {error && <p className="form-error">{error}</p>}

        <form onSubmit={handleSubmit} className="access-form">
          <div className="form-group">
            <label htmlFor="role_id">Role you are applying for</label>
            <select
              id="role_id"
              className="field"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              required
              disabled={busy}
            >
              <option value="" disabled>
                Select a role...
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.department})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Resume / CV</label>
            <div className="file-upload-wrapper">
              <input
                id="resume"
                type="file"
                className="hidden-file-input"
                accept=".pdf,.doc,.docx,.txt,.odt"
                onChange={(e) => setFile(e.target.files[0])}
                disabled={busy}
                style={{ display: "none" }}
              />
              <label
                htmlFor="resume"
                className={`custom-file-upload ${file ? "has-file" : ""}`}
              >
                {file ? (
                  <>
                    <div className="file-info">
                      <FileText size={24} className="file-icon" />
                      <span className="file-name">{file.name}</span>
                    </div>
                    <span className="change-file">Change file</span>
                  </>
                ) : (
                  <>
                    <div className="upload-icon-container">
                      <Upload size={24} />
                    </div>
                    <div className="upload-text">
                      <span className="upload-title">
                        Click to upload resume
                      </span>
                      <span className="upload-subtitle">or drag and drop</span>
                    </div>
                  </>
                )}
              </label>
              <p className="hint">Upload your resume in PDF or DOCX format.</p>
            </div>
          </div>

          <div className="form-section-title">
            <span>Biodata</span>
            <small>Optional — fills in your profile too</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                className="field"
                type="tel"
                value={biodata.phone}
                onChange={setBiodataField("phone")}
                placeholder="+234 800 000 0000"
                disabled={busy}
              />
            </div>
            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                className="field"
                type="text"
                value={biodata.location}
                onChange={setBiodataField("location")}
                placeholder="City, Country"
                disabled={busy}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nationality">Nationality</label>
              <input
                id="nationality"
                className="field"
                type="text"
                value={biodata.nationality}
                onChange={setBiodataField("nationality")}
                placeholder="e.g. Nigerian"
                disabled={busy}
              />
            </div>
            <div className="form-group">
              <label htmlFor="date_of_birth">Date of birth</label>
              <input
                id="date_of_birth"
                className="field"
                type="date"
                value={biodata.date_of_birth}
                onChange={setBiodataField("date_of_birth")}
                disabled={busy}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="education">Education</label>
            <input
              id="education"
              className="field"
              type="text"
              value={biodata.education}
              onChange={setBiodataField("education")}
              placeholder="Highest qualification, institution"
              disabled={busy}
            />
          </div>

          <div className="form-group">
            <label htmlFor="experience">Experience</label>
            <textarea
              id="experience"
              className="field"
              rows={3}
              value={biodata.experience}
              onChange={setBiodataField("experience")}
              placeholder="Relevant work experience, internships, projects..."
              disabled={busy}
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="skills">Skills</label>
            <input
              id="skills"
              className="field"
              type="text"
              value={biodata.skills}
              onChange={setBiodataField("skills")}
              placeholder="e.g. JavaScript, Figma, Data Analysis"
              disabled={busy}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cover_letter">Cover Letter / Why you</label>
            <textarea
              id="cover_letter"
              className="field"
              rows={6}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Tell us about yourself, your background, and why you're a great fit for this role..."
              disabled={busy}
            ></textarea>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || !roleId}
            >
              {busy ? (
                "Submitting..."
              ) : (
                <>
                  <Send size={16} /> Submit Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {submitted && (
        <div className="success-modal-backdrop" onClick={closeSuccess}>
          <div
            className="success-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Application submitted"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="success-modal-close"
              onClick={closeSuccess}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="success-modal-icon">
              <CheckCircle2 size={44} />
            </div>
            <h2>Application submitted!</h2>
            <p>
              Your application has been received. The team will review it and
              you&apos;ll be notified of any updates.
            </p>
            <div className="success-modal-footer">
              <PartyPopper size={16} />
              <span>Good luck!</span>
            </div>
            <button
              className="btn btn-primary success-modal-ok"
              onClick={closeSuccess}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicationFormPage;
