import { Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "./screens/AdminDashboard.jsx";
import ApplicantDashboard from "./components/ApplicantDashboard.jsx";
import InternDashboard from "./components/InternDashboard.jsx";
import { SignUpPage } from "./screens/SignUpPage";
import { LoginPage } from "./screens/LoginPage";
import RequireAuth from "./components/RequireAuth.jsx";
import ProfilePage from "./components/ProfilePage.jsx";
import { getSession } from "./api";
import "./App.css";

const HOME_BY_ROLE = {
  admin: "/dashboard",
  applicant: "/applicant",
  intern: "/intern",
};

function Home() {
  const session = getSession();
  return (
    <Navigate to={HOME_BY_ROLE[session?.role] ?? "/login"} replace />
  );
}

function Guarded({ roles, children }) {
  return (
    <RequireAuth roles={roles}>{children}</RequireAuth>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard/*"
        element={
          <Guarded roles={["admin"]}>
            <AdminDashboard />
          </Guarded>
        }
      />
      <Route
        path="/applicant/*"
        element={
          <Guarded roles={["applicant"]}>
            <ApplicantDashboard />
          </Guarded>
        }
      />
      <Route
        path="/intern/*"
        element={
          <Guarded roles={["intern"]}>
            <InternDashboard />
          </Guarded>
        }
      />
      <Route
        path="/profile"
        element={
          <Guarded roles={["admin", "applicant", "intern"]}>
            <ProfilePage />
          </Guarded>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;