import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import CandidatePointsPage from "./pages/CandidatePointsPage";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AdminPanel from "./pages/AdminPanel";
import { useAuth } from "./context/AuthContext";
import "./App.css";

function ProtectedRoute({ children }) {
  const { token, mustChangePassword } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { token, mustChangePassword, canAccessManagement } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (!canAccessManagement) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function LoginRoute({ children }) {
  const { token, mustChangePassword, canAccessManagement } = useAuth();

  if (!token) {
    return children;
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <Navigate to={canAccessManagement ? "/admin" : "/dashboard"} replace />;
}

function ChangePasswordRoute({ children }) {
  const { token, mustChangePassword, canAccessManagement } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!mustChangePassword) {
    return <Navigate to={canAccessManagement ? "/admin" : "/dashboard"} replace />;
  }

  return children;
}

function HomeRoute() {
  const { token, mustChangePassword, canAccessManagement } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <Navigate to={canAccessManagement ? "/admin" : "/dashboard"} replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeRoute />} />

        <Route
          path="/login"
          element={
            <LoginRoute>
              <LoginPage />
            </LoginRoute>
          }
        />

        <Route
          path="/change-password"
          element={
            <ChangePasswordRoute>
              <ChangePasswordPage />
            </ChangePasswordRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CandidatePointsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
