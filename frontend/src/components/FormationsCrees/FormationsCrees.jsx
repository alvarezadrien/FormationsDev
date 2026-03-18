export function FormationsCrees({
  loading,
  formations,
  handleEdit,
  handleDelete,
}) {
  return (
    <section className="admin-list">
      <h2 className="admin-list__title">Liste des formations</h2>
      <p className="admin-list__text">
        Clique sur une carte pour modifier ou supprimer une formation existante.
      </p>

      {loading ? (
        <div className="admin-loading">Chargement des formations...</div>
      ) : formations.length === 0 ? (
        <div className="admin-empty">
          Aucune formation disponible pour le moment.
        </div>
      ) : (
        <div className="admin-list__grid">
          {formations.map((formation) => {
            const badgeClass = `admin-badge admin-badge--${
              formation.statut || "actif"
            }`;

            const formateurs = formation.formateur
              ? formation.formateur.split(",").map((nom) => nom.trim())
              : [];

            return (
              <article className="admin-card" key={formation.id}>
                <h3 className="admin-card__title">{formation.nom}</h3>

                <div className="admin-card__meta">
                  <p>
                    <strong>Formateur(s) :</strong>{" "}
                    {formateurs.join(", ") || "Non renseigné"}
                  </p>
                  <p>
                    <strong>Lieu :</strong> {formation.lieu || "Non renseigné"}
                  </p>
                  <p>
                    <strong>Participants :</strong>{" "}
                    {formation.nombre_participants ?? 0}
                  </p>
                  <p>
                    <strong>Date début :</strong>{" "}
                    {formation.date_debut || "Non renseignée"}
                  </p>
                  <p>
                    <strong>Date fin :</strong>{" "}
                    {formation.date_fin || "Non renseignée"}
                  </p>
                  <p>
                    <strong>Statut :</strong>{" "}
                    <span className={badgeClass}>
                      {formation.statut || "actif"}
                    </span>
                  </p>
                </div>

                <p className="admin-card__description">
                  {formation.description || "Aucune description."}
                </p>

                <div className="admin-card__actions">
                  <button
                    className="admin-btn admin-btn--edit"
                    type="button"
                    onClick={() => handleEdit(formation)}
                  >
                    Modifier
                  </button>

                  <button
                    className="admin-btn admin-btn--delete"
                    type="button"
                    onClick={() => handleDelete(formation.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}