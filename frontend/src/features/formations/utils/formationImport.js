import * as XLSX from "xlsx";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  createInitialFormationForm,
  JOURS_OPTIONS,
  TYPE_JOURNEE_OPTIONS,
} from "./formationPlanning";

dayjs.extend(customParseFormat);

export const FORMATION_IMPORT_ACCEPT = ".xlsx,.xls,.csv";

export const FORMATION_IMPORT_GUIDE = {
  formationColumns: [
    "nom",
    "formateur_email ou formateur",
    "ville",
    "local",
    "description",
    "date_debut",
    "date_fin ou nombre_seances",
  ],
  creneauxColumns: ["jours", "type_journee", "heure_debut", "heure_fin"],
};

const DAY_ALIASES = {
  lundi: "lundi",
  lun: "lundi",
  monday: "lundi",
  mardi: "mardi",
  mar: "mardi",
  tuesday: "mardi",
  mercredi: "mercredi",
  mer: "mercredi",
  wednesday: "mercredi",
  jeudi: "jeudi",
  jeu: "jeudi",
  thursday: "jeudi",
  vendredi: "vendredi",
  ven: "vendredi",
  friday: "vendredi",
  samedi: "samedi",
  sam: "samedi",
  saturday: "samedi",
  dimanche: "dimanche",
  dim: "dimanche",
  sunday: "dimanche",
};

const STATUS_ALIASES = {
  actif: "actif",
  active: "actif",
  inactif: "inactif",
  inactive: "inactif",
  annule: "annule",
  annulé: "annule",
  annulee: "annule",
  annulee_: "annule",
  cancelled: "annule",
  verification: "verification",
  verif: "verification",
  vérification: "verification",
  a_verifier: "verification",
  a_verification: "verification",
};

const MODE_ALIASES = {
  manuel: "manuel",
  manual: "manuel",
  date_fin: "manuel",
  intelligent: "intelligent",
  auto: "intelligent",
  automatique: "intelligent",
  nombre_seances: "intelligent",
};

const FIELD_ALIASES = {
  nom: ["nom", "nom_formation", "titre", "formation"],
  formateur_id: ["formateur_id", "id_formateur"],
  formateur_email: [
    "formateur_email",
    "email_formateur",
    "email_du_formateur",
    "email_formateur_principal",
  ],
  formateur: [
    "formateur",
    "formateur_principal",
    "nom_formateur",
    "formateur_nom_complet",
  ],
  second_formateur_id: [
    "second_formateur_id",
    "co_formateur_id",
    "formateur_secondaire_id",
    "deuxieme_formateur_id",
  ],
  second_formateur_email: [
    "second_formateur_email",
    "email_second_formateur",
    "email_deuxieme_formateur",
    "co_formateur_email",
  ],
  second_formateur: [
    "second_formateur",
    "co_formateur",
    "deuxieme_formateur",
    "formateur_secondaire",
  ],
  remplacant_id: ["remplacant_id", "id_remplacant"],
  remplacant_email: [
    "remplacant_email",
    "email_remplacant",
    "email_du_remplacant",
  ],
  remplacant: ["remplacant", "nom_remplacant"],
  ville: ["ville", "city"],
  local: ["local", "local_nom", "salle", "classe"],
  lieu: ["lieu", "site", "adresse"],
  description: ["description", "resume", "contenu"],
  nombre_participants: [
    "nombre_participants",
    "participants",
    "nb_participants",
    "nombre_de_participants",
  ],
  statut: ["statut", "status"],
  date_debut: [
    "date_debut",
    "debut",
    "date_debut_souhaitee",
    "start_date",
  ],
  date_fin: ["date_fin", "fin", "end_date"],
  nombre_seances: [
    "nombre_seances",
    "nb_seances",
    "seances",
    "nombre_de_seances",
  ],
  mode_planification: ["mode_planification", "mode", "planning_mode"],
  co_animation: ["co_animation", "coanimation"],
  jours: ["jours", "jour", "jours_recurrents"],
  type_journee: ["type_journee", "format", "type", "session_type"],
  heure_debut: ["heure_debut", "heure_debut_session", "start_time"],
  heure_fin: ["heure_fin", "heure_fin_session", "end_time"],
};

