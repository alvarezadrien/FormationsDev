import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getLocalValidationError,
  importLieuFile,
  LIEU_IMPORT_ACCEPT,
  LIEU_IMPORT_GUIDE,
  normalizeLieuKey,
} from "../../features/lieux/utils/lieuImport";

const API_URL = "http://localhost:8080";

function buildLieuPairKey(ville, localNom) {
  const normalizedVille = normalizeLieuKey(ville);
  const normalizedLocalNom = normalizeLieuKey(localNom);

  if (!normalizedVille || !normalizedLocalNom) {
    return "";
  }

  return `${normalizedVille}|${normalizedLocalNom}`;
}

function normalizeLieu(lieu) {
  return {
    id: lieu?.id ?? "",
    nom: lieu?.nom ?? "",
    ville: lieu?.ville ?? "",
    local_nom: lieu?.local_nom ?? "",
  };
}

function buildImportDrafts(editorRows = []) {
  return editorRows.reduce((accumulator, row) => {
    accumulator[row.key] = {
      ville: row.resolvedVille || row.raw?.ville || "",
      local_nom: row.resolvedLocalNom || row.raw?.local_nom || "",
      allow_new_city: Boolean(row.allowNewCity),
    };

    return accumulator;
  }, {});
}

function buildImportIssueLabel(row) {
  if (row.lineNumber) {
    return `Ligne ${row.lineNumber} : ${row.message}`;
  }

  return row.message;
}

function getRowCandidate(row, drafts = {}) {
  const draft = drafts[row.key] || {};

  return {
    ville: String(draft.ville || row.resolvedVille || row.raw?.ville || "").trim(),
    local_nom: String(
      draft.local_nom || row.resolvedLocalNom || row.raw?.local_nom || ""
    ).trim(),
  };
}

function findExistingVilleMatch(value, villes = []) {
  const normalizedValue = normalizeLieuKey(value);

  if (!normalizedValue) {
    return "";
  }

  return (
    villes.find((ville) => normalizeLieuKey(ville) === normalizedValue) || ""
  );
}

