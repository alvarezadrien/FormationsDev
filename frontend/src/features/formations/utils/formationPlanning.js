export const JOURS_OPTIONS = [
  { value: "lundi", label: "Lundi" },
  { value: "mardi", label: "Mardi" },
  { value: "mercredi", label: "Mercredi" },
  { value: "jeudi", label: "Jeudi" },
  { value: "vendredi", label: "Vendredi" },
  { value: "samedi", label: "Samedi" },
];

export const ALL_JOURS_VALUES = JOURS_OPTIONS.map((jour) => jour.value);

export const TYPE_JOURNEE_OPTIONS = [
  { value: "journee_complete", label: "Journée complète" },
  { value: "demi_journee", label: "Demi-journée" },
  { value: "demi_journee_matin", label: "Demi-journée matin" },
  { value: "demi_journee_apres_midi", label: "Demi-journée après-midi" },
  { value: "soir", label: "Cours du soir" },
  { value: "cours_du_jour", label: "Cours du jour" },
  { value: "personnalise", label: "Personnalisé" },
];

export function createInitialFormationForm() {
  return {
    nom: "",
    formateur_id: "",
    co_animation: false,
    second_formateur_id: "",
    remplacant_id: "",
    lieu: "",
    description: "",
    nombre_participants: 0,
    statut: "actif",
    date_debut: "",
    date_fin: "",
    nombre_seances: "",
    mode_planification: "intelligent",
    creneaux: [
      {
        jours: ["lundi"],
        type_journee: "journee_complete",
        heure_debut: "",
        heure_fin: "",
      },
    ],
  };
}

export function getTypeLabel(value) {
  return (
    TYPE_JOURNEE_OPTIONS.find((option) => option.value === value)?.label || value
  );
}

export function getFormationFormateurId(formation) {
  return (
    formation?.formateur_id ??
    formation?.id_formateur ??
    formation?.formateur?.id ??
    ""
  );
}

export function getFormationRemplacantId(formation) {
  return (
    formation?.remplacant_id ??
    formation?.id_remplacant ??
    formation?.remplacant?.id ??
    ""
  );
}

export function getFormationSecondFormateurId(formation) {
  return (
    formation?.second_formateur_id ??
    formation?.formateur_secondaire_id ??
    formation?.second_formateur?.id ??
    formation?.co_formateur_id ??
    ""
  );
}

export function normalizeSessionsFromFormation(formation) {
  if (Array.isArray(formation?.sessions)) return formation.sessions;
  if (Array.isArray(formation?.seances)) return formation.seances;
  if (Array.isArray(formation?.cours)) return formation.cours;
  if (Array.isArray(formation?.calendrier)) return formation.calendrier;
  return [];
}

export function buildInitialCreneauxFromFormation(formation) {
  const fallbackForm = createInitialFormationForm();

  if (!formation) {
    return fallbackForm.creneaux;
  }

  const sessions = normalizeSessionsFromFormation(formation);

  if (sessions.length > 0) {
    const bySchedule = new Map();

    sessions.forEach((session) => {
      const sessionDate =
        session.date ||
        session.session_date ||
        session.date_session ||
        session.jour ||
        null;

      if (!sessionDate) return;

      const jsDate = new Date(`${sessionDate}T00:00:00`);
      if (Number.isNaN(jsDate.getTime())) return;

      const joursJs = [
        "dimanche",
        "lundi",
        "mardi",
        "mercredi",
        "jeudi",
        "vendredi",
        "samedi",
      ];

      const jour = joursJs[jsDate.getDay()];
      const heureDebut =
        session.heure_debut?.slice(0, 5) ||
        session.start_time?.slice(0, 5) ||
        "";
      const heureFin =
        session.heure_fin?.slice(0, 5) ||
        session.end_time?.slice(0, 5) ||
        "";
      const signature = `personnalise-${heureDebut}-${heureFin}`;

      if (!bySchedule.has(signature)) {
        bySchedule.set(signature, {
          jours: [],
          type_journee: "personnalise",
          heure_debut: heureDebut,
          heure_fin: heureFin,
        });
      }

      const creneau = bySchedule.get(signature);
      if (!creneau.jours.includes(jour)) {
        creneau.jours.push(jour);
      }
    });

    const mapped = Array.from(bySchedule.values()).map((creneau) => ({
      ...creneau,
      jours: JOURS_OPTIONS.map((jour) => jour.value).filter((jour) =>
        creneau.jours.includes(jour)
      ),
    }));

    if (mapped.length > 0) {
      return mapped;
    }
  }

  let joursArray = [];

  if (Array.isArray(formation.jours)) {
    joursArray = formation.jours;
  } else if (
    typeof formation.jours === "string" &&
    formation.jours.trim() !== ""
  ) {
    joursArray = formation.jours
      .split(",")
      .map((jour) => jour.trim())
      .filter(Boolean);
  }

  if (joursArray.length === 0) {
    return fallbackForm.creneaux;
  }

  return [
    {
      jours: JOURS_OPTIONS.map((jour) => jour.value).filter((jour) =>
        joursArray.includes(jour)
      ),
      type_journee: formation.type_journee || "journee_complete",
      heure_debut: formation.heure_debut
        ? formation.heure_debut.slice(0, 5)
        : "",
      heure_fin: formation.heure_fin ? formation.heure_fin.slice(0, 5) : "",
    },
  ];
}

export function buildFormationPayload(formData) {
  const flattenedCreneaux = formData.creneaux.flatMap((creneau) => {
    const jours = Array.isArray(creneau.jours) ? creneau.jours : [];

    return jours.map((jour) => ({
      jour,
      type_journee: creneau.type_journee,
      heure_debut: creneau.heure_debut,
      heure_fin: creneau.heure_fin,
    }));
  });

  const payload = {
    nom: formData.nom.trim(),
    formateur_id: Number(formData.formateur_id),
    second_formateur_id:
      formData.co_animation && formData.second_formateur_id
        ? Number(formData.second_formateur_id)
        : null,
    remplacant_id: formData.remplacant_id
      ? Number(formData.remplacant_id)
      : null,
    lieu: formData.lieu.trim(),
    description: formData.description.trim(),
    nombre_participants: Number(formData.nombre_participants),
    statut: formData.statut,
    date_debut: formData.date_debut,
    creneaux: flattenedCreneaux,
  };

  if (formData.mode_planification === "manuel") {
    payload.date_fin = formData.date_fin;
  } else {
    payload.nombre_seances = Number(formData.nombre_seances);
  }

  return payload;
}
