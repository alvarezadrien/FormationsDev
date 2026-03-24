import { useState } from "react";
import "./CreationCompteFormateur.css";

const API_BASE_URL = "http://localhost:8080";

const initialForm = {
  nom: "",
  prenom: "",
  email: "",
  password: "",
  confirmPassword: "",
  travaille_samedi: false,
  est_remplacant: false,
};

export function CreationCompteFormateur() {
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleField = (field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setMessage("");
    setError("");
  };

  const validateForm = () => {
    const nom = formData.nom.trim();
    const prenom = formData.prenom.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!nom || !prenom || !email || !password) {
      return "Tous les champs sont obligatoires";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Adresse email invalide";
    }

    if (password.length < 6) {
      return "Le mot de passe doit contenir au moins 6 caractères";
    }

    if (password !== formData.confirmPassword) {
      return "Les mots de passe ne correspondent pas";
    }

    return "";
  };

  const buildPayload = () => {
    return {
      nom: formData.nom.trim(),
      prenom: formData.prenom.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      travaille_samedi: formData.travaille_samedi ? 1 : 0,
      est_remplacant: formData.est_remplacant ? 1 : 0,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_BASE_URL}/formateurs`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(data?.message || "Cet email est déjà utilisé");
        }

        if (response.status === 422) {
          throw new Error(data?.message || "Certaines données sont invalides");
        }

        if (response.status === 401) {
          throw new Error(data?.message || "Vous devez être connecté");
        }

        if (response.status === 403) {
          throw new Error(data?.message || "Accès interdit");
        }

        throw new Error(
          data?.message ||
            (data?.details ? JSON.stringify(data.details) : "") ||
            "Impossible de créer le compte formateur"
        );
      }

      setMessage(data?.message || "Compte formateur créé avec succès");
      setFormData(initialForm);
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="creation-formateur">
      <div className="creation-formateur__header">
        <h2 className="creation-formateur__title">Créer un compte formateur</h2>
        <p className="creation-formateur__subtitle">
          Ajoute un nouveau formateur qui pourra se connecter à son espace.
        </p>
      </div>

      <form className="creation-formateur__form" onSubmit={handleSubmit}>
        {message && <div className="creation-formateur__message">{message}</div>}
        {error && <div className="creation-formateur__error">{error}</div>}

        <div className="creation-formateur__grid">
          <div className="creation-formateur__field">
            <label htmlFor="nom">Nom</label>
            <input
              id="nom"
              name="nom"
              type="text"
              value={formData.nom}
              onChange={handleChange}
              placeholder="Nom"
              disabled={saving}
              required
            />
          </div>

          <div className="creation-formateur__field">
            <label htmlFor="prenom">Prénom</label>
            <input
              id="prenom"
              name="prenom"
              type="text"
              value={formData.prenom}
              onChange={handleChange}
              placeholder="Prénom"
              disabled={saving}
              required
            />
          </div>

          <div className="creation-formateur__field creation-formateur__field--full">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              disabled={saving}
              required
            />
          </div>

          <div className="creation-formateur__field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mot de passe"
              disabled={saving}
              required
            />
          </div>

          <div className="creation-formateur__field">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirmer le mot de passe"
              disabled={saving}
              required
            />
          </div>
        </div>

        <div className="creation-formateur__field creation-formateur__field--full">
          <label>Options du formateur</label>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              marginTop: "10px",
            }}
          >
            <button
              type="button"
              onClick={() => toggleField("travaille_samedi")}
              className={`creation-formateur__toggle ${
                formData.travaille_samedi ? "is-active" : ""
              }`}
              disabled={saving}
            >
              {formData.travaille_samedi ? "✓ " : ""}
              Disponible le samedi
            </button>

            <button
              type="button"
              onClick={() => toggleField("est_remplacant")}
              className={`creation-formateur__toggle ${
                formData.est_remplacant ? "is-active" : ""
              }`}
              disabled={saving}
            >
              {formData.est_remplacant ? "✓ " : ""}
              Peut être remplaçant
            </button>
          </div>

          <div
            style={{
              marginTop: "12px",
              fontSize: "14px",
              color: "#555",
              display: "grid",
              gap: "6px",
            }}
          >
            <div>
              <strong>Disponible le samedi :</strong>{" "}
              {formData.travaille_samedi ? "Oui" : "Non"}
            </div>
            <div>
              <strong>Peut être remplaçant :</strong>{" "}
              {formData.est_remplacant ? "Oui" : "Non"}
            </div>
          </div>
        </div>

        <div className="creation-formateur__actions">
          <button type="submit" disabled={saving}>
            {saving ? "Création..." : "Créer le compte formateur"}
          </button>

          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
            className="creation-formateur__reset"
          >
            Réinitialiser
          </button>
        </div>
      </form>
    </section>
  );
}