export function GestionLocaux() {
  const [lieux, setLieux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    ville: "",
    local_nom: "",
  });

  const [importingFile, setImportingFile] = useState(false);
  const [applyingImport, setApplyingImport] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const [importEditorRows, setImportEditorRows] = useState([]);
  const [importDrafts, setImportDrafts] = useState({});
  const [showImportEditor, setShowImportEditor] = useState(false);

  const clearImportState = useCallback(() => {
    setImportReport(null);
    setImportEditorRows([]);
    setImportDrafts({});
    setShowImportEditor(false);
  }, []);

  const fetchLieux = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/lieux`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de charger les locaux.");
      }

      setLieux(Array.isArray(data) ? data.map(normalizeLieu) : []);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des locaux.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLieux();
  }, [fetchLieux]);

  const groupedLieux = useMemo(() => {
    const groups = new Map();

    lieux.forEach((lieu) => {
      const ville = String(lieu.ville || "").trim() || "Non renseignée";
      const current = groups.get(ville) || [];
      current.push(lieu);
      groups.set(ville, current);
    });

    return Array.from(groups.entries())
      .map(([ville, items]) => ({
        ville,
        items: items.sort((a, b) =>
          String(a.local_nom || a.nom).localeCompare(
            String(b.local_nom || b.nom),
            "fr",
            { sensitivity: "base" }
          )
        ),
      }))
      .sort((a, b) =>
        a.ville.localeCompare(b.ville, "fr", { sensitivity: "base" })
      );
  }, [lieux]);

  const villesExistantes = useMemo(
    () =>
      Array.from(
        new Set(
          lieux
            .map((lieu) => String(lieu.ville || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })),
    [lieux]
  );

  const existingLieuKeys = useMemo(
    () =>
      new Set(
        lieux
          .map((lieu) =>
            buildLieuPairKey(lieu.ville, String(lieu.local_nom || lieu.nom || ""))
          )
          .filter(Boolean)
      ),
    [lieux]
  );

  useEffect(() => {
    setFormData((prev) => {
      if (villesExistantes.length === 0) {
        if (!prev.ville) {
          return prev;
        }

        return {
          ...prev,
          ville: "",
        };
      }

      if (villesExistantes.includes(prev.ville)) {
        return prev;
      }

      return {
        ...prev,
        ville: villesExistantes[0],
      };
    });
  }, [villesExistantes]);

  const rebuildImportReport = useCallback((rows, previousReport) => {
    if (!previousReport) {
      return previousReport;
    }

    const issues = rows
      .filter((row) => row.status !== "ready")
      .map((row) => ({
        key: row.key,
        lineNumber: row.lineNumber,
        message: row.message,
        raw: row.raw,
        resolvedVille: row.resolvedVille || "",
        resolvedLocalNom: row.resolvedLocalNom || "",
      }));

    return {
      ...previousReport,
      matchedRows: rows.filter((row) => row.status === "ready").length,
      errors: issues.map(buildImportIssueLabel),
      issues,
    };
  }, []);

  const validateImportRow = useCallback(
    (rowKey, sourceRows = importEditorRows, sourceDrafts = importDrafts) => {
      const targetRow = sourceRows.find((row) => row.key === rowKey);

      if (!targetRow) {
        return sourceRows;
      }

      const candidate = getRowCandidate(targetRow, sourceDrafts);
      const matchedVille = findExistingVilleMatch(candidate.ville, villesExistantes);
      const allowNewCity =
        Boolean(sourceDrafts[rowKey]?.allow_new_city) && !matchedVille;
      let nextMessage = "";

      if (!candidate.ville) {
        nextMessage = "Renseigne une ville.";
      } else if (!matchedVille && !allowNewCity) {
        nextMessage =
          "Cette ville n'existe pas encore en base. Coche l'option pour l'ajouter ou choisis une ville existante.";
      } else {
        nextMessage = getLocalValidationError(
          candidate.local_nom,
          villesExistantes,
          matchedVille || candidate.ville
        );
      }

      const resolvedVille = matchedVille || candidate.ville;
      const pairKey = buildLieuPairKey(resolvedVille, candidate.local_nom);

      if (!nextMessage && pairKey && existingLieuKeys.has(pairKey)) {
        nextMessage = "Ce local existe deja pour cette ville.";
      }

      if (!nextMessage && pairKey) {
        const hasDuplicateInImport = sourceRows.some((row) => {
          if (row.key === rowKey) {
            return false;
          }

          const otherCandidate = getRowCandidate(row, sourceDrafts);
          const otherResolvedVille =
            findExistingVilleMatch(otherCandidate.ville, villesExistantes) ||
            otherCandidate.ville;

          return (
            buildLieuPairKey(otherResolvedVille, otherCandidate.local_nom) === pairKey
          );
        });

        if (hasDuplicateInImport) {
          nextMessage = "Ce local apparait deja dans cet import.";
        }
      }

      const nextRow = {
        ...targetRow,
        status: nextMessage ? "issue" : "ready",
        message: nextMessage || "Ligne prete a importer.",
        resolvedVille,
        resolvedLocalNom: candidate.local_nom,
        allowNewCity,
      };

      return sourceRows.map((row) => (row.key === rowKey ? nextRow : row));
    },
    [existingLieuKeys, importDrafts, importEditorRows, villesExistantes]
  );

  const validateAllImportRows = useCallback(
    (rows = importEditorRows, drafts = importDrafts) => {
      let nextRows = rows;

      rows.forEach((row) => {
        nextRows = validateImportRow(row.key, nextRows, drafts);
      });

      return nextRows;
    },
    [importDrafts, importEditorRows, validateImportRow]
  );

  const importReadyCount = useMemo(
    () => importEditorRows.filter((row) => row.status === "ready").length,
    [importEditorRows]
  );

  const importIssueCount = useMemo(
    () => importEditorRows.length - importReadyCount,
    [importEditorRows.length, importReadyCount]
  );

  const importBatch = useMemo(
    () =>
      importEditorRows
        .filter((row) => row.status === "ready")
        .map((row) => ({
          key: row.key,
          lineNumber: row.lineNumber,
          ville: row.resolvedVille,
          local_nom: row.resolvedLocalNom,
          allow_new_city: Boolean(row.allowNewCity),
        })),
    [importEditorRows]
  );

  const persistLieu = useCallback(
    async ({ ville, local_nom: localNom, allow_new_city: allowNewCity = false }) => {
    const response = await fetch(`${API_URL}/lieux`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        ville: String(ville || "").trim(),
        local_nom: String(localNom || "").trim(),
        allow_new_city: Boolean(allowNewCity),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.messages?.local_nom ||
          data?.messages?.ville ||
          data?.messages?.slug ||
          data?.message ||
          "Impossible d'ajouter le local."
      );
    }

    return data;
    },
    []
  );

  const handleChange = ({ target: { name, value } }) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!formData.ville.trim()) {
      setError("Choisis une ville existante.");
      return;
    }

    if (!villesExistantes.includes(formData.ville.trim())) {
      setError("La ville doit etre choisie parmi celles deja presentes en base.");
      return;
    }

    const localValidationError = getLocalValidationError(
      formData.local_nom,
      villesExistantes
    );

    if (localValidationError) {
      setError(localValidationError);
      return;
    }

    try {
      setSaving(true);

      await persistLieu({
        ville: formData.ville.trim(),
        local_nom: formData.local_nom.trim(),
      });

      setMessage(
        `Le local ${formData.local_nom.trim()} a bien ete ajoute a ${formData.ville.trim()}.`
      );
      setFormData({
        ville: formData.ville.trim(),
        local_nom: "",
      });
      await fetchLieux();
    } catch (err) {
      setError(err.message || "Erreur lors de la creation du local.");
    } finally {
      setSaving(false);
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

      const imported = await importLieuFile(file, { lieux });
      const initialRows = imported.editorRows.map((row) => ({
        ...row,
        status: row.status || "issue",
      }));
      const initialDrafts = buildImportDrafts(initialRows);
      const validatedRows = validateAllImportRows(initialRows, initialDrafts);
      const nextReport = rebuildImportReport(validatedRows, imported.report);

      setImportDrafts(initialDrafts);
      setImportEditorRows(validatedRows);
      setImportReport(nextReport);
      setShowImportEditor(false);

      const readyCount = validatedRows.filter((row) => row.status === "ready").length;
      const issueCount = validatedRows.length - readyCount;

      if (readyCount === 0) {
        setError(
          "Le fichier contient des lignes a completer. Ouvre le formulaire d'ajustement pour corriger l'import."
        );
      } else if (issueCount > 0) {
        setMessage(
          `${readyCount} ligne(s) prete(s), ${issueCount} a ajuster dans le formulaire.`
        );
      } else {
        setMessage(
          `${readyCount} local(aux) charge(s). Ouvre le formulaire d'ajustement pour verifier ou enregistrer.`
        );
      }
    } catch (err) {
      clearImportState();
      setError(err.message || "Impossible d'importer ce fichier de locaux.");
    } finally {
      setImportingFile(false);
      event.target.value = "";
    }
  };

  const handleImportDraftChange = (rowKey, field, value) => {
    setImportDrafts((prev) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || {}),
        [field]: value,
      },
    }));
    setMessage("");
    setError("");
  };

  const handleApplyImportRow = (rowKey) => {
    setMessage("");
    setError("");

    const nextRows = validateImportRow(rowKey);
    setImportEditorRows(nextRows);
    setImportReport((prev) => rebuildImportReport(nextRows, prev));
  };

  const handleApplyImport = async () => {
    if (importEditorRows.length === 0) {
      return;
    }

    setMessage("");
    setError("");

    const validatedRows = validateAllImportRows();
    const validatedReport = rebuildImportReport(validatedRows, importReport);
    const readyRows = validatedRows.filter((row) => row.status === "ready");

    setImportEditorRows(validatedRows);
    setImportReport(validatedReport);

    if (readyRows.length === 0) {
      setShowImportEditor(true);
      setError(
        "Aucune ligne n'est prete. Complete ou corrige les informations dans le formulaire d'ajustement."
      );
      return;
    }

    try {
      setApplyingImport(true);

      const results = await Promise.allSettled(
        readyRows.map((row) =>
          persistLieu({
            ville: row.resolvedVille,
            local_nom: row.resolvedLocalNom,
            allow_new_city: Boolean(row.allowNewCity),
          })
        )
      );

      const successKeys = new Set();
      const failedMessages = new Map();

      results.forEach((result, index) => {
        const sourceRow = readyRows[index];

        if (result.status === "fulfilled") {
          successKeys.add(sourceRow.key);
          return;
        }

        failedMessages.set(
          sourceRow.key,
          result.reason?.message || "Impossible d'ajouter ce local."
        );
      });

      const remainingRows = validatedRows
        .filter((row) => !successKeys.has(row.key))
        .map((row) => {
          if (!failedMessages.has(row.key)) {
            return row;
          }

          return {
            ...row,
            status: "issue",
            message: failedMessages.get(row.key),
          };
        });

      setImportDrafts((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([rowKey]) => !successKeys.has(rowKey))
        )
      );

      if (successKeys.size > 0) {
        await fetchLieux();
      }

      if (remainingRows.length === 0) {
        clearImportState();
        setMessage(`${successKeys.size} local(aux) importe(s) avec succes.`);
      } else {
        setImportEditorRows(remainingRows);
        setImportReport(rebuildImportReport(remainingRows, validatedReport));
        setShowImportEditor(true);

        if (successKeys.size > 0) {
          setMessage(
            `${successKeys.size} local(aux) cree(s). ${remainingRows.length} ligne(s) reste(nt) a verifier.`
          );
        }

        if (failedMessages.size > 0) {
          setError(
            "Certaines lignes n'ont pas pu etre enregistrees. Corrige-les dans le formulaire d'ajustement."
          );
        }
      }
    } catch (err) {
      setError(err.message || "Erreur lors de l'application de l'import.");
      setShowImportEditor(true);
    } finally {
      setApplyingImport(false);
    }
  };

  return (
    <div className="admin-locaux">
      <div className="admin-form__section admin-import">
        <div className="admin-form__section-head">
          <span className="admin-form__section-badge">IM</span>
          <div>
            <h3 className="admin-form__section-title">Import des locaux</h3>
            <p className="admin-form__section-text">
              Charge un fichier Excel ou CSV pour creer plusieurs locaux,
              ouvrir un formulaire d&apos;ajustement et corriger les lignes avant
              l&apos;enregistrement final, y compris si une nouvelle ville doit
              etre ajoutee a la base.
            </p>
          </div>
        </div>

        <div className="admin-import__layout">
          <div className="admin-import__panel">
            <div className="admin-import__panel-head">
              <div>
                <span className="admin-import__eyebrow">Import en lot</span>
                <h4 className="admin-import__title">Fichier locaux</h4>
                <p className="admin-import__text">
                  Le formulaire d&apos;ajustement reste disponible meme si le
                  fichier est deja valide, pour verifier chaque ligne avant la
                  creation et choisir si une ville inconnue doit etre ajoutee a
                  la base.
                </p>
              </div>

              <span className="admin-import__format-badge">
                `.xlsx` `.xls` `.csv`
              </span>
            </div>

            <div className="admin-import__upload-card">
              <label className="admin-form__label" htmlFor="lieux-import">
                Fichier a importer
              </label>
              <input
                id="lieux-import"
                className="admin-import__input"
                type="file"
                accept={LIEU_IMPORT_ACCEPT}
                onChange={handleImportFile}
                disabled={
                  loading ||
                  importingFile ||
                  applyingImport
                }
              />
              <p className="admin-import__caption">
                Les lignes chargees seront affichees dans un formulaire
                d&apos;ajustement ou tu pourras modifier la ville et le nom du
                local avant l&apos;enregistrement.
              </p>
            </div>

            <div className="admin-import__steps">
              <div className="admin-import__step">
                <span>Etape 1</span>
                <strong>Importer le fichier</strong>
              </div>
              <div className="admin-import__step">
                <span>Etape 2</span>
                <strong>Verifier ou corriger les lignes</strong>
              </div>
              <div className="admin-import__step">
                <span>Etape 3</span>
                <strong>Enregistrer les locaux prets</strong>
              </div>
            </div>

            <div className="admin-import__guide-grid">
              <div className="admin-import__guide-card">
                <strong>Colonnes attendues</strong>
                <div className="admin-import__pill-list">
                  {LIEU_IMPORT_GUIDE.map((item) => (
                    <span key={item} className="admin-import__pill">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="admin-import__guide-card">
                <strong>Points de controle</strong>
                <p className="admin-import__text">
                  Chaque local doit commencer par `Local` ou `Salle`.
                </p>
                <p className="admin-import__text">
                  Si une ville n&apos;existe pas encore, tu peux la garder dans
                  le formulaire puis cocher son ajout a la base.
                </p>
              </div>
            </div>
          </div>

          <div
            className={`admin-import__report ${
              importReport ? (importIssueCount > 0 ? "is-review" : "is-ready") : ""
            }`}
          >
            <div className="admin-import__report-head">
              <div>
                <span className="admin-import__eyebrow">Controle</span>
                <h4 className="admin-import__title">Synthese de l&apos;import</h4>
                <p className="admin-import__text">
                  Visualise rapidement ce qui est deja pret et ouvre le
                  formulaire si tu veux ajuster ou completer les lignes.
                </p>
              </div>

              <span
                className={`admin-import__status ${
                  importReport
                    ? importIssueCount > 0
                      ? "is-review"
                      : "is-ready"
                    : "is-idle"
                }`}
              >
                {importReport
                  ? importIssueCount > 0
                    ? "A verifier"
                    : "Pret"
                  : "En attente"}
              </span>
            </div>

            {importingFile ? (
              <div className="admin-loading">Analyse du fichier en cours...</div>
            ) : null}

            {!importingFile && !importReport ? (
              <div className="admin-loading">
                Aucun fichier de locaux importe pour le moment.
              </div>
            ) : null}

            {!importingFile && importReport ? (
              <>
                <div className="admin-import__stats">
                  <div className="admin-import__stat">
                    <span>Lignes</span>
                    <strong>{importReport.totalRows}</strong>
                  </div>
                  <div className="admin-import__stat">
                    <span>Pretes</span>
                    <strong>{importReadyCount}</strong>
                  </div>
                  <div className="admin-import__stat">
                    <span>A corriger</span>
                    <strong>{importIssueCount}</strong>
                  </div>
                </div>

                <div className="admin-import__meta">
                  <strong>{importReport.fileName}</strong>
                  <span>
                    Feuille {importReport.sheetName} importee le {importReport.importedAt}
                  </span>
                </div>

                {importReport.errors.length > 0 ? (
                  <div className="admin-import__block admin-import__block--error">
                    <strong>Points a corriger</strong>
                    <ul className="admin-import__list">
                      {importReport.errors.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {importReport.warnings.length > 0 ? (
                  <div className="admin-import__block admin-import__block--warning">
                    <strong>Points de controle</strong>
                    <ul className="admin-import__list">
                      {importReport.warnings.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="admin-import__actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    onClick={() => setShowImportEditor((prev) => !prev)}
                    disabled={importEditorRows.length === 0}
                  >
                    {showImportEditor
                      ? "Masquer le formulaire d'ajustement"
                      : `Ouvrir le formulaire d'ajustement (${importEditorRows.length})`}
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
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

        {showImportEditor && importEditorRows.length > 0 ? (
          <div className="admin-import__editor">
            <div className="admin-import__editor-top">
              <div>
                <h4 className="admin-import__title">Formulaire d&apos;ajustement</h4>
                <p className="admin-import__text">
                  Modifie les lignes importees, valide-les une par une si
                  besoin, puis enregistre tous les locaux prets depuis ce meme
                  formulaire.
                </p>
              </div>

              <span
                className={`admin-import__state ${
                  importIssueCount > 0 ? "is-review" : "is-ready"
                }`}
              >
                {importIssueCount > 0
                  ? `${importIssueCount} ligne(s) a corriger`
                  : "Toutes les lignes sont pretes"}
              </span>
            </div>

            <div className="admin-import__editor-list">
              {importEditorRows.map((row) => {
                const draft = importDrafts[row.key] || {
                  ville: row.resolvedVille || "",
                  local_nom: row.resolvedLocalNom || "",
                  allow_new_city: Boolean(row.allowNewCity),
                };
                const matchedDraftVille = findExistingVilleMatch(
                  draft.ville,
                  villesExistantes
                );
                const isUnknownCity = Boolean(draft.ville.trim()) && !matchedDraftVille;

                return (
                  <article
                    key={row.key}
                    className={`admin-import__editor-row ${
                      row.status === "ready" ? "is-ready" : "is-review"
                    }`}
                  >
                    <div className="admin-import__editor-head">
                      <div className="admin-import__editor-meta">
                        <strong>Ligne {row.lineNumber || "-"}</strong>
                        <span>{row.message}</span>
                      </div>

                      <span
                        className={`admin-import__state ${
                          row.status === "ready" ? "is-ready" : "is-review"
                        }`}
                      >
                        {row.status === "ready" ? "Prete" : "A corriger"}
                      </span>
                    </div>

                    <div className="admin-import__pill-list">
                      {row.raw?.ville ? (
                        <span className="admin-import__pill">
                          Ville source : {row.raw.ville}
                        </span>
                      ) : null}
                      {row.raw?.local_nom ? (
                        <span className="admin-import__pill">
                          Local source : {row.raw.local_nom}
                        </span>
                      ) : null}
                      {row.raw?.nom ? (
                        <span className="admin-import__pill">
                          Nom source : {row.raw.nom}
                        </span>
                      ) : null}
                    </div>

                    <div className="admin-import__editor-grid">
                      <div className="admin-import__editor-field">
                        <label htmlFor={`import-ville-${row.key}`}>Ville</label>
                        <input
                          id={`import-ville-${row.key}`}
                          className="admin-form__input"
                          type="text"
                          list="lieux-import-villes"
                          value={draft.ville}
                          onChange={(event) =>
                            handleImportDraftChange(
                              row.key,
                              "ville",
                              event.target.value
                            )
                          }
                          placeholder="Ex: Namur"
                          disabled={applyingImport}
                        />
                      </div>

                      <div className="admin-import__editor-field">
                        <label htmlFor={`import-local-${row.key}`}>
                          Nom du local
                        </label>
                        <input
                          id={`import-local-${row.key}`}
                          className="admin-form__input"
                          type="text"
                          value={draft.local_nom}
                          onChange={(event) =>
                            handleImportDraftChange(
                              row.key,
                              "local_nom",
                              event.target.value
                            )
                          }
                          placeholder="Ex: Local 7 ou Salle B"
                          disabled={applyingImport}
                        />
                      </div>
                    </div>

                    <div className="admin-import__editor-city-option">
                      {isUnknownCity ? (
                        <label className="admin-import__city-choice">
                          <input
                            type="checkbox"
                            className="admin-form__checkbox"
                            checked={Boolean(draft.allow_new_city)}
                            onChange={(event) =>
                              handleImportDraftChange(
                                row.key,
                                "allow_new_city",
                                event.target.checked
                              )
                            }
                            disabled={applyingImport}
                          />
                          <span className="admin-import__city-choice-copy">
                            Ajouter la ville <strong>{draft.ville}</strong> a la base
                            si elle n&apos;existe pas encore.
                          </span>
                        </label>
                      ) : draft.ville.trim() ? (
                        <p className="admin-import__city-hint">
                          Cette ligne sera rattachee a la ville existante{" "}
                          <strong>{matchedDraftVille}</strong>.
                        </p>
                      ) : (
                        <p className="admin-import__city-hint">
                          Renseigne une ville existante ou une nouvelle ville a
                          ajouter a la base.
                        </p>
                      )}
                    </div>

                    <div className="admin-import__editor-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        onClick={() => handleApplyImportRow(row.key)}
                        disabled={applyingImport}
                      >
                        Mettre a jour cette ligne
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="admin-import__actions">
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={handleApplyImport}
                disabled={applyingImport || importBatch.length === 0}
              >
                {applyingImport
                  ? "Enregistrement en cours..."
                  : `Enregistrer ${importBatch.length} local(aux)`}
              </button>

              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={clearImportState}
                disabled={applyingImport}
              >
                Effacer l&apos;import
              </button>
            </div>
          </div>
        ) : null}

        <datalist id="lieux-import-villes">
          {villesExistantes.map((ville) => (
            <option key={`datalist-${ville}`} value={ville} />
          ))}
        </datalist>
      </div>

      {message ? (
        <div className="admin-feedback admin-feedback--success">{message}</div>
      ) : null}

      {error ? (
        <div className="admin-feedback admin-feedback--error">{error}</div>
      ) : null}

      <div className="admin-form__section">
        <div className="admin-form__section-head">
          <span className="admin-form__section-badge">LC</span>
          <div>
            <h3 className="admin-form__section-title">Ajouter un local</h3>
            <p className="admin-form__section-text">
              Cree de nouveaux locaux par ville pour augmenter les capacites
              d&apos;attribution automatique.
            </p>
          </div>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form__row">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="local_ville">
                Ville
              </label>
              <select
                id="local_ville"
                className="admin-form__input"
                name="ville"
                value={formData.ville}
                onChange={handleChange}
                required
                disabled={saving || villesExistantes.length === 0}
              >
                {villesExistantes.length === 0 ? (
                  <option value="">Aucune ville disponible</option>
                ) : null}

                {villesExistantes.map((ville) => (
                  <option key={ville} value={ville}>
                    {ville}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="local_nom">
                Nom du local
              </label>
              <input
                id="local_nom"
                className="admin-form__input"
                type="text"
                name="local_nom"
                value={formData.local_nom}
                onChange={handleChange}
                placeholder="Ex: Local 7 ou Salle A"
                required
              />
              <p className="admin-form__hint">
                Utilise un vrai nom de local, par exemple `Local 7` ou `Salle
                A`. Le nom d&apos;une ville seule n&apos;est pas accepte.
              </p>
            </div>
          </div>

          <div className="admin-form__actions">
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={saving || villesExistantes.length === 0}
            >
              {saving ? "Ajout..." : "Ajouter le local"}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="admin-loading">Chargement des locaux...</div>
      ) : (
        <div className="admin-list__grid">
          {groupedLieux.map((group) => (
            <article key={group.ville} className="admin-card admin-card--locaux">
              <div className="admin-card__header">
                <div>
                  <span className="admin-card__eyebrow">Ville</span>
                  <h3 className="admin-card__title">{group.ville}</h3>
                </div>

                <span className="admin-hours-card__badge">
                  {group.items.length} local{group.items.length > 1 ? "aux" : ""}
                </span>
              </div>

              <div className="admin-location-list">
                {group.items.map((lieu) => (
                  <span key={lieu.id} className="admin-location-chip">
                    {lieu.local_nom || lieu.nom}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
