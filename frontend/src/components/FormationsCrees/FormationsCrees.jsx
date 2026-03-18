import { useEffect, useState } from "react";

const API_URL = "http://localhost:8080";

export function FormationsCrees({ refreshKey, onEdit, onDeleted }) {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

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

  const handleDelete = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette formation ?"
    );

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
        throw new Error(
          data?.message || "Impossible de supprimer la formation"
        );
      }

      setMessage("La formation a bien été supprimée.");

      if (onDeleted) {
        onDeleted(id);
      }

      await fetchFormations();
    } catch (err) {
      setErreur(err.message || "Erreur lors de la suppression");
    }
  };

  return (
    <section className="admin-list">
      <h2 className="admin-list__title">Liste des formations</h2>
      <p className="admin-list__text">
        Clique sur une carte pour modifier ou supprimer une formation
        existante.
      </p>

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
      ) : (
        <div className="admin-list__grid">
          {formations.map((formation) => {
            const badgeClass = `admin-badge admin-badge--${
              formation.statut || "actif"
            }`;

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
                    <strong>Lieu :</strong> {formation.lieu || "Non renseigné"}
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
                    <strong>Statut :</strong>{" "}
                    <span className={badgeClass}>
                      {formation.statut || "actif"}
                    </span>
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
  );
}