import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import { api, logout } from "../api";
import { compare } from "../utils/compare";
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
      const [internData, taskData] = await Promise.all([
        api("/interns"),
        api("/interns/tasks"),
      ]);
      setInterns(internData);
      setTasks(taskData);
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

  return (
    <div className="page">
      <h1 className="page-title">Interns</h1>
      {error && <p className="form-error">{error}</p>}
      <div className="card table-card">
        {interns.length === 0 ? (
          <p>No interns yet — mark an application as “Hired” and the applicant
          is promoted to intern automatically.</p>
        ) : (
          <table className="applicants-table intern-table">
            <thead>
              <tr>
                <th>Intern</th>
                <th>Role / Department</th>
                <th>Offer</th>
                <th>Progress</th>
                <th>Tasks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {interns.map((intern) => {
                const internTasks = tasksByIntern(intern.id);
                return (
                  <tr key={intern.id}>
                    <td>
                      <div className="applicant-cell">
                        <div className="avatar-mini">{initials(intern.full_name)}</div>
                        <strong>{intern.full_name}</strong>
                      </div>
                    </td>
                    <td>
                      <strong>{intern.role_title ?? "—"}</strong>
                      <span className="muted-cell">{intern.department ?? ""}</span>
                    </td>
                    <td>
                      <span
                        className={`status ${
                          compare(intern.offer_status, "Accepted")
                            ? "accepted"
                            : compare(intern.offer_status, "Declined")
                              ? "rejected"
                              : "pending"
                        }`}
                      >
                        {intern.offer_status ?? "—"}
                      </span>
                    </td>
                    <td>
                      <div className="progress-cell">
                        <div className="bar">
                          <div style={{ width: `${intern.progress}%` }}></div>
                        </div>
                        <span>
                          {intern.tasks_done}/{intern.tasks_total}
                        </span>
                      </div>
                    </td>
                    <td>
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
                      <AssignTaskForm
                        intern={intern}
                        onCreated={load}
                      />
                    </td>
                    <td>
                      <button
                        className="promote-btn"
                        onClick={() => promoteAdmin(intern)}
                        disabled={promoting === intern.id}
                      >
                        <ShieldCheck size={14} />{" "}
                        {promoting === intern.id ? "Promoting..." : "Make admin"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminInternsPage;