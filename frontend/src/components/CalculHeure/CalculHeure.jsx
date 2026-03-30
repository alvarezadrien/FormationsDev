import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:8080";

function parseTimeToMinutes(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function toLocalDateTime(dateValue, timeValue = "00:00:00") {
  if (typeof dateValue !== "string") {
    return null;
  }

  const dateMatch = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = String(timeValue)
    .trim()
    .match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const seconds = Number(timeMatch[3] ?? 0);

  if (
    [year, month, day, hours, minutes, seconds].some((value) =>
      Number.isNaN(value)
    )
  ) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, seconds);
}

function getSessionDurationMinutes(session) {
  const startMinutes = parseTimeToMinutes(session?.heure_debut);
  const endMinutes = parseTimeToMinutes(session?.heure_fin);

  if (
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes
  ) {
    return 0;
  }

  return endMinutes - startMinutes;
}

function formatDuration(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return `${hours} h ${String(minutes).padStart(2, "0")}`;
}

function formatPercent(value) {
  return `${Math.round(value)} %`;
}

function formatSessionLabel(count) {
  return `${count} séance${count > 1 || count === 0 ? "s" : ""}`;
}

function formatDate(dateValue) {
  const date = toLocalDateTime(dateValue);

  if (!date) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatShortDate(dateValue) {
  const date = toLocalDateTime(dateValue);

  if (!date) {
    return "Non planifiée";
  }

  return new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function isActiveFormation(formation) {
  return String(formation?.statut ?? "").trim().toLowerCase() === "actif";
}

function isSessionInsideCivilYear(session, currentYear) {
  return typeof session?.date === "string" && session.date.startsWith(`${currentYear}-`);
}

function compareSessions(a, b) {
  const first = `${a?.date ?? ""} ${a?.heure_debut ?? ""}`;
  const second = `${b?.date ?? ""} ${b?.heure_debut ?? ""}`;

  return first.localeCompare(second);
}

function getFormateurLabel(formation) {
  const prenom = String(formation?.formateur_prenom ?? "").trim();
  const nom = String(formation?.formateur_nom ?? "").trim();
  const fullName = `${prenom} ${nom}`.trim();

  if (fullName) {
    return fullName;
  }

  return formation?.formateur_email || "Formateur non renseigné";
}

export function CalculHeure() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const referenceDate = useMemo(() => new Date(), []);
  const currentYear = referenceDate.getFullYear();
  const civilYearStart = `${currentYear}-01-01`;
  const civilYearEnd = `${currentYear}-12-31`;

  useEffect(() => {
    const controller = new AbortController();

    const fetchFormations = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/formations`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(
            data?.message || "Impossible de charger les formations actives."
          );
        }

        setFormations(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            err.message ||
              "Une erreur est survenue lors du chargement du suivi horaire."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFormations();

    return () => controller.abort();
  }, []);

  const dashboardData = useMemo(() => {
    const activeFormations = formations
      .filter(isActiveFormation)
      .map((formation) => {
        const sessions = Array.isArray(formation.sessions)
          ? [...formation.sessions].sort(compareSessions)
          : [];

        const annualSessions = sessions.filter((session) =>
          isSessionInsideCivilYear(session, currentYear)
        );

        const stats = annualSessions.reduce(
          (accumulator, session) => {
            const durationMinutes = getSessionDurationMinutes(session);
            const sessionEnd = toLocalDateTime(
              session?.date,
              session?.heure_fin || session?.heure_debut || "00:00:00"
            );
            const isCompleted = sessionEnd ? sessionEnd <= referenceDate : false;

            accumulator.totalSessions += 1;
            accumulator.totalMinutes += durationMinutes;

            if (isCompleted) {
              accumulator.completedSessions += 1;
              accumulator.completedMinutes += durationMinutes;
            } else {
              accumulator.remainingSessions += 1;
              accumulator.remainingMinutes += durationMinutes;
            }

            return accumulator;
          },
          {
            totalMinutes: 0,
            completedMinutes: 0,
            remainingMinutes: 0,
            totalSessions: 0,
            completedSessions: 0,
            remainingSessions: 0,
          }
        );

        const progress =
          stats.totalMinutes > 0
            ? (stats.completedMinutes / stats.totalMinutes) * 100
            : 0;

        return {
          id: formation.id,
          nom: formation.nom || formation.titre || "Formation sans titre",
          formateur: getFormateurLabel(formation),
          dateDebut: annualSessions[0]?.date || null,
          dateFin: annualSessions[annualSessions.length - 1]?.date || null,
          progress,
          ...stats,
        };
      })
      .sort((first, second) => {
        if (second.totalMinutes !== first.totalMinutes) {
          return second.totalMinutes - first.totalMinutes;
        }

        return first.nom.localeCompare(second.nom);
      });

    const totals = activeFormations.reduce(
      (accumulator, formation) => {
        accumulator.totalFormations += 1;
        accumulator.totalMinutes += formation.totalMinutes;
        accumulator.completedMinutes += formation.completedMinutes;
        accumulator.remainingMinutes += formation.remainingMinutes;
        accumulator.totalSessions += formation.totalSessions;
        accumulator.completedSessions += formation.completedSessions;
        accumulator.remainingSessions += formation.remainingSessions;

        return accumulator;
      },
      {
        totalFormations: 0,
        totalMinutes: 0,
        completedMinutes: 0,
        remainingMinutes: 0,
        totalSessions: 0,
        completedSessions: 0,
        remainingSessions: 0,
      }
    );

    totals.progress =
      totals.totalMinutes > 0
        ? (totals.completedMinutes / totals.totalMinutes) * 100
        : 0;

    return {
      activeFormations,
      totals,
    };
  }, [formations, currentYear, referenceDate]);

  if (loading) {
    return <div className="admin-loading">Chargement du suivi horaire...</div>;
  }

  if (error) {
    return <div className="admin-feedback admin-feedback--error">{error}</div>;
  }

  if (dashboardData.activeFormations.length === 0) {
    return (
      <div className="admin-empty">
        Aucune formation active à analyser pour l&apos;année civile {currentYear}.
      </div>
    );
  }

  return (
    <div className="admin-hours">
      <div className="admin-form__section admin-hours__intro">
        <div className="admin-form__section-head">
          <span className="admin-form__section-badge">CH</span>
          <div>
            <h3 className="admin-form__section-title">Suivi des heures actives</h3>
            <p className="admin-form__section-text">
              Vue consolidée des formations au statut actif sur l&apos;année
              civile {currentYear}, avec les heures prévues, réalisées et encore
              planifiées.
            </p>
          </div>
        </div>

        <div className="admin-form__hint admin-hours__period">
          Période analysée : du {formatDate(civilYearStart)} au{" "}
          {formatDate(civilYearEnd)}.
        </div>
      </div>

      <div className="admin-crm-kpis admin-hours__kpis">
        <div className="admin-crm-kpi">
          <span>Formations actives</span>
          <strong>{dashboardData.totals.totalFormations}</strong>
        </div>

        <div className="admin-crm-kpi">
          <span>Heures attendues {currentYear}</span>
          <strong>{formatDuration(dashboardData.totals.totalMinutes)}</strong>
        </div>

        <div className="admin-crm-kpi">
          <span>Total séances {currentYear}</span>
          <strong>{dashboardData.totals.totalSessions}</strong>
        </div>

        <div className="admin-crm-kpi">
          <span>Déjà faites</span>
          <strong>{formatDuration(dashboardData.totals.completedMinutes)}</strong>
        </div>

        <div className="admin-crm-kpi">
          <span>Encore possibles</span>
          <strong>{formatDuration(dashboardData.totals.remainingMinutes)}</strong>
        </div>
      </div>

      <section className="admin-hours__summary-card">
        <div className="admin-hours__summary-head">
          <div>
            <p className="admin-hours__summary-label">Progression globale</p>
            <h3 className="admin-hours__summary-title">
              {formatPercent(dashboardData.totals.progress)} réalisé
            </h3>
          </div>

          <div className="admin-hours__summary-meta">
            <strong>
              {dashboardData.totals.completedSessions}/
              {dashboardData.totals.totalSessions} séances passées
            </strong>
            <span>Reste {formatSessionLabel(dashboardData.totals.remainingSessions)} planifiées</span>
          </div>
        </div>

        <div
          className="admin-hours-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(dashboardData.totals.progress)}
          aria-label="Progression globale des heures réalisées"
        >
          <div
            className="admin-hours-progress__value"
            style={{ width: `${Math.min(dashboardData.totals.progress, 100)}%` }}
          />
        </div>

        <div className="admin-hours__summary-foot">
          <span>
            {formatDuration(dashboardData.totals.completedMinutes)} effectuées
          </span>
          <span>
            {formatDuration(dashboardData.totals.remainingMinutes)} encore
            programmées
          </span>
        </div>
      </section>

      <div className="admin-hours__grid">
        {dashboardData.activeFormations.map((formation) => (
          <article key={formation.id} className="admin-hours-card">
            <div className="admin-hours-card__top">
              <div>
                <span className="admin-card__eyebrow">Formation active</span>
                <h3 className="admin-hours-card__title">{formation.nom}</h3>
                <p className="admin-hours-card__meta">
                  Formateur principal : {formation.formateur}
                </p>
              </div>

              <div className="admin-hours-card__badge">
                {formatPercent(formation.progress)}
              </div>
            </div>

            <div
              className="admin-hours-progress admin-hours-progress--card"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(formation.progress)}
              aria-label={`Progression annuelle de ${formation.nom}`}
            >
              <div
                className="admin-hours-progress__value"
                style={{ width: `${Math.min(formation.progress, 100)}%` }}
              />
            </div>

            <div className="admin-hours-card__stats">
              <div className="admin-hours-card__stat">
                <span>Heures attendues</span>
                <strong>{formatDuration(formation.totalMinutes)}</strong>
              </div>

              <div className="admin-hours-card__stat">
                <span>Déjà faites</span>
                <strong>{formatDuration(formation.completedMinutes)}</strong>
              </div>

              <div className="admin-hours-card__stat">
                <span>Encore possibles</span>
                <strong>{formatDuration(formation.remainingMinutes)}</strong>
              </div>

              <div className="admin-hours-card__stat">
                <span>Séances</span>
                <strong>
                  {formation.completedSessions}/{formation.totalSessions}
                </strong>
              </div>
            </div>

            <div className="admin-hours-card__footer">
              <p>
                <strong>Fenêtre {currentYear} :</strong>{" "}
                {formation.dateDebut && formation.dateFin
                  ? `${formatShortDate(formation.dateDebut)} -> ${formatShortDate(
                      formation.dateFin
                    )}`
                  : `Aucune séance planifiée en ${currentYear}`}
              </p>
              <p>
                <strong>Reste planifié :</strong>{" "}
                {formatSessionLabel(formation.remainingSessions)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
