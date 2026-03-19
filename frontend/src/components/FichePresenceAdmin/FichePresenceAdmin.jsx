import { useEffect, useState } from "react";
import "./FichePresenceAdmin.css";

const API_BASE_URL = "http://localhost:8080";

export function FichesPresenceAdmin() {
  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ficheToDelete, setFicheToDelete] = useState(null);

  useEffect(() => {
    fetchFiches();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        isDeleteModalOpen &&
        deletingId === null
      ) {
        closeDeleteModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleteModalOpen, deletingId]);

  const fetchFiches = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/fiches-presence`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de charger les fiches");
      }

      setFiches(data?.fiches || []);
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (fiche) => {
    setMessage("");
    setError("");
    setFicheToDelete(fiche);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deletingId !== null) return;
    setIsDeleteModalOpen(false);
    setFicheToDelete(null);
  };

  const handleDelete = async () => {
    if (!ficheToDelete?.id) return;

    try {
      setDeletingId(ficheToDelete.id);
      setMessage("");
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/fiches-presence/${ficheToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Suppression impossible");
      }

      setFiches((prev) => prev.filter((item) => item.id !== ficheToDelete.id));
      setMessage(data?.message || "Fiche supprimée avec succès");
      closeDeleteModal();
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <section className="fiches-admin">
        <div className="fiches-admin__header">
          <h2 className="fiches-admin__title">Fiches de présence</h2>
          <button className="fiches-admin__refresh" onClick={fetchFiches}>
            Actualiser
          </button>
        </div>

        {message && <div className="fiches-admin__message">{message}</div>}
        {error && <div className="fiches-admin__error">{error}</div>}

        {loading ? (
          <div className="fiches-admin__empty">Chargement...</div>
        ) : fiches.length === 0 ? (
          <div className="fiches-admin__empty">Aucune fiche trouvée.</div>
        ) : (
          <div className="fiches-admin__table-wrapper">
            <table className="fiches-admin__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Formation</th>
                  <th>Formateur</th>
                  <th>Email</th>
                  <th>Séance</th>
                  <th>Date</th>
                  <th>Heures</th>
                  <th>Remarques</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {fiches.map((fiche) => (
                  <tr key={fiche.id}>
                    <td>#{fiche.id}</td>
                    <td>{fiche.nom_formation}</td>
                    <td>
                      {fiche.prenom_formateur} {fiche.nom_formateur}
                    </td>
                    <td>{fiche.email_formateur}</td>
                    <td>{fiche.titre_seance}</td>
                    <td>{fiche.date_presence}</td>
                    <td>
                      {fiche.heure_debut} - {fiche.heure_fin}
                    </td>
                    <td>{fiche.remarques || "-"}</td>
                    <td>
                      <button
                        className="fiches-admin__delete"
                        onClick={() => openDeleteModal(fiche)}
                        disabled={deletingId === fiche.id}
                      >
                        {deletingId === fiche.id ? "Suppression..." : "Supprimer"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isDeleteModalOpen && (
        <div
          className="fiches-admin__modal-overlay"
          onClick={closeDeleteModal}
          role="presentation"
        >
          <div
            className="fiches-admin__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fiches-delete-modal-title"
            aria-describedby="fiches-delete-modal-description"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fiches-admin__modal-header">
              <span className="fiches-admin__modal-badge">Confirmation</span>

              <h3
                className="fiches-admin__modal-title"
                id="fiches-delete-modal-title"
              >
                Supprimer cette fiche de présence ?
              </h3>

              <p
                className="fiches-admin__modal-text"
                id="fiches-delete-modal-description"
              >
                Vous êtes sur le point de supprimer cette fiche de présence.
                Cette action est définitive.
              </p>
            </div>

            <div className="fiches-admin__modal-details">
              <p>
                <strong>Formation :</strong> {ficheToDelete?.nom_formation || "-"}
              </p>
              <p>
                <strong>Formateur :</strong>{" "}
                {ficheToDelete?.prenom_formateur || ""}{" "}
                {ficheToDelete?.nom_formateur || ""}
              </p>
              <p>
                <strong>Email :</strong> {ficheToDelete?.email_formateur || "-"}
              </p>
              <p>
                <strong>Séance :</strong> {ficheToDelete?.titre_seance || "-"}
              </p>
              <p>
                <strong>Date :</strong> {ficheToDelete?.date_presence || "-"}
              </p>
              <p>
                <strong>Heures :</strong> {ficheToDelete?.heure_debut || "-"} -{" "}
                {ficheToDelete?.heure_fin || "-"}
              </p>
              <p>
                <strong>Remarques :</strong> {ficheToDelete?.remarques || "-"}
              </p>
            </div>

            <div className="fiches-admin__modal-actions">
              <button
                type="button"
                className="fiches-admin__modal-cancel"
                onClick={closeDeleteModal}
                disabled={deletingId !== null}
              >
                Annuler
              </button>

              <button
                type="button"
                className="fiches-admin__modal-delete"
                onClick={handleDelete}
                disabled={deletingId !== null}
              >
                {deletingId !== null
                  ? "Suppression..."
                  : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}