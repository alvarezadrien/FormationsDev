export function FormActif({
  messageInscriptions,
  loadingInscriptions,
  inscriptions,
  handleDeleteInscription,
}) {
  return (
    <section className="admin-list admin-list--inscriptions">
      <h2 className="admin-list__title">Inscriptions reçues</h2>
      <p className="admin-list__text">
        Consulte les coordonnées des personnes inscrites et la formation choisie.
      </p>

      {messageInscriptions && (
        <div className="admin-feedback admin-feedback--success">
          {messageInscriptions}
        </div>
      )}

      {loadingInscriptions ? (
        <div className="admin-loading">Chargement des inscriptions...</div>
      ) : inscriptions.length === 0 ? (
        <div className="admin-empty">Aucune inscription pour le moment.</div>
      ) : (
        <div className="admin-inscriptions__grid">
          {inscriptions.map((inscription) => (
            <article
              className="admin-card admin-card--inscription"
              key={inscription.id}
            >
              <h3 className="admin-card__title">
                {inscription.prenom} {inscription.nom}
              </h3>

              <div className="admin-card__meta">
                <p>
                  <strong>Email :</strong>{" "}
                  {inscription.email || "Non renseigné"}
                </p>
                <p>
                  <strong>Téléphone :</strong>{" "}
                  {inscription.telephone || "Non renseigné"}
                </p>
                <p>
                  <strong>Formation :</strong>{" "}
                  {inscription.formation_nom ||
                    inscription.formation_id ||
                    "Non renseignée"}
                </p>
                <p>
                  <strong>Date inscription :</strong>{" "}
                  {inscription.date_inscription || "Non renseignée"}
                </p>
              </div>

              <p className="admin-card__description">
                {inscription.message?.trim()
                  ? inscription.message
                  : "Aucun message laissé par l'utilisateur."}
              </p>

              <div className="admin-card__actions">
                <button
                  className="admin-btn admin-btn--delete"
                  type="button"
                  onClick={() => handleDeleteInscription(inscription.id)}
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}