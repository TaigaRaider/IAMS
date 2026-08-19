import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  GraduationCap,
  ListTodo,
  BadgeCheck,
  X,
} from "lucide-react";
import "./OnboardingTour.css";

const TOUR_KEY = (role) => `iams-tour-${role}`;

const TOURS = {
  admin: [
    {
      icon: LayoutDashboard,
      title: "Your command center",
      text: "This dashboard shows live stats — applications, open roles, pending interviews and offers — plus the latest applicants at a glance.",
    },
    {
      icon: Users,
      title: "Review applicants",
      text: "Open Applicants to shortlist, reject or hire candidates. Every status change notifies the applicant instantly.",
    },
    {
      icon: ListTodo,
      title: "Assign tasks",
      text: "The Tasks page lets you build a task board per intern and track their progress in real time.",
    },
    {
      icon: BadgeCheck,
      title: "Extend offers",
      text: "Compose offers with terms, negotiate revisions, and confirm hires — promotions to intern happen automatically.",
    },
    {
      icon: FileText,
      title: "Search everything",
      text: "Use the search bar in the header to find applicants, roles, offers and interns across the system.",
    },
  ],
  applicant: [
    {
      icon: FileText,
      title: "Track your application",
      text: "This page follows your journey — from applied, through review and interviews, to your offer. The timeline shows where you are.",
    },
    {
      icon: Briefcase,
      title: "Apply to roles",
      text: "Open roles appear on the right. Apply once per role — you can withdraw any time while it's still in review.",
    },
    {
      icon: BadgeCheck,
      title: "Watch for offers",
      text: "When a team extends an offer you'll see it here — accept, decline, or request changes before you decide.",
    },
    {
      icon: Users,
      title: "Stay in the loop",
      text: "The bell in the header shows every update: reviews, interviews, offers and task assignments.",
    },
  ],
  intern: [
    {
      icon: ListTodo,
      title: "Your task board",
      text: "This dashboard shows the tasks assigned to you. Update each one's status as you make progress.",
    },
    {
      icon: GraduationCap,
      title: "Your intern profile",
      text: "Admins can see your progress and offers. Keep your profile and biodata up to date in Profile.",
    },
    {
      icon: BadgeCheck,
      title: "Offers that matter",
      text: "Accepted offers are tracked here, and confirmations move you forward automatically.",
    },
    {
      icon: FileText,
      title: "Search everything",
      text: "Use the header search bar to jump to the people and roles that matter to you.",
    },
  ],
};

function OnboardingTour({ role }) {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);

  const tour = TOURS[role] ?? null;

  useEffect(() => {
    if (!tour) return;
    if (localStorage.getItem(TOUR_KEY(role))) return;
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, [role, tour]);

  if (!tour || !show) return null;

  const finish = () => {
    localStorage.setItem(TOUR_KEY(role), "1");
    setShow(false);
  };

  const current = tour[step];
  const Icon = current.icon;
  const last = step === tour.length - 1;

  return (
    <div className="tour-backdrop">
      <div className="tour-card" role="dialog" aria-modal="true" aria-label="Welcome tour">
        <button className="tour-close" onClick={finish} aria-label="Skip tour">
          <X size={16} />
        </button>
        <div className="tour-icon">
          <Icon size={26} />
        </div>
        <h3>{current.title}</h3>
        <p>{current.text}</p>
        <div className="tour-dots">
          {tour.map((_, i) => (
            <span key={i} className={i === step ? "active" : ""} />
          ))}
        </div>
        <div className="tour-actions">
          {!last && (
            <button className="btn-ghost" onClick={finish}>
              Skip
            </button>
          )}
          <button className="apply-btn" onClick={() => (last ? finish() : setStep((s) => s + 1))}>
            {last ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;