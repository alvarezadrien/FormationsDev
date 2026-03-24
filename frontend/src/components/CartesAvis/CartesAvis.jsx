import { useEffect, useState } from "react";
import "./CartesAvis.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

const API_URL = "http://localhost:8080";

export function CartesAvis() {
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchAvis = async () => {
      try {
        setLoading(true);
        setErreur("");

        const res = await fetch(`${API_URL}/avis`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        let data = null;

        try {
          data = await res.json();
        } catch {
          throw new Error("Réponse JSON invalide lors du chargement des avis");
        }

        if (!res.ok) {
          throw new Error(data?.message || "Erreur lors du chargement des avis");
        }

        if (!Array.isArray(data)) {
          throw new Error("Format des avis invalide");
        }

        setAvis(data);
      } catch (err) {
        if (err.name === "AbortError") return;
        setErreur(err.message || "Erreur serveur");
      } finally {
        setLoading(false);
      }
    };

    fetchAvis();

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <section className="cartes-avis">
        <div className="cartes-avis__bg" />
        <div className="cartes-avis__container">
          <div className="cartes-avis__header">
            <span className="cartes-avis__badge">Témoignages</span>
            <h2 className="cartes-avis__title">Ce que disent nos apprenants</h2>
            <p className="cartes-avis__subtitle">
              Des retours authentiques sur leur expérience de formation.
            </p>
          </div>
          <p className="cartes-avis__state">Chargement des avis...</p>
        </div>
      </section>
    );
  }

  if (erreur) {
    return (
      <section className="cartes-avis">
        <div className="cartes-avis__bg" />
        <div className="cartes-avis__container">
          <div className="cartes-avis__header">
            <span className="cartes-avis__badge">Témoignages</span>
            <h2 className="cartes-avis__title">Ce que disent nos apprenants</h2>
            <p className="cartes-avis__subtitle">
              Des retours authentiques sur leur expérience de formation.
            </p>
          </div>
          <p className="cartes-avis__state cartes-avis__state--error">{erreur}</p>
        </div>
      </section>
    );
  }

  if (avis.length === 0) {
    return (
      <section className="cartes-avis">
        <div className="cartes-avis__bg" />
        <div className="cartes-avis__container">
          <div className="cartes-avis__header">
            <span className="cartes-avis__badge">Témoignages</span>
            <h2 className="cartes-avis__title">Ce que disent nos apprenants</h2>
            <p className="cartes-avis__subtitle">
              Des retours authentiques sur leur expérience de formation.
            </p>
          </div>
          <p className="cartes-avis__state">Aucun avis disponible pour le moment.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="cartes-avis">
      <div className="cartes-avis__bg" />

      <div className="cartes-avis__container">
        <div className="cartes-avis__header">
          <span className="cartes-avis__badge">Témoignages</span>
          <h2 className="cartes-avis__title">Ce que disent nos apprenants</h2>
          <p className="cartes-avis__subtitle">
            Une sélection d’avis laissés par nos élèves après leur formation.
          </p>
        </div>

        <div className="cartes-avis__grid">
          {avis.map((item, index) => {
            const nomComplet =
              item.prenom || item.nom
                ? `${item.prenom ?? ""} ${item.nom ?? ""}`.trim()
                : "Utilisateur";

            const note = Math.max(0, Math.min(5, Number(item.note) || 0));

            return (
              <article
                className="avis-card"
                key={item.id}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="avis-card__glow" />

                <div className="avis-card__top">
                  <div className="avis-card__identity">
                    <div className="avis-card__avatar">
                      {nomComplet.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h3 className="avis-card__nom">{nomComplet}</h3>
                      {item.nom_formation && (
                        <p className="avis-card__formation">{item.nom_formation}</p>
                      )}
                    </div>
                  </div>

                  <div className="avis-card__rating">
                    <span className="avis-card__rating-value">{note}.0</span>
                    <div className="avis-card__stars">
                      {Array.from({ length: note }).map((_, starIndex) => (
                        <FontAwesomeIcon icon={faStar} key={starIndex} />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="avis-card__commentaire">“{item.commentaire}”</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}