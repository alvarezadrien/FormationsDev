import { useCallback, useEffect, useMemo, useState } from "react";
import {
  importParticipantPresenceFile,
  PARTICIPANT_PRESENCE_IMPORT_ACCEPT,
  PARTICIPANT_PRESENCE_IMPORT_GUIDE,
} from "../../features/presences/utils/participantPresenceImport";
import "./FichePresenceAdmin.css";

const API_BASE_URL = "http://localhost:8080";

function buildParticipantImportEditorRows(matchedRows = [], issues = []) {
  const readyRows = matchedRows.map((row, index) => ({
    key: `matched-${row.participantId}-${index}`,
    status: "ready",
    lineNumber: null,
    message: "Ligne prete a importer.",
    raw: {
      participantId: String(row.participantId ?? ""),
      inscriptionId: "",
      participantEmail: row.participantEmail || "",
      participantPrenom: "",
      participantNom: "",
      participantFullName: row.participantName || "",
      present: row.present ? "present" : "absent",
    },
    resolvedParticipantId: row.participantId,
    resolvedPresent: row.present,
  }));

  const issueRows = issues.map((issue) => ({
    ...issue,
    status: "issue",
  }));

  return [...readyRows, ...issueRows];
}

function buildParticipantCorrectionDrafts(editorRows = []) {
  return editorRows.reduce((accumulator, row) => {
    accumulator[row.key] = {
      participantId: row.resolvedParticipantId
        ? String(row.resolvedParticipantId)
        : "",
      presentValue:
        row.resolvedPresent === true
          ? "present"
          : row.resolvedPresent === false
            ? "absent"
            : "",
    };

    return accumulator;
  }, {});
}

function buildIssueFromEditorRow(row) {
  return {
    key: row.key,
    lineNumber: row.lineNumber,
    message: row.message,
    raw: row.raw,
    resolvedParticipantId: row.resolvedParticipantId || "",
    resolvedPresent:
      row.resolvedPresent === true
        ? true
        : row.resolvedPresent === false
          ? false
          : null,
  };
}

