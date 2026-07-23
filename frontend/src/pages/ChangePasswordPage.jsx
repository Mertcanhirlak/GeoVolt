import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import evChargingHero from "../assets/ev-charging-hero.jpg";
import logo from "../assets/logo-cropped.png";
import basarsoftLogo from "../assets/basarsoft-logo.png";
import "./LoginPage.css";
import "./ChangePasswordPage.css";

function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { token, loginUser, logoutUser, canAccessManagement } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmNewPassword) {
      setError("Yeni şifre ve şifre tekrarı eşleşmiyor.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("Yeni şifre mevcut şifreden farklı olmalıdır.");
      return;
    }

    setLoading(true);

    try {
      const destination = canAccessManagement ? "/admin" : "/dashboard";
      const data = await changePassword(token, currentPassword, newPassword, confirmNewPassword);
      loginUser(data.token, data.user);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/login", { replace: true });
  };

  return (
    <div className="login-page change-password-page" data-testid="change-password-page">
      <div
        className="login-visual"
        style={{ "--login-visual-image": `url(${evChargingHero})` }}
      >
        <div className="login-brand">
          <img src={logo} alt="GeoVolt" className="login-brand-logo" />
        </div>

        <div className="login-quote">
          <p>Hesabınızı güvene alın</p>
          <span>İlk girişinizde size özel bir şifre belirleyin.</span>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-corporate-brand">
          <img src={basarsoftLogo} alt="Başarsoft" className="login-corporate-logo" />
        </div>

        <div className="login-card change-password-card">
          <div className="login-card-header">
            <h1>Şifrenizi Değiştirin</h1>
            <p>Devam etmek için yönetici tarafından verilen şifreyi yenileyin.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" data-testid="change-password-form">
            <label htmlFor="current-password">
              Mevcut şifre
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                minLength={6}
              />
            </label>

            <label htmlFor="new-password">
              Yeni şifre
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={6}
              />
            </label>

            <label htmlFor="confirm-new-password">
              Yeni şifre tekrarı
              <input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                required
                minLength={6}
              />
            </label>

            <p className="password-hint">Şifreniz en az 6 karakter olmalıdır.</p>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Şifre değiştiriliyor..." : "Şifremi Değiştir"}
            </button>

            <button type="button" className="logout-link-button" onClick={handleLogout} disabled={loading}>
              Çıkış Yap
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordPage;
