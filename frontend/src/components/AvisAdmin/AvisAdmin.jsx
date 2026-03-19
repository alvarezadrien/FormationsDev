import { useEffect, useMemo, useState } from "react";
import "./AvisAdmin.css";

const API_BASE_URL = "http://localhost:8080";

export function AvisAdmin() {
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [avisToDelete, setAvisToDelete] = useState(null);

  const token = localStorage.getItem("token");

  const fetchAvis = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/avis`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Impossible de charger les avis");
      }

      const data = await response.json();
      setAvis(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvis();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        isDeleteModalOpen &&
        deleteLoadingId === null
      ) {
        closeDeleteModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleteModalOpen, deleteLoadingId]);

  const openDeleteModal = (item) => {
    setError("");
    setAvisToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleteLoadingId !== null) return;
    setIsDeleteModalOpen(false);
    setAvisToDelete(null);
  };

  const handleDeleteAvis = async () => {
    if (!avisToDelete?.id) return;

    try {
      setDeleteLoadingId(avisToDelete.id);
      setError("");

      const response = await fetch(`${API_BASE_URL}/avis/${avisToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Suppression impossible");
      }

      setAvis((prev) => prev.filter((item) => item.id !== avisToDelete.id));
      closeDeleteModal();
    } catch (err) {
      setError(err.message || "Une erreur est survenue lors de la suppression");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const avisFiltres = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return avis;

    return avis.filter((item) => {
      const nomComplet =
        `${item.prenom ?? ""} ${item.nom ?? ""}`.trim().toLowerCase();
      const email = (item.email ?? "").toLowerCase();
      const formation = (item.nom_formation ?? "").toLowerCase();
      const commentaire = (item.commentaire ?? "").toLowerCase();
      const note = String(item.note ?? "");

      return (
        nomComplet.includes(value) ||
        email.includes(value) ||
        formation.includes(value) ||
        commentaire.includes(value) ||
        note.includes(value)
      );
    });
  }, [avis, search]);

  const moyenneGlobale =
    avis.length > 0
      ? (
          avis.reduce((acc, item) => acc + Number(item.note || 0), 0) /
          avis.length
        ).toFixed(2)
      : "0.00";

  return (
    <>
      <section className="avis-admin">
        <div className="avis-admin__header">
          <div>
            <h2 className="avis-admin__title">Gestion des avis</h2>
            <p className="avis-admin__subtitle">
              Consulte tous les avis déposés par les utilisateurs et supprime
              ceux qui ne doivent plus apparaître.
            </p>
          </div>

          <div className="avis-admin__stats">
            <div className="avis-admin__stat">
              <span className="avis-admin__stat-label">Total avis</span>
              <strong>{avis.length}</strong>
            </div>

            <div className="avis-admin__stat">
              <span className="avis-admin__stat-label">Note moyenne</span>
              <strong>{moyenneGlobale}/5</strong>
            </div>
          </div>
        </div>

        <div className="avis-admin__toolbar">
          <input
            type="text"
            className="avis-admin__search"
            placeholder="Rechercher par utilisateur, email, formation, note ou commentaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button className="avis-admin__refresh" onClick={fetchAvis}>
            Actualiser
          </button>
        </div>

        {error && <div className="avis-admin__error">{error}</div>}

        {loading ? (
          <div className="avis-admin__loading">Chargement des avis...</div>
        ) : avisFiltres.length === 0 ? (
          <div className="avis-admin__empty">Aucun avis trouvé.</div>
        ) : (
          <div className="avis-admin__table-wrapper">
            <table className="avis-admin__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th>Formation</th>
                  <th>Note</th>
                  <th>Commentaire</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {avisFiltres.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>

                    <td>
                      {item.prenom} {item.nom}
                    </td>

                    <td>{item.email || "-"}</td>

                    <td>{item.nom_formation}</td>

                    <td>
                      <span className="avis-admin__note">
                        {"⭐".repeat(Number(item.note || 0))} ({item.note}/5)
                      </span>
                    </td>

                    <td className="avis-admin__commentaire">
                      {item.commentaire}
                    </td>

                    <td>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString("fr-FR")
                        : "-"}
                    </td>

                    <td>
                      <button
                        className="avis-admin__delete"
                        onClick={() => openDeleteModal(item)}
                        disabled={deleteLoadingId === item.id}
                      >
                        {deleteLoadingId === item.id
                          ? "Suppression..."
                          : "Supprimer"}
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
          className="avis-admin__modal-overlay"
          onClick={closeDeleteModal}
          role="presentation"
        >
          <div
            className="avis-admin__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="avis-delete-modal-title"
            aria-describedby="avis-delete-modal-description"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="avis-admin__modal-header">
              <span className="avis-admin__modal-badge">Confirmation</span>

              <h3
                className="avis-admin__modal-title"
                id="avis-delete-modal-title"
              >
                Supprimer cet avis ?
              </h3>

              <p
                className="avis-admin__modal-text"
                id="avis-delete-modal-description"
              >
                Vous êtes sur le point de supprimer l'avis de{" "}
                <strong>
                  {avisToDelete?.prenom} {avisToDelete?.nom}
                </strong>
                . Cette action est définitive.
              </p>
            </div>

            <div className="avis-admin__modal-details">
              <p>
                <strong>Email :</strong> {avisToDelete?.email || "-"}
              </p>
              <p>
                <strong>Formation :</strong>{" "}
                {avisToDelete?.nom_formation || "-"}
              </p>
              <p>
                <strong>Note :</strong> {avisToDelete?.note || 0}/5
              </p>
              <p>
                <strong>Commentaire :</strong>{" "}
                {avisToDelete?.commentaire || "Aucun commentaire"}
              </p>
            </div>

            <div className="avis-admin__modal-actions">
              <button
                type="button"
                className="avis-admin__modal-cancel"
                onClick={closeDeleteModal}
                disabled={deleteLoadingId !== null}
              >
                Annuler
              </button>

              <button
                type="button"
                className="avis-admin__modal-delete"
                onClick={handleDeleteAvis}
                disabled={deleteLoadingId !== null}
              >
                {deleteLoadingId !== null
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