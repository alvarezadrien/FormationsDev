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

    return {
      apprenantsActifs,
      totalPlacesRestantes,
      apprenantsPct,
      placesPct,
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
      <div className="stats-layout">
        
        {/* === LEFT (CARDS) === */}
        <div className="stats-left">
          <div className="stats-box stats-box--blue">
            <span>Apprenants actifs</span>
            <h2>{stats.apprenantsActifs}</h2>
          </div>

          <div className="stats-box stats-box--green">
            <span>Places restantes</span>
            <h2>{stats.totalPlacesRestantes}</h2>
          </div>
        </div>

        {/* === RIGHT (DONUT) === */}
        <div className="stats-right">
          <div className="donut-wrapper">
            <div
              className="donut"
              style={{
                background: `conic-gradient(
                  #2563eb ${stats.apprenantsPct}%,
                  #10b981 ${stats.apprenantsPct}% 100%
                )`,
              }}
            >
              <div className="donut-inner">
                <span>{Math.round(stats.apprenantsPct)}%</span>
              </div>
            </div>

            <div className="donut-legend">
              <div>
                <span className="dot blue"></span>
                Apprenants
              </div>
              <div>
                <span className="dot green"></span>
                Places restantes
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}