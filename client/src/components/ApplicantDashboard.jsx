import { Routes, Route } from "react-router-dom";
import { FileText, UserRound, CalendarClock } from "lucide-react";
import DashboardShell from "./DashboardShell.jsx";
import ApplicantPage from "../screens/ApplicantPage.jsx";
import InterviewPage from "./InterviewPage.jsx";

const APPLICANT_NAV = [
  { to: "/applicant", end: true, icon: FileText, label: "My Application" },
  { to: "/applicant/interviews", icon: CalendarClock, label: "Interviews" },
  { to: "/profile", icon: UserRound, label: "Profile" },
];

function ApplicantDashboard() {
  return (
    <DashboardShell navItems={APPLICANT_NAV}>
      <Routes>
        <Route index element={<ApplicantPage />} />
        <Route path="interviews" element={<InterviewPage />} />
      </Routes>
    </DashboardShell>
  );
}

export default ApplicantDashboard;
