import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:8080";

const JOURS_OPTIONS = [
  { value: "lundi", label: "Lundi" },
  { value: "mardi", label: "Mardi" },
  { value: "mercredi", label: "Mercredi" },
  { value: "jeudi", label: "Jeudi" },
  { value: "vendredi", label: "Vendredi" },
  { value: "samedi", label: "Samedi" },
];

const ALL_JOURS_VALUES = JOURS_OPTIONS.map((jour) => jour.value);

const TYPE_JOURNEE_OPTIONS = [
  { value: "journee_complete", label: "Journée complète" },
  { value: "demi_journee", label: "Demi-journée" },
  { value: "demi_journee_matin", label: "Demi-journée matin" },
  { value: "demi_journee_apres_midi", label: "Demi-journée après-midi" },
  { value: "soir", label: "Cours du soir" },
  { value: "cours_du_jour", label: "Cours du jour" },
  { value: "personnalise", label: "Personnalisé" },
];

const initialForm = {
  nom: "",
  formateur_id: "",
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

function getTypeLabel(value) {
  return (
    TYPE_JOURNEE_OPTIONS.find((option) => option.value === value)?.label || value
  );
}

function normalizeBoolean(value) {
  return value === true || value === 1 || value === "1";
}

function normalizeFormateur(formateur) {
  return {
    id: Number(formateur.id),
    nom: formateur.nom || "",
    prenom: formateur.prenom || "",
    email: formateur.email || "",
    est_remplacant: normalizeBoolean(formateur.est_remplacant),
    travaille_samedi: normalizeBoolean(formateur.travaille_samedi),
  };
}

function getFormationFormateurId(formation) {
  return (
    formation?.formateur_id ??
    formation?.id_formateur ??
    formation?.formateur?.id ??
    ""
  );
}

function getFormationRemplacantId(formation) {
  return (
    formation?.remplacant_id ??
    formation?.id_remplacant ??
    formation?.remplacant?.id ??
    ""
  );
}

function normalizeSessionsFromFormation(formation) {
  if (Array.isArray(formation?.sessions)) return formation.sessions;
  if (Array.isArray(formation?.seances)) return formation.seances;
  if (Array.isArray(formation?.cours)) return formation.cours;
  if (Array.isArray(formation?.calendrier)) return formation.calendrier;
  return [];
}

function buildInitialCreneauxFromFormation(formation) {
  if (!formation) {
    return initialForm.creneaux;
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

      const dayIndex = jsDate.getDay();
      const joursJs = [
        "dimanche",
        "lundi",
        "mardi",
        "mercredi",
        "jeudi",
        "vendredi",
        "samedi",
      ];

      const jour = joursJs[dayIndex];
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
      jours: JOURS_OPTIONS.map((j) => j.value).filter((jour) =>
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
    return initialForm.creneaux;
  }

  return [
    {
      jours: JOURS_OPTIONS.map((j) => j.value).filter((jour) =>
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

export function CreationFormations({
  formationEnEdition,
  onSaved,
  onCancelEdit,
}) {
  const [formData, setFormData] = useState(initialForm);
  const [formateurs, setFormateurs] = useState([]);
  const [lieux, setLieux] = useState([]);
  const [loadingFormateurs, setLoadingFormateurs] = useState(true);
  const [loadingLieux, setLoadingLieux] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const isEditing = useMemo(
    () => formationEnEdition !== null,
    [formationEnEdition]
  );

  useEffect(() => {
    const fetchFormateurs = async () => {
      try {
        setLoadingFormateurs(true);
        setErreur("");

        const res = await fetch(`${API_URL}/users/formateurs`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            data?.message || "Impossible de charger les formateurs"
          );
        }

        const rawFormateurs = Array.isArray(data?.formateurs)
          ? data.formateurs
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];

        setFormateurs(rawFormateurs.map(normalizeFormateur));
      } catch (err) {
        setErreur(err.message || "Erreur lors du chargement des formateurs");
      } finally {
        setLoadingFormateurs(false);
      }
    };

    fetchFormateurs();
  }, []);

  useEffect(() => {
    const fetchLieux = async () => {
      try {
        setLoadingLieux(true);
        setErreur("");

        const res = await fetch(`${API_URL}/lieux`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "Impossible de charger les lieux");
        }

        const rawLieux = Array.isArray(data?.lieux)
          ? data.lieux
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];

        setLieux(rawLieux);
      } catch (err) {
        setErreur(err.message || "Erreur lors du chargement des lieux");
      } finally {
        setLoadingLieux(false);
      }
    };

    fetchLieux();
  }, []);

  useEffect(() => {
    if (formationEnEdition) {
      const initialCreneaux =
        buildInitialCreneauxFromFormation(formationEnEdition);
      const sessions = normalizeSessionsFromFormation(formationEnEdition);

      setFormData({
        nom: formationEnEdition.nom || formationEnEdition.titre || "",
        formateur_id: getFormationFormateurId(formationEnEdition)
          ? String(getFormationFormateurId(formationEnEdition))
          : "",
        remplacant_id: getFormationRemplacantId(formationEnEdition)
          ? String(getFormationRemplacantId(formationEnEdition))
          : "",
        lieu: formationEnEdition.lieu || formationEnEdition.salle || "",
        description: formationEnEdition.description || "",
        nombre_participants: formationEnEdition.nombre_participants ?? 0,
        statut: formationEnEdition.statut ?? "actif",
        date_debut: formationEnEdition.date_debut || "",
        date_fin: formationEnEdition.date_fin || "",
        nombre_seances: sessions.length > 0 ? String(sessions.length) : "",
        mode_planification: formationEnEdition.date_fin
          ? "manuel"
          : "intelligent",
        creneaux:
          initialCreneaux.length > 0
            ? initialCreneaux
            : initialForm.creneaux,
      });
    } else {
      setFormData(initialForm);
    }

    setErreur("");
    setMessage("");
    setPreview(null);
  }, [formationEnEdition]);

  useEffect(() => {
    const canPreview =
      formData.date_debut &&
      formData.creneaux.length > 0 &&
      ((formData.mode_planification === "manuel" && formData.date_fin) ||
        (formData.mode_planification === "intelligent" &&
          Number(formData.nombre_seances) > 0));

    if (!canPreview) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(() => {
      previewSessions();
    }, 350);

    return () => clearTimeout(timer);
  }, [formData]);

  const hasSaturdaySelected = useMemo(() => {
    return formData.creneaux.some(
      (creneau) =>
        Array.isArray(creneau.jours) && creneau.jours.includes("samedi")
    );
  }, [formData.creneaux]);

  const availableFormateurs = useMemo(() => {
    let result = [...formateurs];

    if (hasSaturdaySelected) {
      result = result.filter((formateur) => formateur.travaille_samedi === true);
    }

    return result;
  }, [formateurs, hasSaturdaySelected]);

  const availableRemplacants = useMemo(() => {
    let result = formateurs.filter(
      (formateur) => formateur.est_remplacant === true
    );

    if (hasSaturdaySelected) {
      result = result.filter((formateur) => formateur.travaille_samedi === true);
    }

    if (formData.formateur_id) {
      result = result.filter(
        (formateur) => String(formateur.id) !== String(formData.formateur_id)
      );
    }

    return result;
  }, [formateurs, hasSaturdaySelected, formData.formateur_id]);

  const displayedFormateurs = useMemo(() => {
    if (availableFormateurs.length > 0) {
      return availableFormateurs;
    }

    return formateurs;
  }, [availableFormateurs, formateurs]);

  const displayedRemplacants = useMemo(() => {
    const fallbackRemplacants = formateurs.filter(
      (formateur) => String(formateur.id) !== String(formData.formateur_id)
    );

    if (availableRemplacants.length > 0) {
      return availableRemplacants;
    }

    return fallbackRemplacants;
  }, [availableRemplacants, formateurs, formData.formateur_id]);

  useEffect(() => {
    if (loadingFormateurs) {
      return;
    }

    const fallbackFormateur = availableFormateurs[0] || formateurs[0] || null;

    if (!isEditing && !formData.formateur_id && fallbackFormateur) {
      setFormData((prev) => ({
        ...prev,
        formateur_id: String(fallbackFormateur.id),
      }));
      return;
    }

    if (
      formData.formateur_id &&
      !availableFormateurs.some(
        (formateur) => String(formateur.id) === String(formData.formateur_id)
      )
    ) {
      setFormData((prev) => ({
        ...prev,
        formateur_id: fallbackFormateur ? String(fallbackFormateur.id) : "",
      }));
    }
  }, [
    availableFormateurs,
    formData.formateur_id,
    formateurs,
    isEditing,
    loadingFormateurs,
  ]);

  useEffect(() => {
    if (loadingFormateurs) {
      return;
    }

    const fallbackRemplacants = formateurs.filter(
      (formateur) => String(formateur.id) !== String(formData.formateur_id)
    );
    const preferredRemplacant =
      availableRemplacants[0] || fallbackRemplacants[0] || null;

    if (
      !isEditing &&
      formData.formateur_id &&
      !formData.remplacant_id &&
      preferredRemplacant
    ) {
      setFormData((prev) => ({
        ...prev,
        remplacant_id: String(preferredRemplacant.id),
      }));
      return;
    }

    if (
      formData.remplacant_id &&
      !availableRemplacants.some(
        (formateur) => String(formateur.id) === String(formData.remplacant_id)
      )
    ) {
      setFormData((prev) => ({
        ...prev,
        remplacant_id: preferredRemplacant ? String(preferredRemplacant.id) : "",
      }));
    }
  }, [
    availableRemplacants,
    formData.formateur_id,
    formData.remplacant_id,
    formateurs,
    isEditing,
    loadingFormateurs,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "nombre_participants" ? Number(value) : value,
    }));
  };

  const handleCreneauChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      creneaux: prev.creneaux.map((creneau, i) =>
        i === index ? { ...creneau, [field]: value } : creneau
      ),
    }));
  };

  const handleJourToggle = (creneauIndex, jourValue) => {
    setFormData((prev) => ({
      ...prev,
      creneaux: prev.creneaux.map((creneau, index) => {
        if (index !== creneauIndex) return creneau;

        const jours = Array.isArray(creneau.jours) ? creneau.jours : [];
        const alreadySelected = jours.includes(jourValue);

        return {
          ...creneau,
          jours: alreadySelected
            ? jours.filter((j) => j !== jourValue)
            : [...jours, jourValue],
        };
      }),
    }));
  };

  const selectAllJours = (creneauIndex) => {
    setFormData((prev) => ({
      ...prev,
      creneaux: prev.creneaux.map((creneau, index) =>
        index === creneauIndex
          ? { ...creneau, jours: [...ALL_JOURS_VALUES] }
          : creneau
      ),
    }));
  };

  const clearAllJours = (creneauIndex) => {
    setFormData((prev) => ({
      ...prev,
      creneaux: prev.creneaux.map((creneau, index) =>
        index === creneauIndex
          ? { ...creneau, jours: [] }
          : creneau
      ),
    }));
  };

  const ajouterCreneau = () => {
    setFormData((prev) => ({
      ...prev,
      creneaux: [
        ...prev.creneaux,
        {
          jours: ["lundi"],
          type_journee: "journee_complete",
          heure_debut: "",
          heure_fin: "",
        },
      ],
    }));
  };

  const supprimerCreneau = (index) => {
    setFormData((prev) => ({
      ...prev,
      creneaux:
        prev.creneaux.length === 1
          ? prev.creneaux
          : prev.creneaux.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setErreur("");
    setMessage("");
    setPreview(null);

    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const buildPayload = () => {
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
  };

  const previewSessions = async () => {
    try {
      setLoadingPreview(true);

      const res = await fetch(`${API_URL}/formations/preview-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPreview(null);
        return;
      }

      setPreview(data?.data || data || null);
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const validateForm = () => {
    if (!formData.nom.trim()) {
      return "Le nom de la formation est requis.";
    }

    if (!formData.formateur_id) {
      return "Veuillez sélectionner un formateur.";
    }

    if (!formData.lieu.trim()) {
      return "Veuillez sélectionner un lieu.";
    }

    if (!formData.description.trim()) {
      return "La description est requise.";
    }

    if (!formData.date_debut) {
      return "La date de début est requise.";
    }

    if (!formData.creneaux || formData.creneaux.length === 0) {
      return "Veuillez ajouter au moins un créneau.";
    }

    for (const creneau of formData.creneaux) {
      if (!Array.isArray(creneau.jours) || creneau.jours.length === 0) {
        return "Chaque créneau doit avoir au moins un jour sélectionné.";
      }

      if (!creneau.type_journee) {
        return "Chaque créneau doit avoir un type.";
      }

      if (
        creneau.type_journee === "personnalise" &&
        (!creneau.heure_debut || !creneau.heure_fin)
      ) {
        return "Pour un créneau personnalisé, il faut une heure de début et une heure de fin.";
      }

      if (
        creneau.type_journee === "personnalise" &&
        creneau.heure_fin <= creneau.heure_debut
      ) {
        return "L'heure de fin doit être après l'heure de début.";
      }
    }

    if (
      formData.remplacant_id &&
      String(formData.remplacant_id) === String(formData.formateur_id)
    ) {
      return "Le remplaçant doit être différent du formateur principal.";
    }

    if (formData.mode_planification === "manuel") {
      if (!formData.date_fin) {
        return "Veuillez renseigner une date de fin.";
      }

      if (formData.date_fin < formData.date_debut) {
        return "La date de fin ne peut pas être avant la date de début.";
      }
    } else {
      if (
        !Number(formData.nombre_seances) ||
        Number(formData.nombre_seances) <= 0
      ) {
        return "Veuillez renseigner un nombre de séances valide.";
      }
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErreur("");
    setMessage("");

    const validationError = validateForm();

    if (validationError) {
      setErreur(validationError);
      return;
    }

    try {
      setSaving(true);

      const url = isEditing
        ? `${API_URL}/formations/${formationEnEdition.id}`
        : `${API_URL}/formations`;

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message || "Impossible d'enregistrer la formation"
        );
      }

      setMessage(
        isEditing
          ? "La formation a bien été modifiée."
          : "La formation a bien été créée."
      );

      setFormData(initialForm);
      setPreview(null);

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-panel">
      <div className="admin-crm-header">
        <div>
          <h2 className="admin-panel__title">
            {isEditing ? "Modifier une formation" : "Créer une nouvelle formation"}
          </h2>

          <p className="admin-panel__text">
            Organise la formation comme dans un CRM : équipe, planning,
            disponibilité et prévisualisation intelligente au même endroit.
          </p>
        </div>

        <div className="admin-crm-mini-stats">
          <div className="admin-crm-mini-stat">
            <span>Mode</span>
            <strong>{isEditing ? "Edition" : "Création"}</strong>
          </div>
          <div className="admin-crm-mini-stat">
            <span>Planification</span>
            <strong>
              {formData.mode_planification === "manuel"
                ? "Manuelle"
                : "Intelligente"}
            </strong>
          </div>
        </div>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form__section">
          <div className="admin-form__section-head">
            <span className="admin-form__section-badge">01</span>
            <div>
              <h3 className="admin-form__section-title">Identité</h3>
              <p className="admin-form__section-text">
                Définis le nom, l’équipe pédagogique et le lieu de la formation.
              </p>
            </div>
          </div>

          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="nom">
              Nom de la formation
            </label>
            <input
              id="nom"
              className="admin-form__input"
              type="text"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              placeholder="Ex: Développement Web"
              required
            />
          </div>

          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="formateur_id">
              Formateur
            </label>
            <select
              id="formateur_id"
              className="admin-form__select"
              name="formateur_id"
              value={formData.formateur_id}
              onChange={handleChange}
              required
              disabled={loadingFormateurs}
            >
              <option value="">
                {loadingFormateurs
                  ? "Chargement des formateurs..."
                  : hasSaturdaySelected
                    ? "Sélectionner un formateur dispo le samedi"
                    : "Sélectionner un formateur"}
              </option>

              {displayedFormateurs.map((formateur) => (
                <option key={formateur.id} value={formateur.id}>
                  {formateur.prenom} {formateur.nom} - {formateur.email}
                </option>
              ))}
            </select>

            <div className="admin-form__hint">
              Attribution automatique du premier formateur disponible, modifiable
              manuellement à tout moment.
            </div>
          </div>

          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="remplacant_id">
              Remplaçant
            </label>
            <select
              id="remplacant_id"
              className="admin-form__select"
              name="remplacant_id"
              value={formData.remplacant_id}
              onChange={handleChange}
              disabled={loadingFormateurs}
            >
              <option value="">
                {loadingFormateurs
                  ? "Chargement des remplaçants..."
                  : hasSaturdaySelected
                    ? "Sélectionner un remplaçant dispo le samedi"
                    : "Sélectionner un remplaçant"}
              </option>

              {displayedRemplacants.map((formateur) => (
                <option key={formateur.id} value={formateur.id}>
                  {formateur.prenom} {formateur.nom} - {formateur.email}
                </option>
              ))}
            </select>

            <div className="admin-form__hint">
              Remplaçant proposé automatiquement selon les disponibilités, avec
              possibilité de le changer manuellement.
            </div>

            {!loadingFormateurs && displayedRemplacants.length === 0 && (
              <div className="admin-form__hint admin-form__hint--error">
                Aucun remplaçant disponible pour les critères sélectionnés.
              </div>
            )}
          </div>

          {hasSaturdaySelected ? (
            <div className="admin-form__hint admin-form__hint--warning">
              Samedi est sélectionné : seuls les formateurs et remplaçants
              disponibles le samedi sont affichés.
            </div>
          ) : null}

          <div className="admin-form__row">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="lieu">
                Lieu
              </label>
              <select
                id="lieu"
                className="admin-form__select"
                name="lieu"
                value={formData.lieu}
                onChange={handleChange}
                required
                disabled={loadingLieux}
              >
                <option value="">
                  {loadingLieux ? "Chargement des lieux..." : "Sélectionner un lieu"}
                </option>

                {lieux.map((lieu) => (
                  <option key={lieu.id} value={lieu.nom}>
                    {lieu.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="nombre_participants">
                Participants
              </label>
              <input
                id="nombre_participants"
                className="admin-form__input"
                type="number"
                name="nombre_participants"
                value={formData.nombre_participants}
                onChange={handleChange}
                min="0"
                required
              />
            </div>
          </div>
        </div>

        <div className="admin-form__section">
          <div className="admin-form__section-head">
            <span className="admin-form__section-badge">02</span>
            <div>
              <h3 className="admin-form__section-title">Planification</h3>
              <p className="admin-form__section-text">
                Cadre les dates, le mode de calcul et les créneaux récurrents.
              </p>
            </div>
          </div>

          <div className="admin-form__row">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="date_debut">
                Date de début souhaitée
              </label>
              <input
                id="date_debut"
                className="admin-form__input"
                type="date"
                name="date_debut"
                value={formData.date_debut}
                onChange={handleChange}
                required
              />
            </div>

            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="mode_planification">
                Mode de planification
              </label>
              <select
                id="mode_planification"
                className="admin-form__select"
                name="mode_planification"
                value={formData.mode_planification}
                onChange={handleChange}
              >
                <option value="intelligent">Calcul intelligent</option>
                <option value="manuel">Date de fin manuelle</option>
              </select>
            </div>
          </div>

          {formData.mode_planification === "manuel" ? (
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="date_fin">
                Date de fin
              </label>
              <input
                id="date_fin"
                className="admin-form__input"
                type="date"
                name="date_fin"
                value={formData.date_fin}
                onChange={handleChange}
                required
              />
            </div>
          ) : (
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="nombre_seances">
                Nombre de séances à générer
              </label>
              <input
                id="nombre_seances"
                className="admin-form__input"
                type="number"
                name="nombre_seances"
                value={formData.nombre_seances}
                onChange={handleChange}
                min="1"
                placeholder="Ex: 12"
                required
              />
            </div>
          )}

          <div className="admin-form__group">
            <label className="admin-form__label">Créneaux récurrents</label>

            <div className="admin-creneaux">
            {formData.creneaux.map((creneau, index) => (
              <div key={index} className="admin-creneau-card">
                <div>
                  <label className="admin-form__label">Jours de la semaine</label>

                  <div className="admin-creneau-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={() => selectAllJours(index)}
                    >
                      Tout sélectionner
                    </button>

                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={() => clearAllJours(index)}
                    >
                      Tout désélectionner
                    </button>
                  </div>

                  <div className="admin-creneau-days">
                    {JOURS_OPTIONS.map((jour) => (
                      <label
                        key={jour.value}
                        className={`admin-creneau-day ${
                          creneau.jours?.includes(jour.value) ? "is-active" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={creneau.jours?.includes(jour.value) || false}
                          onChange={() => handleJourToggle(index, jour.value)}
                        />
                        <span>{jour.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="admin-creneau-grid">
                  <div>
                    <label className="admin-form__label">Format</label>
                    <select
                      className="admin-form__select"
                      value={creneau.type_journee}
                      onChange={(e) =>
                        handleCreneauChange(index, "type_journee", e.target.value)
                      }
                    >
                      {TYPE_JOURNEE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="admin-form__label">Heure début</label>
                    <input
                      className="admin-form__input"
                      type="time"
                      value={creneau.heure_debut}
                      onChange={(e) =>
                        handleCreneauChange(index, "heure_debut", e.target.value)
                      }
                      disabled={creneau.type_journee !== "personnalise"}
                    />
                  </div>

                  <div>
                    <label className="admin-form__label">Heure fin</label>
                    <input
                      className="admin-form__input"
                      type="time"
                      value={creneau.heure_fin}
                      onChange={(e) =>
                        handleCreneauChange(index, "heure_fin", e.target.value)
                      }
                      disabled={creneau.type_journee !== "personnalise"}
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={() => supprimerCreneau(index)}
                      disabled={formData.creneaux.length === 1}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                <div className="admin-creneau-summary">
                  <strong>Jours sélectionnés :</strong>{" "}
                  {creneau.jours && creneau.jours.length > 0
                    ? creneau.jours
                        .map(
                          (jour) =>
                            JOURS_OPTIONS.find((j) => j.value === jour)?.label || jour
                        )
                        .join(", ")
                    : "Aucun"}
                </div>
              </div>
            ))}
            </div>

            <div className="admin-creneaux-footer">
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={ajouterCreneau}
            >
              Ajouter un créneau
            </button>
          </div>
        </div>
        </div>

        <div className="admin-form__section">
          <div className="admin-form__section-head">
            <span className="admin-form__section-badge">03</span>
            <div>
              <h3 className="admin-form__section-title">Cadre de diffusion</h3>
              <p className="admin-form__section-text">
                Finalise le statut, la description et vérifie le planning calculé.
              </p>
            </div>
          </div>

          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="statut">
              Statut
            </label>
            <select
              id="statut"
              className="admin-form__select"
              name="statut"
              value={formData.statut}
              onChange={handleChange}
            >
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="annule">Annulé</option>
            </select>
          </div>

          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className="admin-form__textarea"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Décris la formation..."
              required
            />
          </div>

          <div className="admin-preview-card">
            <h3 className="admin-preview-card__title">
              Prévisualisation intelligente
            </h3>

          {loadingPreview && <p>Calcul des sessions...</p>}

          {!loadingPreview && preview && (
            <>
              <p>
                <strong>Premier jour réel :</strong> {preview.date_debut_reelle}
              </p>
              <p>
                <strong>Dernier jour calculé :</strong> {preview.date_fin_calculee}
              </p>
              <p>
                <strong>Jours retenus :</strong> {preview.jours?.join(", ")}
              </p>
              <p>
                <strong>Type global :</strong> {getTypeLabel(preview.type_journee)}
              </p>
              <p>
                <strong>Nombre de sessions :</strong>{" "}
                {Array.isArray(preview.sessions)
                  ? preview.sessions.length
                  : 0}
              </p>

              {Array.isArray(preview.sessions) && preview.sessions.length > 0 && (
                <div className="admin-preview-table-wrap">
                  <table className="admin-preview-table">
                    <thead>
                      <tr>
                        <th>
                          Date
                        </th>
                        <th>
                          Heure début
                        </th>
                        <th>
                          Heure fin
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sessions.map((session, index) => (
                        <tr key={`${session.date}-${session.heure_debut}-${index}`}>
                          <td>{session.date}</td>
                          <td>{session.heure_debut}</td>
                          <td>{session.heure_fin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {!loadingPreview && !preview && (
            <p>
              Renseigne la date de début, les créneaux et soit une date de fin,
              soit un nombre de séances pour voir la planification.
            </p>
          )}
          </div>
        </div>

        {message && (
          <div className="admin-feedback admin-feedback--success">
            {message}
          </div>
        )}

        {erreur && (
          <div className="admin-feedback admin-feedback--error">{erreur}</div>
        )}

        <div className="admin-form__actions">
          <button
            className="admin-btn admin-btn--primary"
            type="submit"
            disabled={saving || loadingFormateurs || loadingLieux}
          >
            {saving
              ? "Enregistrement..."
              : isEditing
                ? "Mettre à jour"
                : "Créer la formation"}
          </button>

          {isEditing && (
            <button
              className="admin-btn admin-btn--secondary"
              type="button"
              onClick={resetForm}
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
