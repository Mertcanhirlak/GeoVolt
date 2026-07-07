import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import "./App.css";

// Giriş başarılı olunca açılacak ekran
function MainDashboard() {
  const { user, logoutUser, role } = useAuth();

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h1>GeoVolt Projesine Hoş Geldiniz!</h1>
      <p>Giriş Yapan: <strong>{user?.fullName}</strong></p>
      <p>Rolünüz: <strong>{role}</strong></p>
      
      {role === "CompanyAdmin" && (
        <div style={{ border: "2px solid green", padding: "15px", margin: "10px 0" }}>
          <h3>Firma Yönetici Paneli</h3>
          <p>Buradan en fazla 2 adet çalışan (CompanyUser) ekleyebilirsiniz.</p>
        </div>
      )}

      {role === "CompanyUser" && (
        <div style={{ border: "2px solid blue", padding: "15px", margin: "10px 0" }}>
          <h3>Firma Çalışan Paneli</h3>
          <p>Harita ve Aday Noktalar modülü aktif.</p>
        </div>
      )}

      <button onClick={logoutUser} style={{ padding: "10px", background: "red", color: "white", border: "none", cursor: "pointer", marginTop: "20px" }}>
        Çıkış Yap
      </button>
    </div>
  );
}

// Giriş kontrol merkezi
function AppContent() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <MainDashboard /> : <LoginPage />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;