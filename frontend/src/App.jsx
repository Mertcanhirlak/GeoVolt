import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import CandidatePointsPage from "./pages/CandidatePointsPage";
import LoginPage from "./pages/LoginPage"; 
import "./App.css";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* İlk açılış*/}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Login sayfsı */}
        <Route path="/login" element={<LoginPage />} />
        
        {/*şarj istasyonları sayfası */}
        <Route path="/dashboard" element={<CandidatePointsPage />} />
      </Routes>
    </Router>
  );
}