import { useEffect, useMemo, useState } from "react";
import "./CalendrierComplet.css";

const API_URL = "http://localhost:8080";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_FULL = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const FORMATION_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#4f46e5",
  "#c2410c",
  "#0f766e",
  "#9333ea",
  "#be123c",
  "#15803d",
  "#1d4ed8",
  "#a21caf",
  "#0ea5e9",
  "#ca8a04",
  "#dc2626",
  "#059669",
];

function getJsonHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

function getFetchOptions(method = "GET", body = null) {
  const options = {
    method,
    headers: getJsonHeaders(),
    credentials: "include",
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  return options;
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isAdminUser() {
  const user = getStoredUser();
  return user?.role === "admin";
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, nb) {
  const d = new Date(date);
  d.setDate(d.getDate() + nb);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function hashString(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getFormationColor(formation) {
  const key =
    `${formation?.id ?? ""}-${formation?.titre ?? formation?.title ?? ""}` ||
    "default";
  return FORMATION_COLORS[hashString(key) % FORMATION_COLORS.length];
}

function parseDateTime(session) {
  const rawDate =
    session.date ||
    session.session_date ||
    session.date_session ||
    session.jour ||
    null;

  const rawStart =
    session.heure_debut ||
    session.start_time ||
    session.heureDebut ||
    session.debut ||
    session.start ||
    "09:00";

  const rawEnd =
    session.heure_fin ||
    session.end_time ||
    session.heureFin ||
    session.fin ||
    session.end ||
    "17:00";

  if (!rawDate) return null;

  const start = new Date(
    `${rawDate}T${rawStart?.length === 5 ? rawStart : "09:00"}`
  );
  const end = new Date(`${rawDate}T${rawEnd?.length === 5 ? rawEnd : "17:00"}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return { start, end };
}

function normalizeFormateur(formateur) {
  return {
    id: formateur.id,
    nom:
      formateur.nom ||
      formateur.name ||
      formateur.full_name ||
      `${formateur.prenom || ""} ${formateur.nom || ""}`.trim() ||
      formateur.email ||
      `Formateur #${formateur.id}`,
    prenom: formateur.prenom || "",
    email: formateur.email || "",
  };
}

function normalizeLieu(lieu) {
  return {
    id: lieu.id,
    nom: lieu.nom || "",
    slug: lieu.slug || "",
    created_at: lieu.created_at || "",
  };
}

function normalizeSession(session, formation, formateursMap) {
  const parsed = parseDateTime(session);
  if (!parsed) return null;

  const formateurId =
    session.formateur_id ??
    session.id_formateur ??
    formation.formateur_id ??
    formation.id_formateur ??
    null;

  const formateur = formateursMap.get(Number(formateurId));

  return {
    id:
      session.id ??
      `${formation.id}-${formatDateKey(parsed.start)}-${parsed.start.getHours()}-${parsed.start.getMinutes()}`,
    formationId: formation.id,
    formationTitre:
      formation.titre ||
      formation.title ||
      formation.nom ||
      `Formation #${formation.id}`,
    formation,
    rawSession: session,
    date: formatDateKey(parsed.start),
    start: parsed.start,
    end: parsed.end,
    startTime: `${pad(parsed.start.getHours())}:${pad(
      parsed.start.getMinutes()
    )}`,
    endTime: `${pad(parsed.end.getHours())}:${pad(parsed.end.getMinutes())}`,
    formateurId: formateurId ? Number(formateurId) : null,
    formateurNom: formateur?.nom || "Non attribué",
    salle:
      session.salle ||
      session.lieu ||
      formation.salle ||
      formation.lieu ||
      formation.location ||
      "",
    color: getFormationColor(formation),
    description:
      formation.description ||
      formation.resume ||
      formation.contenu ||
      "",
  };
}

function extractSessionsFromFormation(formation, formateursMap) {
  const possibleArrays = [
    formation.sessions,
    formation.seances,
    formation.cours,
    formation.calendrier,
    formation.dates,
    formation.occurrences,
  ].filter(Array.isArray);

  if (possibleArrays.length > 0) {
    return possibleArrays
      .flat()
      .map((session) => normalizeSession(session, formation, formateursMap))
      .filter(Boolean);
  }

  if (
    formation.date &&
    (formation.heure_debut || formation.start_time || formation.heureDebut)
  ) {
    const oneSession = normalizeSession(
      {
        id: formation.id,
        date: formation.date,
        heure_debut:
          formation.heure_debut || formation.start_time || formation.heureDebut,
        heure_fin:
          formation.heure_fin || formation.end_time || formation.heureFin,
        formateur_id: formation.formateur_id || formation.id_formateur || null,
      },
      formation,
      formateursMap
    );

    return oneSession ? [oneSession] : [];
  }

  return [];
}

function buildWeeksForMonth(currentDate) {
  const firstDay = startOfMonth(currentDate);
  const lastDay = endOfMonth(currentDate);

  const gridStart = getMonday(firstDay);
  const gridEnd = addDays(
    getMonday(lastDay),
    lastDay.getDay() === 0 ? 6 : 7 - lastDay.getDay()
  );

  const days = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return weeks;
}

function EventModal({
  selectedEvent,
  onClose,
  onSave,
  onDelete,
  formateurs,
  lieux,
  saving,
  canEdit,
}) {
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (!selectedEvent) {
      setFormData(null);
      return;
    }

    setFormData({
      formationTitre: selectedEvent.formationTitre || "",
      date: selectedEvent.date || "",
      startTime: selectedEvent.startTime || "09:00",
      endTime: selectedEvent.endTime || "17:00",
      formateurId: selectedEvent.formateurId || "",
      salle: selectedEvent.salle || "",
      description: selectedEvent.description || "",
    });
  }, [selectedEvent]);

  if (!selectedEvent || !formData) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canEdit) return;
    onSave(formData);
  };

  return (
    <div className="calendar-modal__overlay" onClick={onClose}>
      <div
        className="calendar-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="calendar-modal__header">
          <div className="calendar-modal__title-wrap">
            <span
              className="calendar-modal__dot"
              style={{ backgroundColor: selectedEvent.color }}
            />
            <div>
              <p className="calendar-modal__eyebrow">Événement formation</p>
              <h3 className="calendar-modal__title">
                {selectedEvent.formationTitre}
              </h3>
            </div>
          </div>

          <button
            type="button"
            className="calendar-modal__close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="calendar-modal__form" onSubmit={handleSubmit}>
          <div className="calendar-form__grid">
            <label className="calendar-form__field">
              <span>Titre</span>
              <input
                type="text"
                value={formData.formationTitre}
                disabled={!canEdit}
                onChange={(e) =>
                  handleChange("formationTitre", e.target.value)
                }
              />
            </label>

            <label className="calendar-form__field">
              <span>Date</span>
              <input
                type="date"
                value={formData.date}
                disabled={!canEdit}
                onChange={(e) => handleChange("date", e.target.value)}
              />
            </label>

            <label className="calendar-form__field">
              <span>Heure début</span>
              <input
                type="time"
                value={formData.startTime}
                disabled={!canEdit}
                onChange={(e) => handleChange("startTime", e.target.value)}
              />
            </label>

            <label className="calendar-form__field">
              <span>Heure fin</span>
              <input
                type="time"
                value={formData.endTime}
                disabled={!canEdit}
                onChange={(e) => handleChange("endTime", e.target.value)}
              />
            </label>

            <label className="calendar-form__field">
              <span>Formateur</span>
              <select
                value={formData.formateurId}
                disabled={!canEdit}
                onChange={(e) => handleChange("formateurId", e.target.value)}
              >
                <option value="">Non attribué</option>
                {formateurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </label>

            <label className="calendar-form__field">
              <span>Lieu</span>
              <select
                value={formData.salle}
                disabled={!canEdit}
                onChange={(e) => handleChange("salle", e.target.value)}
              >
                <option value="">Sélectionner un lieu</option>
                {lieux.map((lieu) => (
                  <option key={lieu.id} value={lieu.nom}>
                    {lieu.nom}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="calendar-form__field calendar-form__field--full">
            <span>Description</span>
            <textarea
              rows={4}
              value={formData.description}
              disabled={!canEdit}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </label>

          <div className="calendar-modal__actions">
            {canEdit ? (
              <button
                type="button"
                className="calendar-btn calendar-btn--danger"
                onClick={() => onDelete(selectedEvent)}
                disabled={saving}
              >
                Supprimer ce créneau
              </button>
            ) : (
              <div />
            )}

            <div className="calendar-modal__actions-right">
              <button
                type="button"
                className="calendar-btn calendar-btn--ghost"
                onClick={onClose}
                disabled={saving}
              >
                Fermer
              </button>

              {canEdit ? (
                <button
                  type="submit"
                  className="calendar-btn calendar-btn--primary"
                  disabled={saving}
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CalendrierComplet() {
  const [formations, setFormations] = useState([]);
  const [formateurs, setFormateurs] = useState([]);
  const [lieux, setLieux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [selectedFormateur, setSelectedFormateur] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const canEdit = isAdminUser();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [formationsRes, formateursRes, lieuxRes] = await Promise.all([
          fetch(`${API_URL}/formations`, getFetchOptions("GET")),
          fetch(`${API_URL}/users/formateurs`, getFetchOptions("GET")),
          fetch(`${API_URL}/lieux`, getFetchOptions("GET")),
        ]);

        if (!formationsRes.ok) {
          if (formationsRes.status === 401) {
            throw new Error("Session expirée. Reconnecte-toi.");
          }
          throw new Error("Impossible de charger les formations.");
        }

        let formationsData = await formationsRes.json();
        let formateursData = [];
        let lieuxData = [];

        if (formateursRes.status === 401) {
          console.warn(
            "Accès refusé à /users/formateurs. La session n'est pas transmise ou n'est plus valide."
          );
        } else if (formateursRes.status === 403) {
          console.warn(
            "Accès interdit à /users/formateurs. Le compte n'est probablement pas admin."
          );
        } else if (formateursRes.ok) {
          formateursData = await formateursRes.json();
        }

        if (!lieuxRes.ok) {
          console.warn("Impossible de charger les lieux.");
        } else {
          lieuxData = await lieuxRes.json();
        }

        if (!Array.isArray(formationsData)) {
          formationsData =
            formationsData?.data ||
            formationsData?.formations ||
            formationsData?.results ||
            [];
        }

        if (!Array.isArray(formateursData)) {
          formateursData =
            formateursData?.data ||
            formateursData?.formateurs ||
            formateursData?.results ||
            [];
        }

        if (!Array.isArray(lieuxData)) {
          lieuxData =
            lieuxData?.data ||
            lieuxData?.lieux ||
            lieuxData?.results ||
            [];
        }

        if (isMounted) {
          setFormations(formationsData);
          setFormateurs(formateursData.map(normalizeFormateur));
          setLieux(lieuxData.map(normalizeLieu));
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Une erreur est survenue.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const formateursMap = useMemo(() => {
    return new Map(formateurs.map((f) => [Number(f.id), f]));
  }, [formateurs]);

  const sessions = useMemo(() => {
    return formations.flatMap((formation) =>
      extractSessionsFromFormation(formation, formateursMap)
    );
  }, [formations, formateursMap]);

  const filteredSessions = useMemo(() => {
    if (selectedFormateur === "all") return sessions;
    return sessions.filter(
      (session) => Number(session.formateurId) === Number(selectedFormateur)
    );
  }, [sessions, selectedFormateur]);

  const sessionsByDate = useMemo(() => {
    const map = new Map();

    filteredSessions.forEach((session) => {
      const key = session.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(session);
    });

    map.forEach((items) => {
      items.sort((a, b) => a.start - b.start);
    });

    return map;
  }, [filteredSessions]);

  const stats = useMemo(() => {
    const formationsCount = new Set(filteredSessions.map((s) => s.formationId))
      .size;

    const formateursCount = new Set(
      filteredSessions
        .map((s) => s.formateurId)
        .filter((value) => value !== null && value !== undefined)
    ).size;

    return {
      totalCours: filteredSessions.length,
      totalFormations: formationsCount,
      totalFormateurs: formateursCount,
    };
  }, [filteredSessions]);

  const weeks = useMemo(() => buildWeeksForMonth(currentDate), [currentDate]);

  const weekDays = useMemo(() => {
    const monday = getMonday(currentDate);
    return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  }, [currentDate]);

  const goToToday = () => setCurrentDate(new Date());

  const goPrev = () => {
    setCurrentDate((prev) =>
      viewMode === "month"
        ? new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
        : addDays(prev, -7)
    );
  };

  const goNext = () => {
    setCurrentDate((prev) =>
      viewMode === "month"
        ? new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
        : addDays(prev, 7)
    );
  };

  const getMonthTitle = () => {
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const getWeekTitle = () => {
    const monday = getMonday(currentDate);
    const sunday = addDays(monday, 6);

    return `Semaine du ${monday.getDate()} ${MONTHS[monday.getMonth()]} ${monday.getFullYear()} au ${sunday.getDate()} ${MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
  };

  const handleOpenEvent = (event) => {
    setSelectedEvent(event);
  };

  const handleCloseEvent = () => {
    setSelectedEvent(null);
  };

  const handleSaveEvent = async (formData) => {
    if (!selectedEvent) return;

    if (!canEdit) {
      alert("Seul un administrateur peut modifier un créneau.");
      return;
    }

    try {
      setSaving(true);

      const formation = formations.find(
        (f) => Number(f.id) === Number(selectedEvent.formationId)
      );

      if (!formation) {
        throw new Error("Formation introuvable.");
      }

      const sessionsArrayName = Array.isArray(formation.sessions)
        ? "sessions"
        : Array.isArray(formation.seances)
          ? "seances"
          : Array.isArray(formation.cours)
            ? "cours"
            : Array.isArray(formation.calendrier)
              ? "calendrier"
              : "sessions";

      const currentSessions = Array.isArray(formation[sessionsArrayName])
        ? formation[sessionsArrayName]
        : [];

      const updatedSessions = currentSessions.map((session) => {
        const currentId =
          session.id ??
          `${formation.id}-${session.date || session.session_date || ""}`;

        if (
          String(currentId) !==
          String(selectedEvent.rawSession.id ?? selectedEvent.id)
        ) {
          return session;
        }

        return {
          ...session,
          date: formData.date,
          session_date: formData.date,
          date_session: formData.date,
          heure_debut: formData.startTime,
          start_time: formData.startTime,
          heure_fin: formData.endTime,
          end_time: formData.endTime,
          formateur_id: formData.formateurId
            ? Number(formData.formateurId)
            : null,
          salle: formData.salle,
          lieu: formData.salle,
        };
      });

      const payload = {
        ...formation,
        titre: formData.formationTitre,
        title: formData.formationTitre,
        description: formData.description,
        formateur_id: formData.formateurId
          ? Number(formData.formateurId)
          : null,
        salle: formData.salle,
        lieu: formData.salle,
        [sessionsArrayName]: updatedSessions,
      };

      const response = await fetch(
        `${API_URL}/formations/${formation.id}`,
        getFetchOptions("PUT", payload)
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expirée. Reconnecte-toi en admin.");
        }
        if (response.status === 403) {
          throw new Error("Accès interdit. Admin requis.");
        }
        throw new Error(
          "La sauvegarde a échoué. Vérifie le format attendu côté API."
        );
      }

      setSelectedEvent(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      alert(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventToDelete) => {
    if (!canEdit) {
      alert("Seul un administrateur peut supprimer un créneau.");
      return;
    }

    if (!window.confirm("Supprimer ce créneau du calendrier ?")) return;

    try {
      setSaving(true);

      const formation = formations.find(
        (f) => Number(f.id) === Number(eventToDelete.formationId)
      );

      if (!formation) {
        throw new Error("Formation introuvable.");
      }

      const sessionsArrayName = Array.isArray(formation.sessions)
        ? "sessions"
        : Array.isArray(formation.seances)
          ? "seances"
          : Array.isArray(formation.cours)
            ? "cours"
            : Array.isArray(formation.calendrier)
              ? "calendrier"
              : "sessions";

      const currentSessions = Array.isArray(formation[sessionsArrayName])
        ? formation[sessionsArrayName]
        : [];

      const updatedSessions = currentSessions.filter((session) => {
        const currentId =
          session.id ??
          `${formation.id}-${session.date || session.session_date || ""}`;

        return (
          String(currentId) !==
          String(eventToDelete.rawSession.id ?? eventToDelete.id)
        );
      });

      const payload = {
        ...formation,
        [sessionsArrayName]: updatedSessions,
      };

      const response = await fetch(
        `${API_URL}/formations/${formation.id}`,
        getFetchOptions("PUT", payload)
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expirée. Reconnecte-toi en admin.");
        }
        if (response.status === 403) {
          throw new Error("Accès interdit. Admin requis.");
        }
        throw new Error("La suppression du créneau a échoué côté API.");
      }

      setSelectedEvent(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      alert(err.message || "Erreur lors de la suppression.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="calendar-admin">
      <div className="calendar-admin__header">
        <div>
          <span className="calendar-admin__eyebrow">Planification</span>
          <h2 className="calendar-admin__title">Calendrier complet des cours</h2>
          <p className="calendar-admin__subtitle">
            Visualise toutes les formations, les formateurs, les créneaux et
            modifie-les directement depuis un calendrier personnel administrable.
          </p>
        </div>

        <div className="calendar-admin__stats">
          <div className="calendar-stat">
            <strong>{stats.totalCours}</strong>
            <span>Cours</span>
          </div>
          <div className="calendar-stat">
            <strong>{stats.totalFormations}</strong>
            <span>Formations</span>
          </div>
          <div className="calendar-stat">
            <strong>{stats.totalFormateurs}</strong>
            <span>Formateurs</span>
          </div>
        </div>
      </div>

      {!canEdit ? (
        <div className="calendar-state">
          Mode consultation : les modifications sont réservées aux administrateurs.
        </div>
      ) : null}

      <div className="calendar-toolbar">
        <div className="calendar-toolbar__left">
          <button className="calendar-btn calendar-btn--ghost" onClick={goPrev}>
            ←
          </button>
          <button
            className="calendar-btn calendar-btn--ghost"
            onClick={goToToday}
          >
            Aujourd’hui
          </button>
          <button className="calendar-btn calendar-btn--ghost" onClick={goNext}>
            →
          </button>
        </div>

        <div className="calendar-toolbar__center">
          <h3>{viewMode === "month" ? getMonthTitle() : getWeekTitle()}</h3>
        </div>

        <div className="calendar-toolbar__right">
          <select
            className="calendar-select"
            value={selectedFormateur}
            onChange={(e) => setSelectedFormateur(e.target.value)}
          >
            <option value="all">Tous les formateurs</option>
            {formateurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>

          <div className="calendar-view-switch">
            <button
              className={`calendar-btn ${
                viewMode === "month"
                  ? "calendar-btn--primary"
                  : "calendar-btn--ghost"
              }`}
              onClick={() => setViewMode("month")}
            >
              Mois
            </button>
            <button
              className={`calendar-btn ${
                viewMode === "week"
                  ? "calendar-btn--primary"
                  : "calendar-btn--ghost"
              }`}
              onClick={() => setViewMode("week")}
            >
              Semaine
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="calendar-state">Chargement du calendrier...</div>
      ) : error ? (
        <div className="calendar-state calendar-state--error">{error}</div>
      ) : (
        <>
          {viewMode === "month" && (
            <div className="calendar-month">
              <div className="calendar-month__head">
                {DAYS_SHORT.map((day) => (
                  <div key={day} className="calendar-month__head-cell">
                    {day}
                  </div>
                ))}
              </div>

              <div className="calendar-month__body">
                {weeks.flat().map((day) => {
                  const key = formatDateKey(day);
                  const isCurrentMonth =
                    day.getMonth() === currentDate.getMonth();
                  const isToday = key === formatDateKey(new Date());
                  const dayEvents = sessionsByDate.get(key) || [];

                  return (
                    <div
                      key={key}
                      className={`calendar-day ${
                        !isCurrentMonth ? "is-outside" : ""
                      } ${isToday ? "is-today" : ""}`}
                    >
                      <div className="calendar-day__header">
                        <span>{day.getDate()}</span>
                      </div>

                      <div className="calendar-day__events">
                        {dayEvents.length === 0 ? (
                          <div className="calendar-day__empty">Aucun cours</div>
                        ) : (
                          dayEvents.map((eventItem) => (
                            <button
                              key={`${eventItem.id}-${eventItem.startTime}`}
                              type="button"
                              className="calendar-event"
                              style={{
                                backgroundColor: `${eventItem.color}18`,
                                borderLeftColor: eventItem.color,
                              }}
                              onClick={() => handleOpenEvent(eventItem)}
                              title={`${eventItem.formationTitre} - ${eventItem.startTime} / ${eventItem.endTime}`}
                            >
                              <span
                                className="calendar-event__color"
                                style={{ backgroundColor: eventItem.color }}
                              />
                              <span className="calendar-event__time">
                                {eventItem.startTime} - {eventItem.endTime}
                              </span>
                              <span className="calendar-event__title">
                                {eventItem.formationTitre}
                              </span>
                              <span className="calendar-event__trainer">
                                {eventItem.formateurNom}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "week" && (
            <div className="calendar-week">
              <div className="calendar-week__grid">
                {weekDays.map((day) => {
                  const key = formatDateKey(day);
                  const dayEvents = sessionsByDate.get(key) || [];
                  const isToday = key === formatDateKey(new Date());

                  return (
                    <div
                      key={key}
                      className={`calendar-week__column ${
                        isToday ? "is-today" : ""
                      }`}
                    >
                      <div className="calendar-week__column-head">
                        <span className="calendar-week__day-name">
                          {DAYS_FULL[(day.getDay() + 6) % 7]}
                        </span>
                        <strong className="calendar-week__day-number">
                          {day.getDate()} {MONTHS[day.getMonth()].slice(0, 3)}
                        </strong>
                      </div>

                      <div className="calendar-week__events">
                        {dayEvents.length === 0 ? (
                          <div className="calendar-week__empty">
                            Aucun cours
                          </div>
                        ) : (
                          dayEvents.map((eventItem) => (
                            <button
                              key={`${eventItem.id}-${eventItem.startTime}`}
                              type="button"
                              className="calendar-event calendar-event--week"
                              style={{
                                backgroundColor: `${eventItem.color}18`,
                                borderLeftColor: eventItem.color,
                              }}
                              onClick={() => handleOpenEvent(eventItem)}
                            >
                              <span
                                className="calendar-event__color"
                                style={{ backgroundColor: eventItem.color }}
                              />
                              <span className="calendar-event__time">
                                {eventItem.startTime} - {eventItem.endTime}
                              </span>
                              <span className="calendar-event__title">
                                {eventItem.formationTitre}
                              </span>
                              <span className="calendar-event__trainer">
                                {eventItem.formateurNom}
                              </span>
                              {eventItem.salle ? (
                                <span className="calendar-event__room">
                                  {eventItem.salle}
                                </span>
                              ) : null}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="calendar-legend">
        <h4>Légende des couleurs</h4>
        <div className="calendar-legend__items">
          {[
            ...new Map(
              filteredSessions.map((item) => [
                item.formationId,
                {
                  id: item.formationId,
                  title: item.formationTitre,
                  color: item.color,
                },
              ])
            ).values(),
          ].map((formation) => (
            <div key={formation.id} className="calendar-legend__item">
              <span
                className="calendar-legend__dot"
                style={{ backgroundColor: formation.color }}
              />
              <span>{formation.title}</span>
            </div>
          ))}
        </div>
      </div>

      <EventModal
        selectedEvent={selectedEvent}
        onClose={handleCloseEvent}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        formateurs={formateurs}
        lieux={lieux}
        saving={saving}
        canEdit={canEdit}
      />
    </section>
  );
}