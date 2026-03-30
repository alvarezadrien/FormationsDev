import * as XLSX from "xlsx";
import dayjs from "dayjs";

export const PRESENCE_IMPORT_ACCEPT = ".xlsx,.xls,.csv";

export const PRESENCE_IMPORT_GUIDE = [
  "formation_id ou formation_nom",
  "statut_presence",
  "commentaire_presence",
  "formateur_email (utile en mode admin si noms proches)",
];

const FIELD_ALIASES = {
  formation_id: ["formation_id", "id_formation", "id"],
  formation_nom: ["formation_nom", "nom_formation", "formation", "titre"],
  formateur_email: ["formateur_email", "email_formateur", "email"],
  formateur: ["formateur", "nom_formateur"],
  statut_presence: [
    "statut_presence",
    "statut",
    "presence",
    "etat_presence",
  ],
  commentaire_presence: [
    "commentaire_presence",
    "commentaire",
    "remarque",
    "remarques",
    "note",
  ],
};

const STATUS_ALIASES = {
  present: "present",
  present_: "present",
  presente: "present",
  presentiel: "present",
  oui: "present",
  yes: "present",
  1: "present",
  absent: "absent",
  no: "absent",
  non: "absent",
  0: "absent",
};

const FIELD_BY_ALIAS = Object.entries(FIELD_ALIASES).reduce(
  (accumulator, [field, aliases]) => {
    aliases.forEach((alias) => {
      accumulator[normalizeToken(alias)] = field;
    });

    return accumulator;
  },
  {}
);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeToken(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
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

function normalizeStatus(value) {
  const token = normalizeToken(value);

  return STATUS_ALIASES[token] || "";
}

function buildPresenceLookup(presences) {
  const byId = new Map();
  const bySignature = new Map();

  presences.forEach((presence) => {
    byId.set(String(presence.formation_id), presence);

    const baseSignature = normalizeText(presence.formation_nom);
    const signatureKey = `${baseSignature}|${normalizeText(
      presence.formateur_email
    )}`;

    if (!bySignature.has(signatureKey)) {
      bySignature.set(signatureKey, []);
    }

    bySignature.get(signatureKey).push(presence);

    if (!bySignature.has(baseSignature)) {
      bySignature.set(baseSignature, []);
    }

    bySignature.get(baseSignature).push(presence);
  });

  return { byId, bySignature };
}

function matchPresence(record, lookup) {
  const rawFormationId = resolveField(record, "formation_id");
  const rawFormationNom = resolveField(record, "formation_nom");
  const rawFormateurEmail = resolveField(record, "formateur_email");
  const rawFormateur = resolveField(record, "formateur");

  if (hasValue(rawFormationId)) {
    const matchedById = lookup.byId.get(String(rawFormationId).trim());

    if (matchedById) {
      return matchedById;
    }
  }

  const normalizedFormationNom = normalizeText(rawFormationNom);

  if (!normalizedFormationNom) {
    return null;
  }

  const normalizedFormateurEmail = normalizeText(rawFormateurEmail);
  const normalizedFormateur = normalizeText(rawFormateur);

  if (normalizedFormateurEmail) {
    const preciseMatch =
      lookup.bySignature.get(
        `${normalizedFormationNom}|${normalizedFormateurEmail}`
      ) || [];

    if (preciseMatch.length === 1) {
      return preciseMatch[0];
    }
  }

  const candidates = lookup.bySignature.get(normalizedFormationNom) || [];

  if (candidates.length === 1) {
    return candidates[0];
  }

  if (normalizedFormateur) {
    const filteredCandidates = candidates.filter((presence) => {
      const fullName = normalizeText(presence.formateur_nom_complet);
      return fullName === normalizedFormateur;
    });

    if (filteredCandidates.length === 1) {
      return filteredCandidates[0];
    }
  }

  return null;
}

export async function importPresenceFile(file, { presences = [] } = {}) {
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
      "Le fichier doit contenir une ligne d'entete puis au moins une ligne de presence."
    );
  }

  const lookup = buildPresenceLookup(presences);
  const errors = [];
  const warnings = [];
  const matchedRows = [];
  const seenFormationIds = new Set();

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    const matchedPresence = matchPresence(row, lookup);
    const statutPresence = normalizeStatus(resolveField(row, "statut_presence"));
    const commentairePresence = String(
      resolveField(row, "commentaire_presence") ?? ""
    ).trim();

    if (!matchedPresence) {
      errors.push(
        `Ligne ${lineNumber} : impossible d'associer la presence a une formation visible.`
      );
      return;
    }

    if (!statutPresence) {
      errors.push(
        `Ligne ${lineNumber} : le statut_presence doit valoir present ou absent.`
      );
      return;
    }

    if (seenFormationIds.has(matchedPresence.formation_id)) {
      warnings.push(
        `Ligne ${lineNumber} : la formation ${matchedPresence.formation_nom} etait deja presente dans le fichier. La derniere valeur importe l'emporte.`
      );
      const previousIndex = matchedRows.findIndex(
        (item) => item.formationId === matchedPresence.formation_id
      );

      if (previousIndex >= 0) {
        matchedRows.splice(previousIndex, 1);
      }
    }

    seenFormationIds.add(matchedPresence.formation_id);

    matchedRows.push({
      formationId: matchedPresence.formation_id,
      formationNom: matchedPresence.formation_nom,
      formateurNom: matchedPresence.formateur_nom_complet,
      draft: {
        statut_presence: statutPresence,
        commentaire_presence: commentairePresence,
      },
    });
  });

  return {
    matchedRows,
    report: {
      fileName: file.name,
      sheetName: firstSheetName,
      totalRows: rows.length,
      matchedRows: matchedRows.length,
      errors,
      warnings,
      importedAt: dayjs().format("YYYY-MM-DD HH:mm"),
    },
  };
}
