import { useEffect, useMemo, useState } from "react";
import {
  filterFormationsByQuery,
  formatFormationJours,
  getFormationCatalogStats,
} from "../../features/formations/utils/formationCatalog";

const API_URL = "http://localhost:8080";

export function FormationsCrees({ refreshKey, onEdit, onDeleted }) {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formationToDelete, setFormationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFormations = async () => {
    try {
      setLoading(true);
      setErreur("");

      const res = await fetch(`${API_URL}/formations`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || "Erreur lors du chargement des formations"
        );
      }

      setFormations(Array.isArray(data) ? data : []);
    } catch (err) {
      setErreur(err.message || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormations();
  }, [refreshKey]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isDeleteModalOpen && !isDeleting) {
        closeDeleteModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleteModalOpen, isDeleting]);

  const openDeleteModal = (formation) => {
    setErreur("");
    setMessage("");
    setFormationToDelete(formation);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
    setFormationToDelete(null);
  };

  const handleDelete = async () => {
    if (!formationToDelete?.id) return;

    try {
      setIsDeleting(true);
      setErreur("");
      setMessage("");

      const res = await fetch(`${API_URL}/formations/${formationToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message || "Impossible de supprimer la formation"
        );
      }

      setMessage("La formation a bien été supprimée.");

      if (onDeleted) {
        onDeleted(formationToDelete.id);
      }

      closeDeleteModal();
      await fetchFormations();
    } catch (err) {
      setErreur(err.message || "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredFormations = useMemo(() => {
    return filterFormationsByQuery(formations, search);
  }, [formations, search]);

  const stats = useMemo(() => {
    return getFormationCatalogStats(formations);
  }, [formations]);

  return (
    <>
      <section className="admin-list">
        <div className="admin-crm-toolbar">
          <div className="admin-crm-toolbar__content">
            <h2 className="admin-list__title">Liste des formations</h2>
            <p className="admin-list__text">
              Retrouve rapidement les formations, leur statut, leur formateur et
              leur remplaçant.
            </p>
          </div>

          <div className="admin-crm-toolbar__actions">
            <input
              type="text"
              className="admin-crm-search"
              placeholder="Rechercher une formation, un lieu, un formateur..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="admin-crm-kpis">
          <div className="admin-crm-kpi">
            <span>Total</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="admin-crm-kpi">
            <span>Actives</span>
            <strong>{stats.actif}</strong>
          </div>
          <div className="admin-crm-kpi is-alert">
            <span>Annulées</span>
            <strong>{stats.annule}</strong>
          </div>
        </div>

        {message && (
          <div className="admin-feedback admin-feedback--success">{message}</div>
        )}

        {erreur && (
          <div className="admin-feedback admin-feedback--error">{erreur}</div>
        )}

        {loading ? (
          <div className="admin-loading">Chargement des formations...</div>
        ) : formations.length === 0 ? (
          <div className="admin-empty">
            Aucune formation disponible pour le moment.
          </div>
        ) : filteredFormations.length === 0 ? (
          <div className="admin-empty">
            Aucune formation ne correspond à ta recherche.
          </div>
        ) : (
          <div className="admin-list__grid">
            {filteredFormations.map((formation) => {
              const badgeClass = `admin-badge admin-badge--${
                formation.statut || "actif"
              }`;

              const nomFormateur =
                formation.formateur_prenom || formation.formateur_nom
                  ? `${formation.formateur_prenom || ""} ${
                      formation.formateur_nom || ""
                    }`.trim()
                  : "Non renseigné";

              const nomRemplacant =
                formation.remplacant_prenom || formation.remplacant_nom
                  ? `${formation.remplacant_prenom || ""} ${
                      formation.remplacant_nom || ""
                    }`.trim()
                  : "Aucun remplaçant attribué";

              return (
                <article className="admin-card" key={formation.id}>
                  <div className="admin-card__header">
                    <div>
                      <span className="admin-card__eyebrow">
                        Formation #{formation.id}
                      </span>
                      <h3 className="admin-card__title">{formation.nom}</h3>
                    </div>

                    <span className={badgeClass}>{formation.statut || "actif"}</span>
                  </div>

                  <div className="admin-card__meta">
                    <p>
                      <strong>Formateur :</strong> {nomFormateur}
                    </p>
                    <p>
                      <strong>Email formateur :</strong>{" "}
                      {formation.formateur_email || "Non renseigné"}
                    </p>
                    <p>
                      <strong>Remplaçant :</strong> {nomRemplacant}
                    </p>
                    <p>
                      <strong>Email remplaçant :</strong>{" "}
                      {formation.remplacant_email || "Non renseigné"}
                    </p>
                    <p>
                      <strong>Lieu :</strong>{" "}
                      {formation.lieu || "Non renseigné"}
                    </p>
                    <p>
                      <strong>Participants :</strong>{" "}
                      {formation.nombre_participants ?? 0}
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
                      <strong>Jours :</strong>{" "}
                      {formatFormationJours(formation.jours)}
                    </p>
                    <p>
                      <strong>Type de journée :</strong>{" "}
                      {formation.type_journee || "Non renseigné"}
                    </p>
                  </div>

                  <p className="admin-card__description">
                    {formation.description || "Aucune description."}
                  </p>

                  <div className="admin-card__actions">
                    <button
                      className="admin-btn admin-btn--edit"
                      type="button"
                      onClick={() => onEdit && onEdit(formation)}
                    >
                      Modifier
                    </button>

                    <button
                      className="admin-btn admin-btn--delete"
                      type="button"
                      onClick={() => openDeleteModal(formation)}
                      disabled={
                        isDeleting && formationToDelete?.id === formation.id
                      }
                    >
                      {isDeleting && formationToDelete?.id === formation.id
                        ? "Suppression..."
                        : "Supprimer"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isDeleteModalOpen && (
        <div
          className="admin-modal-overlay"
          onClick={closeDeleteModal}
          role="presentation"
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="formation-delete-modal-title"
            aria-describedby="formation-delete-modal-description"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal__header">
              <span className="admin-modal__badge">Confirmation</span>

              <h3
                className="admin-modal__title"
                id="formation-delete-modal-title"
              >
                Supprimer cette formation ?
              </h3>

              <p
                className="admin-modal__text"
                id="formation-delete-modal-description"
              >
                Vous êtes sur le point de supprimer la formation{" "}
                <strong>{formationToDelete?.nom}</strong>. Cette action est
                définitive.
              </p>
            </div>

            <div className="admin-modal__details">
              <p>
                <strong>Nom :</strong>{" "}
                {formationToDelete?.nom || "Non renseigné"}
              </p>
              <p>
                <strong>Formateur :</strong>{" "}
                {formationToDelete?.formateur_prenom ||
                formationToDelete?.formateur_nom
                  ? `${formationToDelete?.formateur_prenom || ""} ${
                      formationToDelete?.formateur_nom || ""
                    }`.trim()
                  : "Non renseigné"}
              </p>
              <p>
                <strong>Email formateur :</strong>{" "}
                {formationToDelete?.formateur_email || "Non renseigné"}
              </p>
              <p>
                <strong>Remplaçant :</strong>{" "}
                {formationToDelete?.remplacant_prenom ||
                formationToDelete?.remplacant_nom
                  ? `${formationToDelete?.remplacant_prenom || ""} ${
                      formationToDelete?.remplacant_nom || ""
                    }`.trim()
                  : "Aucun remplaçant attribué"}
              </p>
              <p>
                <strong>Email remplaçant :</strong>{" "}
                {formationToDelete?.remplacant_email || "Non renseigné"}
              </p>
              <p>
                <strong>Lieu :</strong>{" "}
                {formationToDelete?.lieu || "Non renseigné"}
              </p>
              <p>
                <strong>Participants :</strong>{" "}
                {formationToDelete?.nombre_participants ?? 0}
              </p>
              <p>
                <strong>Date début :</strong>{" "}
                {formationToDelete?.date_debut || "Non renseignée"}
              </p>
              <p>
                <strong>Date fin :</strong>{" "}
                {formationToDelete?.date_fin || "Non renseignée"}
              </p>
              <p>
                <strong>Jours :</strong>{" "}
                {formatFormationJours(formationToDelete?.jours)}
              </p>
              <p>
                <strong>Type de journée :</strong>{" "}
                {formationToDelete?.type_journee || "Non renseigné"}
              </p>
              <p>
                <strong>Statut :</strong>{" "}
                {formationToDelete?.statut || "actif"}
              </p>
            </div>

            <div className="admin-modal__actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                Annuler
              </button>

              <button
                type="button"
                className="admin-btn admin-btn--delete"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
