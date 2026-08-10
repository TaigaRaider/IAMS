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

("eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYxMzYxNDgsImlkIjoiMDE5ZmRkZmUtNzQwMS03YjdiLWI5NDEtZjI4YTZhNmJkM2Q0Iiwia2lkIjoiTkptMXJzNVJzb1N2emNrZE5Kcl9nWFhjTEZiV1J4MUpOLW5uc2RUOWFuSSIsInJpZCI6ImM2YTkwMTFmLWJkNWEtNGIwMC04ZGViLTg5YjRmM2Y4MmZkNyJ9.o948sLYd7ns_l7UDPeec9otGn9oRHNcjOFqWJZGbDMNNsnT-FsOGYCJrLbVIVtrC4VmjeDASpMVn1fYZMYQ5Dw");
function Home() {
  const session = getSession();
  return <Navigate to={HOME_BY_ROLE[session?.role] ?? "/login"} replace />;
}

function Guarded({ roles, children }) {
  return <RequireAuth roles={roles}>{children}</RequireAuth>;
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
