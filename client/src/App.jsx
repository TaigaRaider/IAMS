import { Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "./screens/AdminDashboard.jsx";
import ApplicantDashboard from "./components/ApplicantDashboard.jsx";
import InternDashboard from "./components/InternDashboard.jsx";
import { AuthPage } from "./screens/AuthPage";
import { IntroPage } from "./screens/IntroPage.jsx";
import VerifyPage from "./screens/VerifyPage.jsx";
import ResetPasswordPage from "./screens/ResetPasswordPage.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import ProfilePage from "./components/ProfilePage.jsx";
import AccountStatus from "./components/AccountStatus.jsx";
import { ToastProvider } from "./components/Toasts.jsx";
import "./App.css";
import "./shared.css";

function Guarded({ roles, children }) {
  return <RequireAuth roles={roles}>{children}</RequireAuth>;
}

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<IntroPage />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route
          path="/account"
          element={
            <Guarded roles={["admin", "applicant", "intern"]}>
              <AccountStatus />
            </Guarded>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
