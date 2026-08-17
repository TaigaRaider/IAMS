import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, logout } from "../api.js";
import { FileText, Send, ArrowLeft, Upload } from "lucide-react";
import "./ApplicationFormPage.css";

function ApplicationFormPage() {
  const [searchParams] = useSearchParams();
  const initialRoleId = searchParams.get("role") || "";
  
  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState(initialRoleId);
  const [biodata, setBiodata] = useState("");
  const [resumeUrl, setResumeUrl] = useState(""); 
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleUnauthorized = useCallback((err) => {
    if (String(err.message).includes("token") || String(err.message).includes("401")) {
      logout();
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  }, [navigate]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/roles");
        setRoles(data.filter(r => r.status === "open" || r.status === "Open"));
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      }
    })();
  }, [handleUnauthorized]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    // Simulate file upload (in reality we would upload to S3/GCS and get URL)
    let finalResumeUrl = resumeUrl;
    if (file && !finalResumeUrl) {
      finalResumeUrl = URL.createObjectURL(file); // mock url
    }

    try {
      await api("/applications", {
        method: "POST",
        body: { 
          role_id: Number(roleId),
          resume_url: finalResumeUrl,
          biodata
        },
      });
      navigate("/applicant", { replace: true });
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page application-form-page">
      <button className="back-btn" onClick={() => navigate("/applicant")} aria-label="Go back">
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
            >
              <option value="" disabled>Select a role...</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.title} ({r.department})</option>
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
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files[0])}
                required={!resumeUrl}
                style={{ display: "none" }}
              />
              <label htmlFor="resume" className={`custom-file-upload ${file ? "has-file" : ""}`}>
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
                      <span className="upload-title">Click to upload resume</span>
                      <span className="upload-subtitle">or drag and drop</span>
                    </div>
                  </>
                )}
              </label>
              <p className="hint">Upload your resume in PDF or DOCX format.</p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="biodata">Biodata / Cover Letter</label>
            <textarea
              id="biodata"
              className="field"
              rows={6}
              value={biodata}
              onChange={(e) => setBiodata(e.target.value)}
              placeholder="Tell us about yourself, your background, and why you're a great fit for this role..."
              required
            ></textarea>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy || !roleId}>
              {busy ? "Submitting..." : (
                <>
                  <Send size={16} /> Submit Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApplicationFormPage;
