import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./BioFormateur.css";

const API_URL = "http://localhost:8080";

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toBoolean(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function BioFormateur() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formateur, setFormateur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const fetchFormateur = async () => {
      try {
        setLoading(true);
        setErreur("");

        const res = await fetch(`${API_URL}/formateurs/${id}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        let responseData = null;

        try {
          responseData = await res.json();
        } catch {
          throw new Error("Réponse JSON invalide du serveur");
        }

        if (!res.ok) {
          throw new Error(
            responseData?.message || "Erreur lors du chargement du formateur"
          );
        }

        const data = responseData?.data;

        if (!data) {
          throw new Error("Aucune donnée formateur reçue");
        }

        const nom = data.nom ?? "";
        const prenom = data.prenom ?? "";
        const nomComplet =
          data.nom_complet?.trim() || `${prenom} ${nom}`.trim() || "Nom non renseigné";

        setFormateur({
          id: data.id,
          nom,
          prenom,
          nom_complet: nomComplet,
          poste: data.poste?.trim() || "Formateur",
          specialite: data.specialite?.trim() || "",
          bio: data.bio?.trim() || "",
          experience: toArray(data.experience),
          competences: toArray(data.competences),
          formations: toArray(data.formations),
          email: data.email?.trim() || "",
          telephone: data.telephone?.trim() || "",
          travaille_samedi: toBoolean(data.travaille_samedi),
          est_remplacant: toBoolean(data.est_remplacant),
          est_co_animation: toBoolean(data.est_co_animation),
        });
      } catch (err) {
        setErreur(err.message || "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    };

    fetchFormateur();
  }, [id]);

  if (loading) {
    return (
      <section className="trainer_page">
        <p className="state_message">Chargement...</p>
      </section>
    );
  }

  if (erreur) {
    return (
      <section className="trainer_page">
        <p className="state_message error">Erreur : {erreur}</p>
      </section>
    );
  }

  if (!formateur) {
    return (
      <section className="trainer_page">
        <p className="state_message">Formateur introuvable</p>
      </section>
    );
  }

  const initiales = `${formateur.prenom?.[0] || ""}${formateur.nom?.[0] || ""}`.toUpperCase();

  return (
    <section className="trainer_page">
      <div className="trainer_wrapper">
        <button className="back_button" onClick={() => navigate(-1)}>
          ← Retour
        </button>

        <div className="trainer_hero">
          <div className="trainer_hero_overlay"></div>

          <div className="trainer_hero_content">
            <span className="trainer_badge">Formateur expert</span>
            <h1 className="trainer_title">{formateur.nom_complet}</h1>
            <p className="trainer_role">{formateur.poste}</p>
            <p className="trainer_intro">
              {formateur.specialite || "Aucune spécialité renseignée."}
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "14px",
              }}
            >
              {formateur.est_remplacant && (
                <span className="trainer_tag">Remplaçant</span>
              )}

              {formateur.travaille_samedi && (
                <span className="trainer_tag">Disponible le samedi</span>
              )}

              {formateur.est_co_animation && (
                <span className="trainer_tag">Co-animation</span>
              )}
            </div>
          </div>
        </div>

        <div className="trainer_layout">
          <aside className="trainer_sidebar">
            <div className="trainer_profile_card">
              <div className="trainer_avatar">{initiales || "FR"}</div>

              <h2 className="trainer_name">{formateur.nom_complet}</h2>
              <p className="trainer_job">{formateur.poste}</p>

              <div className="trainer_contact_box">
                <p className="trainer_contact_item">
                  <strong>Email :</strong> {formateur.email || "Non renseigné"}
                </p>
                <p className="trainer_contact_item">
                  <strong>Téléphone :</strong>{" "}
                  {formateur.telephone || "Non renseigné"}
                </p>
                <p className="trainer_contact_item">
                  <strong>Remplaçant :</strong>{" "}
                  {formateur.est_remplacant ? "Oui" : "Non"}
                </p>
                <p className="trainer_contact_item">
                  <strong>Disponible le samedi :</strong>{" "}
                  {formateur.travaille_samedi ? "Oui" : "Non"}
                </p>
                <p className="trainer_contact_item">
                  <strong>Co-animation :</strong>{" "}
                  {formateur.est_co_animation ? "Oui" : "Non"}
                </p>
              </div>
            </div>
          </aside>

          <div className="trainer_content">
            <div className="trainer_block">
              <h2 className="trainer_section_title">Biographie</h2>
              <p className="trainer_text">
                {formateur.bio || "Aucune biographie disponible."}
              </p>
            </div>

            <div className="trainer_block">
              <h2 className="trainer_section_title">Expérience</h2>
              <div className="trainer_list">
                {formateur.experience.length > 0 ? (
                  formateur.experience.map((item, index) => (
                    <div className="trainer_list_item" key={index}>
                      {item}
                    </div>
                  ))
                ) : (
                  <p className="trainer_text">Aucune expérience renseignée.</p>
                )}
              </div>
            </div>

            <div className="trainer_block">
              <h2 className="trainer_section_title">Compétences</h2>
              <div className="trainer_tags">
                {formateur.competences.length > 0 ? (
                  formateur.competences.map((item, index) => (
                    <span className="trainer_tag" key={index}>
                      {item}
                    </span>
                  ))
                ) : (
                  <p className="trainer_text">Aucune compétence renseignée.</p>
                )}
              </div>
            </div>

            <div className="trainer_block">
              <h2 className="trainer_section_title">Formations enseignées</h2>
              <div className="trainer_training_list">
                {formateur.formations.length > 0 ? (
                  formateur.formations.map((item, index) => (
                    <div className="trainer_training_card" key={index}>
                      {item}
                    </div>
                  ))
                ) : (
                  <p className="trainer_text">Aucune formation renseignée.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
