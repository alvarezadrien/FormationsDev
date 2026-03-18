import { useEffect, useState } from "react";
import "./MesDonnees.css";

const API_BASE_URL = "http://localhost:8080";

export function MesDonnees() {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMesDonnees();
  }, []);

  const fetchMesDonnees = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API_BASE_URL}/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de charger vos données");
      }

      setFormData((prev) => ({
        ...prev,
        nom: data?.user?.nom || "",
        prenom: data?.user?.prenom || "",
        email: data?.user?.email || "",
      }));
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!formData.nom.trim() || !formData.prenom.trim() || !formData.email.trim()) {
      setError("Le nom, le prénom et l'email sont obligatoires");
      return;
    }

    if (formData.password.trim() !== "" && formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        email: formData.email.trim(),
      };

      if (formData.password.trim() !== "") {
        payload.password = formData.password.trim();
      }

      const response = await fetch(`${API_BASE_URL}/me`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de mettre à jour vos données");
      }

      setMessage(data?.message || "Vos données ont été mises à jour avec succès");

      setFormData((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));

      localStorage.setItem("nom", payload.nom);
      localStorage.setItem("prenom", payload.prenom);
      localStorage.setItem("email", payload.email);
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mes-donnees">
      <div className="mes-donnees__header">
        <h2 className="mes-donnees__title">Mes données</h2>
        <p className="mes-donnees__subtitle">
          Consultez et modifiez vos informations personnelles.
        </p>
      </div>

      {loading ? (
        <div className="mes-donnees__loading">Chargement de vos données...</div>
      ) : (
        <form className="mes-donnees__form" onSubmit={handleSubmit}>
          {message && <div className="mes-donnees__message">{message}</div>}
          {error && <div className="mes-donnees__error">{error}</div>}

          <div className="mes-donnees__grid">
            <div className="mes-donnees__field">
              <label htmlFor="nom">Nom</label>
              <input
                id="nom"
                name="nom"
                type="text"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Votre nom"
              />
            </div>

            <div className="mes-donnees__field">
              <label htmlFor="prenom">Prénom</label>
              <input
                id="prenom"
                name="prenom"
                type="text"
                value={formData.prenom}
                onChange={handleChange}
                placeholder="Votre prénom"
              />
            </div>

            <div className="mes-donnees__field mes-donnees__field--full">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Votre email"
              />
            </div>

            <div className="mes-donnees__field">
              <label htmlFor="password">Nouveau mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Laisser vide pour ne pas changer"
              />
            </div>

            <div className="mes-donnees__field">
              <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirmez le nouveau mot de passe"
              />
            </div>
          </div>

          <div className="mes-donnees__actions">
            <button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer mes modifications"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}