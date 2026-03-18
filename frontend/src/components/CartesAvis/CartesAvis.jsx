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
        <h2 className="cartes-avis__title">Avis clients</h2>
        <p className="cartes-avis__state">Chargement des avis...</p>
      </section>
    );
  }

  if (erreur) {
    return (
      <section className="cartes-avis">
        <h2 className="cartes-avis__title">Avis clients</h2>
        <p className="cartes-avis__state cartes-avis__state--error">
          {erreur}
        </p>
      </section>
    );
  }

  if (avis.length === 0) {
    return (
      <section className="cartes-avis">
        <h2 className="cartes-avis__title">Avis clients</h2>
        <p className="cartes-avis__state">Aucun avis disponible pour le moment.</p>
      </section>
    );
  }

  return (
    <section className="cartes-avis">
      <h2 className="cartes-avis__title">Avis clients</h2>

      <div className="cartes-avis__grid">
        {avis.map((item) => (
          <article className="avis-card" key={item.id}>
            <div className="avis-card__top">
              <h3 className="avis-card__nom">
                {item.prenom || item.nom
                  ? `${item.prenom ?? ""} ${item.nom ?? ""}`.trim()
                  : "Utilisateur"}
              </h3>

              {item.nom_formation && (
                <p className="avis-card__formation">{item.nom_formation}</p>
              )}
            </div>

            <div className="avis-card__stars">
              {Array.from({ length: Number(item.note) || 0 }).map((_, index) => (
                <FontAwesomeIcon icon={faStar} key={index} />
              ))}
            </div>

            <p className="avis-card__commentaire">“{item.commentaire}”</p>
          </article>
        ))}
      </div>
    </section>
  );
}