import * as XLSX from "xlsx";
import dayjs from "dayjs";

export const LIEU_IMPORT_ACCEPT = ".xlsx,.xls,.csv";

export const LIEU_IMPORT_GUIDE = [
  "ville",
  "local_nom ou nom",
  "nouvelle ville possible pendant l'ajustement",
];

const FIELD_ALIASES = {
  ville: ["ville", "city"],
  local_nom: ["local_nom", "local", "nom_local", "salle"],
  nom: ["nom", "lieu"],
};

export function normalizeLieuKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function getLocalValidationError(
  localNom,
  villesExistantes,
  currentVille = ""
) {
  const trimmedLocal = String(localNom || "").trim();

  if (!trimmedLocal) {
    return "Le nom du local est obligatoire.";
  }

  const normalizedLocal = normalizeLieuKey(trimmedLocal);
  const normalizedVilles = [
    ...villesExistantes.map((ville) => normalizeLieuKey(ville)),
    normalizeLieuKey(currentVille),
  ].filter(Boolean);

  if (normalizedVilles.includes(normalizedLocal)) {
    return "Le nom du local ne peut pas être une ville.";
  }

  if (!/^(local|salle)\b/i.test(trimmedLocal)) {
    return 'Le nom du local doit commencer par "Local" ou "Salle".';
  }

  return "";
}

function hasValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim() !== "";
  }

  return true;
}

function normalizeToken(value) {
  return normalizeLieuKey(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function resolveField(record, field) {
  const aliases = FIELD_ALIASES[field] || [];

  for (const alias of aliases) {
    const token = normalizeToken(alias);

    if (Object.prototype.hasOwnProperty.call(record, token)) {
      return record[token];
    }
  }

  return "";
}

function extractRows(sheet) {
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false,
  });

  const nonEmptyRows = matrix.filter((row) => row.some(hasValue));

  if (nonEmptyRows.length < 2) {
    return [];
  }

  const headers = nonEmptyRows[0];

  return nonEmptyRows
    .slice(1)
    .filter((row) => row.some(hasValue))
    .map((row) =>
      headers.reduce((accumulator, header, index) => {
        const key = normalizeToken(header);

        if (!key) {
          return accumulator;
        }

        accumulator[key] = row[index];
        return accumulator;
      }, {})
    );
}

function parseInlineNom(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue || !rawValue.includes(" - ")) {
    return {
      ville: "",
      localNom: rawValue,
    };
  }

  const [ville, localNom] = rawValue.split(" - ", 2).map((item) => item.trim());

  return {
    ville,
    localNom,
  };
}

function buildLieuPairKey(ville, localNom) {
  const normalizedVille = normalizeLieuKey(ville);
  const normalizedLocalNom = normalizeLieuKey(localNom);

  if (!normalizedVille || !normalizedLocalNom) {
    return "";
  }

  return `${normalizedVille}|${normalizedLocalNom}`;
}

function buildIssue({
  lineNumber,
  message,
  rawVille,
  rawLocalNom,
  rawNom,
  resolvedVille = "",
  resolvedLocalNom = "",
}) {
  return {
    key: `lieu-row-${lineNumber}`,
    status: "issue",
    lineNumber,
    message,
    raw: {
      ville: String(rawVille || "").trim(),
      local_nom: String(rawLocalNom || "").trim(),
      nom: String(rawNom || "").trim(),
    },
    resolvedVille,
    resolvedLocalNom,
  };
}

export async function importLieuFile(file, { lieux = [] } = {}) {
  if (!file) {
    throw new Error("Aucun fichier d'import n'a ete selectionne.");
  }

  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellDates: true,
  });

  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];

  if (!firstSheet) {
    throw new Error("Le fichier ne contient pas de feuille exploitable.");
  }

  const rows = extractRows(firstSheet);

  if (rows.length === 0) {
    throw new Error(
      "Le fichier doit contenir une ligne d'entete puis au moins une ligne de local."
    );
  }

  const existingCityMap = new Map();
  const existingLieuKeys = new Set();

  lieux.forEach((lieu) => {
    const ville = String(lieu.ville || "").trim();
    const localNom = String(lieu.local_nom || lieu.nom || "").trim();

    if (ville) {
      existingCityMap.set(normalizeLieuKey(ville), ville);
    }

    const pairKey = buildLieuPairKey(ville, localNom);

    if (pairKey) {
      existingLieuKeys.add(pairKey);
    }
  });

  const existingVilles = Array.from(existingCityMap.values());
  const seenImportKeys = new Set();
  const warnings = [];
  const issueRows = [];
  const readyRows = [];

  rows.forEach((record, index) => {
    const lineNumber = index + 2;
    const rawVille = String(resolveField(record, "ville") || "").trim();
    const rawLocalNom = String(resolveField(record, "local_nom") || "").trim();
    const rawNom = String(resolveField(record, "nom") || "").trim();
    const parsedNom = parseInlineNom(rawNom);
    const normalizedVille = normalizeLieuKey(rawVille || parsedNom.ville);
    const resolvedVille = existingCityMap.get(normalizedVille) || "";
    const resolvedLocalNom = String(rawLocalNom || parsedNom.localNom || "").trim();

    if (!resolvedVille) {
      issueRows.push(
        buildIssue({
          lineNumber,
          message:
            "La ville est absente ou inconnue. Renseigne une ville puis choisis si elle doit etre ajoutee a la base.",
          rawVille,
          rawLocalNom,
          rawNom,
          resolvedVille: rawVille || parsedNom.ville,
          resolvedLocalNom,
        })
      );
      return;
    }

    const localValidationError = getLocalValidationError(
      resolvedLocalNom,
      existingVilles
    );

    if (localValidationError) {
      issueRows.push(
        buildIssue({
          lineNumber,
          message: localValidationError,
          rawVille,
          rawLocalNom,
          rawNom,
          resolvedVille,
          resolvedLocalNom,
        })
      );
      return;
    }

    const pairKey = buildLieuPairKey(resolvedVille, resolvedLocalNom);

    if (existingLieuKeys.has(pairKey)) {
      issueRows.push(
        buildIssue({
          lineNumber,
          message: "Ce local existe deja pour cette ville.",
          rawVille,
          rawLocalNom,
          rawNom,
          resolvedVille,
          resolvedLocalNom,
        })
      );
      return;
    }

    if (seenImportKeys.has(pairKey)) {
      issueRows.push(
        buildIssue({
          lineNumber,
          message: "Ce local apparait deja dans le fichier d'import.",
          rawVille,
          rawLocalNom,
          rawNom,
          resolvedVille,
          resolvedLocalNom,
        })
      );
      return;
    }

    seenImportKeys.add(pairKey);

    readyRows.push({
      key: `lieu-row-${lineNumber}`,
      status: "ready",
      lineNumber,
      message: "Ligne prete a importer.",
      raw: {
        ville: rawVille,
        local_nom: rawLocalNom,
        nom: rawNom,
      },
      resolvedVille,
      resolvedLocalNom,
    });
  });

  return {
    editorRows: [...readyRows, ...issueRows],
    report: {
      fileName: file.name,
      sheetName: firstSheetName,
      totalRows: rows.length,
      matchedRows: readyRows.length,
      errors: issueRows.map((item) => `Ligne ${item.lineNumber} : ${item.message}`),
      issues: issueRows,
      warnings,
      importedAt: dayjs().format("YYYY-MM-DD HH:mm"),
    },
  };
}
