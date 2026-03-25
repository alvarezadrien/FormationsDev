import { useEffect, useMemo, useState } from "react";
import {
  getAvailableCoAnimateurs,
  getAvailableRemplacants,
  normalizeFormateur,
} from "../../features/formateurs/utils/formateurAssignments";
import {
  DAYS_FULL,
  DAYS_SHORT,
  MONTHS,
  addDays,
  buildCreneauxFromSessions,
  buildWeeksForMonth,
  extractSessionsFromFormation,
  formatDateKey,
  getFetchOptions,
  getMaxDateFromSessions,
  getMinDateFromSessions,
  getMonday,
  getRemplacantId,
  getSessionDateValue,
  getSessionEndValue,
  getSessionStartValue,
  isAdminUser,
} from "../../features/planning/utils/calendarPlanning";
import "./CalendrierComplet.css";

const API_URL = "http://localhost:8080";

function normalizeLieu(lieu) {
  return {
    id: lieu.id,
    nom: lieu.nom || "",
    slug: lieu.slug || "",
    created_at: lieu.created_at || "",
  };
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
      coAnimation: Boolean(selectedEvent.secondFormateurId),
      secondFormateurId: selectedEvent.secondFormateurId || "",
      remplacantId: selectedEvent.remplacantId || "",
      salle: selectedEvent.salle || "",
      description: selectedEvent.description || "",
    });
  }, [selectedEvent]);

  const availableRemplacants = useMemo(() => {
    return getAvailableRemplacants(formateurs, {
      formateurId: formData?.formateurId,
      secondFormateurId: formData?.coAnimation
        ? formData?.secondFormateurId
        : "",
    });
  }, [
    formateurs,
    formData?.coAnimation,
    formData?.formateurId,
    formData?.secondFormateurId,
  ]);

  const availableSecondFormateurs = useMemo(() => {
    return getAvailableCoAnimateurs(formateurs, {
      formateurId: formData?.formateurId,
      remplacantId: formData?.remplacantId,
    });
  }, [formateurs, formData?.formateurId, formData?.remplacantId]);

  useEffect(() => {
    if (!formData?.coAnimation) {
      return;
    }

    const fallbackSecond = availableSecondFormateurs[0] || null;

    if (!formData.secondFormateurId && fallbackSecond) {
      setFormData((prev) => ({
        ...prev,
        secondFormateurId: String(fallbackSecond.id),
      }));
      return;
    }

    if (
      formData.secondFormateurId &&
      !availableSecondFormateurs.some(
        (formateur) =>
          String(formateur.id) === String(formData.secondFormateurId)
      )
    ) {
      setFormData((prev) => ({
        ...prev,
        secondFormateurId: fallbackSecond ? String(fallbackSecond.id) : "",
      }));
    }
  }, [
    availableSecondFormateurs,
    formData?.coAnimation,
    formData?.secondFormateurId,
  ]);

  const displayedRemplacants = useMemo(() => {
    const fallbackRemplacants = formateurs.filter((f) => {
      if (!formData?.formateurId) return true;
      return String(f.id) !== String(formData.formateurId);
    });

    if (availableRemplacants.length > 0) {
      return availableRemplacants;
    }

    return fallbackRemplacants;
  }, [availableRemplacants, formateurs, formData?.formateurId]);

  if (!selectedEvent || !formData) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (
        field === "formateurId" &&
        value &&
        String(prev.remplacantId) === String(value)
      ) {
        next.remplacantId = "";
      }

      if (
        field === "formateurId" &&
        value &&
        String(prev.secondFormateurId) === String(value)
      ) {
        next.secondFormateurId = "";
      }

      if (
        field === "secondFormateurId" &&
        value &&
        String(prev.remplacantId) === String(value)
      ) {
        next.remplacantId = "";
      }

      return next;
    });
  };

  const handleToggleCoAnimation = () => {
    setFormData((prev) => {
      const nextEnabled = !prev.coAnimation;
      const fallbackSecond = availableSecondFormateurs[0] || null;

      return {
        ...prev,
        coAnimation: nextEnabled,
        secondFormateurId: nextEnabled
          ? prev.secondFormateurId ||
            (fallbackSecond ? String(fallbackSecond.id) : "")
          : "",
      };
    });
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
              <span>Co-animation</span>
              <button
                type="button"
                className={`calendar-btn ${
                  formData.coAnimation
                    ? "calendar-btn--primary"
                    : "calendar-btn--ghost"
                }`}
                disabled={!canEdit}
                onClick={handleToggleCoAnimation}
              >
                {formData.coAnimation ? "Activée" : "Activer"}
              </button>
            </label>

            {formData.coAnimation ? (
              <label className="calendar-form__field">
                <span>Deuxième formateur</span>
                <select
                  value={formData.secondFormateurId}
                  disabled={!canEdit}
                  onChange={(e) =>
                    handleChange("secondFormateurId", e.target.value)
                  }
                >
                  <option value="">Sélectionner un 2e formateur</option>
                  {availableSecondFormateurs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="calendar-form__field">
              <span>Remplaçant</span>
              <select
                value={formData.remplacantId}
                disabled={!canEdit}
                onChange={(e) => handleChange("remplacantId", e.target.value)}
              >
                <option value="">Aucun remplaçant</option>
                {displayedRemplacants.map((f) => (
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
  const [selectedFormation, setSelectedFormation] = useState("all");
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
          // silence volontaire
        } else if (formateursRes.status === 403) {
          // silence volontaire
        } else if (formateursRes.ok) {
          formateursData = await formateursRes.json();
        }

        if (lieuxRes.ok) {
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

  const formationOptions = useMemo(() => {
    return [...formations]
      .map((formation) => ({
        id: Number(formation.id),
        title:
          formation.nom ||
          formation.titre ||
          formation.title ||
          `Formation #${formation.id}`,
      }))
      .sort((a, b) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" }));
  }, [formations]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesFormateur =
        selectedFormateur === "all" ||
        Number(session.formateurId) === Number(selectedFormateur);

      const matchesFormation =
        selectedFormation === "all" ||
        Number(session.formationId) === Number(selectedFormation);

      return matchesFormateur && matchesFormation;
    });
  }, [sessions, selectedFormateur, selectedFormation]);

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

    if (
      formData.remplacantId &&
      String(formData.remplacantId) === String(formData.formateurId)
    ) {
      alert("Le remplaçant doit être différent du formateur principal.");
      return;
    }

    if (
      formData.coAnimation &&
      !formData.secondFormateurId
    ) {
      alert("Veuillez sélectionner le deuxième formateur pour la co-animation.");
      return;
    }

    if (
      formData.coAnimation &&
      String(formData.secondFormateurId) === String(formData.formateurId)
    ) {
      alert("Le deuxième formateur doit être différent du formateur principal.");
      return;
    }

    if (
      formData.coAnimation &&
      formData.remplacantId &&
      String(formData.remplacantId) === String(formData.secondFormateurId)
    ) {
      alert("Le remplaçant doit être différent du deuxième formateur.");
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

      const currentSessions = Array.isArray(formation.sessions)
        ? formation.sessions
        : [];

      const updatedSessions = currentSessions.map((session) => {
        const sameId =
          selectedEvent.rawSession?.id != null &&
          session.id != null &&
          String(session.id) === String(selectedEvent.rawSession.id);

        const sameFallbackIdentity =
          getSessionDateValue(session) === selectedEvent.date &&
          getSessionStartValue(session) === selectedEvent.startTime &&
          getSessionEndValue(session) === selectedEvent.endTime;

        if (!sameId && !sameFallbackIdentity) {
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
          id_formateur: formData.formateurId
            ? Number(formData.formateurId)
            : null,
          second_formateur_id:
            formData.coAnimation && formData.secondFormateurId
              ? Number(formData.secondFormateurId)
              : null,
          remplacant_id: formData.remplacantId
            ? Number(formData.remplacantId)
            : null,
          id_remplacant: formData.remplacantId
            ? Number(formData.remplacantId)
            : null,
          salle: formData.salle,
          lieu: formData.salle,
        };
      });

      const creneaux = buildCreneauxFromSessions(updatedSessions);
      const dateDebut = getMinDateFromSessions(updatedSessions);
      const dateFin = getMaxDateFromSessions(updatedSessions);

      if (!dateDebut || !dateFin || creneaux.length === 0) {
        throw new Error(
          "Impossible de reconstruire la planification de la formation."
        );
      }

      const payload = {
        nom:
          formData.formationTitre ||
          formation.nom ||
          formation.titre ||
          formation.title ||
          "",
        description: formData.description || formation.description || "",
        formateur_id: formData.formateurId
          ? Number(formData.formateurId)
          : null,
        second_formateur_id:
          formData.coAnimation && formData.secondFormateurId
            ? Number(formData.secondFormateurId)
            : null,
        remplacant_id: formData.remplacantId
          ? Number(formData.remplacantId)
          : null,
        lieu: formData.salle || formation.lieu || formation.salle || "",
        nombre_participants: Number(
          formation.nombre_participants ?? formation.participants ?? 0
        ),
        statut: formation.statut || "actif",
        date_debut: dateDebut,
        date_fin: dateFin,
        mode_planification: "manuel",
        creneaux,
      };

      const response = await fetch(
        `${API_URL}/formations/${formation.id}`,
        getFetchOptions("PUT", payload)
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expirée. Reconnecte-toi en admin.");
        }
        if (response.status === 403) {
          throw new Error("Accès interdit. Admin requis.");
        }
        throw new Error(
          responseData?.message ||
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

      const currentSessions = Array.isArray(formation.sessions)
        ? formation.sessions
        : [];

      const updatedSessions = currentSessions.filter((session) => {
        const sameId =
          eventToDelete.rawSession?.id != null &&
          session.id != null &&
          String(session.id) === String(eventToDelete.rawSession.id);

        const sameFallbackIdentity =
          getSessionDateValue(session) === eventToDelete.date &&
          getSessionStartValue(session) === eventToDelete.startTime &&
          getSessionEndValue(session) === eventToDelete.endTime;

        return !(sameId || sameFallbackIdentity);
      });

      if (updatedSessions.length === 0) {
        throw new Error(
          "Impossible de supprimer le dernier créneau depuis ce calendrier."
        );
      }

      const creneaux = buildCreneauxFromSessions(updatedSessions);
      const dateDebut = getMinDateFromSessions(updatedSessions);
      const dateFin = getMaxDateFromSessions(updatedSessions);

      if (!dateDebut || !dateFin || creneaux.length === 0) {
        throw new Error(
          "Impossible de reconstruire la planification après suppression."
        );
      }

      const payload = {
        nom: formation.nom || formation.titre || formation.title || "",
        description: formation.description || "",
        formateur_id: formation.formateur_id || formation.id_formateur || null,
        remplacant_id: getRemplacantId(formation),
        lieu: formation.lieu || formation.salle || "",
        nombre_participants: Number(
          formation.nombre_participants ?? formation.participants ?? 0
        ),
        statut: formation.statut || "actif",
        date_debut: dateDebut,
        date_fin: dateFin,
        mode_planification: "manuel",
        creneaux,
      };

      const response = await fetch(
        `${API_URL}/formations/${formation.id}`,
        getFetchOptions("PUT", payload)
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expirée. Reconnecte-toi en admin.");
        }
        if (response.status === 403) {
          throw new Error("Accès interdit. Admin requis.");
        }
        throw new Error(
          responseData?.message ||
            "La suppression du créneau a échoué côté API."
        );
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
            value={selectedFormation}
            onChange={(e) => setSelectedFormation(e.target.value)}
          >
            <option value="all">Toutes les formations</option>
            {formationOptions.map((formation) => (
              <option key={formation.id} value={formation.id}>
                {formation.title}
              </option>
            ))}
          </select>

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
                              {eventItem.secondFormateurNom ? (
                                <span className="calendar-event__trainer">
                                  Co-animation : {eventItem.secondFormateurNom}
                                </span>
                              ) : null}
                              {eventItem.remplacantNom ? (
                                <span className="calendar-event__trainer">
                                  Remplaçant : {eventItem.remplacantNom}
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
                              {eventItem.secondFormateurNom ? (
                                <span className="calendar-event__trainer">
                                  Co-animation : {eventItem.secondFormateurNom}
                                </span>
                              ) : null}
                              {eventItem.remplacantNom ? (
                                <span className="calendar-event__trainer">
                                  Remplaçant : {eventItem.remplacantNom}
                                </span>
                              ) : null}
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
