import { useEffect, useState } from "react";
import "./MesAvis.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

const API_URL = "http://localhost:8080";

export function MesAvis() {
  const [mesAvis, setMesAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchMesAvis = async () => {
      try {
        setLoading(true);
        setErreur("");

        const storedUser = localStorage.getItem("user");
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;

        if (!parsedUser?.id) {
          throw new Error("Utilisateur non connecté");
        }

        const res = await fetch(`${API_URL}/avis/user/${parsedUser.id}`, {
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
          throw new Error(data?.message || "Erreur lors du chargement de vos avis");
        }

        if (!Array.isArray(data)) {
          throw new Error("Format des avis invalide");
        }

        setMesAvis(data);
      } catch (err) {
        if (err.name === "AbortError") return;
        setErreur(err.message || "Erreur serveur");
      } finally {
        setLoading(false);
      }
    };

    fetchMesAvis();

    return () => controller.abort();
  }, []);

  return (
    <div className="user-reviews-box">
      <div className="user-reviews-header">
        <h3 className="user-reviews-title">Mes avis</h3>
        <p className="user-reviews-subtitle">
          Retrouvez ici les avis que vous avez déjà publiés.
        </p>
      </div>

      {loading && (
        <p className="user-reviews-state">Chargement de vos avis...</p>
      )}

      {erreur && (
        <p className="user-reviews-state user-reviews-state--error">
          {erreur}
        </p>
      )}

      {!loading && !erreur && mesAvis.length === 0 && (
        <p className="user-reviews-state">
          Vous n’avez encore laissé aucun avis.
        </p>
      )}

      {!loading && !erreur && mesAvis.length > 0 && (
        <div className="user-reviews-list">
          {mesAvis.map((avis) => (
            <article className="user-review-card" key={avis.id}>
              <div className="user-review-top">
                <div>
                  <h4 className="user-review-formation">
                    {avis.nom_formation || "Formation"}
                  </h4>

                  {avis.created_at && (
                    <p className="user-review-date">
                      Avis publié le {new Date(avis.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>

                <div className="user-review-stars">
                  {Array.from({ length: Number(avis.note) || 0 }).map((_, index) => (
                    <FontAwesomeIcon icon={faStar} key={index} />
                  ))}
                </div>
              </div>

              <p className="user-review-comment">
                “{avis.commentaire}”
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}