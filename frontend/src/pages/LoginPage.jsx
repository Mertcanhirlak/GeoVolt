import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import evChargingHero from "../assets/ev-charging-hero.jpg";
import logo from "../assets/logo-cropped.png";
import basarsoftLogo from "../assets/basarsoft-logo.png"; // Başarsoft logosu eklendi
import "./LoginPage.css";

const managementPermissions = [
  "user.read",
  "user.create",
  "user.update",
  "user.delete",
  "user.role.assign",
  "role.read",
  "role.create",
  "role.update",
  "role.delete",
  "permission.assign",
  "point.read",
  "point.create",
  "point.update",
  "point.delete",
  "dashboard.admin.view"
];

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);
      const signedInUser = loginUser(data.token, data.user) ?? data.user;

      if (signedInUser?.mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }

      const permissions = Array.isArray(signedInUser?.permissions) ? signedInUser.permissions : [];
      const canAccessManagement = signedInUser?.role !== "CompanyUser"
        && (signedInUser?.role === "Admin"
          || managementPermissions.some((permission) => permissions.includes(permission)));

      navigate(canAccessManagement ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" data-testid="login-page">
      {/* SOL PANEL */}
      <div
        className="login-visual"
        style={{ "--login-visual-image": `url(${evChargingHero})` }}
      >
        <div className="login-brand">
          <img src={logo} alt="GeoVolt" className="login-brand-logo" />
        </div>

        <div className="login-quote">
          <p>Doğru konum, güçlü yatırım</p>
          <span>GeoVolt · Geleceğe uzanır</span>
        </div>
      </div>

      {/* SAĞ PANEL */}
      <div className="login-form-side">
        {/* Başarsoft Logosu */}
        <div className="login-corporate-brand">
          <img src={basarsoftLogo} alt="Başarsoft" className="login-corporate-logo" />
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <h1>Hoş Geldiniz</h1>
            <p>Devam etmek için hesabınıza giriş yapın.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" data-testid="login-form">
            <label htmlFor="login-email">
              E-posta
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                required
              />
            </label>

            <label htmlFor="login-password">
              Şifre
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                required
              />
            </label>

            {error && (
              <p className="login-error" data-testid="login-error-message">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} data-testid="login-submit-button">
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>

        <div className="login-stats">
          <div className="login-stat-row">
            <span className="login-stat-label">
              <svg className="login-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 20h.01M7 20v-4M12 20v-8M17 20v-12M22 20v-16" strokeLinecap="round" />
              </svg>
              Ağ Durumu
            </span>
            <span className="login-stat-value">Aktif</span>
          </div>

          <div className="login-stat-row">
            <span className="login-stat-label">
              <svg className="login-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              Toplam Şarj Noktası
            </span>
            <span className="login-stat-value">12.450</span>
          </div>

          <div className="login-stat-row">
            <span className="login-stat-label">
              <svg className="login-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2 4 14h6l-1 8 9-12h-6z" strokeLinejoin="round" />
              </svg>
              Yıllık Tasarruf (kWh)
            </span>
            <span className="login-stat-value">120M+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
