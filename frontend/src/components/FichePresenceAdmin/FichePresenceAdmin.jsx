import { useEffect, useState } from "react";
import "./FichePresenceAdmin.css";

const API_BASE_URL = "http://localhost:8080";

export function FichesPresenceAdmin() {
  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchFiches();
  }, []);

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

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cette fiche de présence ?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setMessage("");
      setError("");

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
                      onClick={() => handleDelete(fiche.id)}
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
  );
}