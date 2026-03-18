import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:8080";

const initialForm = {
  nom: "",
  formateur: "",
  lieu: "",
  description: "",
  nombre_participants: 0,
  statut: "actif",
  date_debut: "",
  date_fin: "",
};

export function CreationFormations({
  formationEnEdition,
  onSaved,
  onCancelEdit,
}) {
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const isEditing = useMemo(
    () => formationEnEdition !== null,
    [formationEnEdition]
  );

  useEffect(() => {
    if (formationEnEdition) {
      setFormData({
        nom: formationEnEdition.nom || "",
        formateur: formationEnEdition.formateur || "",
        lieu: formationEnEdition.lieu || "",
        description: formationEnEdition.description || "",
        nombre_participants: formationEnEdition.nombre_participants ?? 0,
        statut: formationEnEdition.statut ?? "actif",
        date_debut: formationEnEdition.date_debut || "",
        date_fin: formationEnEdition.date_fin || "",
      });
      setErreur("");
      setMessage("");
    } else {
      setFormData(initialForm);
      setErreur("");
    }
  }, [formationEnEdition]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "nombre_participants" ? Number(value) : value,
    }));
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

    if (
      formData.date_debut &&
      formData.date_fin &&
      formData.date_fin < formData.date_debut
    ) {
      setErreur("La date de fin ne peut pas être avant la date de début.");
      return;
    }

    try {
      setSaving(true);
      setErreur("");
      setMessage("");

      const url = isEditing
        ? `${API_URL}/formations/${formationEnEdition.id}`
        : `${API_URL}/formations`;

      const method = isEditing ? "PUT" : "POST";

      const payload = {
        nom: formData.nom.trim(),
        formateur: formData.formateur.trim(),
        lieu: formData.lieu.trim(),
        description: formData.description.trim(),
        nombre_participants: Number(formData.nombre_participants),
        statut: formData.statut,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
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
        Remplis le formulaire puis enregistre. Cette page est séparée de
        l'accueil.
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
          <label className="admin-form__label" htmlFor="formateur">
            Formateur(s)
          </label>
          <input
            id="formateur"
            className="admin-form__input"
            type="text"
            name="formateur"
            value={formData.formateur}
            onChange={handleChange}
            placeholder="Ex: Marie Dupont, Jean Martin"
            required
          />
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
            disabled={saving}
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