import { useEffect, useState } from "react";
import "./FormFormations.css";

const API_URL = "http://localhost:8080";

export function FormFormations() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    formation_id: "",
    message: ""
  });

  useEffect(() => {
    const fetchFormations = async () => {
      try {
        setLoading(true);
        setErreur("");

        const res = await fetch(`${API_URL}/formations`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Erreur lors du chargement des formations");
        }

        setFormations(Array.isArray(data) ? data : []);
      } catch (err) {
        setErreur(err.message || "Erreur serveur");
      } finally {
        setLoading(false);
      }
    };

    fetchFormations();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "formation_id" ? value : value
    }));
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      formation_id: "",
      message: ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setErreur("");
      setMessage("");

      const payload = {
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        email: formData.email.trim(),
        telephone: formData.telephone.trim(),
        formation_id: Number(formData.formation_id),
        message: formData.message.trim()
      };

      const res = await fetch(`${API_URL}/inscriptions-formations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Impossible d'envoyer l'inscription");
      }

      setMessage("Votre demande d’inscription a bien été envoyée.");
      resetForm();
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'envoi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="training-form-page">
      <div className="training-form-shell">
        <div className="training-form-banner">
          <span className="training-form-badge">Inscription</span>
          <h2 className="training-form-title">
            Rejoignez une formation et développez vos compétences
          </h2>
          <p className="training-form-subtitle">
            Complétez le formulaire ci-dessous pour envoyer votre demande
            d’inscription. Notre équipe vous recontactera rapidement avec les
            prochaines étapes.
          </p>
        </div>

        <div className="training-form-card">
          <form className="training-form" onSubmit={handleSubmit}>
            <div className="training-form-row">
              <div className="training-field">
                <label htmlFor="nom">Nom</label>
                <input
                  id="nom"
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Votre nom"
                  required
                />
              </div>

              <div className="training-field">
                <label htmlFor="prenom">Prénom</label>
                <input
                  id="prenom"
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  placeholder="Votre prénom"
                  required
                />
              </div>
            </div>

            <div className="training-form-row">
              <div className="training-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="exemple@email.com"
                  required
                />
              </div>

              <div className="training-field">
                <label htmlFor="telephone">Téléphone</label>
                <input
                  id="telephone"
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  placeholder="Votre numéro"
                  required
                />
              </div>
            </div>

            <div className="training-field">
              <label htmlFor="formation_id">Choisir une formation</label>
              <select
                id="formation_id"
                name="formation_id"
                value={formData.formation_id}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="">
                  {loading ? "Chargement des formations..." : "Sélectionner une formation"}
                </option>

                {formations.map((formation) => (
                  <option key={formation.id} value={formation.id}>
                    {formation.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="training-field">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                placeholder="Ajoutez un message ou une précision..."
              />
            </div>

            {message && (
              <p style={{ color: "green", marginBottom: "1rem" }}>{message}</p>
            )}

            {erreur && (
              <p style={{ color: "red", marginBottom: "1rem" }}>{erreur}</p>
            )}

            <div className="training-form-actions">
              <button
                type="submit"
                className="training-submit-button"
                disabled={saving || loading}
              >
                {saving ? "Envoi en cours..." : "Envoyer la demande"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}