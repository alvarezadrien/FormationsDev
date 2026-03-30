import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import "dayjs/locale/fr";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.locale("fr");

const API_URL = "http://localhost:8080";

function normalizeTimeValue(value = "00:00:00") {
  const time = String(value).trim();

  if (/^\d{2}:\d{2}$/.test(time)) {
    return `${time}:00`;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return time;
  }

  return null;
}

function parseDate(dateValue) {
  if (typeof dateValue !== "string") {
    return null;
  }

  const parsedDate = dayjs(dateValue.trim(), "YYYY-MM-DD", true);

  return parsedDate.isValid() ? parsedDate : null;
}

function parseDateTime(dateValue, timeValue = "00:00:00") {
  const parsedDate = parseDate(dateValue);
  const normalizedTime = normalizeTimeValue(timeValue);

  if (!parsedDate || !normalizedTime) {
    return null;
  }

  const parsedDateTime = dayjs(
    `${parsedDate.format("YYYY-MM-DD")} ${normalizedTime}`,
    "YYYY-MM-DD HH:mm:ss",
    true
  );

  return parsedDateTime.isValid() ? parsedDateTime : null;
}

function parseClockTime(timeValue) {
  const normalizedTime = normalizeTimeValue(timeValue);

  if (!normalizedTime) {
    return null;
  }

  const parsedTime = dayjs(
    `2000-01-01 ${normalizedTime}`,
    "YYYY-MM-DD HH:mm:ss",
    true
  );

  return parsedTime.isValid() ? parsedTime : null;
}

function getSessionDurationMinutes(session) {
  const startTime = parseClockTime(session?.heure_debut);
  const endTime = parseClockTime(session?.heure_fin);

  if (!startTime || !endTime || !endTime.isAfter(startTime)) {
    return 0;
  }

  return endTime.diff(startTime, "minute");
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
  const parsedDate = parseDate(dateValue);

  if (!parsedDate) {
    return "Date inconnue";
  }

  return parsedDate.format("DD MMM YYYY");
}

function formatShortDate(dateValue) {
  const parsedDate = parseDate(dateValue);

  if (!parsedDate) {
    return "Non planifiée";
  }

  return parsedDate.format("DD MMM");
}

function isActiveFormation(formation) {
  return String(formation?.statut ?? "").trim().toLowerCase() === "actif";
}

function isSessionInsideCivilYear(session, currentYear) {
  const sessionDate = parseDate(session?.date);

  return Boolean(sessionDate && sessionDate.year() === currentYear);
}