const TYPE_ALIAS_TO_VALUE = TYPE_JOURNEE_OPTIONS.reduce((accumulator, option) => {
  accumulator[normalizeToken(option.value)] = option.value;
  accumulator[normalizeToken(option.label)] = option.value;
  return accumulator;
}, {
  demi_journee_midi: "demi_journee_apres_midi",
  demi_journee_apresmidi: "demi_journee_apres_midi",
  journee: "journee_complete",
  journee_complete: "journee_complete",
  demi_journee: "demi_journee",
  demi_journee_matin: "demi_journee_matin",
  demi_journee_apres_midi: "demi_journee_apres_midi",
  cours_du_soir: "soir",
  cours_soir: "soir",
  soir: "soir",
  cours_du_jour: "cours_du_jour",
  cours_jour: "cours_du_jour",
  personnalise: "personnalise",
  personnalisee: "personnalise",
});

const CANONICAL_FIELD_BY_ALIAS = Object.entries(FIELD_ALIASES).reduce(
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

function readMatrix(sheet) {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false,
  });
}

function isKnownImportKey(key) {
  if (CANONICAL_FIELD_BY_ALIAS[key]) {
    return true;
  }

  const repeated = key.match(/^(.*)_([0-9]+)$/);

  return Boolean(repeated && CANONICAL_FIELD_BY_ALIAS[repeated[1]]);
}

function buildRecordFromObject(headers, row) {
  return headers.reduce((accumulator, header, index) => {
    const token = normalizeToken(header);

    if (!token) {
      return accumulator;
    }

    accumulator[token] = row[index];
    return accumulator;
  }, {});
}

function extractSheetRecord(sheet) {
  const matrix = readMatrix(sheet).filter((row) => row.some(hasValue));

  if (matrix.length === 0) {
    return {
      record: null,
      warnings: [],
    };
  }

  const headerRow = matrix[0];
  const recognizedHeaders = headerRow.filter((cell) =>
    isKnownImportKey(normalizeToken(cell))
  ).length;

  if (recognizedHeaders >= 2) {
    const dataRows = matrix.slice(1).filter((row) => row.some(hasValue));
    const firstDataRow = dataRows[0] ?? [];
    const record = buildRecordFromObject(headerRow, firstDataRow);
    const warnings =
      dataRows.length > 1
        ? [
            "Plusieurs lignes ont ete detectees sur la feuille principale. Seule la premiere a ete utilisee.",
          ]
        : [];

    return {
      record,
      warnings,
    };
  }

  const record = matrix.reduce((accumulator, row) => {
    const key = normalizeToken(row[0]);

    if (!key || row.length < 2) {
      return accumulator;
    }

    accumulator[key] = row[1];
    return accumulator;
  }, {});

  return {
    record,
    warnings: [],
  };
}

function extractSheetRows(sheet) {
  const matrix = readMatrix(sheet).filter((row) => row.some(hasValue));

  if (matrix.length === 0) {
    return [];
  }

  const headerRow = matrix[0];
  const recognizedHeaders = headerRow.filter((cell) =>
    isKnownImportKey(normalizeToken(cell))
  ).length;

  if (recognizedHeaders < 2) {
    return [];
  }

  return matrix
    .slice(1)
    .filter((row) => row.some(hasValue))
    .map((row) => buildRecordFromObject(headerRow, row));
}

function findSheetName(workbook, candidates) {
  return (
    workbook.SheetNames.find((sheetName) =>
      candidates.includes(normalizeToken(sheetName))
    ) || null
  );
}

function resolveField(record, canonicalField) {
  const aliases = FIELD_ALIASES[canonicalField] || [];

  for (const alias of aliases) {
    const token = normalizeToken(alias);

    if (Object.prototype.hasOwnProperty.call(record, token)) {
      return record[token];
    }
  }

  return "";
}

