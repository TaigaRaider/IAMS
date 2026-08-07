import {
  Check,
  Clock,
  Calendar,
  Video,
  FileText,
  MessageSquare,
} from "lucide-react";

const steps = [
  { label: "Applied", detail: "Submitted on Aug 2", state: "done" },
  { label: "Screening", detail: "Currently reviewing", state: "active" },
  { label: "Interview", detail: "Pending", state: "upcoming" },
  { label: "Decision", detail: "Awaiting outcome", state: "upcoming" },
];

const events = [
  {
    icon: Video,
    title: "Interview Prep Webinar",
    date: "Aug 12",
    time: "2:00 PM",
  },
  {
    icon: Calendar,
    title: "Virtual Info Session",
    date: "Aug 18",
    time: "11:00 AM",
  },
  {
    icon: FileText,
    title: "Application Deadline",
    date: "Aug 25",
    time: "11:59 PM",
  },
];

const messages = [
  {
    from: "IAMS Team",
    text: "Thanks for applying! Your application is now in screening.",
    time: "2h ago",
    unread: true,
  },
  {
    from: "Talent Coordinator",
    text: "We received your resume. We'll reach out if there's a fit.",
    time: "1d ago",
    unread: false,
  },
  {
    from: "IAMS Team",
    text: "Reminder: complete your profile to improve your chances.",
    time: "3d ago",
    unread: false,
  },
];

function StepIcon({ state }) {
  if (state === "done") return <Check size={16} />;
  if (state === "active") return <Clock size={16} />;
  return <span className="step-num" />;
}

function ApplicantPage() {
  return (
    <div className="applicant-page">
      <div className="applicant-header">
        <div>
          <h1 className="page-title">My Application</h1>
          <p className="applicant-subtitle">
            Track your internship application from here.
          </p>
        </div>
        <span className="status pending">In Review</span>
      </div>

      <div className="applicant-grid">
        <section className="card progress-card">
          <h2>Application Progress</h2>
          <div className="progress-steps">
            {steps.map((step) => (
              <div
                key={step.label}
                className={`step step-${step.state}`}
              >
                <div className="step-dot">
                  <StepIcon state={step.state} />
                </div>
                <div className="step-info">
                  <strong>{step.label}</strong>
                  <span>{step.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card events-card">
          <h2>Events</h2>
          <ul className="events-list">
            {events.map((event) => (
              <li key={event.title} className="event-item">
                <div className="event-icon">
                  <event.icon size={18} />
                </div>
                <div className="event-info">
                  <strong>{event.title}</strong>
                  <span>
                    {event.date} · {event.time}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card messages-card">
        <div className="card-head">
          <h2>Messages</h2>
          <span className="view-all">3 total</span>
        </div>
        <ul className="messages-list">
          {messages.map((message) => (
            <li
              key={message.text}
              className={`message-item${message.unread ? " unread" : ""}`}
            >
              <div className="avatar-mini">
                <MessageSquare size={16} />
              </div>
              <div className="message-content">
                <div className="message-meta">
                  <strong>{message.from}</strong>
                  <span>{message.time}</span>
                </div>
                <p>{message.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default ApplicantPage;
