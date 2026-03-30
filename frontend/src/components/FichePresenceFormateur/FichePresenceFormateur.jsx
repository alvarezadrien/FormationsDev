import { useCallback, useEffect, useMemo, useState } from "react";
import {
  importParticipantPresenceFile,
  PARTICIPANT_PRESENCE_IMPORT_ACCEPT,
  PARTICIPANT_PRESENCE_IMPORT_GUIDE,
} from "../../features/presences/utils/participantPresenceImport";
import "./FichePresenceFormateur.css";

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

export function FichePresenceFormateur() {
  const [formations, setFormations] = useState([]);
  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedFiche, setSelectedFiche] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
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

  const [formData, setFormData] = useState({
    formation_id: "",
    titre_seance: "",
    date_presence: "",
    heure_debut: "",
    heure_fin: "",
    remarques: "",
  });

  const fetchFormations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/formations`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      setFormations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchMesFiches = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/mes-fiches-presence`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de charger vos fiches");
      }

      setFiches(data?.fiches || []);
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFormations();
    fetchMesFiches();
  }, [fetchFormations, fetchMesFiches]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      formation_id: "",
      titre_seance: "",
      date_presence: "",
      heure_debut: "",
      heure_fin: "",
      remarques: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (
      !formData.formation_id ||
      !formData.titre_seance.trim() ||
      !formData.date_presence ||
      !formData.heure_debut ||
      !formData.heure_fin
    ) {
      setError("Tous les champs obligatoires doivent être remplis");
      return;
    }

    if (formData.heure_fin <= formData.heure_debut) {
      setError("L'heure de fin doit être supérieure à l'heure de début");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_BASE_URL}/fiches-presence`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formation_id: Number(formData.formation_id),
          titre_seance: formData.titre_seance.trim(),
          date_presence: formData.date_presence,
          heure_debut: formData.heure_debut,
          heure_fin: formData.heure_fin,
          remarques: formData.remarques.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de créer la fiche");
      }

      setMessage(data?.message || "Fiche créée avec succès");
      resetForm();
      await fetchMesFiches();

      if (data?.fiche_id) {
        await fetchFicheDetails(data.fiche_id);
      }
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cette fiche de présence ?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");
      setMessage("");

      const response = await fetch(`${API_BASE_URL}/fiches-presence/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Suppression impossible");
      }

      setFiches((prev) => prev.filter((item) => item.id !== id));

      if (selectedFiche?.fiche?.id === id) {
        setSelectedFiche(null);
        setParticipantDrafts({});
        clearParticipantImportState();
      }

      setMessage(data?.message || "Fiche supprimée avec succès");
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  };

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
      setError("Ouvre d'abord une fiche avec des participants pour importer.");
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

  const formatDate = (dateString) => {
    if (!dateString) return "Non renseignée";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatFullName = (participant) => {
    return `${participant?.prenom || ""} ${participant?.nom || ""}`.trim();
  };

  const escapeHtml = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const participants = useMemo(
    () => selectedFiche?.participants || [],
    [selectedFiche]
  );

  const participantsCount = useMemo(() => {
    return participants.length;
  }, [participants]);

  const presentsCount = useMemo(() => {
    return participants.filter((participant) => {
      if (Object.prototype.hasOwnProperty.call(participantDrafts, participant.id)) {
        return Boolean(participantDrafts[participant.id]);
      }

      return Boolean(participant.present);
    }).length;
  }, [participantDrafts, participants]);

  const absentsCount = useMemo(() => {
    return participantsCount - presentsCount;
  }, [participantsCount, presentsCount]);

  const buildPrintHTML = () => {
    if (!selectedFiche?.fiche) return "";

    const fiche = selectedFiche.fiche;

    const participantsRows =
      participants.length > 0
        ? participants
            .map(
              (participant, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapeHtml(formatFullName(participant) || "Non renseigné")}</td>
                  <td>${escapeHtml(participant.email || "Non renseigné")}</td>
                  <td>${escapeHtml(participant.telephone || "Non renseigné")}</td>
                  <td>
                    <span class="print-status ${
                      participant.present ? "present" : "absent"
                    }">
                      ${participant.present ? "Présent" : "Absent"}
                    </span>
                  </td>
                  <td><div class="print-signature-line"></div></td>
                </tr>
              `
            )
            .join("")
        : `
          <tr>
            <td colspan="6" class="print-empty-row">
              Aucun participant inscrit pour cette formation.
            </td>
          </tr>
        `;

    return `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Fiche de présence - ${escapeHtml(
            fiche.titre_seance || "Séance"
          )}</title>
          <style>
            * {
              box-sizing: border-box;
            }

            @page {
              size: A4 portrait;
              margin: 14mm;
            }

            body {
              margin: 0;
              background: #f3f4f6;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
            }

            .print-page {
              width: 100%;
              padding: 0;
            }

            .print-sheet {
              background: #ffffff;
              border-radius: 20px;
              padding: 24px;
              border: 1px solid #e5e7eb;
              box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
            }

            .print-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              padding: 18px;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              background: #f9fafb;
              margin-bottom: 20px;
            }

            .print-header h1 {
              margin: 0 0 10px;
              font-size: 1.4rem;
              color: #111827;
            }

            .print-header p {
              margin: 0 0 8px;
              color: #374151;
              line-height: 1.5;
              font-size: 0.95rem;
            }

            .print-badge {
              min-width: 220px;
              border-radius: 16px;
              padding: 16px;
              background: linear-gradient(135deg, #2563eb, #1d4ed8);
              color: #ffffff;
            }

            .print-badge-label {
              font-size: 0.82rem;
              opacity: 0.9;
              margin-bottom: 8px;
            }

            .print-badge-value {
              font-size: 1.3rem;
              font-weight: 800;
              line-height: 1.2;
            }

            .print-summary {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 14px;
              margin-bottom: 20px;
            }

            .print-summary-card {
              font-weight: 700;
              color: #111827;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              padding: 14px 16px;
              border-radius: 14px;
              text-align: center;
            }

            .print-table-wrapper {
              width: 100%;
              overflow: hidden;
              border-radius: 16px;
              border: 1px solid #e5e7eb;
              margin-bottom: 20px;
            }

            .print-table {
              width: 100%;
              border-collapse: collapse;
              background: #fff;
            }

            .print-table thead {
              background: #f3f4f6;
            }

            .print-table th,
            .print-table td {
              padding: 13px 14px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
              font-size: 0.92rem;
              vertical-align: middle;
            }

            .print-table th {
              color: #111827;
              font-weight: 800;
            }

            .print-table td {
              color: #374151;
            }

            .print-table th:first-child,
            .print-table td:first-child {
              width: 52px;
              text-align: center;
            }

            .print-table th:last-child,
            .print-table td:last-child {
              min-width: 140px;
            }

            .print-status {
              display: inline-block;
              padding: 6px 10px;
              border-radius: 999px;
              font-weight: 700;
              font-size: 0.84rem;
            }

            .print-status.present {
              background: #dcfce7;
              color: #166534;
              border: 1px solid #bbf7d0;
            }

            .print-status.absent {
              background: #fee2e2;
              color: #b91c1c;
              border: 1px solid #fecaca;
            }

            .print-signature-line {
              height: 28px;
              border-bottom: 1px solid #9ca3af;
              min-width: 110px;
            }

            .print-footer {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 18px;
            }

            .print-footer-box {
              padding: 18px;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              background: #f9fafb;
            }

            .print-footer-box p {
              margin: 0 0 10px;
              color: #374151;
              line-height: 1.5;
              font-size: 0.95rem;
            }

            .print-footer-signature {
              margin-top: 26px;
              height: 36px;
              border-bottom: 1px solid #6b7280;
            }

            .print-empty-row {
              text-align: center;
              padding: 20px;
              color: #6b7280;
            }

            @media print {
              body {
                background: #ffffff;
              }

              .print-sheet {
                border: 1px solid #e5e7eb;
                box-shadow: none;
                border-radius: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-page">
            <div class="print-sheet">
              <div class="print-header">
                <div>
                  <h1>Fiche de présence</h1>
                  <p><strong>Séance :</strong> ${escapeHtml(
                    fiche.titre_seance || "Non renseigné"
                  )}</p>
                  <p><strong>Formation :</strong> ${escapeHtml(
                    fiche.nom_formation || "Non renseigné"
                  )}</p>
                  <p><strong>Lieu :</strong> ${escapeHtml(
                    fiche.lieu || "Non renseigné"
                  )}</p>
                  <p><strong>Date :</strong> ${escapeHtml(
                    formatDate(fiche.date_presence)
                  )}</p>
                  <p><strong>Horaires :</strong> ${escapeHtml(
                    `${fiche.heure_debut || "--:--"} - ${fiche.heure_fin || "--:--"}`
                  )}</p>
                  <p><strong>Remarques :</strong> ${escapeHtml(
                    fiche.remarques || "Aucune remarque"
                  )}</p>
                </div>

                <div class="print-badge">
                  <div class="print-badge-label">Document généré le</div>
                  <div class="print-badge-value">${escapeHtml(
                    new Date().toLocaleDateString("fr-FR")
                  )}</div>
                </div>
              </div>

              <div class="print-summary">
                <div class="print-summary-card">Participants : ${participantsCount}</div>
                <div class="print-summary-card">Présents : ${presentsCount}</div>
                <div class="print-summary-card">Absents : ${absentsCount}</div>
              </div>

              <div class="print-table-wrapper">
                <table class="print-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nom complet</th>
                      <th>Email</th>
                      <th>Téléphone</th>
                      <th>Présence</th>
                      <th>Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${participantsRows}
                  </tbody>
                </table>
              </div>

              <div class="print-footer">
                <div class="print-footer-box">
                  <p><strong>Nom du formateur :</strong> ${escapeHtml(
                    fiche.formateur_nom ||
                      fiche.nom_formateur ||
                      fiche.formateur ||
                      "Non renseigné"
                  )}</p>
                  <p><strong>Signature du formateur :</strong></p>
                  <div class="print-footer-signature"></div>
                </div>

                <div class="print-footer-box">
                  <p><strong>Validation / cachet :</strong></p>
                  <p>Document de suivi de présence de la séance.</p>
                  <div class="print-footer-signature"></div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const openPrintWindow = () => {
    if (!selectedFiche?.fiche) {
      setError("Veuillez sélectionner une fiche avant impression");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=900");

    if (!printWindow) {
      setError("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }

    const html = buildPrintHTML();

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handlePrint = () => {
    setError("");
    openPrintWindow();
  };

  const handleDownloadPDF = () => {
    setError("");
    openPrintWindow();
  };

  return (
    <div className="fiche-formateur">
      <div className="fiche-formateur__block">
        <h3 className="fiche-formateur__title">Créer une fiche de présence</h3>

        {message && <div className="fiche-formateur__message">{message}</div>}
        {error && <div className="fiche-formateur__error">{error}</div>}

        <form className="fiche-formateur__form" onSubmit={handleSubmit}>
          <div className="fiche-formateur__grid">
            <div className="fiche-formateur__field">
              <label>Formation</label>
              <select
                name="formation_id"
                value={formData.formation_id}
                onChange={handleChange}
              >
                <option value="">Sélectionner une formation</option>
                {formations.map((formation) => (
                  <option key={formation.id} value={formation.id}>
                    {formation.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="fiche-formateur__field">
              <label>Titre de séance</label>
              <input
                type="text"
                name="titre_seance"
                value={formData.titre_seance}
                onChange={handleChange}
                placeholder="Ex : Initiation React"
              />
            </div>

            <div className="fiche-formateur__field">
              <label>Date</label>
              <input
                type="date"
                name="date_presence"
                value={formData.date_presence}
                onChange={handleChange}
              />
            </div>

            <div className="fiche-formateur__field">
              <label>Heure début</label>
              <input
                type="time"
                name="heure_debut"
                value={formData.heure_debut}
                onChange={handleChange}
              />
            </div>

            <div className="fiche-formateur__field">
              <label>Heure fin</label>
              <input
                type="time"
                name="heure_fin"
                value={formData.heure_fin}
                onChange={handleChange}
              />
            </div>

            <div className="fiche-formateur__field fiche-formateur__field--full">
              <label>Remarques</label>
              <textarea
                name="remarques"
                value={formData.remarques}
                onChange={handleChange}
                placeholder="Observations, notes..."
                rows="4"
              />
            </div>
          </div>

          <div className="fiche-formateur__actions">
            <button type="submit" disabled={saving}>
              {saving ? "Création..." : "Créer la fiche"}
            </button>
          </div>
        </form>
      </div>

      <div className="fiche-formateur__block">
        <h3 className="fiche-formateur__title">Mes fiches de présence</h3>

        {loading ? (
          <div className="fiche-formateur__empty">Chargement...</div>
        ) : fiches.length === 0 ? (
          <div className="fiche-formateur__empty">
            Aucune fiche de présence enregistrée.
          </div>
        ) : (
          <div className="fiche-formateur__list">
            {fiches.map((fiche) => (
              <div className="fiche-formateur__card" key={fiche.id}>
                <div className="fiche-formateur__card-head">
                  <div>
                    <h4>{fiche.titre_seance}</h4>
                    <p>{fiche.nom_formation}</p>
                  </div>

                  <div className="fiche-formateur__card-actions">
                    <button
                      className="btn-action btn-voir"
                      type="button"
                      onClick={() => fetchFicheDetails(fiche.id)}
                    >
                      Voir
                    </button>

                    <button
                      className="btn-action fiche-formateur__delete"
                      type="button"
                      onClick={() => handleDelete(fiche.id)}
                      disabled={deletingId === fiche.id}
                    >
                      {deletingId === fiche.id ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                </div>

                <div className="fiche-formateur__meta">
                  <span>Date : {formatDate(fiche.date_presence)}</span>
                  <span>
                    Horaire : {fiche.heure_debut} - {fiche.heure_fin}
                  </span>
                </div>

                <p className="fiche-formateur__remarques">
                  {fiche.remarques || "Aucune remarque"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fiche-formateur__block">
        <h3 className="fiche-formateur__title">Détail de la fiche</h3>

        {loadingDetails ? (
          <div className="fiche-formateur__empty">Chargement de la fiche...</div>
        ) : !selectedFiche ? (
          <div className="fiche-formateur__empty">
            Cliquez sur “Voir” pour afficher une fiche.
          </div>
        ) : (
          <div className="fiche-detail">
            <div className="fiche-detail__header">
              <div>
                <h4>Fiche de présence</h4>
                <p>
                  <strong>Séance :</strong> {selectedFiche.fiche.titre_seance}
                </p>
                <p>
                  <strong>Formation :</strong> {selectedFiche.fiche.nom_formation}
                </p>
                <p>
                  <strong>Lieu :</strong>{" "}
                  {selectedFiche.fiche.lieu || "Non renseigné"}
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

              <div className="fiche-detail__actions">
                <button
                  type="button"
                  className="btn-action btn-print"
                  onClick={handlePrint}
                >
                  Imprimer
                </button>

                <button
                  type="button"
                  className="btn-action btn-download"
                  onClick={handleDownloadPDF}
                >
                  Télécharger PDF
                </button>
              </div>
            </div>

            <section className="fiche-formateur__import">
              <div className="fiche-formateur__import-head">
                <div>
                  <span className="fiche-formateur__import-eyebrow">
                    Import participants
                  </span>
                  <h4 className="fiche-formateur__import-title">
                    Import des presences de la fiche
                  </h4>
                  <p className="fiche-formateur__import-text">
                    Charge un Excel ou CSV pour pre-remplir les statuts des
                    participants de cette fiche avant application en lot.
                  </p>
                </div>

                <span className="fiche-formateur__import-badge">
                  `.xlsx` `.xls` `.csv`
                </span>
              </div>

              <div className="fiche-formateur__import-layout">
                <div className="fiche-formateur__import-panel">
                  <label
                    className="fiche-formateur__import-label"
                    htmlFor="participant-presence-import-formateur"
                  >
                    Fichier a importer
                  </label>
                  <input
                    id="participant-presence-import-formateur"
                    className="fiche-formateur__import-input"
                    type="file"
                    accept={PARTICIPANT_PRESENCE_IMPORT_ACCEPT}
                    onChange={handleParticipantImportFile}
                    disabled={participantImporting || participantApplying}
                  />

                  <div className="fiche-formateur__import-guide">
                    {PARTICIPANT_PRESENCE_IMPORT_GUIDE.map((item) => (
                      <span
                        key={item}
                        className="fiche-formateur__import-pill"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="fiche-formateur__empty fiche-formateur__empty--soft">
                    Les lignes reconnues modifient les statuts visibles dans le
                    tableau ci-dessous avant l&apos;enregistrement final.
                  </div>
                </div>

                <div
                  className={`fiche-formateur__import-report ${
                    participantImportReport
                      ? participantImportReport.errors.length > 0
                        ? "is-review"
                        : "is-ready"
                      : ""
                  }`}
                >
                  <div className="fiche-formateur__import-report-head">
                    <div>
                      <h4 className="fiche-formateur__import-title">
                        Controle de l&apos;import
                      </h4>
                      <p className="fiche-formateur__import-text">
                        Verifie les lignes chargees avant de mettre a jour la
                        feuille.
                      </p>
                    </div>

                    <span className="fiche-formateur__import-status">
                      {participantImportReport
                        ? participantImportReport.errors.length > 0
                          ? "A verifier"
                          : "Pret"
                        : "En attente"}
                    </span>
                  </div>

                  {participantImporting ? (
                    <div className="fiche-formateur__empty">
                      Analyse du fichier en cours...
                    </div>
                  ) : null}

                  {!participantImporting && !participantImportReport ? (
                    <div className="fiche-formateur__empty">
                      Aucun fichier importe pour le moment.
                    </div>
                  ) : null}

                  {!participantImporting && participantImportReport ? (
                    <>
                      <div className="fiche-formateur__import-stats">
                        <div className="fiche-formateur__import-stat">
                          <strong>{participantImportReport.totalRows}</strong>
                          <span>Lignes</span>
                        </div>
                        <div className="fiche-formateur__import-stat">
                          <strong>{participantImportReport.matchedRows}</strong>
                          <span>Chargees</span>
                        </div>
                        <div className="fiche-formateur__import-stat">
                          <strong>{participantImportReport.errors.length}</strong>
                          <span>Erreurs</span>
                        </div>
                      </div>

                      <div className="fiche-formateur__empty fiche-formateur__empty--soft">
                        <strong>{participantImportReport.fileName}</strong>
                        {" "}
                        sur la feuille {participantImportReport.sheetName} importe
                        le {participantImportReport.importedAt}.
                      </div>

                      {participantImportReport.errors.length > 0 ? (
                        <div className="fiche-formateur__import-list fiche-formateur__import-list--error">
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
                          <div className="fiche-formateur__correction-toggle">
                            <button
                              type="button"
                              className="btn-action btn-correct-import"
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
                            <div className="fiche-formateur__corrections">
                              {participantImportEditorRows.map((issue) => {
                                const correctionDraft =
                                  participantCorrectionDrafts[issue.key] || {
                                    participantId: "",
                                    presentValue: "",
                                  };
                                const importedName =
                                  issue.raw.participantFullName ||
                                  `${issue.raw.participantPrenom || ""} ${issue.raw.participantNom || ""}`.trim() ||
                                  "Non renseigne";

                                return (
                                  <div
                                    key={issue.key}
                                    className="fiche-formateur__correction-card"
                                  >
                                    <div className="fiche-formateur__correction-head">
                                      <strong>
                                        {issue.lineNumber
                                          ? `Ligne ${issue.lineNumber}`
                                          : "Ligne importee"}
                                      </strong>
                                      <span>{issue.message}</span>
                                    </div>

                                    <div className="fiche-formateur__correction-raw">
                                      <span>Participant importe : {importedName}</span>
                                      <span>
                                        Etat :{" "}
                                        {issue.status === "ready"
                                          ? "Pret"
                                          : "A corriger"}
                                      </span>
                                      {issue.raw.participantEmail ? (
                                        <span>Email : {issue.raw.participantEmail}</span>
                                      ) : null}
                                      {issue.raw.present ? (
                                        <span>Valeur presence : {issue.raw.present}</span>
                                      ) : null}
                                    </div>

                                    <div className="fiche-formateur__correction-grid">
                                      <div className="fiche-formateur__correction-field">
                                        <label>Participant de la fiche</label>
                                        <select
                                          value={correctionDraft.participantId}
                                          onChange={(event) =>
                                            handleParticipantCorrectionChange(
                                              issue.key,
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

                                      <div className="fiche-formateur__correction-field">
                                        <label>Statut corrige</label>
                                        <select
                                          value={correctionDraft.presentValue}
                                          onChange={(event) =>
                                            handleParticipantCorrectionChange(
                                              issue.key,
                                              "presentValue",
                                              event.target.value
                                            )
                                          }
                                        >
                                          <option value="">
                                            Selectionner un statut
                                          </option>
                                          <option value="present">Present</option>
                                          <option value="absent">Absent</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="fiche-formateur__correction-actions">
                                      <button
                                        type="button"
                                        className="btn-action btn-correct-import"
                                        onClick={() =>
                                          handleApplyParticipantCorrection(issue)
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
                        <div className="fiche-formateur__import-list fiche-formateur__import-list--warning">
                          <strong>Points de controle</strong>
                          <ul>
                            {participantImportReport.warnings.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="fiche-formateur__import-actions">
                        <button
                          type="button"
                          className="btn-action btn-apply-import"
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
                          className="btn-action btn-import-reset"
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

            <div className="fiche-detail__count">
              Participants inscrits : {participantsCount} | Présents :{" "}
              {presentsCount} | Absents : {absentsCount}
            </div>

            {participants.length === 0 ? (
              <div className="fiche-formateur__empty">
                Aucun inscrit pour cette formation.
              </div>
            ) : (
              <div className="fiche-detail__table-wrapper">
                <table className="fiche-detail__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nom complet</th>
                      <th>Email</th>
                      <th>Téléphone</th>
                      <th>Présence</th>
                      <th>Signature</th>
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
                            <div className="presence-cell">
                              <input
                                type="checkbox"
                                checked={displayedPresent}
                                onChange={() =>
                                  togglePresence(participant.id, !displayedPresent)
                                }
                              />
                              <span
                                className={
                                  displayedPresent
                                    ? "presence-badge presence-badge--present"
                                    : "presence-badge presence-badge--absent"
                                }
                              >
                                {displayedPresent ? "Présent" : "Absent"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="signature-line" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="fiche-detail__footer">
              <div className="fiche-detail__footer-box">
                <p>
                  <strong>Nom du formateur :</strong>{" "}
                  {selectedFiche.fiche.formateur_nom ||
                    selectedFiche.fiche.nom_formateur ||
                    selectedFiche.fiche.formateur ||
                    "Non renseigné"}
                </p>
                <p>
                  <strong>Signature du formateur :</strong>
                </p>
                <div className="footer-signature-line" />
              </div>

              <div className="fiche-detail__footer-box">
                <p>
                  <strong>Date d'édition :</strong>{" "}
                  {new Date().toLocaleDateString("fr-FR")}
                </p>
                <p>
                  <strong>Validation / cachet :</strong>
                </p>
                <div className="footer-signature-line" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
