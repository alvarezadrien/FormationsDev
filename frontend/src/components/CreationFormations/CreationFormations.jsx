import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:8080";

const JOURS_OPTIONS = [
  { value: "lundi", label: "Lundi" },
  { value: "mardi", label: "Mardi" },
  { value: "mercredi", label: "Mercredi" },
  { value: "jeudi", label: "Jeudi" },
  { value: "vendredi", label: "Vendredi" },
];

const TYPE_JOURNEE_OPTIONS = [
  { value: "", label: "Sélectionner un type de journée" },
  { value: "journee_complete", label: "Journée complète" },
  { value: "demi_journee", label: "Demi-journée" },
  { value: "soir", label: "Soir" },
  { value: "cours_du_jour", label: "Cours du jour" },
];

const initialForm = {
  nom: "",
  formateur_id: "",
  lieu: "",
  description: "",
  nombre_participants: 0,
  statut: "actif",
  date_debut: "",
  date_fin: "",
  jours: [],
  type_journee: "",
};

export function CreationFormations({
  formationEnEdition,
  onSaved,
  onCancelEdit,
}) {
  const [formData, setFormData] = useState(initialForm);
  const [formateurs, setFormateurs] = useState([]);
  const [loadingFormateurs, setLoadingFormateurs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const isEditing = useMemo(
    () => formationEnEdition !== null,
    [formationEnEdition]
  );

  useEffect(() => {
    const fetchFormateurs = async () => {
      try {
        setLoadingFormateurs(true);
        setErreur("");

        const res = await fetch(`${API_URL}/users/formateurs`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.message || "Impossible de charger les formateurs"
          );
        }

        setFormateurs(Array.isArray(data?.formateurs) ? data.formateurs : []);
      } catch (err) {
        setErreur(err.message || "Erreur lors du chargement des formateurs");
      } finally {
        setLoadingFormateurs(false);
      }
    };

    fetchFormateurs();
  }, []);

  useEffect(() => {
    if (formationEnEdition) {
      let joursArray = [];

      if (Array.isArray(formationEnEdition.jours)) {
        joursArray = formationEnEdition.jours;
      } else if (
        typeof formationEnEdition.jours === "string" &&
        formationEnEdition.jours.trim() !== ""
      ) {
        joursArray = formationEnEdition.jours
          .split(",")
          .map((jour) => jour.trim())
          .filter(Boolean);
      }

      setFormData({
        nom: formationEnEdition.nom || "",
        formateur_id: formationEnEdition.formateur_id
          ? String(formationEnEdition.formateur_id)
          : "",
        lieu: formationEnEdition.lieu || "",
        description: formationEnEdition.description || "",
        nombre_participants: formationEnEdition.nombre_participants ?? 0,
        statut: formationEnEdition.statut ?? "actif",
        date_debut: formationEnEdition.date_debut || "",
        date_fin: formationEnEdition.date_fin || "",
        jours: joursArray,
        type_journee: formationEnEdition.type_journee || "",
      });
      setErreur("");
      setMessage("");
    } else {
      setFormData(initialForm);
      setErreur("");
      setMessage("");
    }
  }, [formationEnEdition]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "nombre_participants" ? Number(value) : value,
    }));
  };

  const handleJourChange = (jourValue) => {
    setFormData((prev) => {
      const dejaSelectionne = prev.jours.includes(jourValue);

      return {
        ...prev,
        jours: dejaSelectionne
          ? prev.jours.filter((jour) => jour !== jourValue)
          : [...prev.jours, jourValue],
      };
    });
  };

  const resetForm = () => {
    setFormData(initialForm);
    setErreur("");
    setMessage("");

    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErreur("");
    setMessage("");

    if (
      formData.date_debut &&
      formData.date_fin &&
      formData.date_fin < formData.date_debut
    ) {
      setErreur("La date de fin ne peut pas être avant la date de début.");
      return;
    }

    if (!formData.formateur_id) {
      setErreur("Veuillez sélectionner un formateur.");
      return;
    }

    if (!formData.jours || formData.jours.length === 0) {
      setErreur("Veuillez sélectionner au moins un jour.");
      return;
    }

    if (!formData.type_journee) {
      setErreur("Veuillez sélectionner un type de journée.");
      return;
    }

    try {
      setSaving(true);

      const url = isEditing
        ? `${API_URL}/formations/${formationEnEdition.id}`
        : `${API_URL}/formations`;

      const method = isEditing ? "PUT" : "POST";

      const payload = {
        nom: formData.nom.trim(),
        formateur_id: Number(formData.formateur_id),
        lieu: formData.lieu.trim(),
        description: formData.description.trim(),
        nombre_participants: Number(formData.nombre_participants),
        statut: formData.statut,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        jours: formData.jours,
        type_journee: formData.type_journee,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message || "Impossible d'enregistrer la formation"
        );
      }

      setMessage(
        isEditing
          ? "La formation a bien été modifiée."
          : "La formation a bien été créée."
      );

      setFormData(initialForm);

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-panel">
      <h2 className="admin-panel__title">
        {isEditing ? "Modifier une formation" : "Créer une nouvelle formation"}
      </h2>

      <p className="admin-panel__text">
        Remplis le formulaire puis enregistre. Le champ formateur récupère
        automatiquement les utilisateurs ayant le rôle formateur.
      </p>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="nom">
            Nom de la formation
          </label>
          <input
            id="nom"
            className="admin-form__input"
            type="text"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            placeholder="Ex: Développement Web"
            required
          />
        </div>

        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="formateur_id">
            Formateur
          </label>
          <select
            id="formateur_id"
            className="admin-form__select"
            name="formateur_id"
            value={formData.formateur_id}
            onChange={handleChange}
            required
            disabled={loadingFormateurs}
          >
            <option value="">
              {loadingFormateurs
                ? "Chargement des formateurs..."
                : "Sélectionner un formateur"}
            </option>

            {formateurs.map((formateur) => (
              <option key={formateur.id} value={formateur.id}>
                {formateur.prenom} {formateur.nom} - {formateur.email}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-form__row">
          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="lieu">
              Lieu
            </label>
            <input
              id="lieu"
              className="admin-form__input"
              type="text"
              name="lieu"
              value={formData.lieu}
              onChange={handleChange}
              placeholder="Ex: Bruxelles"
              required
            />
          </div>

          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="nombre_participants">
              Participants
            </label>
            <input
              id="nombre_participants"
              className="admin-form__input"
              type="number"
              name="nombre_participants"
              value={formData.nombre_participants}
              onChange={handleChange}
              min="0"
              required
            />
          </div>
        </div>

        <div className="admin-form__row">
          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="date_debut">
              Date de début
            </label>
            <input
              id="date_debut"
              className="admin-form__input"
              type="date"
              name="date_debut"
              value={formData.date_debut}
              onChange={handleChange}
              required
            />
          </div>

          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="date_fin">
              Date de fin
            </label>
            <input
              id="date_fin"
              className="admin-form__input"
              type="date"
              name="date_fin"
              value={formData.date_fin}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="admin-form__group">
          <label className="admin-form__label">Jours de la formation</label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "10px",
              marginTop: "8px",
            }}
          >
            {JOURS_OPTIONS.map((jour) => (
              <label
                key={jour.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.jours.includes(jour.value)}
                  onChange={() => handleJourChange(jour.value)}
                />
                <span>{jour.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="type_journee">
            Type de journée
          </label>
          <select
            id="type_journee"
            className="admin-form__select"
            name="type_journee"
            value={formData.type_journee}
            onChange={handleChange}
            required
          >
            {TYPE_JOURNEE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="statut">
            Statut
          </label>
          <select
            id="statut"
            className="admin-form__select"
            name="statut"
            value={formData.statut}
            onChange={handleChange}
          >
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="annule">Annulé</option>
          </select>
        </div>

        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className="admin-form__textarea"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Décris la formation..."
            required
          />
        </div>

        {message && (
          <div className="admin-feedback admin-feedback--success">{message}</div>
        )}

        {erreur && (
          <div className="admin-feedback admin-feedback--error">{erreur}</div>
        )}

        <div className="admin-form__actions">
          <button
            className="admin-btn admin-btn--primary"
            type="submit"
            disabled={saving || loadingFormateurs}
          >
            {saving
              ? "Enregistrement..."
              : isEditing
              ? "Mettre à jour"
              : "Créer la formation"}
          </button>

          {isEditing && (
            <button
              className="admin-btn admin-btn--secondary"
              type="button"
              onClick={resetForm}
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </section>
  );
}