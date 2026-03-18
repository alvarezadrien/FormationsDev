import "./CartesAvis.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

export function CartesAvis() {
  const avis = [
    {
      id: 1,
      nom: "Sophie Martin",
      note: 5,
      commentaire: "Service impeccable, très satisfaite du résultat !",
    },
    {
      id: 2,
      nom: "Lucas Bernard",
      note: 4,
      commentaire: "Très bonne expérience, je recommande sans hésiter.",
    },
    {
      id: 3,
      nom: "Emma Dubois",
      note: 5,
      commentaire: "Accueil chaleureux et prestation au top.",
    },
  ];

  return (
    <section className="cartes-avis">
      <h2 className="cartes-avis__title">Avis clients</h2>

      <div className="cartes-avis__grid">
        {avis.map((item) => (
          <article className="avis-card" key={item.id}>
            <h3 className="avis-card__nom">{item.nom}</h3>

            <div className="avis-card__stars">
              {Array.from({ length: item.note }).map((_, index) => (
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
