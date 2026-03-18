import { useState } from "react";
import "./Faq.css";

const faqData = [
  {
    id: 1,
    question: "Comment s’inscrire à une formation ?",
    answer:
      "Vous pouvez vous inscrire directement depuis la page des formations ou via le formulaire d’inscription. Une fois votre demande envoyée, notre équipe vous recontactera rapidement.",
  },
  {
    id: 2,
    question: "Les formations sont-elles accessibles à distance ?",
    answer:
      "Oui, plusieurs formations sont proposées en ligne. Selon la formation choisie, vous pouvez suivre les cours à distance ou en présentiel.",
  },
  {
    id: 3,
    question: "Comment savoir si une formation est encore disponible ?",
    answer:
      "Chaque formation affiche son statut ainsi que le nombre de places disponibles. Si elle est complète ou inactive, vous le verrez directement sur la carte ou la page détail.",
  },
  {
    id: 4,
    question: "Puis-je annuler ou modifier mon inscription ?",
    answer:
      "Oui, il est possible de nous contacter pour demander une modification ou une annulation. Notre équipe vous indiquera les conditions applicables.",
  },
  {
    id: 5,
    question: "Comment accéder à mon compte ?",
    answer:
      "Vous pouvez vous connecter via la page Connexion / Inscription. Une fois connecté, vous accédez à votre espace personnel et à vos informations de compte.",
  },
];

export function Faq() {
  const [openId, setOpenId] = useState(1);

  const handleToggle = (id) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="faq_page">
      <div className="faq_container">
        <div className="faq_header">
          <span className="faq_badge">FAQ</span>
          <h1 className="faq_title">Questions fréquentes</h1>
          <p className="faq_subtitle">
            Retrouvez ici les réponses aux questions les plus courantes sur nos
            formations, les inscriptions et votre espace personnel.
          </p>
        </div>

        <div className="faq_list">
          {faqData.map((item) => (
            <div
              key={item.id}
              className={`faq_item ${openId === item.id ? "active" : ""}`}
            >
              <button
                className="faq_question"
                onClick={() => handleToggle(item.id)}
                type="button"
              >
                <span>{item.question}</span>
                <span className={`faq_icon ${openId === item.id ? "rotate" : ""}`}>
                  +
                </span>
              </button>

              {openId === item.id && (
                <div className="faq_answer">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}