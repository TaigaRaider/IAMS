import { useCallback, useEffect, useState } from "react";
import { Link, Routes, Route, useNavigate } from "react-router-dom";
import {
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
  Gift,
  Hourglass,
  UserRound,
  ChevronRight,
  X,
  ClipboardCheck,
} from "lucide-react";
import { api, logout, getSession } from "../api";
import { compare } from "../utils/compare";
import DashboardShell from "./DashboardShell.jsx";
import SearchResults from "./SearchResults.jsx";
import InternDocumentsPage from "./InternDocumentsPage.jsx";
import InternFormsPage from "./InternFormsPage.jsx";
import "./InternDashboard.css";

const INTERN_NAV = [
  { to: "/intern", end: true, icon: LayoutDashboard, label: "Overview" },
  { to: "/intern/documents", icon: FileCheck2, label: "Documents" },
  { to: "/intern/forms", icon: ClipboardCheck, label: "Forms" },
  { to: "/profile", icon: UserRound, label: "Profile" },
];

const CONTACTS = [
  {
    name: "Chiamaka Obi",
    role: "HR Coordinator",
    phone: "+234 803 456 7890",
    email: "hr@iams.dev",
    icon: Phone,
    note: "Reach out for onboarding, payroll, leave, or any HR questions.",
  },
  {
    name: "Tunde Bakare",
    role: "Mentor",
    phone: "+234 705 123 4567",
    email: "mentor@iams.dev",
    icon: Mail,
    note: "Your mentor for project guidance, feedback, and career advice.",
  },
  {
    name: "Intern Cohort",
    role: "Team · Slack #interns",
    phone: "+234 812 987 6543",
    email: "Slack · #interns",
    icon: Users,
    note: "Connect with fellow interns for collaboration and support.",
  },
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

const DEFAULT_ONBOARDING_STEPS = [
  {
    step_key: "submit_documents",
    label: "Submit required documents",
    href: "/intern/documents",
  },
  {
    step_key: "complete_forms",
    label: "Complete onboarding forms",
    href: "/intern/forms",
  },
  {
    step_key: "work_email",
    label: "Set up work email & accounts",
    href: null,
  },
  {
    step_key: "handbook",
    label: "Review employee handbook",
    href: null,
  },
  {
    step_key: "meet_team",
    label: "Meet your team & mentor",
    href: null,
  },
];

function InternOverview() {
  const navigate = useNavigate();
  const session = getSession();
  const [applications, setApplications] = useState([]);
  const [offers, setOffers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);

  const [onboardingSteps, setOnboardingSteps] = useState(
    DEFAULT_ONBOARDING_STEPS,
  );
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [openGuide, setOpenGuide] = useState(null);

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
        const data = await api("/onboarding");
        setOnboardingSteps(data.steps);
      } catch (err) {
        if (!handleUnauthorized(err)) setError(err.message);
      } finally {
        setOnboardingLoading(false);
      }
    })();
  }, [handleUnauthorized]);

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

  const toggleOnboardingStep = async (step) => {
    const nextDone = !step.done;
    // Optimistic update; the next poll/fetch corrects any failure.
    setOnboardingSteps((prev) =>
      prev.map((s) =>
        s.step_key === step.step_key ? { ...s, done: nextDone } : s,
      ),
    );
    try {
      await api(`/onboarding/${step.step_key}`, {
        method: "PATCH",
        body: { done: nextDone },
      });
    } catch (err) {
      if (!handleUnauthorized(err)) setError(err.message);
      setOnboardingSteps((prev) =>
        prev.map((s) =>
          s.step_key === step.step_key ? { ...s, done: step.done } : s,
        ),
      );
    }
  };

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

  const hired = applications.find((a) => compare(a.status, "Hired"));
  const offer = hired
    ? (offers.find((o) => o.application_id === hired.id) ?? null)
    : null;
  const role = hired
    ? (roles.find((r) => r.id === hired.role_id) ?? null)
    : null;

  const doneCount = onboardingSteps.filter((s) => s.done).length;
  const progress = Math.round((doneCount / onboardingSteps.length) * 100);

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
      value: offer?.current_revision
        ? formatDate(offer.current_revision.created_at)
        : "Congrats!",
      icon: BadgeCheck,
      done: true,
    },
    {
      label: "Internship starts",
      value: offer?.current_revision?.start_date
        ? formatDate(offer.current_revision.start_date)
        : "Soon",
      icon: CalendarDays,
      done: false,
    },
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
              {doneCount}/{onboardingSteps.length} done
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-track-bar">
              <div style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <ul className="checklist">
            {onboardingSteps.map((step) => (
              <li key={step.step_key} className={step.done ? "done" : ""}>
                <div
                  className="checklist-row"
                  onClick={() => toggleOnboardingStep(step)}
                  style={{
                    cursor: onboardingLoading ? "default" : "pointer",
                    transition: "background-color 0.2s",
                  }}
                >
                  {step.done ? (
                    <CheckCircle2 className="check-icon done" size={20} />
                  ) : (
                    <Circle className="check-icon" size={20} />
                  )}
                  <span style={{ userSelect: "none", flex: 1 }}>
                    {step.label}
                  </span>
                  {step.guide && (
                    <button
                      type="button"
                      className="step-guide-btn"
                      aria-expanded={openGuide === step.step_key}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenGuide(
                          openGuide === step.step_key ? null : step.step_key,
                        );
                      }}
                    >
                      How to complete
                    </button>
                  )}
                </div>
                {openGuide === step.step_key && step.guide && (
                  <div className="step-guide">
                    <p>{step.guide}</p>
                    {step.href && (
                      <Link to={step.href} className="step-guide-link">
                        Go to <strong>{step.label}</strong> →
                      </Link>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Key Dates</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            {keyDates.map((item) => {
              let month = "TBD";
              let day = "—";
              let year = "";
              if (
                item.value &&
                !["—", "Congrats!", "Soon"].includes(item.value)
              ) {
                const parts = item.value.split(" ");
                if (parts.length >= 2) {
                  month = parts[0].toUpperCase();
                  day = parseInt(parts[1], 10);
                  year = parts[2] || "";
                }
              }
              return (
                <div
                  key={item.label}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    textAlign: "center",
                    background: "var(--card-background)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      background: item.done
                        ? "var(--primary, #6366f1)"
                        : "var(--muted, #9ca3af)",
                      color: "white",
                      padding: "6px",
                      fontWeight: "bold",
                      fontSize: "13px",
                      letterSpacing: "1px",
                    }}
                  >
                    {month} {year}
                  </div>
                  <div style={{ padding: "16px 10px" }}>
                    <div
                      style={{
                        fontSize: "32px",
                        fontWeight: "800",
                        lineHeight: 1,
                        marginBottom: "8px",
                        color: "var(--heading)",
                      }}
                    >
                      {day}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--muted)",
                        fontWeight: 500,
                        lineHeight: 1.2,
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>My Tasks</h2>
            <span className="view-all">
              {tasks.filter((t) => compare(t.status, "done")).length}/
              {tasks.length} done
            </span>
          </div>
          {tasks.length === 0 ? (
            <p className="muted">No tasks assigned yet.</p>
          ) : (
            <ul className="checklist">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className={compare(task.status, "done") ? "done" : ""}
                >
                  {compare(task.status, "done") ? (
                    <CheckCircle2 className="check-icon done" size={20} />
                  ) : (
                    <Circle className="check-icon" size={20} />
                  )}
                  <div className="task-info">
                    <strong>{task.title}</strong>
                    {task.description && <span>{task.description}</span>}
                    {task.due_date && (
                      <span className="task-due">
                        Due {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                  {task.status !== "done" && (
                    <button
                      className="task-btn"
                      onClick={() =>
                        updateTaskStatus(
                          task,
                          compare(task.status, "pending")
                            ? "in_progress"
                            : "done",
                        )
                      }
                    >
                      {compare(task.status, "pending") ? "Start" : "Mark done"}
                    </button>
                  )}
                  {compare(task.status, "done") && (
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
          <h2>Your Contacts</h2>
          <ul className="contact-list">
            {CONTACTS.map((c) => (
              <li
                key={c.name}
                className="contact-item"
                onClick={() => setSelectedContact(c)}
              >
                <div className="contact-icon">
                  <c.icon size={16} />
                </div>
                <div className="contact-info">
                  <strong>{c.name}</strong>
                  <span>{c.role}</span>
                </div>
                <ChevronRight size={16} className="contact-chevron" />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {selectedContact && (
        <div
          className="contact-modal-backdrop"
          onClick={() => setSelectedContact(null)}
        >
          <div
            className="contact-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="contact-modal-head">
              <div className="contact-modal-avatar">
                <selectedContact.icon size={22} />
              </div>
              <div className="contact-modal-title">
                <h3>{selectedContact.name}</h3>
                <span>{selectedContact.role}</span>
              </div>
              <button
                className="contact-modal-close"
                onClick={() => setSelectedContact(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p className="contact-modal-note">{selectedContact.note}</p>

            <div className="contact-modal-details">
              <a
                href={`tel:${selectedContact.phone.replace(/\s/g, "")}`}
                className="contact-modal-row"
              >
                <Phone size={16} />
                <span>{selectedContact.phone}</span>
              </a>
              <a
                href={`mailto:${selectedContact.email}`}
                className="contact-modal-row"
              >
                <Mail size={16} />
                <span>{selectedContact.email}</span>
              </a>
            </div>

            <div className="contact-modal-actions">
              <a
                className="btn-ghost"
                href={`tel:${selectedContact.phone.replace(/\s/g, "")}`}
              >
                <Phone size={16} /> Call
              </a>
              <a className="apply-btn" href={`mailto:${selectedContact.email}`}>
                <Mail size={16} /> Email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InternDashboard() {
  return (
    <DashboardShell navItems={INTERN_NAV}>
      <Routes>
        <Route index element={<InternOverview />} />
        <Route path="documents" element={<InternDocumentsPage />} />
        <Route path="forms" element={<InternFormsPage />} />
        <Route path="search" element={<SearchResults />} />
      </Routes>
    </DashboardShell>
  );
}

export default InternDashboard;
