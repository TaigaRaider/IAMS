import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout.jsx";
import { SignUpPage } from "./screens/SignUpPage";
import { LoginPage } from "./screens/LoginPage";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<DashboardLayout />} />
    </Routes>
  );
}

export default App;
