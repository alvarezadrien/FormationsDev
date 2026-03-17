import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import "./Dashboard.css";

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

export default function AdminFormationsPage() {
  const [formations, setFormations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingInscriptions, setLoadingInscriptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [messageInscriptions, setMessageInscriptions] = useState("");

  const isAdmin = localStorage.getItem("role") === "admin";
  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const fetchFormations = async () => {
    try {
      setLoading(true);
      setErreur("");

      const res = await fetch(`${API_URL}/formations`, {
        credentials: "include",
      });

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

  const fetchInscriptions = async () => {
    try {
      setLoadingInscriptions(true);
      setErreur("");

      const res = await fetch(`${API_URL}/inscriptions-formations`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Erreur lors du chargement des inscriptions");
      }

      setInscriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      setErreur(err.message || "Erreur serveur");
    } finally {
      setLoadingInscriptions(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchFormations();
      fetchInscriptions();
    }
  }, [isAdmin]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "nombre_participants" ? Number(value) : value,
    }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.date_debut && formData.date_fin && formData.date_fin < formData.date_debut) {
      setErreur("La date de fin ne peut pas être avant la date de début.");
      return;
    }

    try {
      setSaving(true);
      setErreur("");
      setMessage("");

      const url = isEditing
        ? `${API_URL}/formations/${editingId}`
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
        throw new Error(data?.message || "Impossible d'enregistrer la formation");
      }

      setMessage(
        isEditing
          ? "La formation a bien été modifiée."
          : "La formation a bien été créée."
      );

      resetForm();
      fetchFormations();
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (formation) => {
    setErreur("");
    setMessage("");
    setEditingId(formation.id);

    setFormData({
      nom: formation.nom || "",
      formateur: formation.formateur || "",
      lieu: formation.lieu || "",
      description: formation.description || "",
      nombre_participants: formation.nombre_participants ?? 0,
      statut: formation.statut ?? "actif",
      date_debut: formation.date_debut || "",
      date_fin: formation.date_fin || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirmation = window.confirm("Voulez-vous vraiment supprimer cette formation ?");
    if (!confirmation) return;

    try {
      setErreur("");
      setMessage("");

      const res = await fetch(`${API_URL}/formations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Impossible de supprimer la formation");
      }

      if (editingId === id) {
        resetForm();
      }

      setMessage("La formation a bien été supprimée.");
      fetchFormations();
      fetchInscriptions();
    } catch (err) {
      setErreur(err.message || "Erreur lors de la suppression");
    }
  };

  const handleDeleteInscription = async (id) => {
    const confirmation = window.confirm("Voulez-vous vraiment supprimer cette inscription ?");
    if (!confirmation) return;

    try {
      setErreur("");
      setMessageInscriptions("");

      const res = await fetch(`${API_URL}/inscriptions-formations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Impossible de supprimer l'inscription");
      }

      setMessageInscriptions("L'inscription a bien été supprimée.");
      fetchInscriptions();
    } catch (err) {
      setErreur(err.message || "Erreur lors de la suppression de l'inscription");
    }
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="admin-dashboard">
      <div className="admin-dashboard__header">
        <h1 className="admin-dashboard__title">Dashboard Admin Formations</h1>
        <p className="admin-dashboard__subtitle">
          Crée, modifie et supprime les formations, puis consulte les inscriptions envoyées.
        </p>
      </div>

      <div className="admin-dashboard__layout">
        <section className="admin-panel">
          <h2 className="admin-panel__title">
            {isEditing ? "Modifier une formation" : "Créer une nouvelle formation"}
          </h2>
          <p className="admin-panel__text">
            Remplis le formulaire puis enregistre. Cette page est séparée de l'accueil.
          </p>

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form__group">
              <label className="admin-form__label">Nom de la formation</label>
              <input
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
              <label className="admin-form__label">Formateur(s)</label>
              <input
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
                <label className="admin-form__label">Lieu</label>
                <input
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
                <label className="admin-form__label">Participants</label>
                <input
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
                <label className="admin-form__label">Date de début</label>
                <input
                  className="admin-form__input"
                  type="date"
                  name="date_debut"
                  value={formData.date_debut}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">Date de fin</label>
                <input
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
              <label className="admin-form__label">Statut</label>
              <select
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
              <label className="admin-form__label">Description</label>
              <textarea
                className="admin-form__textarea"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Décris la formation..."
                required
              />
            </div>

            {message && <div className="admin-feedback admin-feedback--success">{message}</div>}
            {erreur && <div className="admin-feedback admin-feedback--error">{erreur}</div>}

            <div className="admin-form__actions">
              <button className="admin-btn admin-btn--primary" type="submit" disabled={saving}>
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

        <div className="admin-dashboard__content">
          <section className="admin-list">
            <h2 className="admin-list__title">Liste des formations</h2>
            <p className="admin-list__text">
              Clique sur une carte pour modifier ou supprimer une formation existante.
            </p>

            {loading ? (
              <div className="admin-loading">Chargement des formations...</div>
            ) : formations.length === 0 ? (
              <div className="admin-empty">Aucune formation disponible pour le moment.</div>
            ) : (
              <div className="admin-list__grid">
                {formations.map((formation) => {
                  const badgeClass = `admin-badge admin-badge--${formation.statut || "actif"}`;
                  const formateurs = formation.formateur
                    ? formation.formateur.split(",").map((nom) => nom.trim())
                    : [];

                  return (
                    <article className="admin-card" key={formation.id}>
                      <h3 className="admin-card__title">{formation.nom}</h3>

                      <div className="admin-card__meta">
                        <p>
                          <strong>Formateur(s) :</strong>{" "}
                          {formateurs.join(", ") || "Non renseigné"}
                        </p>
                        <p>
                          <strong>Lieu :</strong> {formation.lieu}
                        </p>
                        <p>
                          <strong>Participants :</strong> {formation.nombre_participants ?? 0}
                        </p>
                        <p>
                          <strong>Date début :</strong>{" "}
                          {formation.date_debut || "Non renseignée"}
                        </p>
                        <p>
                          <strong>Date fin :</strong>{" "}
                          {formation.date_fin || "Non renseignée"}
                        </p>
                        <p>
                          <strong>Statut :</strong>{" "}
                          <span className={badgeClass}>{formation.statut || "actif"}</span>
                        </p>
                      </div>

                      <p className="admin-card__description">{formation.description}</p>

                      <div className="admin-card__actions">
                        <button
                          className="admin-btn admin-btn--edit"
                          type="button"
                          onClick={() => handleEdit(formation)}
                        >
                          Modifier
                        </button>

                        <button
                          className="admin-btn admin-btn--delete"
                          type="button"
                          onClick={() => handleDelete(formation.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="admin-list admin-list--inscriptions">
            <h2 className="admin-list__title">Inscriptions reçues</h2>
            <p className="admin-list__text">
              Consulte les coordonnées des personnes inscrites et la formation choisie.
            </p>

            {messageInscriptions && (
              <div className="admin-feedback admin-feedback--success">
                {messageInscriptions}
              </div>
            )}

            {loadingInscriptions ? (
              <div className="admin-loading">Chargement des inscriptions...</div>
            ) : inscriptions.length === 0 ? (
              <div className="admin-empty">Aucune inscription pour le moment.</div>
            ) : (
              <div className="admin-inscriptions__grid">
                {inscriptions.map((inscription) => (
                  <article className="admin-card admin-card--inscription" key={inscription.id}>
                    <h3 className="admin-card__title">
                      {inscription.prenom} {inscription.nom}
                    </h3>

                    <div className="admin-card__meta">
                      <p>
                        <strong>Email :</strong> {inscription.email || "Non renseigné"}
                      </p>
                      <p>
                        <strong>Téléphone :</strong> {inscription.telephone || "Non renseigné"}
                      </p>
                      <p>
                        <strong>Formation :</strong>{" "}
                        {inscription.formation_nom || inscription.formation_id || "Non renseignée"}
                      </p>
                      <p>
                        <strong>Date inscription :</strong>{" "}
                        {inscription.date_inscription || "Non renseignée"}
                      </p>
                    </div>

                    <p className="admin-card__description">
                      {inscription.message?.trim()
                        ? inscription.message
                        : "Aucun message laissé par l'utilisateur."}
                    </p>

                    <div className="admin-card__actions">
                      <button
                        className="admin-btn admin-btn--delete"
                        type="button"
                        onClick={() => handleDeleteInscription(inscription.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}