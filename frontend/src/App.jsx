import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import CandidatePointsPage from "./pages/CandidatePointsPage";
<<<<<<< HEAD
import LoginPage from "./pages/LoginPage"; 
=======
import LoginPage from "./pages/LoginPage";
import AdminPanel from "./pages/AdminPanel";
import { useAuth } from "./context/AuthContext";
>>>>>>> origin/main
import "./App.css";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
<<<<<<< HEAD
        {/* İlk açılış*/}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Login sayfsı */}
        <Route path="/login" element={<LoginPage />} />
        
        {/*şarj istasyonları sayfası */}
        <Route path="/dashboard" element={<CandidatePointsPage />} />
=======
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
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
>>>>>>> origin/main
      </Routes>
    </Router>
  );
}