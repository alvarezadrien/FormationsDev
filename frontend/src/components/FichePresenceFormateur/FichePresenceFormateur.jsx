import { useEffect, useMemo, useState } from "react";
import "./FichePresenceFormateur.css";

const API_BASE_URL = "http://localhost:8080";

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

  const [formData, setFormData] = useState({
    formation_id: "",
    titre_seance: "",
    date_presence: "",
    heure_debut: "",
    heure_fin: "",
    remarques: "",
  });

  useEffect(() => {
    fetchFormations();
    fetchMesFiches();
  }, []);

  const fetchFormations = async () => {
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
  };

  const fetchMesFiches = async () => {
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
  };

  const fetchFicheDetails = async (id) => {
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
    } catch (err) {
      setError(err.message || "Erreur lors du chargement de la fiche");
    } finally {
      setLoadingDetails(false);
    }
  };

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
      }

      setMessage(data?.message || "Fiche supprimée avec succès");
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  };

  const togglePresence = async (participantId, currentValue) => {
    if (!selectedFiche?.fiche?.id) return;

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_BASE_URL}/fiches-presence/${selectedFiche.fiche.id}/participants/${participantId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            present: !currentValue,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de modifier la présence");
      }

      setSelectedFiche((prev) => ({
        ...prev,
        participants: prev.participants.map((participant) =>
          participant.id === participantId
            ? { ...participant, present: currentValue ? 0 : 1 }
            : participant
        ),
      }));

      setMessage(data?.message || "Présence mise à jour avec succès");
    } catch (err) {
      setError(err.message || "Erreur lors de la mise à jour");
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

  const participants = selectedFiche?.participants || [];

  const participantsCount = useMemo(() => {
    return participants.length;
  }, [participants]);

  const presentsCount = useMemo(() => {
    return participants.filter((participant) => Boolean(participant.present)).length;
  }, [participants]);

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
                    {participants.map((participant, index) => (
                      <tr key={participant.id}>
                        <td>{index + 1}</td>
                        <td>{formatFullName(participant) || "Non renseigné"}</td>
                        <td>{participant.email || "Non renseigné"}</td>
                        <td>{participant.telephone || "Non renseigné"}</td>
                        <td>
                          <div className="presence-cell">
                            <input
                              type="checkbox"
                              checked={Boolean(participant.present)}
                              onChange={() =>
                                togglePresence(
                                  participant.id,
                                  Boolean(participant.present)
                                )
                              }
                            />
                            <span
                              className={
                                Boolean(participant.present)
                                  ? "presence-badge presence-badge--present"
                                  : "presence-badge presence-badge--absent"
                              }
                            >
                              {Boolean(participant.present) ? "Présent" : "Absent"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="signature-line" />
                        </td>
                      </tr>
                    ))}
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