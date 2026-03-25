const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const DAYS_FULL = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const STATUS_LABELS = {
  actif: "Actif",
  inactif: "Inactif",
  annule: "Annulé",
  complet: "Complet",
};

const FORMATION_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#4f46e5",
  "#c2410c",
  "#0f766e",
  "#9333ea",
  "#be123c",
  "#15803d",
  "#1d4ed8",
  "#a21caf",
  "#0ea5e9",
  "#ca8a04",
  "#dc2626",
  "#059669",
];

const JOURS_BY_DAY_NUMBER = {
  0: "dimanche",
  1: "lundi",
  2: "mardi",
  3: "mercredi",
  4: "jeudi",
  5: "vendredi",
  6: "samedi",
};

export { DAYS_FULL, DAYS_SHORT, MONTHS };

export function getJsonHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

export function getFetchOptions(method = "GET", body = null) {
  const options = {
    method,
    headers: getJsonHeaders(),
    credentials: "include",
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  return options;
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAdminUser() {
  const user = getStoredUser();
  return user?.role === "admin";
}

export function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, nb) {
  const d = new Date(date);
  d.setDate(d.getDate() + nb);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function hashString(str = "") {
  let hash = 0;
  for (let index = 0; index < str.length; index += 1) {
    hash = str.charCodeAt(index) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getFormationColor(formation) {
  const key =
    `${formation?.id ?? ""}-${formation?.titre ?? formation?.title ?? formation?.nom ?? ""}` ||
    "default";
  return FORMATION_COLORS[hashString(key) % FORMATION_COLORS.length];
}

export function getStatusColor(status) {
  switch (String(status || "actif").toLowerCase()) {
    case "annule":
      return "#dc2626";
    case "complet":
      return "#b45309";
    case "inactif":
      return "#475569";
    default:
      return "#15803d";
  }
}

export function getStatusLabel(status) {
  return STATUS_LABELS[String(status || "actif").toLowerCase()] || "Actif";
}

function normalizeToHHMM(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

export function getTypeJourneeFromHours(startTime, endTime) {
  const start = normalizeToHHMM(startTime);
  const end = normalizeToHHMM(endTime);

  if (start === "09:00" && end === "17:00") return "journee_complete";
  if (start === "09:00" && end === "12:30") return "demi_journee_matin";
  if (start === "13:30" && end === "17:00") return "demi_journee_apres_midi";
  if (start === "18:00" && end === "21:00") return "soir";
  if (start === "09:00" && end === "16:00") return "cours_du_jour";
  return "personnalise";
}

export function getTypeJourneeLabel(value) {
  switch (value) {
    case "journee_complete":
      return "Journée complète";
    case "demi_journee":
      return "Demi-journée";
    case "demi_journee_matin":
      return "Matin";
    case "demi_journee_apres_midi":
      return "Après-midi";
    case "soir":
      return "Soir";
    case "cours_du_jour":
      return "Cours du jour";
    default:
      return "Créneau personnalisé";
  }
}

export function formatShortDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return `${DAYS_FULL[(date.getDay() + 6) % 7].slice(0, 3)} ${date.getDate()} ${
    MONTHS[date.getMonth()]
  }`;
}

function parseDateTime(session) {
  const rawDate =
    session.date ||
    session.session_date ||
    session.date_session ||
    session.jour ||
    null;

  const rawStart =
    session.heure_debut ||
    session.start_time ||
    session.heureDebut ||
    session.debut ||
    session.start ||
    "09:00";

  const rawEnd =
    session.heure_fin ||
    session.end_time ||
    session.heureFin ||
    session.fin ||
    session.end ||
    "17:00";

  if (!rawDate) return null;

  const start = new Date(
    `${rawDate}T${rawStart?.length >= 5 ? rawStart.slice(0, 5) : "09:00"}`
  );
  const end = new Date(
    `${rawDate}T${rawEnd?.length >= 5 ? rawEnd.slice(0, 5) : "17:00"}`
  );

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return { start, end };
}

export function getSessionDateValue(session) {
  return (
    session.date ||
    session.session_date ||
    session.date_session ||
    session.jour ||
    ""
  );
}

export function getSessionStartValue(session) {
  return normalizeToHHMM(
    session.heure_debut ||
      session.start_time ||
      session.heureDebut ||
      session.debut ||
      session.start ||
      ""
  );
}

export function getSessionEndValue(session) {
  return normalizeToHHMM(
    session.heure_fin ||
      session.end_time ||
      session.heureFin ||
      session.fin ||
      session.end ||
      ""
  );
}

export function getRemplacantId(source) {
  if (!source) return null;

  return (
    source.remplacant_id ??
    source.id_remplacant ??
    source.remplacant?.id ??
    source.remplacant?.user_id ??
    null
  );
}

export function getSecondFormateurId(source) {
  if (!source) return null;

  return (
    source.second_formateur_id ??
    source.formateur_secondaire_id ??
    source.second_formateur?.id ??
    source.co_formateur_id ??
    null
  );
}

export function normalizeSession(session, formation, formateursMap) {
  const parsed = parseDateTime(session);
  if (!parsed) return null;

  const formateurId =
    session.formateur_id ??
    session.id_formateur ??
    formation.formateur_id ??
    formation.id_formateur ??
    null;

  const remplacantId = getRemplacantId(session) ?? getRemplacantId(formation) ?? null;
  const secondFormateurId =
    getSecondFormateurId(session) ?? getSecondFormateurId(formation) ?? null;
  const formateur = formateursMap.get(Number(formateurId));
  const remplacant = formateursMap.get(Number(remplacantId));
  const secondFormateur = formateursMap.get(Number(secondFormateurId));
  const statut = String(formation.statut || "actif").toLowerCase();
  const startTime = `${pad(parsed.start.getHours())}:${pad(
    parsed.start.getMinutes()
  )}`;
  const endTime = `${pad(parsed.end.getHours())}:${pad(parsed.end.getMinutes())}`;
  const typeJournee = getTypeJourneeFromHours(startTime, endTime);

  return {
    id:
      session.id ??
      `${formation.id}-${formatDateKey(parsed.start)}-${pad(
        parsed.start.getHours()
      )}:${pad(parsed.start.getMinutes())}`,
    formationId: formation.id,
    formationTitre:
      formation.titre ||
      formation.title ||
      formation.nom ||
      `Formation #${formation.id}`,
    formation,
    rawSession: session,
    date: formatDateKey(parsed.start),
    start: parsed.start,
    end: parsed.end,
    startTime,
    endTime,
    formateurId: formateurId ? Number(formateurId) : null,
    formateurNom: formateur?.nom || "Non attribué",
    secondFormateurId: secondFormateurId ? Number(secondFormateurId) : null,
    secondFormateurNom: secondFormateur?.nom || "",
    remplacantId: remplacantId ? Number(remplacantId) : null,
    remplacantNom: remplacant?.nom || "",
    salle:
      session.salle ||
      session.lieu ||
      formation.salle ||
      formation.lieu ||
      formation.location ||
      "",
    color: getFormationColor(formation),
    statusColor: getStatusColor(statut),
    statut,
    statutLabel: getStatusLabel(statut),
    typeJournee,
    typeJourneeLabel: getTypeJourneeLabel(typeJournee),
    description:
      formation.description ||
      formation.resume ||
      formation.contenu ||
      "",
  };
}

export function extractSessionsFromFormation(formation, formateursMap) {
  const possibleArrays = [
    formation.sessions,
    formation.seances,
    formation.cours,
    formation.calendrier,
    formation.dates,
    formation.occurrences,
  ].filter(Array.isArray);

  if (possibleArrays.length > 0) {
    return possibleArrays
      .flat()
      .map((session) => normalizeSession(session, formation, formateursMap))
      .filter(Boolean);
  }

  if (
    formation.date &&
    (formation.heure_debut || formation.start_time || formation.heureDebut)
  ) {
    const oneSession = normalizeSession(
      {
        id: formation.id,
        date: formation.date,
        heure_debut:
          formation.heure_debut || formation.start_time || formation.heureDebut,
        heure_fin:
          formation.heure_fin || formation.end_time || formation.heureFin,
        formateur_id: formation.formateur_id || formation.id_formateur || null,
        second_formateur_id: getSecondFormateurId(formation),
        remplacant_id: getRemplacantId(formation),
      },
      formation,
      formateursMap
    );

    return oneSession ? [oneSession] : [];
  }

  return [];
}

export function buildWeeksForMonth(currentDate) {
  const firstDay = startOfMonth(currentDate);
  const lastDay = endOfMonth(currentDate);

  const gridStart = getMonday(firstDay);
  const gridEnd = addDays(
    getMonday(lastDay),
    lastDay.getDay() === 0 ? 6 : 7 - lastDay.getDay()
  );

  const days = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  return weeks;
}

export function buildCreneauxFromSessions(sessions) {
  const grouped = new Map();

  sessions.forEach((session) => {
    const dateValue = getSessionDateValue(session);
    if (!dateValue) return;

    const jsDate = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(jsDate.getTime())) return;

    const jour = JOURS_BY_DAY_NUMBER[jsDate.getDay()];
    const heureDebut = getSessionStartValue(session);
    const heureFin = getSessionEndValue(session);
    const typeJournee = getTypeJourneeFromHours(heureDebut, heureFin);
    const signature = `${typeJournee}|${heureDebut}|${heureFin}`;

    if (!grouped.has(signature)) {
      grouped.set(signature, {
        jours: [],
        type_journee: typeJournee,
        heure_debut: typeJournee === "personnalise" ? heureDebut : "",
        heure_fin: typeJournee === "personnalise" ? heureFin : "",
      });
    }

    const entry = grouped.get(signature);
    if (!entry.jours.includes(jour)) {
      entry.jours.push(jour);
    }
  });

  return Array.from(grouped.values()).filter(
    (creneau) => Array.isArray(creneau.jours) && creneau.jours.length > 0
  );
}

export function getMinDateFromSessions(sessions) {
  const dates = sessions
    .map((session) => getSessionDateValue(session))
    .filter(Boolean)
    .sort();

  return dates.length > 0 ? dates[0] : "";
}

export function getMaxDateFromSessions(sessions) {
  const dates = sessions
    .map((session) => getSessionDateValue(session))
    .filter(Boolean)
    .sort();

  return dates.length > 0 ? dates[dates.length - 1] : "";
}
