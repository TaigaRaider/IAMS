import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ShieldCheck, GraduationCap } from "lucide-react";
import { api, logout } from "../api";
import EmptyState from "../components/EmptyState.jsx";
import "./AdminInternsPage.css";

const initials = (name) =>
  (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const TASK_STATUS_CLASS = {
  pending: "pending",
  in_progress: "shortlisted",
  done: "accepted",
};

function AssignTaskForm({ intern, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }
    setSaving(true);
    try {
      await api("/interns/tasks", {
        method: "POST",
        body: {
          intern_id: intern.id,
          title,
          description: description || null,
          due_date: dueDate || null,
          status: "pending",
        },
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form-row">
        <input
          className="field"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title (e.g. Submit first PR)"
        />
        <input
          className="field"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button className="apply-btn" type="submit" disabled={saving}>
          <Plus size={16} /> {saving ? "Adding..." : "Assign"}
        </button>
      </div>
      <textarea
        className="field"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional description"
      />
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

function AdminInternsPage() {
  const navigate = useNavigate();
  const [interns, setInterns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState("");
  const [promoting, setPromoting] = useState(null);
  const [selectedIntern, setSelectedIntern] = useState(null);

  const handleUnauthorized = useCallback(
    (err) => {
      if (String(err.message).includes("token") || String(err.message).includes("401")) {
        logout();
        navigate("/login", { replace: true });
        return true;
      }
      return false;
    },
    [navigate],
  );

  const load = useCallback(async () => {
    try {
      const [internData, taskData, offerData] = await Promise.all([
        api("/interns"),
        api("/interns/tasks"),
        api("/offers"),
      ]);
      setInterns(internData);
      setTasks(taskData);
      setOffers(offerData);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const promoteAdmin = async (intern) => {
    setPromoting(intern.id);
    setError("");
    try {
      await api(`/interns/users/${intern.id}/role`, {
        method: "PATCH",
        body: { role: "admin" },
      });
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setPromoting(null);
    }
  };

  const deleteTask = async (taskId) => {
    setError("");
    try {
      await api(`/interns/tasks/${taskId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    }
  };

  const tasksByIntern = (internId) =>
    tasks.filter((t) => Number(t.intern_id) === Number(internId));

  const offerCountFor = (internId) =>
    offers.filter((o) => Number(o.applicant_id) === Number(internId)).length;

  return (
    <div className="page">
      <h1 className="page-title">Interns</h1>
      {error && <p className="form-error">{error}</p>}
      {interns.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={GraduationCap}
            title="No interns yet"
            text='Mark an application as "Hired" and the applicant is promoted to intern automatically.'
          />
        </div>
      ) : (
        <div className="intern-cards">
          {interns.map((intern) => {
            const internTasks = tasksByIntern(intern.id);
            const offerCount = offerCountFor(intern.id);
            return (
              <article className="intern-block" key={intern.id}>
                <div className="intern-block-head">
                  <div className="applicant-cell" onClick={() => setSelectedIntern(intern)} style={{ cursor: 'pointer', transition: 'opacity 0.2s' }} title="View profile">
                    <div className="avatar-mini">{initials(intern.full_name)}</div>
                    <div className="intern-identity">
                      <strong>{intern.full_name}</strong>
                      <span className="muted-cell">
                        {intern.role_title ?? "—"}
                        {intern.department ? ` · ${intern.department}` : ""}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`status ${offerCount > 0 ? "accepted" : "pending"}`}
                  >
                    {offerCount === 0
                      ? "None"
                      : `${offerCount} offer${offerCount > 1 ? "s" : ""}`}
                  </span>
                </div>

                <div className="intern-block-meta">
                  <div className="progress-cell">
                    <div className="bar">
                      <div style={{ width: `${intern.progress}%` }}></div>
                    </div>
                    <span>
                      {intern.tasks_done}/{intern.tasks_total}
                    </span>
                  </div>
                  <button
                    className="promote-btn"
                    onClick={() => promoteAdmin(intern)}
                    disabled={promoting === intern.id}
                  >
                    <ShieldCheck size={14} />{" "}
                    {promoting === intern.id ? "Promoting..." : "Make admin"}
                  </button>
                </div>

                <div className="intern-tasks">
                  <h3>Tasks</h3>
                  <ul className="task-list">
                    {internTasks.length === 0 && (
                      <li className="muted-cell">No tasks assigned</li>
                    )}
                    {internTasks.map((task) => (
                      <li key={task.id}>
                        <span
                          className={`status ${TASK_STATUS_CLASS[task.status] ?? "pending"}`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                        <span className="task-name">{task.title}</span>
                        <button
                          className="icon-btn"
                          onClick={() => deleteTask(task.id)}
                          aria-label={`Delete task ${task.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <AssignTaskForm intern={intern} onCreated={load} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedIntern && (
        <div className="modal-overlay" onClick={() => setSelectedIntern(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card cute-profile-card" onClick={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: "360px", background: "var(--card-background)", position: "relative", overflow: "hidden", borderRadius: "20px", padding: 0, border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.15)" }}>
             <button onClick={() => setSelectedIntern(null)} style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10, background: "rgba(255,255,255,0.7)", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#333", backdropFilter: "blur(4px)" }}>&times;</button>
             <div className="profile-banner" style={{ height: "100px", background: "linear-gradient(135deg, var(--primary-soft, #fbc2eb) 0%, var(--primary, #a6c1ee) 100%)" }}></div>
             <div className="cute-profile-content" style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", alignItems: "center", marginTop: "-40px" }}>
                <div className="cute-avatar-wrapper" style={{ padding: "4px", background: "var(--card-background)", borderRadius: "50%" }}>
                   <div className="cute-avatar" style={{ width: "72px", height: "72px", background: "var(--primary-soft, #f0f4f8)", color: "var(--primary, #6366f1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "bold" }}>
                      {initials(selectedIntern.full_name)}
                   </div>
                </div>
                <div className="cute-profile-info" style={{ textAlign: "center", marginTop: "12px" }}>
                   <h2 style={{ fontSize: "20px", margin: "0 0 4px", color: "var(--heading)" }}>{selectedIntern.full_name}</h2>
                   <div style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "12px" }}>{selectedIntern.email}</div>
                   <span className="cute-badge capitalize" style={{ display: "inline-flex", background: "var(--primary-soft, #eef2ff)", color: "var(--primary, #6366f1)", padding: "4px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: 600 }}>
                     {selectedIntern.role_title ?? "Intern"}
                   </span>
                </div>
                
                <div style={{ width: "100%", marginTop: "24px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "var(--muted)", fontSize: "13px" }}>Department</span>
                      <span style={{ fontWeight: 500, fontSize: "14px" }}>{selectedIntern.department ?? "—"}</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "var(--muted)", fontSize: "13px" }}>Tasks Progress</span>
                      <span style={{ fontWeight: 500, fontSize: "14px" }}>{selectedIntern.progress}%</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)", fontSize: "13px" }}>Tasks Completed</span>
                      <span style={{ fontWeight: 500, fontSize: "14px" }}>{selectedIntern.tasks_done} / {selectedIntern.tasks_total}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInternsPage;