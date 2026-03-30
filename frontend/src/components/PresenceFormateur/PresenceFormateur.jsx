import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PRESENCE_IMPORT_ACCEPT,
  PRESENCE_IMPORT_GUIDE,
  importPresenceFile,
} from "../../features/presences/utils/presenceImport";
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

function buildPresenceEndpoint(isAdminMode, formationId) {
  return isAdminMode
    ? `${API_BASE_URL}/presences-formateurs/${formationId}`
    : `${API_BASE_URL}/mes-presences-formateur/${formationId}`;
}

export function PresenceFormateur({ mode = "admin" }) {
  const [presences, setPresences] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [importingFile, setImportingFile] = useState(false);
  const [applyingImport, setApplyingImport] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const [importBatch, setImportBatch] = useState([]);

  const isAdminMode = mode === "admin";

  const fetchPresences = useCallback(async () => {
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
  }, [isAdminMode]);

  useEffect(() => {
    fetchPresences();
  }, [fetchPresences]);

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

  const clearImportState = () => {
    setImportReport(null);
    setImportBatch([]);
  };

  const persistPresenceDraft = async (formationId, draft) => {
    const response = await fetch(
      buildPresenceEndpoint(isAdminMode, formationId),
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

    return data;
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

      const data = await persistPresenceDraft(formationId, draft);

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

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setImportingFile(true);
      setMessage("");
      setError("");

      const imported = await importPresenceFile(file, { presences });

      setDrafts((prev) => {
        const nextDrafts = { ...prev };

        imported.matchedRows.forEach((row) => {
          nextDrafts[row.formationId] = {
            ...(prev[row.formationId] || {}),
            ...row.draft,
          };
        });

        return nextDrafts;
      });

      setImportBatch(imported.matchedRows);
      setImportReport(imported.report);

      if (imported.matchedRows.length > 0) {
        setMessage(
          `${imported.matchedRows.length} presence(s) importee(s) dans les brouillons.`
        );
      }

      if (imported.matchedRows.length === 0 && imported.report.errors.length > 0) {
        setError("Aucune ligne exploitable n'a ete chargee depuis le fichier.");
      }
    } catch (err) {
      clearImportState();
      setError(err.message || "Impossible d'importer ce fichier de presences.");
    } finally {
      setImportingFile(false);
      event.target.value = "";
    }
  };

  const handleApplyImport = async () => {
    if (importBatch.length === 0) {
      return;
    }

    try {
      setApplyingImport(true);
      setMessage("");
      setError("");

      const results = await Promise.allSettled(
        importBatch.map(async (row) => {
          const currentDraft = drafts[row.formationId] || row.draft;
          const data = await persistPresenceDraft(row.formationId, currentDraft);

          return {
            formationId: row.formationId,
            formationNom: row.formationNom,
            data,
          };
        })
      );

      const updatedPresences = new Map();
      const updatedDrafts = {};
      const failedRows = [];

      results.forEach((result, index) => {
        const sourceRow = importBatch[index];

        if (result.status === "fulfilled") {
          const presence = result.value.data?.presence;

          if (presence) {
            updatedPresences.set(sourceRow.formationId, presence);
            updatedDrafts[sourceRow.formationId] = {
              statut_presence: presence.statut_presence || "present",
              commentaire_presence: presence.commentaire_presence || "",
            };
          }

          return;
        }

        failedRows.push(sourceRow);
      });

      if (updatedPresences.size > 0) {
        setPresences((prev) =>
          prev.map((item) => updatedPresences.get(item.formation_id) || item)
        );

        setDrafts((prev) => ({
          ...prev,
          ...updatedDrafts,
        }));
      }

      if (failedRows.length === 0) {
        clearImportState();
        setMessage(
          `${importBatch.length} presence(s) importee(s) et enregistree(s).`
        );
      } else {
        setImportBatch(failedRows);
        setImportReport((prev) =>
          prev
            ? {
                ...prev,
                matchedRows: failedRows.length,
              }
            : prev
        );
        setError(
          `Import partiel : ${importBatch.length - failedRows.length} enregistree(s), ${failedRows.length} en echec.`
        );
      }
    } catch (err) {
      setError(err.message || "Erreur lors de l'application de l'import.");
    } finally {
      setApplyingImport(false);
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

      <section className="trainer-presence__import">
        <div className="trainer-presence__import-head">
          <div>
            <span className="trainer-presence__import-eyebrow">
              Import presences
            </span>
            <h4 className="trainer-presence__import-title">
              {isAdminMode
                ? "Import en lot pour les formateurs"
                : "Import de mes presences"}
            </h4>
            <p className="trainer-presence__import-text">
              Charge un fichier Excel ou CSV pour remplir les brouillons, puis
              applique l&apos;import pour creer ou mettre a jour les presences.
            </p>
          </div>

          <span className="trainer-presence__import-badge">
            `.xlsx` `.xls` `.csv`
          </span>
        </div>

        <div className="trainer-presence__import-layout">
          <div className="trainer-presence__import-panel">
            <label
              className="trainer-presence__import-label"
              htmlFor={`presence-import-${mode}`}
            >
              Fichier a importer
            </label>
            <input
              id={`presence-import-${mode}`}
              className="trainer-presence__import-input"
              type="file"
              accept={PRESENCE_IMPORT_ACCEPT}
              onChange={handleImportFile}
              disabled={loading || importingFile || applyingImport}
            />

            <div className="trainer-presence__import-guide">
              {PRESENCE_IMPORT_GUIDE.map((item) => (
                <span key={item} className="trainer-presence__import-pill">
                  {item}
                </span>
              ))}
            </div>

            <div className="trainer-presence__note">
              Les lignes reconnues sont chargees dans les brouillons des cartes
              ci-dessous. Tu peux ensuite corriger manuellement avant
              l&apos;enregistrement en lot.
            </div>
          </div>

          <div
            className={`trainer-presence__import-report ${
              importReport
                ? importReport.errors.length > 0
                  ? "is-review"
                  : "is-ready"
                : ""
            }`}
          >
            <div className="trainer-presence__import-report-head">
              <div>
                <h4 className="trainer-presence__import-title">
                  Controle de l&apos;import
                </h4>
                <p className="trainer-presence__import-text">
                  Verifie les lignes chargees avant de creer les presences.
                </p>
              </div>

              <span className="trainer-presence__import-status">
                {importReport
                  ? importReport.errors.length > 0
                    ? "A verifier"
                    : "Pret"
                  : "En attente"}
              </span>
            </div>

            {importingFile ? (
              <div className="trainer-presence__empty">
                Analyse du fichier en cours...
              </div>
            ) : null}

            {!importingFile && !importReport ? (
              <div className="trainer-presence__empty">
                Aucun fichier importe pour le moment.
              </div>
            ) : null}

            {!importingFile && importReport ? (
              <>
                <div className="trainer-presence__import-stats">
                  <div className="trainer-presence__import-stat">
                    <strong>{importReport.totalRows}</strong>
                    <span>Lignes</span>
                  </div>
                  <div className="trainer-presence__import-stat">
                    <strong>{importReport.matchedRows}</strong>
                    <span>Chargees</span>
                  </div>
                  <div className="trainer-presence__import-stat">
                    <strong>{importReport.errors.length}</strong>
                    <span>Erreurs</span>
                  </div>
                </div>

                <div className="trainer-presence__note">
                  <strong>{importReport.fileName}</strong>
                  {" "}
                  sur la feuille {importReport.sheetName} importee le{" "}
                  {importReport.importedAt}.
                </div>

                {importReport.errors.length > 0 ? (
                  <div className="trainer-presence__error-list">
                    <strong>Points a corriger</strong>
                    <ul>
                      {importReport.errors.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {importReport.warnings.length > 0 ? (
                  <div className="trainer-presence__warning-list">
                    <strong>Points de controle</strong>
                    <ul>
                      {importReport.warnings.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="trainer-presence__import-actions">
                  <button
                    type="button"
                    className="trainer-presence__save"
                    onClick={handleApplyImport}
                    disabled={applyingImport || importBatch.length === 0}
                  >
                    {applyingImport
                      ? "Import en cours..."
                      : isAdminMode
                        ? `Creer / mettre a jour ${importBatch.length} presence(s)`
                        : `Enregistrer ${importBatch.length} presence(s)`}
                  </button>

                  <button
                    type="button"
                    className="trainer-presence__refresh"
                    onClick={clearImportState}
                    disabled={applyingImport}
                  >
                    Effacer l&apos;import
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

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