function collectInlineCreneauRecords(record) {
  const records = [];
  const directCreneau = {
    jours: resolveField(record, "jours"),
    type_journee: resolveField(record, "type_journee"),
    heure_debut: resolveField(record, "heure_debut"),
    heure_fin: resolveField(record, "heure_fin"),
  };

  if (Object.values(directCreneau).some(hasValue)) {
    records.push(directCreneau);
  }

  const suffixes = new Set();

  Object.keys(record).forEach((key) => {
    const match = key.match(/^(.*)_([0-9]+)$/);

    if (!match || !CANONICAL_FIELD_BY_ALIAS[match[1]]) {
      return;
    }

    if (["jours", "type_journee", "heure_debut", "heure_fin"].includes(
      CANONICAL_FIELD_BY_ALIAS[match[1]]
    )) {
      suffixes.add(match[2]);
    }
  });

  Array.from(suffixes)
    .sort((first, second) => Number(first) - Number(second))
    .forEach((suffix) => {
      const currentRecord = {
        jours: "",
        type_journee: "",
        heure_debut: "",
        heure_fin: "",
      };

      Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
        if (!["jours", "type_journee", "heure_debut", "heure_fin"].includes(field)) {
          return;
        }

        aliases.some((alias) => {
          const candidate = `${normalizeToken(alias)}_${suffix}`;

          if (Object.prototype.hasOwnProperty.call(record, candidate)) {
            currentRecord[field] = record[candidate];
            return true;
          }

          return false;
        });
      });

      if (Object.values(currentRecord).some(hasValue)) {
        records.push(currentRecord);
      }
    });

  return records;
}

function normalizeExcelDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dayjs(value).format("YYYY-MM-DD");
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (parsed) {
      return dayjs(
        new Date(parsed.y, parsed.m - 1, parsed.d || 1)
      ).format("YYYY-MM-DD");
    }
  }

  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  const acceptedFormats = [
    "YYYY-MM-DD",
    "DD/MM/YYYY",
    "D/M/YYYY",
    "DD-MM-YYYY",
    "D-M-YYYY",
    "MM/DD/YYYY",
    "M/D/YYYY",
  ];

  for (const format of acceptedFormats) {
    const parsed = dayjs(rawValue, format, true);

    if (parsed.isValid()) {
      return parsed.format("YYYY-MM-DD");
    }
  }

  const parsedLoose = dayjs(rawValue);
  return parsedLoose.isValid() ? parsedLoose.format("YYYY-MM-DD") : "";
}

function normalizeExcelTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dayjs(value).format("HH:mm");
  }

  if (typeof value === "number" && value >= 0 && value < 1) {
    const minutes = Math.round(value * 24 * 60);
    const hours = Math.floor(minutes / 60) % 24;
    const remainingMinutes = minutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(
      remainingMinutes
    ).padStart(2, "0")}`;
  }

  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  const acceptedFormats = ["HH:mm", "H:mm", "HH:mm:ss", "H:mm:ss"];

  for (const format of acceptedFormats) {
    const parsed = dayjs(rawValue, format, true);

    if (parsed.isValid()) {
      return parsed.format("HH:mm");
    }
  }

  return "";
}

function normalizeInteger(value) {
  if (!hasValue(value)) {
    return "";
  }

  const parsed = Number(String(value).replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return "";
  }

  return Math.max(0, Math.round(parsed));
}

function normalizeBoolean(value) {
  const token = normalizeToken(value);

  return ["oui", "yes", "true", "1", "active", "actif"].includes(token);
}

function normalizeMode(value) {
  const token = normalizeToken(value);

  return MODE_ALIASES[token] || "";
}

function normalizeStatus(value) {
  const token = normalizeToken(value);

  return STATUS_ALIASES[token] || "";
}

function normalizeTypeJournee(value, hasCustomHours) {
  const token = normalizeToken(value);

  if (TYPE_ALIAS_TO_VALUE[token]) {
    return TYPE_ALIAS_TO_VALUE[token];
  }

  return hasCustomHours ? "personnalise" : "";
}

function normalizeDays(value) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((day) => DAY_ALIASES[normalizeToken(day)] || "")
          .filter(Boolean)
      )
    );
  }

  return Array.from(
    new Set(
      String(value ?? "")
        .split(/[;,|/]+/)
        .flatMap((part) => part.split(/\s+-\s+/))
        .map((part) => DAY_ALIASES[normalizeToken(part)] || "")
        .filter(Boolean)
    )
  );
}

function parseInlineLieu(rawLieu) {
  const value = String(rawLieu ?? "").trim();

  if (!value.includes(" - ")) {
    return {
      ville: "",
      local: "",
      lieu: value,
    };
  }

  const [ville, local] = value.split(" - ", 2).map((part) => part.trim());

  return {
    ville,
    local,
    lieu: value,
  };
}

function buildFullName(person) {
  return `${String(person?.prenom ?? "").trim()} ${String(person?.nom ?? "").trim()}`
    .trim()
    .toLowerCase();
}

function resolveFormateurMatch({ id, email, name }, formateurs) {
  if (hasValue(id)) {
    const matchedById = formateurs.find(
      (formateur) => String(formateur.id) === String(id).trim()
    );

    if (matchedById) {
      return matchedById;
    }
  }

  if (hasValue(email)) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const matchedByEmail = formateurs.find(
      (formateur) => String(formateur.email ?? "").trim().toLowerCase() === normalizedEmail
    );

    if (matchedByEmail) {
      return matchedByEmail;
    }
  }

  if (hasValue(name)) {
    const normalizedName = normalizeText(name);
    const matchingByName = formateurs.filter((formateur) => {
      const fullName = normalizeText(buildFullName(formateur));
      const reverseName = normalizeText(
        `${String(formateur?.nom ?? "").trim()} ${String(formateur?.prenom ?? "").trim()}`
      );

      return fullName === normalizedName || reverseName === normalizedName;
    });

    if (matchingByName.length === 1) {
      return matchingByName[0];
    }
  }

  return null;
}

function resolveLieuMatch({ ville, local, lieu }, lieux) {
  const normalizedVille = normalizeText(ville);
  const normalizedLocal = normalizeText(local);
  const normalizedLieu = normalizeText(lieu);

  if (normalizedVille && normalizedLocal) {
    const exact = lieux.find(
      (item) =>
        normalizeText(item.ville) === normalizedVille &&
        normalizeText(item.localNom || item.nom) === normalizedLocal
    );

    if (exact) {
      return exact;
    }
  }

  if (normalizedLieu) {
    const exactLieu = lieux.find(
      (item) =>
        normalizeText(item.nom) === normalizedLieu ||
        normalizeText(`${item.ville} - ${item.localNom || item.nom}`) ===
          normalizedLieu
    );

    if (exactLieu) {
      return exactLieu;
    }
  }

  return null;
}

function groupImportedCreneaux(records, warnings) {
  const grouped = new Map();

  records.forEach((record, index) => {
    const jours = normalizeDays(record.jours);
    const heureDebut = normalizeExcelTime(record.heure_debut);
    const heureFin = normalizeExcelTime(record.heure_fin);
    const typeJournee = normalizeTypeJournee(
      record.type_journee,
      Boolean(heureDebut || heureFin)
    );

    if (jours.length === 0) {
      warnings.push(
        `Le creneau ${index + 1} n'a pas de jour reconnu et a ete ignore.`
      );
      return;
    }

    if (!typeJournee) {
      warnings.push(
        `Le type du creneau ${index + 1} est invalide et a ete ignore.`
      );
      return;
    }

    if (
      typeJournee === "personnalise" &&
      (!heureDebut || !heureFin || heureFin <= heureDebut)
    ) {
      warnings.push(
        `Le creneau ${index + 1} a des heures invalides et a ete ignore.`
      );
      return;
    }

    const signature = `${typeJournee}|${heureDebut}|${heureFin}`;

    if (!grouped.has(signature)) {
      grouped.set(signature, {
        jours: [],
        type_journee: typeJournee,
        heure_debut: heureDebut,
        heure_fin: heureFin,
      });
    }

    const current = grouped.get(signature);
    current.jours = Array.from(new Set([...current.jours, ...jours])).filter(
      (jour) => JOURS_OPTIONS.some((option) => option.value === jour)
    );
  });

  return Array.from(grouped.values()).sort((first, second) => {
    const firstDay = first.jours[0] || "";
    const secondDay = second.jours[0] || "";
    return firstDay.localeCompare(secondDay, "fr");
  });
}

