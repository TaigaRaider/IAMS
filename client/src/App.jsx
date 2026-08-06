<<<<<<< HEAD
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout.jsx";
=======
import { Routes, Route } from "react-router-dom";
import AdminDashboard from "./screens/AdminDashboard.jsx";
>>>>>>> c9682307b061a12d733f30ef23380f154fd73565
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
      <Route path="/" element={<SignUpPage />} />
      <Route path="*" element={<SignUpPage />} />
    </Routes>
  );
}

export default App;
