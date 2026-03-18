import { useEffect, useState } from "react";
import "./FormAvis.css";

const API_URL = "http://localhost:8080";

export function FormAvis({ onAvisAdded }) {
  const [formations, setFormations] = useState([]);
  const [loadingFormations, setLoadingFormations] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  const [avisData, setAvisData] = useState({
    formation_id: "",
    note: "5",
    commentaire: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchFormations = async () => {
      try {
        setLoadingFormations(true);
        setErreur("");

        const res = await fetch(`${API_URL}/formations`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        let data = null;

        try {
          data = await res.json();
        } catch {
          throw new Error("Réponse JSON invalide lors du chargement des formations");
        }

        if (!res.ok) {
          throw new Error(data?.message || "Erreur lors du chargement des formations");
        }

        if (!Array.isArray(data)) {
          throw new Error("Format des formations invalide");
        }

        const formationsDisponibles = data.map((formation) => ({
          id: formation.id,
          nom: formation.nom ?? "Formation sans nom",
        }));

        setFormations(formationsDisponibles);
      } catch (err) {
        if (err.name === "AbortError") return;
        setErreur(err.message || "Erreur serveur");
      } finally {
        setLoadingFormations(false);
      }
    };

    fetchFormations();

    return () => controller.abort();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setAvisData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setAvisData({
      formation_id: "",
      note: "5",
      commentaire: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setErreur("");
      setMessage("");

      const storedUser = localStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;

      if (!parsedUser?.id) {
        throw new Error("Vous devez être connecté pour envoyer un avis");
      }

      if (!avisData.formation_id) {
        throw new Error("Veuillez sélectionner une formation");
      }

      if (!avisData.commentaire.trim()) {
        throw new Error("Veuillez écrire un commentaire");
      }

      const payload = {
        user_id: Number(parsedUser.id),
        formation_id: Number(avisData.formation_id),
        note: Number(avisData.note),
        commentaire: avisData.commentaire.trim(),
      };

      const res = await fetch(`${API_URL}/avis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data = {};

      try {
        data = await res.json();
      } catch {
        throw new Error("Réponse JSON invalide lors de l'envoi de l'avis");
      }

      if (!res.ok) {
        throw new Error(data?.message || "Impossible d'envoyer l'avis");
      }

      setMessage("Votre avis a bien été envoyé. Merci pour votre retour.");
      resetForm();

      if (typeof onAvisAdded === "function") {
        onAvisAdded();
      }
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'envoi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="review_form_box">
      <div className="review_form_header">
        <h3 className="review_form_title">Donner votre avis</h3>
        <p className="review_form_subtitle">
          Sélectionnez la formation suivie et partagez votre expérience.
        </p>
      </div>

      <form className="review_form" onSubmit={handleSubmit}>
        <div className="review_field">
          <label htmlFor="formation_id">Formation suivie</label>
          <select
            id="formation_id"
            name="formation_id"
            value={avisData.formation_id}
            onChange={handleChange}
            required
            disabled={loadingFormations || saving}
          >
            <option value="">
              {loadingFormations
                ? "Chargement des formations..."
                : "Sélectionner une formation"}
            </option>

            {formations.map((formation) => (
              <option key={formation.id} value={formation.id}>
                {formation.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="review_field">
          <label htmlFor="note">Note</label>
          <select
            id="note"
            name="note"
            value={avisData.note}
            onChange={handleChange}
            disabled={saving}
          >
            <option value="5">⭐⭐⭐⭐⭐ - Excellent</option>
            <option value="4">⭐⭐⭐⭐ - Très bien</option>
            <option value="3">⭐⭐⭐ - Correct</option>
            <option value="2">⭐⭐ - Moyen</option>
            <option value="1">⭐ - Mauvais</option>
          </select>
        </div>

        <div className="review_field">
          <label htmlFor="commentaire">Commentaire</label>
          <textarea
            id="commentaire"
            name="commentaire"
            rows="5"
            placeholder="Partagez votre expérience sur cette formation..."
            value={avisData.commentaire}
            onChange={handleChange}
            required
            disabled={saving}
          />
        </div>

        {message && <p className="review_feedback success">{message}</p>}
        {erreur && <p className="review_feedback error">{erreur}</p>}

        <div className="review_form_actions">
          <button
            className="review_submit_button"
            type="submit"
            disabled={saving || loadingFormations}
          >
            {saving ? "Envoi en cours..." : "Envoyer mon avis"}
          </button>
        </div>
      </form>
    </div>
  );
}