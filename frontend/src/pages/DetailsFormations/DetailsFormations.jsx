import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./DetailsFormations.css";

export function DetailsFormations() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formation, setFormation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  const API_URL = "http://localhost:8080";

  useEffect(() => {
    const fetchFormation = async () => {
      try {
        setLoading(true);
        setErreur("");

        const res = await fetch(`${API_URL}/formations/${id}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        let data = null;

        try {
          data = await res.json();
        } catch {
          throw new Error("Réponse JSON invalide du serveur");
        }

        if (!res.ok) {
          throw new Error(data?.message || "Erreur API");
        }

        setFormation({
          id: data.id,
          nom_formation: data.nom ?? "Formation sans nom",
          formateurs: data.formateur
            ? data.formateur.split(",").map((n) => n.trim())
            : [],
          lieu: data.lieu ?? "",
          description: data.description ?? "",
          nombre_participants: Number(data.nombre_participants ?? 0),
          statut: String(data.statut ?? "actif").toLowerCase(),
          date_debut: data.date_debut || "",
          date_fin: data.date_fin || "",
        });
      } catch (err) {
        setErreur(err.message || "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    };

    fetchFormation();
  }, [id]);

  if (loading) {
    return (
      <section className="details_page">
        <p className="state_message">Chargement...</p>
      </section>
    );
  }

  if (erreur) {
    return (
      <section className="details_page">
        <p className="state_message error">Erreur : {erreur}</p>
      </section>
    );
  }

  if (!formation) {
    return (
      <section className="details_page">
        <p className="state_message">Formation introuvable</p>
      </section>
    );
  }

  const inscriptionActive =
    formation.statut === "actif" && formation.nombre_participants > 0;

  const handleInscription = () => {
    if (!inscriptionActive) return;

    navigate(`/inscription-formations?formation=${formation.id}`);
  };

  return (
    <section className="details_page">
      <button className="back_button" onClick={() => navigate(-1)}>
        ← Retour
      </button>

      <div className="details_hero">
        <div className="details_hero_overlay"></div>

        <div className="details_hero_content">
          <span className={`status_badge ${formation.statut}`}>
            {formation.statut}
          </span>

          <h1 className="details_title">{formation.nom_formation}</h1>

          <p className="details_subtitle">
            Développez vos compétences avec une formation conçue pour allier
            expertise, accompagnement et montée en compétence concrète.
          </p>
        </div>
      </div>

      <div className="details_layout">
        <div className="details_content">
          <div className="content_block">
            <h2 className="section_title">Présentation</h2>

            <p className="description_text">
              {formation.description || "Aucune description disponible."}
            </p>
          </div>

          <div className="content_block">
            <h2 className="section_title">Informations essentielles</h2>

            <div className="info_grid">
              <div className="info_card">
                <span className="info_label">Formateur(s)</span>
                <span className="info_data">
                  {formation.formateurs.length > 0
                    ? formation.formateurs.join(", ")
                    : "Non renseigné"}
                </span>
              </div>

              <div className="info_card">
                <span className="info_label">Lieu</span>
                <span className="info_data">
                  {formation.lieu || "Non renseigné"}
                </span>
              </div>

              <div className="info_card">
                <span className="info_label">Places disponibles</span>
                <span className="info_data">
                  {formation.nombre_participants}
                </span>
              </div>

              <div className="info_card">
                <span className="info_label">Date de début</span>
                <span className="info_data">
                  {formation.date_debut || "Non renseignée"}
                </span>
              </div>

              <div className="info_card">
                <span className="info_label">Date de fin</span>
                <span className="info_data">
                  {formation.date_fin || "Non renseignée"}
                </span>
              </div>

              <div className="info_card">
                <span className="info_label">Statut</span>
                <span className={`info_data status_text ${formation.statut}`}>
                  {formation.statut}
                </span>
              </div>
            </div>
          </div>
        </div>

        <aside className="details_sidebar">
          <div className="cta_box">
            <h3 className="cta_title">Prêt à rejoindre cette formation ?</h3>

            <p className="cta_text">
              Réservez votre place dès maintenant et profitez d’un apprentissage
              structuré, moderne et orienté résultats.
            </p>

            <button
              className={`cta_button ${!inscriptionActive ? "disabled" : ""}`}
              disabled={!inscriptionActive}
              onClick={handleInscription}
            >
              {!inscriptionActive
                ? formation.statut !== "actif"
                  ? "Indisponible"
                  : formation.nombre_participants === 0
                  ? "Complet"
                  : "Indisponible"
                : "S'inscrire maintenant"}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}