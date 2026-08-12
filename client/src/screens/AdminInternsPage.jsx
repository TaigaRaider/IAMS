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
                  <div className="applicant-cell">
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
    </div>
  );
}

export default AdminInternsPage;