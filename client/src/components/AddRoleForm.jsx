import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, logout } from "../api";

export default function AddRoleForm({ initial = null }) {
  const navigate = useNavigate();
  const editing = Boolean(initial);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (editing) {
        await api(`/roles/${initial.id}`, {
          method: "PATCH",
          body: { title, department, description: description || null },
        });
        setSuccess("Role updated successfully.");
      } else {
        await api("/roles", {
          method: "POST",
          body: { title, department, description: description || null },
        });
        setSuccess("Role created successfully.");
        setTitle("");
        setDepartment("");
        setDescription("");
      }
    } catch (err) {
      if (String(err.message).includes("token") || String(err.message).includes("401")) {
        logout();
        navigate("/login", { replace: true });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate("/dashboard/roles");

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      {error && <p className="form-error">{error}</p>}
      {success && (
        <>
          <p className="form-success">{success}</p>
          {editing && (
            <button className="btn-ghost" onClick={handleBack}>
              Back to roles
            </button>
          )}
        </>
      )}
      <form className="access-form" onSubmit={handleSubmit}>
        <label className="label" htmlFor="role-title-field">
          Title:
        </label>
        <input
          className="field"
          type="text"
          id="role-title-field"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Software Engineer"
        />
        <label className="label" htmlFor="role-department-field">
          Department:
        </label>
        <input
          className="field"
          type="text"
          id="role-department-field"
          name="department"
          required
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="Engineering"
        />
        <label className="label" htmlFor="role-description-field">
          Description (optional):
        </label>
        <textarea
          className="field"
          id="role-description-field"
          name="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will the intern do?"
        />
        <input
          className="submit-btn"
          type="submit"
          value={loading ? "Saving..." : editing ? "Save Changes" : "Create Role"}
          disabled={loading}
        />
      </form>
    </div>
  );
}
