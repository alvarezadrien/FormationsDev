import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CartesFormations.css";

export function CartesFormations() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  const API_URL = "http://localhost:8080";
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    const fetchFormations = async () => {
      try {
        setLoading(true);
        setErreur("");

        const res = await fetch(`${API_URL}/formations`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        let data = null;

        try {
          data = await res.json();
        } catch {
          throw new Error("Réponse JSON invalide du serveur");
        }

        if (!res.ok) {
          throw new Error(
            data?.message || "Erreur lors du chargement des formations"
          );
        }

        if (!Array.isArray(data)) {
          throw new Error("Format de données invalide : tableau attendu");
        }

        const formattedData = data.map((f) => ({
          id: f.id,
          nom_formation: f.nom ?? "Formation sans nom",
          lieu: f.lieu ?? "",
          description: f.description ?? "",
          nombre_participants: Number(f.nombre_participants ?? 0),
          statut: String(f.statut ?? "actif").toLowerCase(),
          date_debut: f.date_debut ?? "",
          date_fin: f.date_fin ?? "",
        }));

        setFormations(formattedData);
      } catch (err) {
        if (err.name === "AbortError") return;

        setErreur(err.message || "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    };

    fetchFormations();

    return () => {
      controller.abort();
    };
  }, []);

  const formatDate = (date) => {
    if (!date) return "Non renseignée";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <section className="section_formations">
        <p className="etat_message">Chargement des formations...</p>
      </section>
    );
  }

  if (erreur) {
    return (
      <section className="section_formations">
        <p className="etat_message erreur">Erreur : {erreur}</p>
      </section>
    );
  }

  return (
    <section className="section_formations" id="formations">
      <div className="formations_entete">
        <span className="formations_badge">Nos formations</span>
        <h2 className="titre_formations">
          Choisissez la formation qui vous correspond
        </h2>
        <p className="texte_formations">
          Des formations modernes, accessibles et conçues pour vous aider à
          évoluer rapidement.
        </p>
      </div>

      <div className="container_cartes_formations">
        {formations.length === 0 ? (
          <p className="etat_message">Aucune formation disponible pour le moment.</p>
        ) : (
          formations.map((formation) => {
            const inscriptionActive =
              formation.statut === "actif" &&
              formation.nombre_participants > 0;

            return (
              <article
                className="carte_formation"
                key={formation.id}
                onClick={() => navigate(`/details-formations/${formation.id}`)}
              >
                <div className="carte_top">
                  <span className={`badge_statut ${formation.statut}`}>
                    {formation.statut}
                  </span>

                  <span className="badge_places">
                    {formation.nombre_participants} place
                    {formation.nombre_participants > 1 ? "s" : ""}
                  </span>
                </div>

                <h3 className="nom_formation">{formation.nom_formation}</h3>

                <p className="description_formation">
                  {formation.description || "Aucune description disponible."}
                </p>

                <div className="meta_formation">
                  <div className="meta_item">
                    <span className="meta_label">Lieu</span>
                    <span className="meta_value">
                      {formation.lieu || "Non renseigné"}
                    </span>
                  </div>

                  <div className="meta_row">
                    <div className="meta_item small">
                      <span className="meta_label">Début</span>
                      <span className="meta_value">
                        {formatDate(formation.date_debut)}
                      </span>
                    </div>

                    <div className="meta_item small">
                      <span className="meta_label">Fin</span>
                      <span className="meta_value">
                        {formatDate(formation.date_fin)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="actions_carte">
                  <button
                    type="button"
                    className={`btn_inscription ${
                      !inscriptionActive ? "disabled" : ""
                    }`}
                    disabled={!inscriptionActive}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (inscriptionActive) {
                        navigate("/inscription-formations");
                      }
                    }}
                  >
                    {!inscriptionActive
                      ? formation.statut !== "actif"
                        ? "Indisponible"
                        : formation.nombre_participants === 0
                        ? "Complet"
                        : "Indisponible"
                      : "S'inscrire"}
                  </button>

                  <button
                    type="button"
                    className="btn_details"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/details-formations/${formation.id}`);
                    }}
                  >
                    Détails
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}