function buildImportReport({
  file,
  formationSheetName,
  creneauxSheetName,
  errors,
  warnings,
  readyForVerification,
}) {
  return {
    fileName: file.name,
    formationSheetName,
    creneauxSheetName,
    errors,
    warnings,
    readyForVerification,
    importedAt: dayjs().format("YYYY-MM-DD HH:mm"),
  };
}

export async function importFormationFile(file, { formateurs = [], lieux = [] } = {}) {
  if (!file) {
    throw new Error("Aucun fichier n'a ete selectionne.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const formationSheetName =
    findSheetName(workbook, ["formation", "formations", "donnees", "data"]) ||
    workbook.SheetNames[0];
  const creneauxSheetName =
    findSheetName(workbook, ["creneaux", "creneau", "planning", "horaires"]) ||
    null;

  const formationSheet = workbook.Sheets[formationSheetName];

  if (!formationSheet) {
    throw new Error("La feuille principale du fichier n'a pas pu etre lue.");
  }

  const { record, warnings: sheetWarnings } = extractSheetRecord(formationSheet);

  if (!record) {
    throw new Error(
      "Le fichier n'a pas de donnees exploitables pour la formation."
    );
  }

  const warnings = [...sheetWarnings];
  const errors = [];
  const formData = createInitialFormationForm();

  const rawNom = resolveField(record, "nom");
  const rawDescription = resolveField(record, "description");
  const rawVille = resolveField(record, "ville");
  const rawLocal = resolveField(record, "local");
  const rawLieu = resolveField(record, "lieu");
  const parsedLieu = parseInlineLieu(rawLieu);
  const rawDateDebut = normalizeExcelDate(resolveField(record, "date_debut"));
  const rawDateFin = normalizeExcelDate(resolveField(record, "date_fin"));
  const rawNombreSeances = normalizeInteger(resolveField(record, "nombre_seances"));
  const rawParticipants = normalizeInteger(resolveField(record, "nombre_participants"));
  const importedStatus = normalizeStatus(resolveField(record, "statut"));
  const importedMode = normalizeMode(resolveField(record, "mode_planification"));

  const formateurMatch = resolveFormateurMatch(
    {
      id: resolveField(record, "formateur_id"),
      email: resolveField(record, "formateur_email"),
      name: resolveField(record, "formateur"),
    },
    formateurs
  );

  const secondFormateurMatch = resolveFormateurMatch(
    {
      id: resolveField(record, "second_formateur_id"),
      email: resolveField(record, "second_formateur_email"),
      name: resolveField(record, "second_formateur"),
    },
    formateurs
  );

  const remplacantMatch = resolveFormateurMatch(
    {
      id: resolveField(record, "remplacant_id"),
      email: resolveField(record, "remplacant_email"),
      name: resolveField(record, "remplacant"),
    },
    formateurs
  );

  const inferredVille = String(rawVille || parsedLieu.ville).trim();
  const inferredLocal = String(rawLocal || parsedLieu.local).trim();
  const inferredLieu = String(rawLieu || "").trim();
  const matchedLieu = resolveLieuMatch(
    {
      ville: inferredVille,
      local: inferredLocal,
      lieu: inferredLieu,
    },
    lieux
  );

  const importedCreneauxRows = creneauxSheetName
    ? extractSheetRows(workbook.Sheets[creneauxSheetName])
    : [];

  const inlineCreneauxRows =
    importedCreneauxRows.length === 0 ? collectInlineCreneauRecords(record) : [];
  const groupedCreneaux = groupImportedCreneaux(
    importedCreneauxRows.length > 0 ? importedCreneauxRows : inlineCreneauxRows,
    warnings
  );

  formData.nom = String(rawNom ?? "").trim();
  formData.description = String(rawDescription ?? "").trim();
  formData.nombre_participants = rawParticipants === "" ? 0 : rawParticipants;
  formData.date_debut = rawDateDebut;
  formData.date_fin = rawDateFin;
  formData.nombre_seances = rawNombreSeances === "" ? "" : String(rawNombreSeances);
  formData.mode_planification =
    importedMode ||
    (rawDateFin ? "manuel" : rawNombreSeances !== "" ? "intelligent" : "intelligent");
  formData.creneaux =
    groupedCreneaux.length > 0 ? groupedCreneaux : formData.creneaux;
  formData.formateur_id = formateurMatch ? String(formateurMatch.id) : "";
  formData.remplacant_id = remplacantMatch ? String(remplacantMatch.id) : "";
  formData.second_formateur_id = secondFormateurMatch
    ? String(secondFormateurMatch.id)
    : "";
  formData.co_animation =
    normalizeBoolean(resolveField(record, "co_animation")) ||
    Boolean(secondFormateurMatch);
  formData.ville = matchedLieu?.ville || inferredVille;
  formData.local = matchedLieu?.localNom || inferredLocal;
  formData.lieu =
    matchedLieu?.nom ||
    inferredLieu ||
    [formData.ville, formData.local].filter(Boolean).join(" - ");

  if (!formData.nom) {
    errors.push("Le fichier ne contient pas de nom de formation exploitable.");
  }

  if (!formData.description) {
    errors.push("La description est manquante dans le fichier importe.");
  }

  if (!formData.date_debut) {
    errors.push("La date de debut est manquante ou invalide.");
  }

  if (!formateurMatch) {
    errors.push(
      "Le formateur principal n'a pas pu etre associe. Utilise de preference l'email du formateur dans le fichier."
    );
  }

  if (!formData.ville) {
    errors.push("La ville est manquante dans le fichier importe.");
  }

  if (groupedCreneaux.length === 0) {
    errors.push(
      "Aucun creneau exploitable n'a ete detecte. Ajoute une feuille Creneaux ou des colonnes jours/type_journee/heure_debut/heure_fin."
    );
  }

  if (formData.mode_planification === "manuel" && !formData.date_fin) {
    errors.push(
      "Le mode manuel importe exige une date de fin valide."
    );
  }

  if (
    formData.mode_planification === "intelligent" &&
    (!formData.nombre_seances || Number(formData.nombre_seances) <= 0)
  ) {
    errors.push(
      "Le mode intelligent importe exige un nombre de seances valide."
    );
  }

  if (
    hasValue(resolveField(record, "second_formateur")) ||
    hasValue(resolveField(record, "second_formateur_email")) ||
    hasValue(resolveField(record, "second_formateur_id"))
  ) {
    if (!secondFormateurMatch) {
      warnings.push(
        "Le deuxieme formateur n'a pas pu etre associe automatiquement. Verifie la co-animation dans le formulaire."
      );
    }
  }

  if (
    hasValue(resolveField(record, "remplacant")) ||
    hasValue(resolveField(record, "remplacant_email")) ||
    hasValue(resolveField(record, "remplacant_id"))
  ) {
    if (!remplacantMatch) {
      warnings.push(
        "Le remplacant n'a pas pu etre associe automatiquement. Tu peux le corriger dans le formulaire."
      );
    }
  }

  if (formData.ville && formData.local && !matchedLieu) {
    warnings.push(
      "Le local importe n'a pas ete retrouve exactement dans la ville selectionnee. Verifie le champ local avant d'enregistrer."
    );
  }

  const readyForVerification = errors.length === 0;

  if (readyForVerification) {
    formData.statut = "verification";
    warnings.push(
      "Le brouillon importe a ete place en verification pour controle avant publication."
    );
  } else {
    formData.statut = importedStatus || formData.statut;
  }

  return {
    formData,
    report: buildImportReport({
      file,
      formationSheetName,
      creneauxSheetName,
      errors,
      warnings,
      readyForVerification,
    }),
  };
}
