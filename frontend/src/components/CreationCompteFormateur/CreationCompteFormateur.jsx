import { useState } from "react";
import "./CreationCompteFormateur.css";

const API_BASE_URL = "http://localhost:8080";

export function CreationCompteFormateur() {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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

  const resetForm = () => {
    setFormData({
      nom: "",
      prenom: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (
      !formData.nom.trim() ||
      !formData.prenom.trim() ||
      !formData.email.trim() ||
      !formData.password.trim()
    ) {
      setError("Tous les champs sont obligatoires");
      return;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
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
        body: JSON.stringify({
          nom: formData.nom.trim(),
          prenom: formData.prenom.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de créer le compte formateur");
      }

      setMessage(data?.message || "Compte formateur créé avec succès");
      resetForm();
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
            />
          </div>
        </div>

        <div className="creation-formateur__actions">
          <button type="submit" disabled={saving}>
            {saving ? "Création..." : "Créer le compte formateur"}
          </button>
        </div>
      </form>
    </section>
  );
}