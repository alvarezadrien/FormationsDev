import { useEffect, useMemo, useState } from "react";
import "./StatsPage.css";

const API_URL = "http://localhost:8080";

export function StatsPage() {
  const [formations, setFormations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        setErreur("");

        const [formationsRes, inscriptionsRes] = await Promise.all([
          fetch(`${API_URL}/formations`, {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }),
          fetch(`${API_URL}/inscriptions-formations`, {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }),
        ]);

        let formationsData = [];
        let inscriptionsData = [];

        try {
          formationsData = await formationsRes.json();
        } catch {
          throw new Error("Réponse JSON invalide pour les formations");
        }

        try {
          inscriptionsData = await inscriptionsRes.json();
        } catch {
          throw new Error("Réponse JSON invalide pour les inscriptions");
        }

        if (!formationsRes.ok) {
          throw new Error(
            formationsData?.message || "Erreur lors du chargement des formations"
          );
        }

        if (!inscriptionsRes.ok) {
          throw new Error(
            inscriptionsData?.message ||
              "Erreur lors du chargement des inscriptions"
          );
        }

        if (!Array.isArray(formationsData)) {
          throw new Error("Format de données invalide pour les formations");
        }

        if (!Array.isArray(inscriptionsData)) {
          throw new Error("Format de données invalide pour les inscriptions");
        }

        const normalizedFormations = formationsData.map((formation) => ({
          id: formation.id,
          nom: formation.nom ?? "Formation sans nom",
          description: formation.description ?? "",
          lieu: formation.lieu ?? "Non renseigné",
          statut: String(formation.statut ?? "actif").toLowerCase(),
          date_debut: formation.date_debut ?? "",
          date_fin: formation.date_fin ?? "",
          nombre_participants: Number(formation.nombre_participants ?? 0),
        }));

        const normalizedInscriptions = inscriptionsData.map((inscription) => ({
          id: inscription.id,
          formation_id: inscription.formation_id,
          statut: String(inscription.statut ?? "actif").toLowerCase(),
        }));

        setFormations(normalizedFormations);
        setInscriptions(normalizedInscriptions);
      } catch (err) {
        if (err.name === "AbortError") return;
        setErreur(err.message || "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, []);

  const stats = useMemo(() => {
    const formationsActives = formations.filter(
      (formation) => formation.statut === "actif"
    );

    const inscriptionsActives = inscriptions.filter((inscription) => {
      const statut = inscription.statut;
      return (
        statut === "actif" ||
        statut === "inscrit" ||
        statut === "valide" ||
        statut === "validé" ||
        statut === "confirmé" ||
        statut === "confirme"
      );
    });

    const inscriptionsParFormation = inscriptionsActives.reduce((acc, item) => {
      const key = Number(item.formation_id);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const formationsAvecStats = formationsActives.map((formation) => {
      const inscrits = inscriptionsParFormation[Number(formation.id)] || 0;
      const placesRestantes = Math.max(0, Number(formation.nombre_participants || 0));
      const capaciteTotale = inscrits + placesRestantes;
      const tauxRemplissage =
        capaciteTotale > 0 ? Math.round((inscrits / capaciteTotale) * 100) : 0;

      return {
        ...formation,
        inscrits,
        placesRestantes,
        capaciteTotale,
        tauxRemplissage,
      };
    });

    const totalApprenants = formationsAvecStats.reduce(
      (sum, formation) => sum + formation.inscrits,
      0
    );

    const totalPlacesRestantes = formationsAvecStats.reduce(
      (sum, formation) => sum + formation.placesRestantes,
      0
    );

    const totalFormationsActives = formationsAvecStats.length;

    const formationsPopulaires = [...formationsAvecStats]
      .sort((a, b) => b.inscrits - a.inscrits)
      .slice(0, 3);

    const presqueCompletes = formationsAvecStats
      .filter(
        (formation) =>
          formation.placesRestantes > 0 && formation.tauxRemplissage >= 70
      )
      .sort((a, b) => b.tauxRemplissage - a.tauxRemplissage);

    return {
      totalApprenants,
      totalPlacesRestantes,
      totalFormationsActives,
      formationsAvecStats,
      formationsPopulaires,
      presqueCompletes,
    };
  }, [formations, inscriptions]);

  const formatDate = (date) => {
    if (!date) return "Non renseignée";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <section className="stats-page">
        <div className="stats-page__state">Chargement des statistiques...</div>
      </section>
    );
  }

  if (erreur) {
    return (
      <section className="stats-page">
        <div className="stats-page__state stats-page__state--error">
          Erreur : {erreur}
        </div>
      </section>
    );
  }

  return (
    <main className="stats-page">
      <section className="stats-page__hero">
        <span className="stats-page__badge">Vue d’ensemble</span>
        <h1 className="stats-page__title">Statistiques des formations</h1>
        <p className="stats-page__subtitle">
          Découvrez les formations les plus suivies, les places encore
          disponibles et les sessions qui se remplissent rapidement.
        </p>
      </section>

      <section className="stats-page__summary">
        <article className="summary-card summary-card--blue">
          <span className="summary-card__label">Apprenants inscrits</span>
          <strong className="summary-card__value">{stats.totalApprenants}</strong>
          <p className="summary-card__text">
            Nombre total d’apprenants actuellement engagés dans nos formations.
          </p>
        </article>

        <article className="summary-card summary-card--green">
          <span className="summary-card__label">Places encore disponibles</span>
          <strong className="summary-card__value">
            {stats.totalPlacesRestantes}
          </strong>
          <p className="summary-card__text">
            Places restantes sur l’ensemble des formations actives.
          </p>
        </article>

        <article className="summary-card summary-card--dark">
          <span className="summary-card__label">Formations actives</span>
          <strong className="summary-card__value">
            {stats.totalFormationsActives}
          </strong>
          <p className="summary-card__text">
            Sessions actuellement ouvertes aux inscriptions.
          </p>
        </article>
      </section>

      <section className="stats-page__grid">
        <div className="stats-panel">
          <div className="stats-panel__header">
            <h2 className="stats-panel__title">Formations les plus populaires</h2>
            <p className="stats-panel__subtitle">
              Les formations qui attirent actuellement le plus d’apprenants.
            </p>
          </div>

          <div className="stats-list">
            {stats.formationsPopulaires.length === 0 ? (
              <p className="stats-empty">Aucune donnée disponible.</p>
            ) : (
              stats.formationsPopulaires.map((formation, index) => (
                <article className="formation-stat-card" key={formation.id}>
                  <div className="formation-stat-card__top">
                    <span className="ranking-badge">Top {index + 1}</span>
                    <span className="fill-badge">
                      {formation.tauxRemplissage}% rempli
                    </span>
                  </div>

                  <h3 className="formation-stat-card__title">{formation.nom}</h3>

                  <p className="formation-stat-card__meta">
                    {formation.lieu} • Début : {formatDate(formation.date_debut)}
                  </p>

                  <div className="progress-block">
                    <div className="progress-block__labels">
                      <span>{formation.inscrits} inscrits</span>
                      <span>{formation.placesRestantes} places restantes</span>
                    </div>

                    <div className="progress-bar">
                      <div
                        className="progress-bar__fill"
                        style={{ width: `${formation.tauxRemplissage}%` }}
                      ></div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="stats-panel">
          <div className="stats-panel__header">
            <h2 className="stats-panel__title">Presque complet</h2>
            <p className="stats-panel__subtitle">
              Les formations à forte demande avec peu de places encore
              disponibles.
            </p>
          </div>

          <div className="stats-list">
            {stats.presqueCompletes.length === 0 ? (
              <p className="stats-empty">
                Aucune formation n’est proche d’être complète pour le moment.
              </p>
            ) : (
              stats.presqueCompletes.map((formation) => (
                <article className="formation-alert-card" key={formation.id}>
                  <div className="formation-alert-card__content">
                    <h3 className="formation-alert-card__title">
                      {formation.nom}
                    </h3>

                    <p className="formation-alert-card__text">
                      {formation.placesRestantes <= 3
                        ? `Il ne reste plus que ${formation.placesRestantes} place${
                            formation.placesRestantes > 1 ? "s" : ""
                          }.`
                        : `${formation.tauxRemplissage}% des places sont déjà réservées.`}
                    </p>
                  </div>

                  <div className="formation-alert-card__side">
                    <span className="alert-value">
                      {formation.placesRestantes}
                    </span>
                    <span className="alert-label">places restantes</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="stats-panel stats-panel--full">
        <div className="stats-panel__header">
          <h2 className="stats-panel__title">Toutes les formations</h2>
          <p className="stats-panel__subtitle">
            Vue détaillée des sessions actives avec leur niveau de remplissage.
          </p>
        </div>

        <div className="all-formations-grid">
          {stats.formationsAvecStats.length === 0 ? (
            <p className="stats-empty">Aucune formation active disponible.</p>
          ) : (
            stats.formationsAvecStats.map((formation) => (
              <article className="all-formation-card" key={formation.id}>
                <div className="all-formation-card__top">
                  <span className="mini-status">Formation active</span>
                  <span className="mini-fill">
                    {formation.tauxRemplissage}% rempli
                  </span>
                </div>

                <h3 className="all-formation-card__title">{formation.nom}</h3>

                <p className="all-formation-card__desc">
                  {formation.description || "Aucune description disponible."}
                </p>

                <div className="all-formation-card__meta">
                  <span>📍 {formation.lieu}</span>
                  <span>📅 {formatDate(formation.date_debut)}</span>
                </div>

                <div className="progress-block">
                  <div className="progress-block__labels">
                    <span>{formation.inscrits} inscrits</span>
                    <span>{formation.placesRestantes} places restantes</span>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-bar__fill"
                      style={{ width: `${formation.tauxRemplissage}%` }}
                    ></div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}