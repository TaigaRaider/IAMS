import { Check, X } from "lucide-react";
import "./JourneyTimeline.css";

const OFFER_ACTIVE = new Set(["Extended", "In Negotiation", "Final"]);
const OFFER_DONE = new Set(["Accepted", "Confirmed"]);

function JourneyTimeline({ status, offerStatus = null, interviews = 0 }) {
  const rejected = status === "Rejected";
  const hired = status === "Hired" || offerStatus === "Confirmed";

  const steps = [
    { label: "Applied", done: true },
    { label: "In Review", done: !rejected && status !== "In Review" },
    { label: "Shortlisted", done: !rejected && (status === "Shortlisted" || hired) },
    { label: "Interview", done: !rejected && (interviews > 0 || hired) },
    {
      label: "Offer",
      done:
        !rejected &&
        (OFFER_ACTIVE.has(offerStatus) || OFFER_DONE.has(offerStatus)),
    },
    { label: "Hired", done: hired },
  ];

  const currentIdx = steps.findIndex((s) => !s.done);

  return (
    <div className={`journey ${rejected ? "journey-rejected" : ""}`}>
      <ol className="journey-steps">
        {steps.map((step, i) => {
          const isCurrent = i === currentIdx && !rejected;
          return (
            <li
              key={step.label}
              className={`journey-step${
                step.done ? " done" : isCurrent ? " current" : ""
              }${rejected && i > 1 ? " blocked" : ""}`}
            >
              <span className="journey-dot">
                {step.done ? <Check size={13} strokeWidth={3} /> : rejected && i > 1 ? <X size={12} strokeWidth={3} /> : null}
              </span>
              <span className="journey-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
      {rejected && (
        <p className="journey-note">
          This application was not successful — the journey ended here.
        </p>
      )}
    </div>
  );
}

export default JourneyTimeline;