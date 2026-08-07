import { Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "./screens/AdminDashboard.jsx";
import ApplicantDashboard from "./components/ApplicantDashboard.jsx";
import { SignUpPage } from "./screens/SignUpPage";
import { LoginPage } from "./screens/LoginPage";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard/*" element={<AdminDashboard />} />
      <Route path="/applicant/*" element={<ApplicantDashboard />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