function compareSessions(firstSession, secondSession) {
  const firstDate = parseDateTime(
    firstSession?.date,
    firstSession?.heure_debut || "00:00:00"
  );
  const secondDate = parseDateTime(
    secondSession?.date,
    secondSession?.heure_debut || "00:00:00"
  );

  if (!firstDate && !secondDate) {
    return 0;
  }

  if (!firstDate) {
    return 1;
  }

  if (!secondDate) {
    return -1;
  }

  return firstDate.valueOf() - secondDate.valueOf();
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

function getFormationWindowLabel(formation, currentYear) {
  if (formation.dateDebut && formation.dateFin) {
    return `${formatShortDate(formation.dateDebut)} -> ${formatShortDate(
      formation.dateFin
    )}`;
  }

  return `Aucune séance planifiée en ${currentYear}`;
}

function escapeCsvValue(value) {
  const safeValue = String(value ?? "");

  if (/[;"\n]/.test(safeValue)) {
    return `"${safeValue.replaceAll('"', '""')}"`;
  }

  return safeValue;
}

function buildCsvContent(formations, currentYear) {
  const rows = [
    [
      "Formation",
      "Formateur principal",
      "Debut",
      "Fin",
      "Heures attendues",
      "Heures realisees",
      "Heures restantes",
      "Seances realisees",
      "Seances totales",
      "Seances restantes",
      "Progression",
      "Fenetre",
    ],
    ...formations.map((formation) => [
      formation.nom,
      formation.formateur,
      formation.dateDebut ? formatDate(formation.dateDebut) : "Non planifiée",
      formation.dateFin ? formatDate(formation.dateFin) : "Non planifiée",
      formatDuration(formation.totalMinutes),
      formatDuration(formation.completedMinutes),
      formatDuration(formation.remainingMinutes),
      formation.completedSessions,
      formation.totalSessions,
      formation.remainingSessions,
      formatPercent(formation.progress),
      getFormationWindowLabel(formation, currentYear),
    ]),
  ];

  return `\uFEFF${rows
    .map((row) => row.map(escapeCsvValue).join(";"))
    .join("\n")}`;
}

function downloadCsv(content, fileName) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isSelectedFormation(formationId, selectedFormationId) {
  return String(formationId) === String(selectedFormationId);
}

function FormationStats({ formation }) {
  return (
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
  );
}

function FormationFooter({ formation, currentYear }) {
  return (
    <div className="admin-hours-card__footer">
      <p>
        <strong>Fenêtre {currentYear} :</strong>{" "}
        {getFormationWindowLabel(formation, currentYear)}
      </p>
      <p>
        <strong>Reste planifié :</strong>{" "}
        {formatSessionLabel(formation.remainingSessions)}
      </p>
    </div>
  );
}

export function CalculHeure() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("cards");
  const [selectedFormationId, setSelectedFormationId] = useState(null);

  const referenceDate = useMemo(() => dayjs(), []);
  const currentYear = referenceDate.year();
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
            const sessionEnd = parseDateTime(
              session?.date,
              session?.heure_fin || session?.heure_debut || "00:00:00"
            );
            const isCompleted = Boolean(
              sessionEnd && sessionEnd.isSameOrBefore(referenceDate)
            );

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

  useEffect(() => {
    if (dashboardData.activeFormations.length === 0) {
      setSelectedFormationId(null);
      return;
    }

    const selectedStillExists = dashboardData.activeFormations.some((formation) =>
      isSelectedFormation(formation.id, selectedFormationId)
    );

    if (!selectedStillExists) {
      setSelectedFormationId(dashboardData.activeFormations[0].id);
    }
  }, [dashboardData.activeFormations, selectedFormationId]);

  const selectedFormation = useMemo(
    () =>
      dashboardData.activeFormations.find((formation) =>
        isSelectedFormation(formation.id, selectedFormationId)
      ) ??
      dashboardData.activeFormations[0] ??
      null,
    [dashboardData.activeFormations, selectedFormationId]
  );

  const csvContent = useMemo(
    () => buildCsvContent(dashboardData.activeFormations, currentYear),
    [dashboardData.activeFormations, currentYear]
  );

  const handleSelectFormation = (formationId) => {
    setSelectedFormationId(formationId);
  };

  const handleTableRowKeyDown = (event, formationId) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelectFormation(formationId);
    }
  };

  const handleExportCsv = () => {
    downloadCsv(csvContent, `suivi-heures-${currentYear}.csv`);
  };

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
            <span>
              Reste{" "}
              {formatSessionLabel(dashboardData.totals.remainingSessions)}{" "}
              planifiées
            </span>
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

      <section className="admin-hours__toolbar">
        <div>
          <p className="admin-hours__toolbar-label">Affichage disponible</p>

          <div
            className="admin-hours__view-switch"
            role="group"
            aria-label="Choisir une vue du suivi horaire"
          >
            <button
              type="button"
              className={`admin-hours__view-btn ${
                viewMode === "cards" ? "is-active" : ""
              }`}
              onClick={() => setViewMode("cards")}
              aria-pressed={viewMode === "cards"}
            >
              Vue box
            </button>

            <button
              type="button"
              className={`admin-hours__view-btn ${
                viewMode === "table" ? "is-active" : ""
              }`}
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
            >
              Voir en tableau
            </button>
          </div>
        </div>

        <div className="admin-hours__toolbar-actions">
          <p className="admin-hours__toolbar-text">
            Box sélectionnée :{" "}
            <strong>{selectedFormation?.nom ?? "Aucune formation"}</strong>
          </p>

          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-hours__export-btn"
            onClick={handleExportCsv}
          >
            Exporter le tableau en CSV
          </button>
        </div>
      </section>

      {selectedFormation ? (
        <section className="admin-hours-card admin-hours-card--focus">
          <div className="admin-hours-card__top">
            <div>
              <span className="admin-card__eyebrow">Formation sélectionnée</span>
              <h3 className="admin-hours-card__title">{selectedFormation.nom}</h3>
              <p className="admin-hours-card__meta">
                Formateur principal : {selectedFormation.formateur}
              </p>
            </div>

            <div className="admin-hours-card__badge">
              {formatPercent(selectedFormation.progress)}
            </div>
          </div>

          <div
            className="admin-hours-progress admin-hours-progress--card"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(selectedFormation.progress)}
            aria-label={`Progression annuelle de ${selectedFormation.nom}`}
          >
            <div
              className="admin-hours-progress__value"
              style={{ width: `${Math.min(selectedFormation.progress, 100)}%` }}
            />
          </div>

          <FormationStats formation={selectedFormation} />
          <FormationFooter formation={selectedFormation} currentYear={currentYear} />
        </section>
      ) : null}

      {viewMode === "cards" ? (
        <div className="admin-hours__grid">
          {dashboardData.activeFormations.map((formation) => {
            const selected = isSelectedFormation(
              formation.id,
              selectedFormation?.id
            );

            return (
              <article
                key={formation.id}
                className={`admin-hours-card ${selected ? "is-selected" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => handleSelectFormation(formation.id)}
                onKeyDown={(event) => handleTableRowKeyDown(event, formation.id)}
              >
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

                <FormationStats formation={formation} />
                <FormationFooter formation={formation} currentYear={currentYear} />

                <div className="admin-hours-card__selection">
                  <span>
                    {selected
                      ? "Cette box est affichée au-dessus."
                      : "Cliquer pour l'afficher en priorité."}
                  </span>
                  <strong>{selected ? "Sélectionnée" : "Disponible"}</strong>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="admin-hours__table-shell">
          <div className="admin-hours__table-scroll">
            <table className="admin-hours__table">
              <caption>
                Vue tableau du suivi horaire {currentYear}, exportable en CSV.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Formation</th>
                  <th scope="col">Début</th>
                  <th scope="col">Fin</th>
                  <th scope="col">Heures attendues</th>
                  <th scope="col">Réalisées</th>
                  <th scope="col">Restantes</th>
                  <th scope="col">Séances</th>
                  <th scope="col">Progression</th>
                </tr>
              </thead>

              <tbody>
                {dashboardData.activeFormations.map((formation) => {
                  const selected = isSelectedFormation(
                    formation.id,
                    selectedFormation?.id
                  );

                  return (
                    <tr
                      key={formation.id}
                      className={selected ? "is-selected" : ""}
                      tabIndex={0}
                      aria-label={
                        selected
                          ? `${formation.nom} sélectionnée`
                          : `Afficher ${formation.nom} dans la box de détail`
                      }
                      onClick={() => handleSelectFormation(formation.id)}
                      onKeyDown={(event) =>
                        handleTableRowKeyDown(event, formation.id)
                      }
                    >
                      <td>
                        <strong>{formation.nom}</strong>
                        <span>{formation.formateur}</span>
                      </td>
                      <td>
                        {formation.dateDebut
                          ? formatDate(formation.dateDebut)
                          : "Non planifiée"}
                      </td>
                      <td>
                        {formation.dateFin
                          ? formatDate(formation.dateFin)
                          : "Non planifiée"}
                      </td>
                      <td>{formatDuration(formation.totalMinutes)}</td>
                      <td>{formatDuration(formation.completedMinutes)}</td>
                      <td>{formatDuration(formation.remainingMinutes)}</td>
                      <td>
                        {formation.completedSessions}/{formation.totalSessions}
                        <span className="admin-hours__table-muted">
                          {formatSessionLabel(formation.remainingSessions)}{" "}
                          restantes
                        </span>
                      </td>
                      <td>
                        <span className="admin-hours__table-progress">
                          {formatPercent(formation.progress)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
