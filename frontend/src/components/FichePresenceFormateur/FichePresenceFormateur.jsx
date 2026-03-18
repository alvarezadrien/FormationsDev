import { useEffect, useState } from "react";
import "./FichePresenceFormateur.css";

const API_BASE_URL = "http://localhost:8080";

export function FichePresenceFormateur() {
  const [formations, setFormations] = useState([]);
  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    formation_id: "",
    titre_seance: "",
    date_presence: "",
    heure_debut: "",
    heure_fin: "",
    remarques: "",
  });

  useEffect(() => {
    fetchFormations();
    fetchMesFiches();
  }, []);

  const fetchFormations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/formations`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      setFormations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMesFiches = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/mes-fiches-presence`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de charger vos fiches");
      }

      setFiches(data?.fiches || []);
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

  const resetForm = () => {
    setFormData({
      formation_id: "",
      titre_seance: "",
      date_presence: "",
      heure_debut: "",
      heure_fin: "",
      remarques: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (
      !formData.formation_id ||
      !formData.titre_seance.trim() ||
      !formData.date_presence ||
      !formData.heure_debut ||
      !formData.heure_fin
    ) {
      setError("Tous les champs obligatoires doivent être remplis");
      return;
    }

    if (formData.heure_fin <= formData.heure_debut) {
      setError("L'heure de fin doit être supérieure à l'heure de début");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_BASE_URL}/fiches-presence`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formation_id: Number(formData.formation_id),
          titre_seance: formData.titre_seance.trim(),
          date_presence: formData.date_presence,
          heure_debut: formData.heure_debut,
          heure_fin: formData.heure_fin,
          remarques: formData.remarques.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de créer la fiche");
      }

      setMessage(data?.message || "Fiche créée avec succès");
      resetForm();
      fetchMesFiches();
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cette fiche de présence ?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");
      setMessage("");

      const response = await fetch(`${API_BASE_URL}/fiches-presence/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Suppression impossible");
      }

      setFiches((prev) => prev.filter((item) => item.id !== id));
      setMessage(data?.message || "Fiche supprimée avec succès");
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fiche-formateur">
      <div className="fiche-formateur__block">
        <h3 className="fiche-formateur__title">Créer une fiche de présence</h3>

        {message && <div className="fiche-formateur__message">{message}</div>}
        {error && <div className="fiche-formateur__error">{error}</div>}

        <form className="fiche-formateur__form" onSubmit={handleSubmit}>
          <div className="fiche-formateur__grid">
            <div className="fiche-formateur__field">
              <label>Formation</label>
              <select
                name="formation_id"
                value={formData.formation_id}
                onChange={handleChange}
              >
                <option value="">Sélectionner une formation</option>
                {formations.map((formation) => (
                  <option key={formation.id} value={formation.id}>
                    {formation.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="fiche-formateur__field">
              <label>Titre de séance</label>
              <input
                type="text"
                name="titre_seance"
                value={formData.titre_seance}
                onChange={handleChange}
                placeholder="Ex : Initiation React"
              />
            </div>

            <div className="fiche-formateur__field">
              <label>Date</label>
              <input
                type="date"
                name="date_presence"
                value={formData.date_presence}
                onChange={handleChange}
              />
            </div>

            <div className="fiche-formateur__field">
              <label>Heure début</label>
              <input
                type="time"
                name="heure_debut"
                value={formData.heure_debut}
                onChange={handleChange}
              />
            </div>

            <div className="fiche-formateur__field">
              <label>Heure fin</label>
              <input
                type="time"
                name="heure_fin"
                value={formData.heure_fin}
                onChange={handleChange}
              />
            </div>

            <div className="fiche-formateur__field fiche-formateur__field--full">
              <label>Remarques</label>
              <textarea
                name="remarques"
                value={formData.remarques}
                onChange={handleChange}
                placeholder="Observations, participants présents, notes..."
                rows="4"
              />
            </div>
          </div>

          <div className="fiche-formateur__actions">
            <button type="submit" disabled={saving}>
              {saving ? "Création..." : "Créer la fiche"}
            </button>
          </div>
        </form>
      </div>

      <div className="fiche-formateur__block">
        <h3 className="fiche-formateur__title">Mes fiches de présence</h3>

        {loading ? (
          <div className="fiche-formateur__empty">Chargement...</div>
        ) : fiches.length === 0 ? (
          <div className="fiche-formateur__empty">
            Aucune fiche de présence enregistrée.
          </div>
        ) : (
          <div className="fiche-formateur__list">
            {fiches.map((fiche) => (
              <div className="fiche-formateur__card" key={fiche.id}>
                <div className="fiche-formateur__card-head">
                  <div>
                    <h4>{fiche.titre_seance}</h4>
                    <p>{fiche.nom_formation}</p>
                  </div>

                  <button
                    className="fiche-formateur__delete"
                    onClick={() => handleDelete(fiche.id)}
                    disabled={deletingId === fiche.id}
                  >
                    {deletingId === fiche.id ? "Suppression..." : "Supprimer"}
                  </button>
                </div>

                <div className="fiche-formateur__meta">
                  <span>Date : {fiche.date_presence}</span>
                  <span>
                    Horaire : {fiche.heure_debut} - {fiche.heure_fin}
                  </span>
                </div>

                <p className="fiche-formateur__remarques">
                  {fiche.remarques || "Aucune remarque"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}