function formatDate(dateString) {
  if (!dateString) return "Non renseignée";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatFullName(participant) {
  return `${participant?.prenom || ""} ${participant?.nom || ""}`.trim();
}

export function FichesPresenceAdmin() {
  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedFiche, setSelectedFiche] = useState(null);
  const [participantDrafts, setParticipantDrafts] = useState({});
  const [participantImporting, setParticipantImporting] = useState(false);
  const [participantApplying, setParticipantApplying] = useState(false);
  const [participantImportReport, setParticipantImportReport] = useState(null);
  const [participantImportBatch, setParticipantImportBatch] = useState([]);
  const [participantImportEditorRows, setParticipantImportEditorRows] =
    useState([]);
  const [participantCorrectionDrafts, setParticipantCorrectionDrafts] =
    useState({});
  const [showParticipantCorrections, setShowParticipantCorrections] =
    useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ficheToDelete, setFicheToDelete] = useState(null);

  const clearParticipantImportState = useCallback(() => {
    setParticipantImportReport(null);
    setParticipantImportBatch([]);
    setParticipantImportEditorRows([]);
    setParticipantCorrectionDrafts({});
    setShowParticipantCorrections(false);
  }, []);

  const resetParticipantDrafts = useCallback(
    (participants = []) => {
      setParticipantDrafts(
        participants.reduce((accumulator, participant) => {
          accumulator[participant.id] = Boolean(participant.present);
          return accumulator;
        }, {})
      );
      clearParticipantImportState();
    },
    [clearParticipantImportState]
  );

  const fetchFiches = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/fiches-presence`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de charger les fiches");
      }

      setFiches(data?.fiches || []);
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiches();
  }, [fetchFiches]);

  const fetchFicheDetails = useCallback(
    async (id) => {
      try {
        setLoadingDetails(true);
        setError("");
        setMessage("");

        const response = await fetch(`${API_BASE_URL}/fiches-presence/${id}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Impossible de charger la fiche");
        }

        setSelectedFiche(data);
        resetParticipantDrafts(data?.participants || []);
      } catch (err) {
        setError(err.message || "Erreur lors du chargement de la fiche");
      } finally {
        setLoadingDetails(false);
      }
    },
    [resetParticipantDrafts]
  );

  const openDeleteModal = (fiche) => {
    setMessage("");
    setError("");
    setFicheToDelete(fiche);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = useCallback(() => {
    if (deletingId !== null) return;
    setIsDeleteModalOpen(false);
    setFicheToDelete(null);
  }, [deletingId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        isDeleteModalOpen &&
        deletingId === null
      ) {
        closeDeleteModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDeleteModal, deletingId, isDeleteModalOpen]);

  const handleDelete = async () => {
    if (!ficheToDelete?.id) return;

    try {
      setDeletingId(ficheToDelete.id);
      setMessage("");
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/fiches-presence/${ficheToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Suppression impossible");
      }

      setFiches((prev) => prev.filter((item) => item.id !== ficheToDelete.id));

      if (selectedFiche?.fiche?.id === ficheToDelete.id) {
        setSelectedFiche(null);
        setParticipantDrafts({});
        clearParticipantImportState();
      }

      setMessage(data?.message || "Fiche supprimée avec succès");
      closeDeleteModal();
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  };

  const participants = useMemo(
    () => selectedFiche?.participants || [],
    [selectedFiche]
  );

  const participantsCount = useMemo(() => participants.length, [participants]);

  const presentsCount = useMemo(() => {
    return participants.filter((participant) => {
      if (Object.prototype.hasOwnProperty.call(participantDrafts, participant.id)) {
        return Boolean(participantDrafts[participant.id]);
      }

      return Boolean(participant.present);
    }).length;
  }, [participantDrafts, participants]);

  const absentsCount = useMemo(
    () => participantsCount - presentsCount,
    [participantsCount, presentsCount]
  );

  const getDisplayedParticipantPresence = useCallback(
    (participant) => {
      if (Object.prototype.hasOwnProperty.call(participantDrafts, participant.id)) {
        return Boolean(participantDrafts[participant.id]);
      }

      return Boolean(participant.present);
    },
    [participantDrafts]
  );

  const persistParticipantPresence = useCallback(
    async (participantId, nextValue) => {
      if (!selectedFiche?.fiche?.id) {
        throw new Error("Aucune fiche selectionnee.");
      }

      const response = await fetch(
        `${API_BASE_URL}/fiches-presence/${selectedFiche.fiche.id}/participants/${participantId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            present: nextValue,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de modifier la présence");
      }

      return data;
    },
    [selectedFiche]
  );

  const applyParticipantPresenceLocally = useCallback((participantId, nextValue) => {
    setSelectedFiche((prev) =>
      prev
        ? {
            ...prev,
            participants: prev.participants.map((participant) =>
              participant.id === participantId
                ? { ...participant, present: nextValue ? 1 : 0 }
                : participant
            ),
          }
        : prev
    );

    setParticipantDrafts((prev) => ({
      ...prev,
      [participantId]: Boolean(nextValue),
    }));
  }, []);

  const togglePresence = async (participantId, nextValue) => {
    if (!selectedFiche?.fiche?.id) return;

    try {
      setError("");
      setMessage("");

      const data = await persistParticipantPresence(participantId, nextValue);
      applyParticipantPresenceLocally(participantId, nextValue);

      setMessage(data?.message || "Présence mise à jour avec succès");
    } catch (err) {
      setError(err.message || "Erreur lors de la mise à jour");
    }
  };

  const handleParticipantImportFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!selectedFiche?.participants?.length) {
      setError("Selectionne d'abord une fiche avec des participants.");
      event.target.value = "";
      return;
    }

    try {
      setParticipantImporting(true);
      setMessage("");
      setError("");

      const imported = await importParticipantPresenceFile(file, {
        participants: selectedFiche.participants,
      });
      const editorRows = buildParticipantImportEditorRows(
        imported.matchedRows,
        imported.report.issues
      );

      setParticipantDrafts((prev) => {
        const nextDrafts = { ...prev };

        imported.matchedRows.forEach((row) => {
          nextDrafts[row.participantId] = row.present;
        });

        return nextDrafts;
      });

      setParticipantImportBatch(
        editorRows
          .filter((row) => row.status === "ready")
          .map((row) => ({
            editorKey: row.key,
            participantId: row.resolvedParticipantId,
            participantName: row.raw.participantFullName || "Non renseigné",
            participantEmail: row.raw.participantEmail || "",
            present: Boolean(row.resolvedPresent),
          }))
      );
      setParticipantImportEditorRows(editorRows);
      setParticipantImportReport(imported.report);
      setParticipantCorrectionDrafts(buildParticipantCorrectionDrafts(editorRows));
      setShowParticipantCorrections(false);

      if (imported.matchedRows.length > 0) {
        const correctionHint =
          imported.report.issues.length > 0
            ? ` ${imported.report.issues.length} ligne(s) restent a corriger via le bouton du formulaire.`
            : "";

        setMessage(
          `${imported.matchedRows.length} participant(s) charge(s) dans la fiche.${correctionHint}`
        );
      } else if (imported.report.issues.length > 0) {
        setMessage(
          `${imported.report.issues.length} ligne(s) necessitent une correction via le bouton du formulaire.`
        );
      }

      if (imported.matchedRows.length === 0 && imported.report.errors.length > 0) {
        setError("Aucune ligne exploitable n'a ete chargee depuis le fichier.");
      }
    } catch (err) {
      clearParticipantImportState();
      setError(
        err.message || "Impossible d'importer ce fichier de presences participants."
      );
    } finally {
      setParticipantImporting(false);
      event.target.value = "";
    }
  };

  const handleClearParticipantImport = useCallback(() => {
    resetParticipantDrafts(selectedFiche?.participants || []);
  }, [resetParticipantDrafts, selectedFiche]);

  const handleParticipantCorrectionChange = (issueKey, field, value) => {
    setParticipantCorrectionDrafts((prev) => ({
      ...prev,
      [issueKey]: {
        participantId: "",
        presentValue: "",
        ...(prev[issueKey] || {}),
        [field]: value,
      },
    }));
    setError("");
    setMessage("");
  };

  const handleApplyParticipantCorrection = (issue) => {
    const correctionDraft = participantCorrectionDrafts[issue.key] || {
      participantId: "",
      presentValue: "",
    };

    if (!correctionDraft.participantId || !correctionDraft.presentValue) {
      setError("Choisis un participant et un statut avant de valider la correction.");
      return;
    }

    const matchedParticipant = participants.find(
      (participant) =>
        String(participant.id) === String(correctionDraft.participantId)
    );

    if (!matchedParticipant) {
      setError("Le participant choisi n'existe pas dans cette fiche.");
      return;
    }

    if (
      participantImportBatch.some(
        (row) =>
          row.editorKey !== issue.key &&
          String(row.participantId) === String(matchedParticipant.id)
      )
    ) {
      setError("Ce participant est deja utilise dans le formulaire d'import.");
      return;
    }

    const present = correctionDraft.presentValue === "present";
    const previousParticipantId = issue.resolvedParticipantId;
    const correctedRow = {
      editorKey: issue.key,
      participantId: matchedParticipant.id,
      participantName: formatFullName(matchedParticipant) || "Non renseigné",
      participantEmail: matchedParticipant.email || "",
      present,
    };

    const nextBatch = [
      ...participantImportBatch.filter((row) => row.editorKey !== issue.key),
      correctedRow,
    ];

    const nextEditorRows = participantImportEditorRows.map((row) =>
      row.key === issue.key
        ? {
            ...row,
            status: "ready",
            message: "Ligne prete a importer.",
            resolvedParticipantId: matchedParticipant.id,
            resolvedPresent: present,
          }
        : row
    );
    const nextIssues = nextEditorRows
      .filter((row) => row.status === "issue")
      .map(buildIssueFromEditorRow);

    setParticipantDrafts((prev) => {
      const nextDrafts = {
        ...prev,
        [matchedParticipant.id]: present,
      };

      if (
        previousParticipantId &&
        String(previousParticipantId) !== String(matchedParticipant.id)
      ) {
        const previousParticipant = participants.find(
          (participant) =>
            String(participant.id) === String(previousParticipantId)
        );

        if (previousParticipant) {
          nextDrafts[previousParticipant.id] = Boolean(previousParticipant.present);
        }
      }

      return nextDrafts;
    });
    setParticipantImportBatch(nextBatch);
    setParticipantImportEditorRows(nextEditorRows);
    setParticipantImportReport((prev) =>
      prev
        ? {
            ...prev,
            matchedRows: nextBatch.length,
            issues: nextIssues,
            errors: nextIssues.map((item) => item.message),
          }
        : prev
    );
    setParticipantCorrectionDrafts((prev) => {
      return {
        ...prev,
        [issue.key]: {
          participantId: String(matchedParticipant.id),
          presentValue: present ? "present" : "absent",
        },
      };
    });
    setShowParticipantCorrections(true);
    setError("");
    setMessage("La ligne en erreur a ete corrigee et ajoutee a l'import.");
  };

  const handleApplyParticipantImport = async () => {
    if (!selectedFiche?.fiche?.id || participantImportBatch.length === 0) {
      return;
    }

    try {
      setParticipantApplying(true);
      setMessage("");
      setError("");

      const results = await Promise.allSettled(
        participantImportBatch.map(async (row) => {
          const nextValue =
            participantDrafts[row.participantId] ?? Boolean(row.present);

          await persistParticipantPresence(row.participantId, nextValue);

          return {
            participantId: row.participantId,
            present: nextValue,
          };
        })
      );

      const successfulUpdates = new Map();
      const failedRows = [];

      results.forEach((result, index) => {
        const sourceRow = participantImportBatch[index];

        if (result.status === "fulfilled") {
          successfulUpdates.set(
            sourceRow.participantId,
            Boolean(result.value.present)
          );
          return;
        }

        failedRows.push(sourceRow);
      });

      if (successfulUpdates.size > 0) {
        setSelectedFiche((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map((participant) =>
                  successfulUpdates.has(participant.id)
                    ? {
                        ...participant,
                        present: successfulUpdates.get(participant.id) ? 1 : 0,
                      }
                    : participant
                ),
              }
            : prev
        );
      }

      if (failedRows.length === 0) {
        clearParticipantImportState();
        setMessage(
          `${participantImportBatch.length} presence(s) participant enregistree(s).`
        );
      } else {
        setParticipantImportBatch(failedRows);
        setParticipantImportReport((prev) =>
          prev
            ? {
                ...prev,
                matchedRows: failedRows.length,
              }
            : prev
        );
        setError(
          `Import partiel : ${participantImportBatch.length - failedRows.length} enregistree(s), ${failedRows.length} en echec.`
        );
      }
    } catch (err) {
      setError(err.message || "Erreur lors de l'application de l'import.");
    } finally {
      setParticipantApplying(false);
    }
  };

  return (
    <>
      <section className="fiches-admin">
        <div className="fiches-admin__header">
          <div>
            <h2 className="fiches-admin__title">Fiches de présence</h2>
            <p className="fiches-admin__text">
              Ouvre une fiche pour contrôler les participants puis importe leurs
              statuts en lot si besoin.
            </p>
          </div>

          <button className="fiches-admin__refresh" onClick={fetchFiches}>
            Actualiser
          </button>
        </div>

        {message && <div className="fiches-admin__message">{message}</div>}
        {error && <div className="fiches-admin__error">{error}</div>}

        {loading ? (
          <div className="fiches-admin__empty">Chargement...</div>
        ) : fiches.length === 0 ? (
          <div className="fiches-admin__empty">Aucune fiche trouvée.</div>
        ) : (
          <div className="fiches-admin__table-wrapper">
            <table className="fiches-admin__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Formation</th>
                  <th>Formateur</th>
                  <th>Email</th>
                  <th>Séance</th>
                  <th>Date</th>
                  <th>Heures</th>
                  <th>Remarques</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {fiches.map((fiche) => (
                  <tr key={fiche.id}>
                    <td>#{fiche.id}</td>
                    <td>{fiche.nom_formation}</td>
                    <td>
                      {fiche.prenom_formateur} {fiche.nom_formateur}
                    </td>
                    <td>{fiche.email_formateur}</td>
                    <td>{fiche.titre_seance}</td>
                    <td>{fiche.date_presence}</td>
                    <td>
                      {fiche.heure_debut} - {fiche.heure_fin}
                    </td>
                    <td>{fiche.remarques || "-"}</td>
                    <td>
                      <div className="fiches-admin__row-actions">
                        <button
                          className="fiches-admin__view"
                          onClick={() => fetchFicheDetails(fiche.id)}
                        >
                          Voir
                        </button>

                        <button
                          className="fiches-admin__delete"
                          onClick={() => openDeleteModal(fiche)}
                          disabled={deletingId === fiche.id}
                        >
                          {deletingId === fiche.id ? "Suppression..." : "Supprimer"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="fiches-admin__detail-shell">
          <h3 className="fiches-admin__detail-title">Détail de la fiche</h3>

          {loadingDetails ? (
            <div className="fiches-admin__empty">Chargement de la fiche...</div>
          ) : !selectedFiche ? (
            <div className="fiches-admin__empty">
              Clique sur “Voir” pour afficher une fiche et importer les présences
              participants.
            </div>
          ) : (
            <div className="fiches-admin__detail">
              <div className="fiches-admin__detail-head">
                <div>
                  <h4>{selectedFiche.fiche.titre_seance}</h4>
                  <p>
                    <strong>Formation :</strong> {selectedFiche.fiche.nom_formation}
                  </p>
                  <p>
                    <strong>Formateur :</strong>{" "}
                    {selectedFiche.fiche.prenom_formateur ||
                      selectedFiche.fiche.prenom ||
                      ""}{" "}
                    {selectedFiche.fiche.nom_formateur ||
                      selectedFiche.fiche.nom ||
                      ""}
                  </p>
                  <p>
                    <strong>Email :</strong>{" "}
                    {selectedFiche.fiche.email_formateur || "Non renseigné"}
                  </p>
                  <p>
                    <strong>Date :</strong>{" "}
                    {formatDate(selectedFiche.fiche.date_presence)}
                  </p>
                  <p>
                    <strong>Horaires :</strong> {selectedFiche.fiche.heure_debut} -{" "}
                    {selectedFiche.fiche.heure_fin}
                  </p>
                  <p>
                    <strong>Remarques :</strong>{" "}
                    {selectedFiche.fiche.remarques || "Aucune remarque"}
                  </p>
                </div>

                <button
                  type="button"
                  className="fiches-admin__refresh"
                  onClick={() => fetchFicheDetails(selectedFiche.fiche.id)}
                >
                  Recharger la fiche
                </button>
              </div>

              <section className="fiches-admin__import">
                <div className="fiches-admin__import-head">
                  <div>
                    <span className="fiches-admin__import-eyebrow">
                      Import participants
                    </span>
                    <h4 className="fiches-admin__import-title">
                      Import des presences participants
                    </h4>
                    <p className="fiches-admin__import-text">
                      Charge un Excel ou CSV pour pre-remplir les statuts de la
                      fiche ouverte avant application en lot.
                    </p>
                  </div>

                  <span className="fiches-admin__import-badge">
                    `.xlsx` `.xls` `.csv`
                  </span>
                </div>

                <div className="fiches-admin__import-layout">
                  <div className="fiches-admin__import-panel">
                    <label
                      className="fiches-admin__import-label"
                      htmlFor="participant-presence-import-admin"
                    >
                      Fichier a importer
                    </label>
                    <input
                      id="participant-presence-import-admin"
                      className="fiches-admin__import-input"
                      type="file"
                      accept={PARTICIPANT_PRESENCE_IMPORT_ACCEPT}
                      onChange={handleParticipantImportFile}
                      disabled={participantImporting || participantApplying}
                    />

                    <div className="fiches-admin__import-guide">
                      {PARTICIPANT_PRESENCE_IMPORT_GUIDE.map((item) => (
                        <span key={item} className="fiches-admin__import-pill">
                          {item}
                        </span>
                      ))}
                    </div>

                    <div className="fiches-admin__empty fiches-admin__empty--soft">
                      Les lignes reconnues mettent a jour le tableau ci-dessous
                      localement avant enregistrement serveur.
                    </div>
                  </div>

                  <div
                    className={`fiches-admin__import-report ${
                      participantImportReport
                        ? participantImportReport.errors.length > 0
                          ? "is-review"
                          : "is-ready"
                        : ""
                    }`}
                  >
                    <div className="fiches-admin__import-report-head">
                      <div>
                        <h4 className="fiches-admin__import-title">
                          Controle de l&apos;import
                        </h4>
                        <p className="fiches-admin__import-text">
                          Verifie les lignes chargees avant mise a jour.
                        </p>
                      </div>

                      <span className="fiches-admin__import-status">
                        {participantImportReport
                          ? participantImportReport.errors.length > 0
                            ? "A verifier"
                            : "Pret"
                          : "En attente"}
                      </span>
                    </div>

                    {participantImporting ? (
                      <div className="fiches-admin__empty">
                        Analyse du fichier en cours...
                      </div>
                    ) : null}

                    {!participantImporting && !participantImportReport ? (
                      <div className="fiches-admin__empty">
                        Aucun fichier importe pour le moment.
                      </div>
                    ) : null}

                    {!participantImporting && participantImportReport ? (
                      <>
                        <div className="fiches-admin__import-stats">
                          <div className="fiches-admin__import-stat">
                            <strong>{participantImportReport.totalRows}</strong>
                            <span>Lignes</span>
                          </div>
                          <div className="fiches-admin__import-stat">
                            <strong>{participantImportReport.matchedRows}</strong>
                            <span>Chargees</span>
                          </div>
                          <div className="fiches-admin__import-stat">
                            <strong>{participantImportReport.errors.length}</strong>
                            <span>Erreurs</span>
                          </div>
                        </div>

                        <div className="fiches-admin__empty fiches-admin__empty--soft">
                          <strong>{participantImportReport.fileName}</strong>
                          {" "}
                          sur la feuille {participantImportReport.sheetName} importe
                          le {participantImportReport.importedAt}.
                        </div>

                        {participantImportReport.errors.length > 0 ? (
                          <div className="fiches-admin__import-list fiches-admin__import-list--error">
                            <strong>Points a corriger</strong>
                            <ul>
                              {participantImportReport.errors.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {participantImportEditorRows.length > 0 ? (
                          <>
                            <div className="fiches-admin__correction-toggle">
                              <button
                                type="button"
                                className="fiches-admin__correct"
                                onClick={() =>
                                  setShowParticipantCorrections((prev) => !prev)
                                }
                              >
                                {showParticipantCorrections
                                  ? "Masquer le formulaire d'ajustement"
                                  : `Ouvrir le formulaire d'ajustement (${participantImportEditorRows.length})`}
                              </button>
                            </div>

                            {showParticipantCorrections ? (
                              <div className="fiches-admin__corrections">
                                {participantImportEditorRows.map((editorRow) => {
                                  const correctionDraft =
                                    participantCorrectionDrafts[editorRow.key] || {
                                      participantId: "",
                                      presentValue: "",
                                    };
                                  const importedName =
                                    editorRow.raw.participantFullName ||
                                    `${editorRow.raw.participantPrenom || ""} ${editorRow.raw.participantNom || ""}`.trim() ||
                                    "Non renseigne";

                                  return (
                                    <div
                                      key={editorRow.key}
                                      className="fiches-admin__correction-card"
                                    >
                                      <div className="fiches-admin__correction-head">
                                        <strong>
                                          {editorRow.lineNumber
                                            ? `Ligne ${editorRow.lineNumber}`
                                            : "Ligne importee"}
                                        </strong>
                                        <span>{editorRow.message}</span>
                                      </div>

                                      <div className="fiches-admin__correction-raw">
                                        <span>
                                          Participant importe : {importedName}
                                        </span>
                                        <span>
                                          Etat :{" "}
                                          {editorRow.status === "ready"
                                            ? "Pret"
                                            : "A corriger"}
                                        </span>
                                        {editorRow.raw.participantEmail ? (
                                          <span>
                                            Email : {editorRow.raw.participantEmail}
                                          </span>
                                        ) : null}
                                        {editorRow.raw.present ? (
                                          <span>
                                            Valeur presence : {editorRow.raw.present}
                                          </span>
                                        ) : null}
                                      </div>

                                      <div className="fiches-admin__correction-grid">
                                        <div className="fiches-admin__correction-field">
                                          <label>Participant de la fiche</label>
                                          <select
                                            value={correctionDraft.participantId}
                                            onChange={(event) =>
                                              handleParticipantCorrectionChange(
                                                editorRow.key,
                                                "participantId",
                                                event.target.value
                                              )
                                            }
                                          >
                                            <option value="">
                                              Selectionner un participant
                                            </option>
                                            {participants.map((participant) => (
                                              <option
                                                key={participant.id}
                                                value={participant.id}
                                              >
                                                {formatFullName(participant) ||
                                                  "Participant sans nom"}
                                                {participant.email
                                                  ? ` - ${participant.email}`
                                                  : ""}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="fiches-admin__correction-field">
                                          <label>Statut corrige</label>
                                          <select
                                            value={correctionDraft.presentValue}
                                            onChange={(event) =>
                                              handleParticipantCorrectionChange(
                                                editorRow.key,
                                                "presentValue",
                                                event.target.value
                                              )
                                            }
                                          >
                                            <option value="">
                                              Selectionner un statut
                                            </option>
                                            <option value="present">
                                              Present
                                            </option>
                                            <option value="absent">
                                              Absent
                                            </option>
                                          </select>
                                        </div>
                                      </div>

                                      <div className="fiches-admin__correction-actions">
                                        <button
                                          type="button"
                                          className="fiches-admin__correct"
                                          onClick={() =>
                                            handleApplyParticipantCorrection(
                                              editorRow
                                            )
                                          }
                                        >
                                          Mettre a jour cette ligne
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </>
                        ) : null}

                        {participantImportReport.warnings.length > 0 ? (
                          <div className="fiches-admin__import-list fiches-admin__import-list--warning">
                            <strong>Points de controle</strong>
                            <ul>
                              {participantImportReport.warnings.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        <div className="fiches-admin__import-actions">
                          <button
                            type="button"
                            className="fiches-admin__apply"
                            onClick={handleApplyParticipantImport}
                            disabled={
                              participantApplying ||
                              participantImportBatch.length === 0
                            }
                          >
                            {participantApplying
                              ? "Import en cours..."
                              : `Enregistrer ${participantImportBatch.length} presence(s)`}
                          </button>

                          <button
                            type="button"
                            className="fiches-admin__reset"
                            onClick={handleClearParticipantImport}
                            disabled={participantApplying}
                          >
                            Effacer l&apos;import
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </section>

              <div className="fiches-admin__count">
                Participants inscrits : {participantsCount} | Présents :{" "}
                {presentsCount} | Absents : {absentsCount}
              </div>

              {participants.length === 0 ? (
                <div className="fiches-admin__empty">
                  Aucun participant inscrit sur cette fiche.
                </div>
              ) : (
                <div className="fiches-admin__participants-wrapper">
                  <table className="fiches-admin__participants-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Nom complet</th>
                        <th>Email</th>
                        <th>Téléphone</th>
                        <th>Présence</th>
                      </tr>
                    </thead>

                    <tbody>
                      {participants.map((participant, index) => {
                        const displayedPresent =
                          getDisplayedParticipantPresence(participant);

                        return (
                          <tr key={participant.id}>
                            <td>{index + 1}</td>
                            <td>{formatFullName(participant) || "Non renseigné"}</td>
                            <td>{participant.email || "Non renseigné"}</td>
                            <td>{participant.telephone || "Non renseigné"}</td>
                            <td>
                              <div className="fiches-admin__presence-cell">
                                <input
                                  type="checkbox"
                                  checked={displayedPresent}
                                  onChange={() =>
                                    togglePresence(
                                      participant.id,
                                      !displayedPresent
                                    )
                                  }
                                />
                                <span
                                  className={
                                    displayedPresent
                                      ? "fiches-admin__presence-badge fiches-admin__presence-badge--present"
                                      : "fiches-admin__presence-badge fiches-admin__presence-badge--absent"
                                  }
                                >
                                  {displayedPresent ? "Présent" : "Absent"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {isDeleteModalOpen && (
        <div
          className="fiches-admin__modal-overlay"
          onClick={closeDeleteModal}
          role="presentation"
        >
          <div
            className="fiches-admin__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fiches-delete-modal-title"
            aria-describedby="fiches-delete-modal-description"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fiches-admin__modal-header">
              <span className="fiches-admin__modal-badge">Confirmation</span>

              <h3
                className="fiches-admin__modal-title"
                id="fiches-delete-modal-title"
              >
                Supprimer cette fiche de présence ?
              </h3>

              <p
                className="fiches-admin__modal-text"
                id="fiches-delete-modal-description"
              >
                Vous êtes sur le point de supprimer cette fiche de présence.
                Cette action est définitive.
              </p>
            </div>

            <div className="fiches-admin__modal-details">
              <p>
                <strong>Formation :</strong> {ficheToDelete?.nom_formation || "-"}
              </p>
              <p>
                <strong>Formateur :</strong>{" "}
                {ficheToDelete?.prenom_formateur || ""}{" "}
                {ficheToDelete?.nom_formateur || ""}
              </p>
              <p>
                <strong>Email :</strong> {ficheToDelete?.email_formateur || "-"}
              </p>
              <p>
                <strong>Séance :</strong> {ficheToDelete?.titre_seance || "-"}
              </p>
              <p>
                <strong>Date :</strong> {ficheToDelete?.date_presence || "-"}
              </p>
              <p>
                <strong>Heures :</strong> {ficheToDelete?.heure_debut || "-"} -{" "}
                {ficheToDelete?.heure_fin || "-"}
              </p>
              <p>
                <strong>Remarques :</strong> {ficheToDelete?.remarques || "-"}
              </p>
            </div>

            <div className="fiches-admin__modal-actions">
              <button
                type="button"
                className="fiches-admin__modal-cancel"
                onClick={closeDeleteModal}
                disabled={deletingId !== null}
              >
                Annuler
              </button>

              <button
                type="button"
                className="fiches-admin__modal-delete"
                onClick={handleDelete}
                disabled={deletingId !== null}
              >
                {deletingId !== null
                  ? "Suppression..."
                  : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
