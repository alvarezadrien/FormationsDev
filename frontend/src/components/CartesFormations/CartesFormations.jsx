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
    const fetchFormations = async () => {
      try {
        const res = await fetch(`${API_URL}/formations`);
        const data = await res.json();

        if (!res.ok) throw new Error("Erreur API");

        setFormations(
          data.map((f) => ({
            id: f.id,
            nom_formation: f.nom,
            formateurs: f.formateur
              ? f.formateur.split(",").map((n) => n.trim())
              : [],
            lieu: f.lieu,
            description: f.description,
            nombre_participants: f.nombre_participants ?? 0,
            statut: f.statut ?? "actif",
            date_debut: f.date_debut || "",
            date_fin: f.date_fin || "",
          }))
        );
      } catch (err) {
        setErreur(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFormations();
  }, []);

  if (loading) return <p className="etat_message">Chargement...</p>;
  if (erreur) return <p className="etat_message erreur">Erreur : {erreur}</p>;

  return (
    <section className="section_formations">
      <h2 className="titre_formations">Nos formations</h2>

      <div className="container_cartes_formations">
        {formations.map((formation) => {
          const inscriptionActive =
            formation.statut === "actif" &&
            formation.nombre_participants > 0;

          return (
            <article
              className="carte_formation"
              key={formation.id}
              onClick={() => navigate(`/details-formations/${formation.id}`)}
            >
              <div className="top_carte">
                <span className={`badge_statut ${formation.statut}`}>
                  {formation.statut}
                </span>
              </div>

              <h3 className="nom_formation">{formation.nom_formation}</h3>

              <p className="description_formation">
                {formation.description}
              </p>

              <div className="infos_formation">
                <p>
                  <strong>Formateur(s) :</strong>{" "}
                  {formation.formateurs.length > 0
                    ? formation.formateurs.join(", ")
                    : "Non renseigné"}
                </p>

                <p>
                  <strong>Lieu :</strong> {formation.lieu || "Non renseigné"}
                </p>

                <p>
                  <strong>Places :</strong> {formation.nombre_participants}
                </p>

                <p>
                  <strong>Date de début :</strong>{" "}
                  {formation.date_debut || "Non renseignée"}
                </p>

                <p>
                  <strong>Date de fin :</strong>{" "}
                  {formation.date_fin || "Non renseignée"}
                </p>
              </div>

              <div className="actions_carte">
                <button
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
        })}
      </div>
    </section>
  );
}