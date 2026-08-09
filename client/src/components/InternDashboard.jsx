import { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Menu,
  LogOut,
  LayoutDashboard,
  CalendarDays,
  Briefcase,
  BadgeCheck,
  PartyPopper,
  Building2,
  Users,
  Phone,
  Mail,
  CheckCircle2,
  Circle,
  FileCheck2,
  ClipboardList,
  BookOpen,
  Gift,
  Hourglass,
} from "lucide-react";
import { api, logout, getSession } from "../api";

const ONBOARDING_STEPS = [
  { label: "Submit required documents", done: true },
  { label: "Complete onboarding forms", done: true },
  { label: "Set up work email & accounts", done: false },
  { label: "Review employee handbook", done: false },
  { label: "Meet your team & mentor", done: false },
];

const CONTACTS = [
  { name: "HR Coordinator", detail: "hr@iams.dev", icon: Phone },
  { name: "Mentor", detail: "mentor@iams.dev", icon: Mail },
  { name: "Intern Cohort", detail: "Slack · #interns", icon: Users },
];

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

function InternOverview() {
  const navigate = useNavigate();
  const session = getSession();
  const [applications, setApplications] = useState([]);
  const [offers, setOffers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");

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
        const [apps, offerData, roleData] = await Promise.all([
          api("/applications"),
          api("/offers"),
          api("/roles"),
        ]);
        setApplications(apps);
        setOffers(offerData);
        setRoles(roleData);
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      }
    })();
  }, [handleUnauthorized]);

  useEffect(() => {
    (async () => {
      try {
        setTasks(await api("/interns/tasks"));
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      }
    })();
  }, [handleUnauthorized]);

  const updateTaskStatus = async (task, status) => {
    try {
      await api(`/interns/tasks/${task.id}`, {
        method: "PATCH",
        body: { status },
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status } : t)),
      );
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
    }
  };

  const hired = applications.find((a) => a.status === "Hired");
  const offer = hired
    ? offers.find((o) => o.application_id === hired.id) ?? null
    : null;
  const role = hired
    ? roles.find((r) => r.id === hired.role_id) ?? null
    : null;

  const doneCount = ONBOARDING_STEPS.filter((s) => s.done).length;
  const progress = Math.round((doneCount / ONBOARDING_STEPS.length) * 100);

  const keyDates = [
    {
      label: "Application submitted",
      value: formatDate(hired?.applied_at),
      icon: FileCheck2,
      done: true,
    },
    {
      label: "Offer extended",
      value: formatDate(offer?.created_at),
      icon: Gift,
      done: true,
    },
    {
      label: "Offer accepted",
      value: "Congrats!",
      icon: BadgeCheck,
      done: true,
    },
    { label: "Internship starts", value: "Soon", icon: CalendarDays, done: false },
  ];

  return (
    <div className="intern-page">
      <div className="intern-hero">
        <div className="intern-hero-icon">
          <PartyPopper size={30} />
        </div>
        <div className="intern-hero-info">
          <h1 className="page-title">
            Welcome aboard, {session?.full_name ?? "Intern"}!
          </h1>
          <p className="applicant-subtitle">
            Your offer has been accepted — here&apos;s everything you need to
            get ready for your internship.
          </p>
        </div>
        <span className="status accepted">Offer Accepted</span>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="intcards intern-stats">
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Role</span>
            <span className="card-icon">
              <Briefcase />
            </span>
          </div>
          <h1 className="stat-title">{hired?.role_title ?? "—"}</h1>
        </div>
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Department</span>
            <span className="card-icon">
              <Building2 />
            </span>
          </div>
          <h1 className="stat-title">{role?.department ?? "—"}</h1>
        </div>
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Application Status</span>
            <span className="card-icon">
              <BadgeCheck />
            </span>
          </div>
          <h1 className="stat-title">{hired?.status ?? "—"}</h1>
        </div>
        <div className="intcard">
          <div className="card-top">
            <span className="card-label">Onboarding</span>
            <span className="card-icon">
              <Hourglass />
            </span>
          </div>
          <h1 className="stat-title">{progress}%</h1>
        </div>
      </div>

      <div className="dash-grid intern-grid">
        <section className="card">
          <div className="card-head">
            <h2>Onboarding Checklist</h2>
            <span className="view-all">
              {doneCount}/{ONBOARDING_STEPS.length} done
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-track-bar">
              <div style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <ul className="checklist">
            {ONBOARDING_STEPS.map((step) => (
              <li key={step.label} className={step.done ? "done" : ""}>
                {step.done ? (
                  <CheckCircle2 className="check-icon done" size={20} />
                ) : (
                  <Circle className="check-icon" size={20} />
                )}
                <span>{step.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Key Dates</h2>
          <ul className="timeline">
            {keyDates.map((item) => (
              <li key={item.label}>
                <div className={`timeline-icon ${item.done ? "done" : ""}`}>
                  <item.icon size={16} />
                </div>
                <div className="timeline-info">
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>My Tasks</h2>
            <span className="view-all">
              {tasks.filter((t) => t.status === "done").length}/{tasks.length} done
            </span>
          </div>
          {tasks.length === 0 ? (
            <p className="muted">No tasks assigned yet.</p>
          ) : (
            <ul className="checklist">
              {tasks.map((task) => (
                <li key={task.id} className={task.status === "done" ? "done" : ""}>
                  {task.status === "done" ? (
                    <CheckCircle2 className="check-icon done" size={20} />
                  ) : (
                    <Circle className="check-icon" size={20} />
                  )}
                  <div className="task-info">
                    <strong>{task.title}</strong>
                    {task.description && <span>{task.description}</span>}
                    {task.due_date && (
                      <span className="task-due">Due {formatDate(task.due_date)}</span>
                    )}
                  </div>
                  {task.status !== "done" && (
                    <button
                      className="task-btn"
                      onClick={() =>
                        updateTaskStatus(
                          task,
                          task.status === "pending" ? "in_progress" : "done",
                        )
                      }
                    >
                      {task.status === "pending" ? "Start" : "Mark done"}
                    </button>
                  )}
                  {task.status === "done" && (
                    <button
                      className="task-btn"
                      onClick={() => updateTaskStatus(task, "in_progress")}
                    >
                      Reopen
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Getting Started</h2>
          <ul className="resource-list">
            <li>
              <div className="resource-icon">
                <ClipboardList size={18} />
              </div>
              <div className="resource-info">
                <strong>Onboarding Packet</strong>
                <span>Forms, policies &amp; first-week guide</span>
              </div>
            </li>
            <li>
              <div className="resource-icon">
                <BookOpen size={18} />
              </div>
              <div className="resource-info">
                <strong>Employee Handbook</strong>
                <span>Company culture &amp; expectations</span>
              </div>
            </li>
            <li>
              <div className="resource-icon">
                <Gift size={18} />
              </div>
              <div className="resource-info">
                <strong>Welcome Kit</strong>
                <span>Swag &amp; equipment handover</span>
              </div>
            </li>
          </ul>
        </section>

        <section className="card">
          <h2>Your Contacts</h2>
          <ul className="contact-list">
            {CONTACTS.map((c) => (
              <li key={c.name}>
                <div className="contact-icon">
                  <c.icon size={16} />
                </div>
                <div className="contact-info">
                  <strong>{c.name}</strong>
                  <span>{c.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function InternDashboard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 768);

  const closeOnMobile = () => {
    if (window.innerWidth <= 768) setCollapsed(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header>
        <button
          className="menu-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          <Menu />
        </button>
        <img src="/iamslogo.png" alt="Logo" className="logo" />
        <input type="text" placeholder="Search..." />
        <div className="actions">
          <Bell className="bell" />
          <svg className="avatar" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="24" r="14" fill="#f0e6ff" />
            <path d="M10 58c4-14 12-18 22-18s18 4 22 18" fill="#f0e6ff" />
          </svg>
          <button className="logout-btn" onClick={handleLogout} aria-label="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>
      {!collapsed && <div className="backdrop" onClick={closeOnMobile} />}
      <div className="layout">
        <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
          <nav>
            <NavLink
              to="/intern"
              end
              onClick={closeOnMobile}
              className={({ isActive }) =>
                `nav-item${isActive ? " active" : ""}`
              }
            >
              <LayoutDashboard />
              <span>Overview</span>
            </NavLink>
          </nav>
        </aside>
        <main className="content">
          <InternOverview />
        </main>
      </div>
    </>
  );
}

export default InternDashboard;
