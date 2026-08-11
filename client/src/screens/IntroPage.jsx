import { Link } from "react-router-dom";
import { ArrowRight, UserPlus } from "lucide-react";
import {
  SiJavascript,
  SiHtml5,
  SiCss,
  SiReact,
  SiPython,
} from "react-icons/si";
import "./IntroPage.css";

const INTERNS = [
  {
    name: "Timothy Adetunji Ojo",
    role: "Intern · Crown Interactive",
    photo: null,
  },
  {
    name: "Olufikayo Sharon Amos",
    role: "Intern · Crown Interactive",
    photo: "./olufikayo.png",
  },
];

const TECH_ICONS = [
  { name: "JavaScript", Icon: SiJavascript, color: "#F7DF1E" },
  { name: "HTML5", Icon: SiHtml5, color: "#E34F26" },
  { name: "CSS", Icon: SiCss, color: "#1572B6" },
  { name: "React", Icon: SiReact, color: "#61DAFB" },
  { name: "Python", Icon: SiPython, color: "#3776AB" },
];

const PHOTO_GRADIENTS = [
  "linear-gradient(135deg, #2b2b31, #6b5bd6)",
  "linear-gradient(135deg, #7a1fc4, #27272a)",
];

const initials = (name) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const IntroPage = () => {
  return (
    <div className="intro-page">
      <header className="intro-hero">
        <div className="intro-eyebrow">
          <img src="./iamslogo.png" alt="IAMS Logo" className="intro-logo" />
          <span className="intro-brand">IAMS</span>
        </div>
        <div className="intro-hero-body">
          <h1>Your internship, tracked from apply to offer.</h1>
          <p>
            One place for students to apply and follow their status, and for
            teams to review every candidate.
          </p>
          <div className="intro-cta">
            <Link to="/login" className="intro-btn">
              Join the Team!
              <ArrowRight size={20} />
            </Link>
            <Link to="/signup" className="intro-btn ghost">
              <UserPlus size={20} />
              Create an account
            </Link>
          </div>
        </div>
      </header>

      <main className="interns-section">
        <div className="interns-head">
          <h2>Here are our Interns</h2>
          <p>
            Meet the team behind IAMS — the people building Crown Interactive's
            internship experience.
          </p>
        </div>

        <div className="interns-grid">
          {INTERNS.map((intern, i) => (
            <article className="intern-card" key={intern.name}>
              <div
                className="intern-photo"
                style={{ background: PHOTO_GRADIENTS[i % PHOTO_GRADIENTS.length] }}
              >
                {intern.photo ? (
                  <img src={intern.photo} alt={intern.name} />
                ) : (
                  <span className="intern-initials">
                    {initials(intern.name)}
                  </span>
                )}
              </div>
              <h3>{intern.name}</h3>
              <p>{intern.role}</p>
              <div className="intern-tools">
                {TECH_ICONS.map(({ name, Icon, color }) => (
                  <span className="tool" key={name} title={name}>
                    <Icon color={color} size={20} />
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="join-block">
          <h2>Ready to join the team?</h2>
          <p>Apply for an open role and track your journey with IAMS.</p>
          <Link to="/login" className="intro-btn join-btn">
            Join the Team!
            <ArrowRight size={22} />
          </Link>
        </div>
      </main>

      <footer className="intro-footer">
        <span>© 2026 IAMS · Internship Program</span>
      </footer>
    </div>
  );
};
