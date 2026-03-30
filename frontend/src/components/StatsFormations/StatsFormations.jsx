import { useEffect, useMemo, useState } from "react";
import "./StatsFormations.css";

const API_URL = "http://localhost:8080";

export function StatsFormations() {
  const [formations, setFormations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchStats = async () => {
      try {
        setLoading(true);
        setErreur("");

        const [formationsRes, inscriptionsRes] = await Promise.all([
          fetch(`${API_URL}/formations`, {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }),
          fetch(`${API_URL}/inscriptions-formations`, {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }),
        ]);

        const formationsData = await formationsRes.json();
        const inscriptionsData = await inscriptionsRes.json();

        if (!formationsRes.ok || !inscriptionsRes.ok) {
          throw new Error("Erreur lors du chargement des données");
        }

        setFormations(formationsData);
        setInscriptions(inscriptionsData);
      } catch (err) {
        if (err.name !== "AbortError") {
          setErreur(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    return () => controller.abort();
  }, []);

  const stats = useMemo(() => {
    const totalPlacesRestantes = formations.reduce(
      (total, f) => total + Number(f.nombre_participants ?? 0),
      0
    );

    const apprenantsActifs = inscriptions.length;

    const total = apprenantsActifs + totalPlacesRestantes;

    const apprenantsPct = total ? (apprenantsActifs / total) * 100 : 0;
    const placesPct = total ? (totalPlacesRestantes / total) * 100 : 0;
    const breakdown = formations.reduce(
      (accumulator, formation) => {
        const status = String(formation?.statut || "").trim().toLowerCase();

        if (status === "actif") {
          accumulator.actives += 1;
        } else if (status === "annule") {
          accumulator.annulees += 1;
        } else {
          accumulator.inactives += 1;
        }

        return accumulator;
      },
      {
        actives: 0,
        inactives: 0,
        annulees: 0,
      }
    );

    const cards = [
      {
        key: "catalogue",
        label: "Catalogue",
        value: formations.length,
        note: `${apprenantsActifs} apprenant(s) inscrit(s)`,
        tone: "primary",
      },
      {
        key: "actives",
        label: "Formations actives",
        value: breakdown.actives,
        note: "modules en cours ou disponibles",
        tone: "success",
      },
      {
        key: "places",
        label: "Places libres",
        value: totalPlacesRestantes,
        note: "capacite restante a remplir",
        tone: "neutral",
      },
      {
        key: "annulees",
        label: "Annulations",
        value: breakdown.annulees,
        note: `${breakdown.inactives} formation(s) en pause`,
        tone: "alert",
      },
    ];

    const distribution = [
      {
        key: "actives",
        label: "Actives",
        value: breakdown.actives,
        tone: "strong",
      },
      {
        key: "inactives",
        label: "En pause",
        value: breakdown.inactives,
        tone: "soft",
      },
      {
        key: "annulees",
        label: "Annulees",
        value: breakdown.annulees,
        tone: "alert",
      },
      {
        key: "apprenants",
        label: "Apprenants",
        value: apprenantsActifs,
        tone: "highlight",
      },
    ];

    return {
      totalFormations: formations.length,
      apprenantsActifs,
      totalPlacesRestantes,
      apprenantsPct,
      placesPct,
      actives: breakdown.actives,
      inactives: breakdown.inactives,
      annulees: breakdown.annulees,
      cards,
      distribution,
    };
  }, [formations, inscriptions]);

  if (loading) {
    return <p className="stats-message">Chargement...</p>;
  }

  if (erreur) {
    return <p className="stats-message error">{erreur}</p>;
  }

  return (
    <section className="stats-formations">
      <div className="stats-header">
        <div>
          <span className="stats-header__eyebrow">Vue synthese</span>
          <h2 className="stats-header__title">Performance du catalogue</h2>
          <p className="stats-header__text">
            Suivez le volume des formations, les places encore disponibles et le
            niveau d&apos;occupation depuis le dashboard.
          </p>
        </div>
      </div>

      <div className="stats-cards">
        {stats.cards.map((card) => (
          <article
            key={card.key}
            className={`stats-card stats-card--${card.tone}`}
          >
            <span className="stats-card__label">{card.label}</span>
            <strong className="stats-card__value">{card.value}</strong>
            <p className="stats-card__note">{card.note}</p>
          </article>
        ))}
      </div>

      <div className="stats-bottom">
        <article className="stats-panel stats-panel--analytics">
          <div className="stats-panel__header">
            <div>
              <span className="stats-panel__eyebrow">Repartition</span>
              <h3 className="stats-panel__title">Etat des formations</h3>
            </div>
            <strong className="stats-panel__meta">
              {stats.totalFormations} au total
            </strong>
          </div>

          <div className="stats-bars">
            {stats.distribution.map((item) => {
              const maxValue = Math.max(
                ...stats.distribution.map((entry) => entry.value),
                1
              );
              const width = `${Math.max((item.value / maxValue) * 100, 8)}%`;

              return (
                <div className="stats-bar" key={item.key}>
                  <div className="stats-bar__top">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="stats-bar__track">
                    <span
                      className={`stats-bar__value stats-bar__value--${item.tone}`}
                      style={{ width }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="stats-panel stats-panel--progress">
          <div className="stats-panel__header">
            <div>
              <span className="stats-panel__eyebrow">Occupation</span>
              <h3 className="stats-panel__title">Taux de remplissage</h3>
            </div>
            <strong className="stats-panel__meta">
              {stats.apprenantsActifs} /{" "}
              {stats.apprenantsActifs + stats.totalPlacesRestantes}
            </strong>
          </div>

          <div className="donut-wrapper">
            <div
              className="donut"
              style={{
                background: `conic-gradient(
                  #1f7a53 ${stats.apprenantsPct}%,
                  #cfe7da ${stats.apprenantsPct}% 100%
                )`,
              }}
            >
              <div className="donut-inner">
                <span>{Math.round(stats.apprenantsPct)}%</span>
                <small>taux rempli</small>
              </div>
            </div>

            <div className="donut-legend">
              <div>
                <span className="dot dot--filled"></span>
                <span>Apprenants: {stats.apprenantsActifs}</span>
              </div>
              <div>
                <span className="dot dot--empty"></span>
                <span>Places libres: {stats.totalPlacesRestantes}</span>
              </div>
              <div>
                <span className="dot dot--alert"></span>
                <span>Part libre: {Math.round(stats.placesPct)}%</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
