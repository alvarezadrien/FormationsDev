import * as XLSX from "xlsx";
import dayjs from "dayjs";

export const PARTICIPANT_PRESENCE_IMPORT_ACCEPT = ".xlsx,.xls,.csv";

export const PARTICIPANT_PRESENCE_IMPORT_GUIDE = [
  "participant_email ou participant_nom + participant_prenom",
  "present",
  "participant_id ou inscription_id en option pour un matching plus precis",
];

const FIELD_ALIASES = {
  participant_id: [
    "participant_id",
    "fiche_participant_id",
    "id_participant_fiche",
    "id_participant",
  ],
  inscription_id: ["inscription_id", "id_inscription"],
  participant_email: ["participant_email", "email_participant", "email"],
  participant_prenom: ["participant_prenom", "prenom_participant", "prenom"],
  participant_nom: ["participant_nom", "nom_participant", "nom"],
  participant_full_name: [
    "participant",
    "participant_nom_complet",
    "nom_complet",
    "participant_name",
  ],
  present: ["present", "presence", "statut_presence", "statut", "etat"],
};

const STATUS_ALIASES = {
  present: true,
  presente: true,
  presentiel: true,
  oui: true,
  yes: true,
  true: true,
  1: true,
  absent: false,
  non: false,
  no: false,
  false: false,
  0: false,
};

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

function normalizePresenceValue(value) {
  const token = normalizeToken(value);

  if (!token) {
    return null;
  }

  return Object.prototype.hasOwnProperty.call(STATUS_ALIASES, token)
    ? STATUS_ALIASES[token]
    : null;
}

function buildIssue({
  lineNumber,
  message,
  record,
  matchedParticipant = null,
  resolvedPresent = null,
}) {
  return {
    key: `line-${lineNumber}`,
    lineNumber,
    message,
    raw: {
      participantId: String(resolveField(record, "participant_id") ?? "").trim(),
      inscriptionId: String(resolveField(record, "inscription_id") ?? "").trim(),
      participantEmail: String(
        resolveField(record, "participant_email") ?? ""
      ).trim(),
      participantPrenom: String(
        resolveField(record, "participant_prenom") ?? ""
      ).trim(),
      participantNom: String(resolveField(record, "participant_nom") ?? "").trim(),
      participantFullName: String(
        resolveField(record, "participant_full_name") ?? ""
      ).trim(),
      present: String(resolveField(record, "present") ?? "").trim(),
    },
    resolvedParticipantId: matchedParticipant ? matchedParticipant.id : "",
    resolvedPresent,
  };
}

function buildParticipantLookup(participants) {
  const byParticipantId = new Map();
  const byInscriptionId = new Map();
  const byEmail = new Map();
  const byFullName = new Map();

  participants.forEach((participant) => {
    byParticipantId.set(String(participant.id), participant);

    if (hasValue(participant.inscription_id)) {
      byInscriptionId.set(String(participant.inscription_id), participant);
    }

    const normalizedEmail = normalizeText(participant.email);

    if (normalizedEmail) {
      if (!byEmail.has(normalizedEmail)) {
        byEmail.set(normalizedEmail, []);
      }

      byEmail.get(normalizedEmail).push(participant);
    }

    const normalizedFullName = normalizeText(
      `${participant.prenom || ""} ${participant.nom || ""}`
    );

    if (normalizedFullName) {
      if (!byFullName.has(normalizedFullName)) {
        byFullName.set(normalizedFullName, []);
      }

      byFullName.get(normalizedFullName).push(participant);
    }
  });

  return {
    byParticipantId,
    byInscriptionId,
    byEmail,
    byFullName,
  };
}

function matchParticipant(record, lookup) {
  const rawParticipantId = resolveField(record, "participant_id");
  const rawInscriptionId = resolveField(record, "inscription_id");
  const rawEmail = resolveField(record, "participant_email");
  const rawFullName = resolveField(record, "participant_full_name");
  const rawPrenom = resolveField(record, "participant_prenom");
  const rawNom = resolveField(record, "participant_nom");

  if (hasValue(rawParticipantId)) {
    const matchedByParticipantId = lookup.byParticipantId.get(
      String(rawParticipantId).trim()
    );

    if (matchedByParticipantId) {
      return matchedByParticipantId;
    }
  }

  if (hasValue(rawInscriptionId)) {
    const matchedByInscriptionId = lookup.byInscriptionId.get(
      String(rawInscriptionId).trim()
    );

    if (matchedByInscriptionId) {
      return matchedByInscriptionId;
    }
  }

  const normalizedEmail = normalizeText(rawEmail);

  if (normalizedEmail) {
    const emailMatches = lookup.byEmail.get(normalizedEmail) || [];

    if (emailMatches.length === 1) {
      return emailMatches[0];
    }
  }

  const normalizedFullName =
    normalizeText(rawFullName) ||
    normalizeText(`${rawPrenom || ""} ${rawNom || ""}`);

  if (!normalizedFullName) {
    return null;
  }

  const fullNameMatches = lookup.byFullName.get(normalizedFullName) || [];

  if (fullNameMatches.length === 1) {
    return fullNameMatches[0];
  }

  return null;
}

export async function importParticipantPresenceFile(
  file,
  { participants = [] } = {}
) {
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
      "Le fichier doit contenir une ligne d'entete puis au moins une ligne de participant."
    );
  }

  const lookup = buildParticipantLookup(participants);
  const errors = [];
  const warnings = [];
  const issues = [];
  const matchedRows = [];
  const seenParticipantIds = new Set();

  rows.forEach((row, index) => {
    const lineNumber = index + 2;
    const matchedParticipant = matchParticipant(row, lookup);
    const present = normalizePresenceValue(resolveField(row, "present"));

    if (!matchedParticipant) {
      const message = `Ligne ${lineNumber} : impossible d'associer cette ligne a un participant de la fiche selectionnee.`;
      errors.push(message);
      issues.push(
        buildIssue({
          lineNumber,
          message,
          record: row,
          resolvedPresent: present,
        })
      );
      return;
    }

    if (present === null) {
      const message = `Ligne ${lineNumber} : la colonne present doit valoir oui/non, present/absent ou 1/0.`;
      errors.push(message);
      issues.push(
        buildIssue({
          lineNumber,
          message,
          record: row,
          matchedParticipant,
        })
      );
      return;
    }

    if (seenParticipantIds.has(matchedParticipant.id)) {
      warnings.push(
        `Ligne ${lineNumber} : ${matchedParticipant.prenom || ""} ${matchedParticipant.nom || ""} apparait plusieurs fois. La derniere valeur est conservee.`
      );

      const previousIndex = matchedRows.findIndex(
        (item) => item.participantId === matchedParticipant.id
      );

      if (previousIndex >= 0) {
        matchedRows.splice(previousIndex, 1);
      }
    }

    seenParticipantIds.add(matchedParticipant.id);

    matchedRows.push({
      participantId: matchedParticipant.id,
      participantName: `${matchedParticipant.prenom || ""} ${matchedParticipant.nom || ""}`.trim(),
      participantEmail: matchedParticipant.email || "",
      present,
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
      issues,
      warnings,
      importedAt: dayjs().format("YYYY-MM-DD HH:mm"),
    },
  };
}
