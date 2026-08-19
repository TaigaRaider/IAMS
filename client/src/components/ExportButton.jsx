import { useState } from "react";
import { Download } from "lucide-react";
import { downloadFile } from "../api";

export default function ExportButton({ path, filename, label = "Export CSV", className = "" }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleClick = async () => {
    setBusy(true);
    setErr("");
    try {
      await downloadFile(path, filename);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="export-wrap">
      <button
        type="button"
        className={`btn export-btn ${className}`}
        onClick={handleClick}
        disabled={busy}
        title={label}
      >
        <Download size={15} />
        {busy ? "..." : label}
      </button>
      {err && <span className="export-error">{err}</span>}
    </span>
  );
}