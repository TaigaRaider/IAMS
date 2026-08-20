import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Trash2, UploadCloud } from "lucide-react";
import { api, logout } from "../api";
import "./InternDocumentsPage.css";

const DOC_TYPE_META = {
  cv: { label: "CV / Resume" },
  id: { label: "ID / Passport" },
  certificate: { label: "Certificate" },
  other: { label: "Other document" },
};

const formatBytes = (n) => {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function InternDocumentsPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [docType, setDocType] = useState("cv");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

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
        const data = await api("/interns/documents");
        setDocs(data);
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [handleUnauthorized]);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("document", file);
      form.append("doc_type", docType);
      await api("/interns/documents", { method: "POST", body: form });
      setFile(null);
      e.target.reset();
      const data = await api("/interns/documents");
      setDocs(data);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (doc) => {
    setDeleting(doc.id);
    setError("");
    try {
      await api(`/interns/documents/${doc.id}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="page">
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate("/intern")}>
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="page-title">Submit Required Documents</h1>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="card docs-card">
        <h2 className="cute-section-title">Upload a document</h2>
        <p className="muted">
          Share your CV and any documents HR asked for (ID, certificates). PDF,
          Word, TXT and images up to 5 MB.
        </p>
        <form className="access-form docs-form" onSubmit={upload}>
          <div className="docs-form-row">
            <select
              className="field"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              {Object.entries(DOC_TYPE_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <input
              className="field"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.odt,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              className="apply-btn"
              type="submit"
              disabled={busy || !file}
            >
              <UploadCloud size={16} />
              {busy ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>

      <div className="card docs-card">
        <h2 className="cute-section-title">Your documents</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="muted">Nothing uploaded yet.</p>
        ) : (
          <ul className="docs-list">
            {docs.map((doc) => (
              <li key={doc.id}>
                <div className="docs-file-icon">
                  <FileText size={18} />
                </div>
                <div className="docs-file-info">
                  <strong>{doc.file_name}</strong>
                  <span>
                    {DOC_TYPE_META[doc.doc_type]?.label ?? doc.doc_type} ·{" "}
                    {formatBytes(doc.size_bytes)} · {formatDate(doc.uploaded_at)}
                  </span>
                </div>
                <a className="docs-download" href={doc.url} target="_blank" rel="noreferrer">
                  View
                </a>
                <button
                  type="button"
                  className="docs-delete"
                  aria-label={`Delete ${doc.file_name}`}
                  disabled={deleting === doc.id}
                  onClick={() => remove(doc)}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}