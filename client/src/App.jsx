import { Routes, Route } from "react-router-dom";
import AdminDashboard from "./screens/AdminDashboard.jsx";
import { SignUpPage } from "./screens/SignUpPage";
import { LoginPage } from "./screens/LoginPage";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard/*" element={<AdminDashboard />} />
      <Route path="/" element={<SignUpPage />} />
      <Route path="*" element={<SignUpPage />} />
    </Routes>
  );
}

export default App;
