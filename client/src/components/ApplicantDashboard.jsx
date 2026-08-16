import { Routes, Route } from "react-router-dom";
import { FileText, UserRound, CalendarClock, BadgeCheck } from "lucide-react";
import DashboardShell from "./DashboardShell.jsx";
import SearchResults from "./SearchResults.jsx";
import ApplicantPage from "../screens/ApplicantPage.jsx";
import ApplicantOffersPage from "../screens/ApplicantOffersPage.jsx";
import InterviewPage from "./InterviewPage.jsx";

const APPLICANT_NAV = [
  { to: "/applicant", end: true, icon: FileText, label: "My Application" },
  { to: "/applicant/offers", icon: BadgeCheck, label: "Offers" },
  { to: "/applicant/interviews", icon: CalendarClock, label: "Interviews" },
  { to: "/profile", icon: UserRound, label: "Profile" },
];

function ApplicantDashboard() {
  return (
    <DashboardShell navItems={APPLICANT_NAV}>
      <Routes>
        <Route index element={<ApplicantPage />} />
        <Route path="offers" element={<ApplicantOffersPage />} />
        <Route path="interviews" element={<InterviewPage />} />
        <Route path="search" element={<SearchResults />} />
      </Routes>
    </DashboardShell>
  );
}

export default ApplicantDashboard;
