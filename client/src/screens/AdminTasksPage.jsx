import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ListTodo, Plus, Trash2, CalendarClock, UserRound } from "lucide-react";
import { api, logout } from "../api";
import { compare } from "../utils/compare";
import EmptyState from "../components/EmptyState.jsx";
import Select from "../components/Select.jsx";
import "./AdminTasksPage.css";

const TASK_STATUS_CLASS = {
  pending: "pending",
  in_progress: "shortlisted",
  done: "accepted",
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function AssignTaskForm({ assignees, initialInternId, onCreated }) {
  const [internId, setInternId] = useState(initialInternId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const prevInitial = useRef(initialInternId);
  useEffect(() => {
    if (initialInternId && initialInternId !== prevInitial.current) {
      setInternId(String(initialInternId));
    }
    prevInitial.current = initialInternId;
  }, [initialInternId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!internId) {
      setError("Select who the task is for");
      return;
    }
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }
    setSaving(true);
    try {
      await api("/interns/tasks", {
        method: "POST",
        body: {
          intern_id: Number(internId),
          title,
          description: description || null,
          due_date: dueDate || null,
          status: "pending",
        },
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      setInternId(initialInternId ?? "");
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
        <Select
          className="field"
          value={internId}
          onChange={setInternId}
          placeholder="Assign to…"
          options={assignees.map((a) => ({ value: a.id, label: a.name }))}
        />
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

function AdminTasksPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [interns, setInterns] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleting, setDeleting] = useState(null);

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
      const [taskData, internData, appData] = await Promise.all([
        api("/interns/tasks"),
        api("/interns"),
        api("/applications"),
      ]);
      setTasks(taskData);
      setInterns(internData);
      setApplicants(appData);
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const assignees = useMemo(() => {
    const map = new Map();
    interns.forEach((i) => map.set(Number(i.id), i.full_name));
    applicants
      .filter((a) => compare(a.status, "Hired"))
      .forEach((a) => {
        if (!map.has(Number(a.applicant_id))) {
          map.set(Number(a.applicant_id), a.applicant_name);
        }
      });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [interns, applicants]);

  const preselectId = searchParams.get("assignee");
  const preselect = assignees.find((a) => String(a.id) === preselectId) ?? null;

  const deleteTask = async (taskId) => {
    setDeleting(taskId);
    setError("");
    try {
      await api(`/interns/tasks/${taskId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = tasks.filter(
    (t) => !statusFilter || compare(t.status, statusFilter),
  );

  return (
    <div className="page">
      <h1 className="page-title">Tasks</h1>
      {error && <p className="form-error">{error}</p>}

      <section className="card tasks-assign-card">
        <div className="card-head">
          <h2>Assign a new task</h2>
          {preselect && (
            <span className="view-all">
              <UserRound size={14} /> for {preselect.name}
            </span>
          )}
        </div>
        <AssignTaskForm
          assignees={assignees}
          initialInternId={preselect ? preselect.id : undefined}
          onCreated={load}
        />
      </section>

      <section className="card table-card tasks-table-card">
        <div className="card-head">
          <h2>All tasks</h2>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "in_progress", label: "In progress" },
              { value: "done", label: "Done" },
            ]}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title={tasks.length === 0 ? "No tasks yet" : "No matches"}
            text={
              tasks.length === 0
                ? "Assign a task above and it will show up here."
                : "No tasks match the selected status."
            }
          />
        ) : (
          <ul className="task-table-list">
            {filtered.map((task) => (
              <li key={task.id} className="task-table-row">
                <div className="task-table-main">
                  <strong>{task.title}</strong>
                  <span className="task-table-assignee">
                    <UserRound size={13} /> {task.intern_name ?? "Unassigned"}
                  </span>
                  {task.description && (
                    <span className="task-table-desc">{task.description}</span>
                  )}
                </div>
                <div className="task-table-meta">
                  <span
                    className={`status ${TASK_STATUS_CLASS[task.status] ?? "pending"}`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                  <span className="task-table-due">
                    <CalendarClock size={13} /> {formatDate(task.due_date)}
                  </span>
                  <button
                    className="icon-btn"
                    onClick={() => deleteTask(task.id)}
                    disabled={deleting === task.id}
                    aria-label={`Delete task ${task.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AdminTasksPage;