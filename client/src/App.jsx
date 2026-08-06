import { useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import {
  Bell,
  LayoutDashboard,
  Users,
  Briefcase,
  Plus,
  Menu,
} from "lucide-react";
import Dashboard from "./screens/Dashboard.jsx";
import ApplicantsPage from "./screens/ApplicantsPage.jsx";
import "./App.css";
import { SignUpPage } from "./screens/SignUpPage";
import { LoginPage } from "./screens/LoginPage";

function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <SignUpPage />
      <LoginPage />
    </>
  );
}

export default App;
