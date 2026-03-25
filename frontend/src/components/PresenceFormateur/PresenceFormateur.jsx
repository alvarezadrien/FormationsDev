import { useEffect, useMemo, useState } from "react";
import "./PresenceFormateur.css";

const API_BASE_URL = "http://localhost:8080";

function formatDateRange(item) {
  const start = item.date_debut || "Non renseignée";
  const end = item.date_fin || "Non renseignée";

  if (start === end) {
    return start;
  }

  return `${start} -> ${end}`;
}

function formatTimeRange(item) {
  if (!item.heure_debut && !item.heure_fin) {
    return "Horaires non renseignés";
  }

  return `${item.heure_debut || "--:--"} - ${item.heure_fin || "--:--"}`;
}

export function PresenceFormateur({ mode = "admin" }) {
  const [presences, setPresences] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState(null);

  const isAdminMode = mode === "admin";

  const fetchPresences = async () => {
    try {
      setLoading(true);
      setError("");

      const endpoint = isAdminMode
        ? `${API_BASE_URL}/presences-formateurs`
        : `${API_BASE_URL}/mes-presences-formateur`;

      const response = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || "Impossible de charger les présences formateurs."
        );
      }

      const nextPresences = Array.isArray(data?.presences) ? data.presences : [];

      setPresences(nextPresences);

      setDrafts(
        nextPresences.reduce((acc, item) => {
          acc[item.formation_id] = {
            statut_presence: item.statut_presence || "present",
            commentaire_presence: item.commentaire_presence || "",
          };
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresences();
  }, [isAdminMode]);

  const summary = useMemo(() => {
    const absentCount = presences.filter(
      (item) => item.statut_presence === "absent"
    ).length;

    return {
      total: presences.length,
      absent: absentCount,
      present: presences.length - absentCount,
    };
  }, [presences]);

  const updateDraft = (formationId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [formationId]: {
        ...(prev[formationId] || {}),
        [field]: value,
      },
    }));
    setMessage("");
    setError("");
  };

  const handleSave = async (formationId) => {
    const draft = drafts[formationId];

    if (!draft) {
      return;
    }

    try {
      setSavingId(formationId);
      setMessage("");
      setError("");

      const response = await fetch(
        isAdminMode
          ? `${API_BASE_URL}/presences-formateurs/${formationId}`
          : `${API_BASE_URL}/mes-presences-formateur/${formationId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(draft),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || "Impossible d'enregistrer le statut de présence."
        );
      }

      if (data?.presence) {
        setPresences((prev) =>
          prev.map((item) =>
            item.formation_id === formationId ? data.presence : item
          )
        );

        setDrafts((prev) => ({
          ...prev,
          [formationId]: {
            statut_presence: data.presence.statut_presence || "present",
            commentaire_presence: data.presence.commentaire_presence || "",
          },
        }));
      }

      setMessage(
        data?.message || "Le statut de présence a bien été enregistré."
      );
    } catch (err) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="trainer-presence">
      <div className="trainer-presence__toolbar">
        <div>
          <h3 className="trainer-presence__title">
            {isAdminMode ? "Présence formateurs" : "Mes présences formations"}
          </h3>
          <p className="trainer-presence__text">
            {isAdminMode
              ? "Visualise rapidement qui assure chaque formation et si un remplaçant prend le relais."
              : "Déclare si tu es présent ou absent sur tes formations. Si tu es absent, le remplaçant attribué sera affiché comme intervenant."}
          </p>
        </div>

        <button
          type="button"
          className="trainer-presence__refresh"
          onClick={fetchPresences}
        >
          Actualiser
        </button>
      </div>

      <div className="trainer-presence__summary">
        <div className="trainer-presence__summary-card">
          <strong>{summary.total}</strong>
          <span>Formations suivies</span>
        </div>
        <div className="trainer-presence__summary-card">
          <strong>{summary.present}</strong>
          <span>Présents</span>
        </div>
        <div className="trainer-presence__summary-card is-alert">
          <strong>{summary.absent}</strong>
          <span>Absents</span>
        </div>
      </div>

      {message && <div className="trainer-presence__message">{message}</div>}
      {error && <div className="trainer-presence__error">{error}</div>}

      {loading ? (
        <div className="trainer-presence__empty">Chargement des présences...</div>
      ) : presences.length === 0 ? (
        <div className="trainer-presence__empty">
          {isAdminMode
            ? "Aucune formation liée à un formateur pour le moment."
            : "Aucune formation ne t'est attribuée pour le moment."}
        </div>
      ) : (
        <div className="trainer-presence__grid">
          {presences.map((item) => {
            const draft = drafts[item.formation_id] || {
              statut_presence: item.statut_presence || "present",
              commentaire_presence: item.commentaire_presence || "",
            };

            const isAbsent = draft.statut_presence === "absent";

            return (
              <article className="trainer-presence__card" key={item.formation_id}>
                <div className="trainer-presence__card-top">
                  <div>
                    <span
                      className={`trainer-presence__badge ${
                        item.statut_presence === "absent"
                          ? "is-absent"
                          : "is-present"
                      }`}
                    >
                      {item.statut_presence === "absent" ? "Absent" : "Présent"}
                    </span>
                    <h4 className="trainer-presence__card-title">
                      {item.formation_nom}
                    </h4>
                  </div>
                </div>

                <div className="trainer-presence__meta">
                  <p>
                    <strong>Formateur :</strong> {item.formateur_nom_complet}
                  </p>
                  <p>
                    <strong>Remplaçant :</strong>{" "}
                    {item.remplacant_nom_complet || "Aucun remplaçant attribué"}
                  </p>
                  <p>
                    <strong>Dates :</strong> {formatDateRange(item)}
                  </p>
                  <p>
                    <strong>Horaires :</strong> {formatTimeRange(item)}
                  </p>
                  <p>
                    <strong>Lieu :</strong> {item.lieu || "Non renseigné"}
                  </p>
                  <p>
                    <strong>Cours assuré par :</strong> {item.cours_assure_par}
                  </p>
                </div>

                {item.statut_presence === "absent" && !item.remplacement_effectif && (
                  <div className="trainer-presence__warning">
                    Aucun remplaçant n'est attribué pour cette formation.
                  </div>
                )}

                <div className="trainer-presence__editor">
                  <div className="trainer-presence__choices">
                    <button
                      type="button"
                      className={`trainer-presence__choice ${
                        draft.statut_presence === "present" ? "is-active" : ""
                      }`}
                      onClick={() =>
                        updateDraft(
                          item.formation_id,
                          "statut_presence",
                          "present"
                        )
                      }
                    >
                      Présent
                    </button>

                    <button
                      type="button"
                      className={`trainer-presence__choice ${
                        draft.statut_presence === "absent" ? "is-active" : ""
                      }`}
                      onClick={() =>
                        updateDraft(
                          item.formation_id,
                          "statut_presence",
                          "absent"
                        )
                      }
                    >
                      Absent
                    </button>
                  </div>

                  <textarea
                    className="trainer-presence__textarea"
                    value={draft.commentaire_presence}
                    onChange={(event) =>
                      updateDraft(
                        item.formation_id,
                        "commentaire_presence",
                        event.target.value
                      )
                    }
                    placeholder={
                      isAbsent
                        ? "Ajoute une précision pour cette absence si besoin."
                        : "Commentaire optionnel."
                    }
                  />

                  <button
                    type="button"
                    className="trainer-presence__save"
                    onClick={() => handleSave(item.formation_id)}
                    disabled={savingId === item.formation_id}
                  >
                    {savingId === item.formation_id
                      ? "Enregistrement..."
                      : isAdminMode
                        ? "Enregistrer pour ce formateur"
                        : "Enregistrer mon statut"}
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
