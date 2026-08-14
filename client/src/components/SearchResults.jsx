import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Briefcase, Files, GraduationCap, BadgeCheck, ClipboardList } from "lucide-react";
import { api, logout, getSession } from "../api";
import { compare } from "../utils/compare";
import "./SearchResults.css";

function matches(fields, q) {
  if (!q) return true;
  return fields.some((f) => String(f ?? "").toLowerCase().includes(q));
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="card search-section">
      <div className="card-head">
        <Icon size={16} />
        <h2>{title}</h2>
        <span className="view-all">{children.length}</span>
      </div>
      <ul className="search-list">
        {children.length === 0 ? (
          <li className="muted-cell">No matches</li>
        ) : (
          children
        )}
      </ul>
    </section>
  );
}

function SearchResults() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const session = getSession();
  const role = session?.role;

  const [apps, setApps] = useState(null);
  const [roles, setRoles] = useState(null);
  const [interns, setInterns] = useState(null);
  const [offers, setOffers] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (compare(role, "admin")) {
          const [a, r, i, o] = await Promise.all([
            api("/applications"),
            api("/roles"),
            api("/interns"),
            api("/offers"),
          ]);
          setApps(a);
          setRoles(r);
          setInterns(i);
          setOffers(o);
        } else if (compare(role, "applicant")) {
          const [a, r, o] = await Promise.all([
            api("/applications"),
            api("/roles"),
            api("/offers"),
          ]);
          setApps(a);
          setRoles(r);
          setOffers(o);
        } else {
          setTasks(await api("/interns/tasks"));
        }
      } catch (err) {
        if (String(err.message).includes("token") || String(err.message).includes("401")) {
          logout();
          navigate("/login", { replace: true });
        } else {
          setError(err.message);
        }
      }
    })();
  }, [role, navigate]);

  const qLower = q.toLowerCase();

  const filterApps = (a) =>
    matches([a.applicant_name, a.role_title, a.status], qLower);
  const filterRoles = (r) =>
    matches([r.title, r.department, r.status], qLower);

  const loaded =
    compare(role, "admin")
      ? !!(apps && roles && interns && offers)
      : compare(role, "applicant")
        ? !!(apps && roles && offers)
        : tasks != null;

  if (error) return <p className="form-error">{error}</p>;
  if (!loaded) return null;

  const appliedRoleIds = new Set((apps ?? []).map((a) => a.role_id));

  return (
    <div className="page">
      <div className="search-heading">
        <Search size={18} />
        <h1 className="page-title">
          Results for “{q || "…"}”
        </h1>
      </div>

      {compare(role, "admin") && (
        <>
          <Section icon={Files} title="Applications">
            {apps.filter(filterApps).map((a) => (
              <li key={a.id} className="search-item">
                <Link to="/dashboard/applicants" className="search-link">
                  <strong>{a.applicant_name}</strong>
                  <span>{a.role_title} · {a.status}</span>
                </Link>
              </li>
            ))}
          </Section>
          <Section icon={Briefcase} title="Roles">
            {roles.filter(filterRoles).map((r) => (
              <li key={r.id} className="search-item">
                <Link to="/dashboard/roles" className="search-link">
                  <strong>{r.title}</strong>
                  <span>{r.department} · {r.status}</span>
                </Link>
              </li>
            ))}
          </Section>
          <Section icon={GraduationCap} title="Interns">
            {interns.filter((i) => matches([i.full_name, i.email, i.role_title, i.department], qLower)).map((i) => (
              <li key={i.id} className="search-item">
                <Link to="/dashboard/interns" className="search-link">
                  <strong>{i.full_name}</strong>
                  <span>{i.email ?? ""} {i.role_title ? `· ${i.role_title}` : ""}</span>
                </Link>
              </li>
            ))}
          </Section>
          <Section icon={BadgeCheck} title="Offers">
            {offers.filter((o) => matches([o.applicant_name, o.role_title, o.status], qLower)).map((o) => (
              <li key={o.id} className="search-item">
                <Link to={`/dashboard/offers/${o.id}`} className="search-link">
                  <strong>{o.applicant_name}</strong>
                  <span>{o.role_title} · {o.status}</span>
                </Link>
              </li>
            ))}
          </Section>
        </>
      )}

      {compare(role, "applicant") && (
        <>
          <Section icon={Briefcase} title="Open Roles">
            {roles.filter((r) => compare(r.status, "open")).filter(filterRoles).map((r) => (
              <li key={r.id} className="search-item">
                <Link to="/applicant" className="search-link">
                  <strong>{r.title}</strong>
                  <span>{r.department} · {appliedRoleIds.has(r.id) ? "Applied" : "Open"}</span>
                </Link>
              </li>
            ))}
          </Section>
          <Section icon={Files} title="My Applications">
            {apps.filter(filterApps).map((a) => (
              <li key={a.id} className="search-item">
                <Link to="/applicant" className="search-link">
                  <strong>{a.role_title}</strong>
                  <span>{a.status} · {a.applied_at}</span>
                </Link>
              </li>
            ))}
          </Section>
          <Section icon={BadgeCheck} title="My Offers">
            {offers.filter((o) => matches([o.role_title, o.status], qLower)).map((o) => (
              <li key={o.id} className="search-item">
                <Link to="/applicant" className="search-link">
                  <strong>{o.role_title}</strong>
                  <span>{o.status}</span>
                </Link>
              </li>
            ))}
          </Section>
        </>
      )}

      {compare(role, "intern") && (
        <Section icon={ClipboardList} title="My Tasks">
          {tasks.filter((t) => matches([t.title, t.description, t.status, t.due_date], qLower)).map((t) => (
            <li key={t.id} className="search-item">
              <Link to="/intern" className="search-link">
                <strong>{t.title}</strong>
                <span>{t.status?.replace("_", " ") ?? ""}{t.due_date ? ` · due ${t.due_date}` : ""}</span>
              </Link>
            </li>
          ))}
        </Section>
      )}

      {q && (
        <p className="muted search-tip">
          No results? Try a different search term.
        </p>
      )}
    </div>
  );
}

export default SearchResults;