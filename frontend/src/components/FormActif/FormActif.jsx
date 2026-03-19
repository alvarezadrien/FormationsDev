import { useEffect, useState } from "react";

const API_URL = "http://localhost:8080";

export function FormActif() {
  const [inscriptions, setInscriptions] = useState([]);
  const [loadingInscriptions, setLoadingInscriptions] = useState(true);
  const [messageInscriptions, setMessageInscriptions] = useState("");
  const [erreur, setErreur] = useState("");

  const fetchInscriptions = async () => {
    try {
      setLoadingInscriptions(true);
      setErreur("");

      const res = await fetch(`${API_URL}/inscriptions-formations`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || "Erreur lors du chargement des inscriptions"
        );
      }

      setInscriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      setErreur(err.message || "Erreur serveur");
    } finally {
      setLoadingInscriptions(false);
    }
  };

  useEffect(() => {
    fetchInscriptions();
  }, []);

  const handleDeleteInscription = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette inscription ?"
    );
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
        throw new Error(
          data?.message || "Impossible de supprimer l'inscription"
        );
      }

      setMessageInscriptions("L'inscription a bien été supprimée.");
      await fetchInscriptions();
    } catch (err) {
      setErreur(
        err.message || "Erreur lors de la suppression de l'inscription"
      );
    }
  };

  return (
    <section className="admin-list admin-list--inscriptions">
      <h2 className="admin-list__title">Inscriptions reçues</h2>
      <p className="admin-list__text">
        Consulte les coordonnées des personnes inscrites, leur diplôme et la
        formation choisie.
      </p>

      {erreur && (
        <div className="admin-feedback admin-feedback--error">{erreur}</div>
      )}

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
            <article
              className="admin-card admin-card--inscription"
              key={inscription.id}
            >
              <h3 className="admin-card__title">
                {inscription.prenom} {inscription.nom}
              </h3>

              <div className="admin-card__meta">
                <p>
                  <strong>Email :</strong>{" "}
                  {inscription.email || "Non renseigné"}
                </p>
                <p>
                  <strong>Téléphone :</strong>{" "}
                  {inscription.telephone || "Non renseigné"}
                </p>
                <p>
                  <strong>Diplôme :</strong>{" "}
                  {inscription.diplome || "Non renseigné"}
                </p>
                <p>
                  <strong>Formation :</strong>{" "}
                  {inscription.formation_nom ||
                    inscription.formation_id ||
                    "Non renseignée"}
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
  );
}