import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function LoginRegister() {
  const [authMode, setAuthMode] = useState("login");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const API_URL = "http://localhost:8080";

  const parseResponse = async (res) => {
    const text = await res.text();

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text || "Réponse invalide du serveur" };
    }
  };

  const resetMessages = () => {
    setAuthError("");
    setAuthSuccess("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: userEmail.trim(),
          password: userPassword,
        }),
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        setAuthError(
          data.messages?.error || data.message || "Erreur de connexion"
        );
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", data.user?.role || "user");
      localStorage.setItem("isLoggedIn", "true");

      window.dispatchEvent(new Event("auth-changed"));

      if (data.user?.role === "admin") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Erreur login :", err);
      setAuthError("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          nom: lastName.trim(),
          prenom: firstName.trim(),
          email: userEmail.trim(),
          password: userPassword,
        }),
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        setAuthError(
          data.messages?.error || data.message || "Erreur inscription"
        );
        return;
      }

      setAuthSuccess(
        data.message || "Compte créé avec succès. Redirection en cours..."
      );

      // Si le backend renvoie directement l'utilisateur après inscription
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("role", data.user?.role || "user");
        localStorage.setItem("isLoggedIn", "true");
        window.dispatchEvent(new Event("auth-changed"));
      }

      setLastName("");
      setFirstName("");
      setUserEmail("");
      setUserPassword("");

      setTimeout(() => {
        if (data.user?.role === "admin") {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }, 1500);
    } catch (err) {
      console.error("Erreur register :", err);
      setAuthError("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth_page">
      <div className="auth_wrapper">
        <div className="auth_intro">
          <span className="auth_badge">Espace membre</span>
          <h1 className="auth_heading">
            Accédez à votre espace de formation
          </h1>
          <p className="auth_description">
            Connectez-vous pour retrouver vos formations, gérer vos inscriptions
            et profiter d’une expérience simple, rapide et professionnelle.
          </p>
        </div>

        <div className="auth_panel">
          <div className="auth_switcher">
            <button
              type="button"
              className={`auth_switch_button ${
                authMode === "login" ? "active" : ""
              }`}
              onClick={() => {
                resetMessages();
                setAuthMode("login");
              }}
            >
              Connexion
            </button>

            <button
              type="button"
              className={`auth_switch_button ${
                authMode === "register" ? "active" : ""
              }`}
              onClick={() => {
                resetMessages();
                setAuthMode("register");
              }}
            >
              Inscription
            </button>
          </div>

          {authError && <p className="auth_alert auth_alert_error">{authError}</p>}
          {authSuccess && (
            <p className="auth_alert auth_alert_success">{authSuccess}</p>
          )}

          {authMode === "login" && (
            <form className="auth_form" onSubmit={handleLogin}>
              <h2 className="auth_form_title">Connexion</h2>

              <div className="auth_field">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="Votre email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="auth_field">
                <label htmlFor="login-password">Mot de passe</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Votre mot de passe"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                className="auth_submit_button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          )}

          {authMode === "register" && (
            <form className="auth_form" onSubmit={handleRegister}>
              <h2 className="auth_form_title">Inscription</h2>

              <div className="auth_field">
                <label htmlFor="register-lastname">Nom</label>
                <input
                  id="register-lastname"
                  type="text"
                  placeholder="Votre nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>

              <div className="auth_field">
                <label htmlFor="register-firstname">Prénom</label>
                <input
                  id="register-firstname"
                  type="text"
                  placeholder="Votre prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>

              <div className="auth_field">
                <label htmlFor="register-email">Email</label>
                <input
                  id="register-email"
                  type="email"
                  placeholder="Votre email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="auth_field">
                <label htmlFor="register-password">Mot de passe</label>
                <input
                  id="register-password"
                  type="password"
                  placeholder="Votre mot de passe"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                className="auth_submit_button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Création..." : "Créer un compte"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}