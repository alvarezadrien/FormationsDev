import { useEffect, useMemo, useState } from "react";
import {
  getAvailableCoAnimateurs,
  getAvailablePrincipalFormateurs,
  getAvailableRemplacants,
  getDisplayedFormateurs,
  getDisplayedRemplacants,
  normalizeFormateur,
} from "../../features/formateurs/utils/formateurAssignments";
import {
  ALL_JOURS_VALUES,
  buildFormationPayload,
  buildInitialCreneauxFromFormation,
  createInitialFormationForm,
  getFormationFormateurId,
  getFormationRemplacantId,
  getFormationSecondFormateurId,
  getTypeLabel,
  JOURS_OPTIONS,
  normalizeSessionsFromFormation,
  TYPE_JOURNEE_OPTIONS,
} from "../../features/formations/utils/formationPlanning";
import {
  FORMATION_IMPORT_ACCEPT,
  FORMATION_IMPORT_GUIDE,
  importFormationFile,
} from "../../features/formations/utils/formationImport";

const API_URL = "http://localhost:8080";

function normalizeLieuOption(lieu) {
  const nom = String(lieu?.nom ?? "").trim();
  const rawVille = String(lieu?.ville ?? "").trim();
  const rawLocalNom = String(lieu?.local_nom ?? "").trim();

  let ville = rawVille;
  let localNom = rawLocalNom;

  if ((!ville || !localNom) && nom.includes(" - ")) {
    const [parsedVille, parsedLocalNom] = nom
      .split(" - ", 2)
      .map((value) => value.trim());

    if (!ville) {
      ville = parsedVille;
    }

    if (!localNom) {
      localNom = parsedLocalNom;
    }
  }

  if (!ville && nom) {
    ville = nom;
  }

  const label = nom || [ville, localNom].filter(Boolean).join(" - ");

  return {
    id: lieu?.id ?? label,
    nom: label,
    slug: lieu?.slug ?? "",
    ville,
    localNom,
  };
}

function parseStoredLieu(lieuValue, lieuOptions) {
  const normalizedValue = String(lieuValue ?? "").trim();

  if (!normalizedValue) {
    return {
      ville: "",
      local: "",
      lieu: "",
    };
  }

  const exactMatch = lieuOptions.find((option) => option.nom === normalizedValue);

  if (exactMatch) {
    return {
      ville: exactMatch.ville,
      local: exactMatch.localNom || exactMatch.nom,
      lieu: exactMatch.nom,
    };
  }

  if (normalizedValue.includes(" - ")) {
    const [ville, local] = normalizedValue.split(" - ", 2);

    return {
      ville: ville.trim(),
      local: (local || "").trim(),
      lieu: normalizedValue,
    };
  }

  return {
    ville: normalizedValue,
    local: "",
    lieu: "",
  };
}

function getLieuOptionValue(lieu) {
  return lieu?.localNom || lieu?.nom || "";
}

function getFormationLocation(formation) {
  const ville = String(formation?.ville ?? "").trim();
  const localNom = String(formation?.local_nom ?? "").trim();
  const lieu = String(formation?.lieu ?? formation?.salle ?? "").trim();

  if (ville || localNom) {
    return {
      ville,
      local: localNom,
      lieu,
    };
  }

  return parseStoredLieu(lieu, []);
}

function toMinutes(timeValue) {
  const value = String(timeValue ?? "").trim();
  const match = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function sessionsOverlap(firstSession, secondSession) {
  if (!firstSession?.date || !secondSession?.date) {
    return false;
  }

  if (String(firstSession.date) !== String(secondSession.date)) {
    return false;
  }

  const firstStart = toMinutes(firstSession.heure_debut);
  const firstEnd = toMinutes(firstSession.heure_fin);
  const secondStart = toMinutes(secondSession.heure_debut);
  const secondEnd = toMinutes(secondSession.heure_fin);

  if (
    firstStart === null ||
    firstEnd === null ||
    secondStart === null ||
    secondEnd === null
  ) {
    return false;
  }

  return firstStart < secondEnd && secondStart < firstEnd;
}

export function CreationFormations({
  formationEnEdition,
  onSaved,
  onCancelEdit,
}) {
  const [formData, setFormData] = useState(() => createInitialFormationForm());
  const [formateurs, setFormateurs] = useState([]);
  const [lieux, setLieux] = useState([]);
  const [formationsExistantes, setFormationsExistantes] = useState([]);
  const [loadingFormateurs, setLoadingFormateurs] = useState(true);
  const [loadingLieux, setLoadingLieux] = useState(true);
  const [loadingFormations, setLoadingFormations] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [importReport, setImportReport] = useState(null);

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

        setLieux(
          rawLieux
            .map(normalizeLieuOption)
            .filter((lieu) => lieu.nom && lieu.ville)
        );
      } catch (err) {
        setErreur(err.message || "Erreur lors du chargement des lieux");
      } finally {
        setLoadingLieux(false);
      }
    };

    fetchLieux();
  }, []);

  useEffect(() => {
    const fetchFormations = async () => {
      try {
        setLoadingFormations(true);

        const res = await fetch(`${API_URL}/formations`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data = await res.json().catch(() => ([]));

        if (!res.ok) {
          throw new Error(
            data?.message || "Impossible de charger les formations existantes"
          );
        }

        setFormationsExistantes(Array.isArray(data) ? data : []);
      } catch (err) {
        setErreur(
          err.message || "Erreur lors du chargement des formations existantes"
        );
      } finally {
        setLoadingFormations(false);
      }
    };

    fetchFormations();
  }, []);

  useEffect(() => {
    if (formationEnEdition) {
      const initialCreneaux =
        buildInitialCreneauxFromFormation(formationEnEdition);
      const sessions = normalizeSessionsFromFormation(formationEnEdition);
      const parsedLieu = parseStoredLieu(
        formationEnEdition.lieu || formationEnEdition.salle || "",
        lieux
      );

      setFormData({
        nom: formationEnEdition.nom || formationEnEdition.titre || "",
        formateur_id: getFormationFormateurId(formationEnEdition)
          ? String(getFormationFormateurId(formationEnEdition))
          : "",
        co_animation: Boolean(getFormationSecondFormateurId(formationEnEdition)),
        second_formateur_id: getFormationSecondFormateurId(formationEnEdition)
          ? String(getFormationSecondFormateurId(formationEnEdition))
          : "",
        remplacant_id: getFormationRemplacantId(formationEnEdition)
          ? String(getFormationRemplacantId(formationEnEdition))
          : "",
        ville: parsedLieu.ville,
        local: parsedLieu.local,
        lieu: parsedLieu.lieu,
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
            : createInitialFormationForm().creneaux,
      });
    } else {
      setFormData(createInitialFormationForm());
    }

    setErreur("");
    setMessage("");
    setPreview(null);
    setImportReport(null);
  }, [formationEnEdition]);

  useEffect(() => {
    if (!formationEnEdition || lieux.length === 0) {
      return;
    }

    const parsedLieu = parseStoredLieu(
      formationEnEdition.lieu || formationEnEdition.salle || "",
      lieux
    );

    setFormData((prev) => {
      const nextVille = prev.ville || parsedLieu.ville;
      const nextLocal = prev.local || parsedLieu.local;
      const nextLieu = prev.lieu || parsedLieu.lieu;

      if (
        prev.ville === nextVille &&
        prev.local === nextLocal &&
        prev.lieu === nextLieu
      ) {
        return prev;
      }

      return {
        ...prev,
        ville: nextVille,
        local: nextLocal,
        lieu: nextLieu,
      };
    });
  }, [formationEnEdition, lieux]);

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
    return getAvailablePrincipalFormateurs(formateurs, hasSaturdaySelected);
  }, [formateurs, hasSaturdaySelected]);

  const availableRemplacants = useMemo(() => {
    return getAvailableRemplacants(formateurs, {
      hasSaturdaySelected,
      formateurId: formData.formateur_id,
      secondFormateurId: formData.second_formateur_id,
    });
  }, [
    formateurs,
    hasSaturdaySelected,
    formData.formateur_id,
    formData.second_formateur_id,
  ]);

  const availableSecondFormateurs = useMemo(() => {
    return getAvailableCoAnimateurs(formateurs, {
      hasSaturdaySelected,
      formateurId: formData.formateur_id,
      remplacantId: formData.remplacant_id,
    });
  }, [
    formateurs,
    hasSaturdaySelected,
    formData.formateur_id,
    formData.remplacant_id,
  ]);

  const displayedFormateurs = useMemo(() => {
    return getDisplayedFormateurs(formateurs, availableFormateurs);
  }, [availableFormateurs, formateurs]);

  const displayedRemplacants = useMemo(() => {
    return getDisplayedRemplacants(
      formateurs,
      availableRemplacants,
      formData.formateur_id
    );
  }, [availableRemplacants, formateurs, formData.formateur_id]);

  const villesDisponibles = useMemo(() => {
    const counts = new Map();

    lieux.forEach((lieu) => {
      if (!lieu.ville) {
        return;
      }

      counts.set(lieu.ville, (counts.get(lieu.ville) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([ville, count]) => ({
        ville,
        count,
      }))
      .sort((a, b) =>
        a.ville.localeCompare(b.ville, "fr", { sensitivity: "base" })
      );
  }, [lieux]);

  const locauxDisponibles = useMemo(() => {
    if (!formData.ville) {
      return [];
    }

    const sessionsCibles = Array.isArray(preview?.sessions) ? preview.sessions : [];

    return lieux
      .filter((lieu) => lieu.ville === formData.ville)
      .filter((lieu) => {
        if (sessionsCibles.length === 0) {
          return true;
        }

        return !formationsExistantes.some((formation) => {
          if (
            formationEnEdition?.id &&
            String(formation.id) === String(formationEnEdition.id)
          ) {
            return false;
          }

          if (String(formation?.statut ?? "").trim().toLowerCase() === "annule") {
            return false;
          }

          const formationLocation = getFormationLocation(formation);

          if (
            formationLocation.ville !== formData.ville ||
            formationLocation.local !== getLieuOptionValue(lieu)
          ) {
            return false;
          }

          const existingSessions = normalizeSessionsFromFormation(formation);

          return existingSessions.some((existingSession) =>
            sessionsCibles.some((targetSession) =>
              sessionsOverlap(existingSession, targetSession)
            )
          );
        });
      })
      .sort((a, b) =>
        getLieuOptionValue(a).localeCompare(getLieuOptionValue(b), "fr", {
          sensitivity: "base",
        })
      );
  }, [
    formData.ville,
    formationsExistantes,
    formationEnEdition,
    lieux,
    preview?.sessions,
  ]);

  const totalLocauxVille = useMemo(() => {
    if (!formData.ville) {
      return 0;
    }

    return lieux.filter((lieu) => lieu.ville === formData.ville).length;
  }, [formData.ville, lieux]);

  useEffect(() => {
    if (loadingLieux || loadingFormations || !formData.ville) {
      return;
    }

    if (locauxDisponibles.length === 0) {
      setFormData((prev) => {
        if (!prev.local && !prev.lieu) {
          return prev;
        }

        return {
          ...prev,
          local: "",
          lieu: "",
        };
      });
      return;
    }

    const currentLocalIsAvailable = locauxDisponibles.some(
      (lieu) =>
        getLieuOptionValue(lieu) === formData.local && lieu.nom === formData.lieu
    );

    if (currentLocalIsAvailable) {
      return;
    }

    const autoAssignedLieu = locauxDisponibles[0];

    setFormData((prev) => ({
      ...prev,
      local: getLieuOptionValue(autoAssignedLieu),
      lieu: autoAssignedLieu.nom,
    }));
  }, [
    formData.lieu,
    formData.local,
    formData.ville,
    loadingFormations,
    loadingLieux,
    locauxDisponibles,
  ]);

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
    if (loadingFormateurs || !formData.co_animation) {
      return;
    }

    const fallbackSecondFormateur = availableSecondFormateurs[0] || null;

    if (!formData.second_formateur_id && fallbackSecondFormateur) {
      setFormData((prev) => ({
        ...prev,
        second_formateur_id: String(fallbackSecondFormateur.id),
      }));
      return;
    }

    if (
      formData.second_formateur_id &&
      !availableSecondFormateurs.some(
        (formateur) =>
          String(formateur.id) === String(formData.second_formateur_id)
      )
    ) {
      setFormData((prev) => ({
        ...prev,
        second_formateur_id: fallbackSecondFormateur
          ? String(fallbackSecondFormateur.id)
          : "",
      }));
    }
  }, [
    availableSecondFormateurs,
    formData.co_animation,
    formData.second_formateur_id,
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

    if (name === "ville") {
      setFormData((prev) => ({
        ...prev,
        ville: value,
        local: "",
        lieu: "",
      }));
      return;
    }

    if (name === "local") {
      const selectedLieu = lieux.find(
        (lieu) =>
          lieu.ville === formData.ville && getLieuOptionValue(lieu) === value
      );

      setFormData((prev) => ({
        ...prev,
        ville: selectedLieu?.ville || prev.ville,
        local: value,
        lieu: selectedLieu?.nom || prev.lieu,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: name === "nombre_participants" ? Number(value) : value,
    }));
  };

  const handleToggleCoAnimation = () => {
    setFormData((prev) => {
      const nextEnabled = !prev.co_animation;
      const fallbackSecondFormateur =
        availableSecondFormateurs[0] || null;

      return {
        ...prev,
        co_animation: nextEnabled,
        second_formateur_id: nextEnabled
          ? prev.second_formateur_id ||
            (fallbackSecondFormateur ? String(fallbackSecondFormateur.id) : "")
          : "",
      };
    });
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
    setFormData(createInitialFormationForm());
    setErreur("");
    setMessage("");
    setPreview(null);
    setImportReport(null);

    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setImportingFile(true);
      setErreur("");
      setMessage("");

      const imported = await importFormationFile(file, {
        formateurs,
        lieux,
      });

      setFormData({
        ...createInitialFormationForm(),
        ...imported.formData,
        creneaux:
          imported.formData.creneaux?.length > 0
            ? imported.formData.creneaux
            : createInitialFormationForm().creneaux,
      });
      setPreview(null);
      setImportReport(imported.report);

      if (imported.report.readyForVerification) {
        setMessage(
          `Le fichier ${file.name} a ete importe. Le brouillon est maintenant en verification.`
        );
      }
    } catch (err) {
      setImportReport(null);
      setErreur(
        err.message || "Impossible d'importer ce fichier de formation."
      );
    } finally {
      setImportingFile(false);
      event.target.value = "";
    }
  };

  const buildPayload = () => {
    return buildFormationPayload(formData);
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

    if (!formData.ville.trim()) {
      return "Veuillez sélectionner une ville.";
    }

    if (!formData.local.trim()) {
      return totalLocauxVille === 0
        ? "Aucun local n'est configuré pour cette ville. Ajoute-en depuis le dashboard admin."
        : "Aucun local n'est disponible pour ce planning. Ajoute-en depuis le dashboard admin ou change les dates.";
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
      formData.co_animation &&
      !formData.second_formateur_id
    ) {
      return "Veuillez sélectionner le deuxième formateur pour la co-animation.";
    }

    if (
      formData.remplacant_id &&
      String(formData.remplacant_id) === String(formData.formateur_id)
    ) {
      return "Le remplaçant doit être différent du formateur principal.";
    }

    if (
      formData.co_animation &&
      String(formData.second_formateur_id) === String(formData.formateur_id)
    ) {
      return "Le deuxième formateur doit être différent du formateur principal.";
    }

    if (
      formData.co_animation &&
      formData.remplacant_id &&
      String(formData.remplacant_id) === String(formData.second_formateur_id)
    ) {
      return "Le remplaçant doit être différent du deuxième formateur.";
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

      const savedFormation = data?.data && typeof data.data === "object"
        ? data.data
        : null;

      if (savedFormation) {
        setFormationsExistantes((prev) => {
          if (isEditing) {
            return prev.map((formation) =>
              String(formation.id) === String(savedFormation.id)
                ? { ...formation, ...savedFormation }
                : formation
            );
          }

          return [savedFormation, ...prev];
        });
      }

      setMessage(
        isEditing
          ? `La formation a bien été modifiée${
              savedFormation?.local_nom ? ` avec le local ${savedFormation.local_nom}.` : "."
            }`
          : `La formation a bien été créée${
              savedFormation?.local_nom ? ` avec le local ${savedFormation.local_nom}.` : "."
            }`
      );

      setFormData(createInitialFormationForm());
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
        <div className="admin-form__section admin-import">
          <div className="admin-form__section-head">
            <span className="admin-form__section-badge">IMP</span>
            <div>
              <h3 className="admin-form__section-title">Import Excel / CSV</h3>
              <p className="admin-form__section-text">
                Importe un fichier pour pre-remplir la formation, voir les
                erreurs detectees et corriger ensuite les champs directement
                dans le formulaire ci-dessous.
              </p>
            </div>
          </div>

          <div className="admin-import__layout">
            <div className="admin-import__panel">
              <div className="admin-import__panel-head">
                <span className="admin-import__eyebrow">Import guide</span>
                <span className="admin-import__format-badge">
                  `.xlsx` `.xls` `.csv`
                </span>
              </div>

              <div className="admin-import__upload-card">
                <div className="admin-import__upload-copy">
                  <h3 className="admin-import__title">
                    Importer un fichier source
                  </h3>
                  <p className="admin-import__caption">
                    Charge ton tableau pour remplir la formation plus vite. Le
                    systeme controle le contenu avant de te laisser valider.
                  </p>
                </div>

                <div className="admin-form__group">
                  <label className="admin-form__label" htmlFor="formation-import">
                    Fichier a importer
                  </label>
                  <input
                    id="formation-import"
                    className="admin-form__input admin-import__input"
                    type="file"
                    accept={FORMATION_IMPORT_ACCEPT}
                    onChange={handleImportFile}
                    disabled={importingFile || loadingFormateurs || loadingLieux}
                  />
                </div>
              </div>

              <div className="admin-import__steps">
                <div className="admin-import__step">
                  <span>01</span>
                  <strong>Importer</strong>
                </div>
                <div className="admin-import__step">
                  <span>02</span>
                  <strong>Verifier</strong>
                </div>
                <div className="admin-import__step">
                  <span>03</span>
                  <strong>Corriger puis creer</strong>
                </div>
              </div>

              <div className="admin-import__guide-grid">
                <div className="admin-import__guide-card">
                  <strong>Feuille formation</strong>
                  <div className="admin-import__pill-list">
                    {FORMATION_IMPORT_GUIDE.formationColumns.map((column) => (
                      <span key={column} className="admin-import__pill">
                        {column}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="admin-import__guide-card">
                  <strong>Feuille `Creneaux` optionnelle</strong>
                  <div className="admin-import__pill-list">
                    {FORMATION_IMPORT_GUIDE.creneauxColumns.map((column) => (
                      <span key={column} className="admin-import__pill">
                        {column}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="admin-form__hint admin-form__hint--warning admin-import__hint">
                Si le fichier est exploitable, il pre-remplit le formulaire et
                passe en verification. Sinon, tu vois tout de suite ce qu&apos;il
                faut corriger.
              </div>
            </div>

            <div
              className={`admin-import__report ${
                importReport?.readyForVerification
                  ? "is-ready"
                  : importReport
                    ? "is-review"
                    : ""
              }`}
            >
              <div className="admin-import__report-head">
                <div>
                  <span className="admin-import__eyebrow">Controle avant creation</span>
                  <h3 className="admin-import__title">Validation du fichier</h3>
                </div>

                <span
                  className={`admin-import__status ${
                    importReport?.readyForVerification
                      ? "is-ready"
                      : importReport
                        ? "is-review"
                        : "is-idle"
                  }`}
                >
                  {importReport?.readyForVerification
                    ? "Pret pour verification"
                    : importReport
                      ? "A corriger"
                      : "En attente"}
                </span>
              </div>

              {importingFile ? (
                <p className="admin-import__text">
                  Analyse du fichier en cours...
                </p>
              ) : null}

              {!importingFile && !importReport ? (
                <p className="admin-import__text">
                  Aucun fichier importe pour le moment. Une fois le fichier lu,
                  le formulaire sera rempli automatiquement avec ce qui a ete
                  detecte.
                </p>
              ) : null}

              {!importingFile && importReport ? (
                <>
                  <div className="admin-import__stats">
                    <div className="admin-import__stat">
                      <span>Erreurs</span>
                      <strong>{importReport.errors.length}</strong>
                    </div>
                    <div className="admin-import__stat">
                      <span>Controles</span>
                      <strong>{importReport.warnings.length}</strong>
                    </div>
                    <div className="admin-import__stat">
                      <span>Etat</span>
                      <strong>
                        {importReport.readyForVerification ? "OK" : "Check"}
                      </strong>
                    </div>
                  </div>

                  <div className="admin-import__meta">
                    <strong>{importReport.fileName}</strong>
                    <span>Feuille formation : {importReport.formationSheetName}</span>
                    <span>
                      Feuille creneaux :{" "}
                      {importReport.creneauxSheetName || "non fournie"}
                    </span>
                    <span>Importe le : {importReport.importedAt}</span>
                    <span>
                      Etat :{" "}
                      {importReport.readyForVerification
                        ? "pret pour verification"
                        : "corrections necessaires"}
                    </span>
                  </div>

                  {importReport.errors.length > 0 ? (
                    <div className="admin-import__block admin-import__block--error">
                      <strong>Points a corriger</strong>
                      <ul className="admin-import__list">
                        {importReport.errors.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {importReport.warnings.length > 0 ? (
                    <div className="admin-import__block admin-import__block--warning">
                      <strong>Points de controle</strong>
                      <ul className="admin-import__list">
                        {importReport.warnings.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="admin-import__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      onClick={() => setImportReport(null)}
                    >
                      Masquer le rapport
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="admin-form__section">
          <div className="admin-form__section-head">
            <span className="admin-form__section-badge">01</span>
            <div>
              <h3 className="admin-form__section-title">Identité</h3>
              <p className="admin-form__section-text">
                Définis le nom, l’équipe pédagogique, la ville et le local de
                la formation.
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

          <div className="admin-form__group">
            <label className="admin-form__label">Co-animation</label>
            <button
              type="button"
              className={`admin-btn ${
                formData.co_animation
                  ? "admin-btn--primary"
                  : "admin-btn--secondary"
              }`}
              onClick={handleToggleCoAnimation}
            >
              {formData.co_animation
                ? "Co-animation activée"
                : "Activer la co-animation"}
            </button>
          </div>

          {formData.co_animation && (
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="second_formateur_id">
                Deuxième formateur
              </label>
              <select
                id="second_formateur_id"
                className="admin-form__select"
                name="second_formateur_id"
                value={formData.second_formateur_id}
                onChange={handleChange}
                disabled={loadingFormateurs}
              >
                <option value="">
                  {loadingFormateurs
                    ? "Chargement des formateurs..."
                    : "Sélectionner le deuxième formateur"}
                </option>

                {availableSecondFormateurs.map((formateur) => (
                  <option key={formateur.id} value={formateur.id}>
                    {formateur.prenom} {formateur.nom} - {formateur.email}
                  </option>
                ))}
              </select>

              <div className="admin-form__hint">
                Le deuxième formateur est attribué automatiquement s’il est
                disponible, puis reste modifiable manuellement.
              </div>
            </div>
          )}

          {hasSaturdaySelected ? (
            <div className="admin-form__hint admin-form__hint--warning">
              Samedi est sélectionné : seuls les formateurs et remplaçants
              disponibles le samedi sont affichés.
            </div>
          ) : null}

          <div className="admin-form__row">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="ville">
                Ville
              </label>
              <select
                id="ville"
                className="admin-form__select"
                name="ville"
                value={formData.ville}
                onChange={handleChange}
                required
                disabled={loadingLieux}
              >
                <option value="">
                  {loadingLieux
                    ? "Chargement des villes..."
                    : "Sélectionner une ville"}
                </option>

                {villesDisponibles.map((ville) => (
                  <option key={ville.ville} value={ville.ville}>
                    {ville.ville} ({ville.count} local
                    {ville.count > 1 ? "aux" : ""})
                  </option>
                ))}
              </select>

              <div className="admin-form__hint">
                Choisis d&apos;abord la ville pour filtrer les locaux
                disponibles et auto-attribuer le premier local libre.
              </div>
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

          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="local">
              Local
            </label>
            <select
              id="local"
              className="admin-form__select"
              name="local"
              value={formData.local}
              onChange={handleChange}
              required
              disabled={loadingLieux || !formData.ville}
            >
              <option value="">
                {loadingLieux
                  ? "Chargement des locaux..."
                  : !formData.ville
                    ? "Sélectionner d'abord une ville"
                    : "Sélectionner un local"}
              </option>

              {locauxDisponibles.map((lieu) => (
                <option key={lieu.id} value={getLieuOptionValue(lieu)}>
                  {getLieuOptionValue(lieu)}
                </option>
              ))}
            </select>

            {formData.ville ? (
              <div className="admin-form__hint">
                {formData.ville} : {locauxDisponibles.length} local
                {locauxDisponibles.length > 1 ? "aux" : ""} disponible
                {locauxDisponibles.length > 1 ? "s" : ""} sur{" "}
                {totalLocauxVille}{" "}
                configuré
                {totalLocauxVille > 1 ? "s" : ""}
                . Le premier local libre est attribué automatiquement.
              </div>
            ) : null}

            {!loadingLieux && formData.ville && locauxDisponibles.length === 0 ? (
              <div className="admin-form__hint admin-form__hint--error">
                Aucun local n&apos;est disponible pour cette ville sur ce
                planning. Ajoute-en depuis le dashboard admin.
              </div>
            ) : null}
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
                    {JOURS_OPTIONS.map((jour) => {
                      const isSelected =
                        creneau.jours?.includes(jour.value) || false;

                      return (
                        <label
                          key={jour.value}
                          className={`admin-creneau-day ${
                            isSelected ? "is-active" : ""
                          }`}
                        >
                          <input
                            className="admin-creneau-day__input"
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleJourToggle(index, jour.value)}
                          />
                          <span
                            className="admin-creneau-day__check"
                            aria-hidden="true"
                          />
                          <span className="admin-creneau-day__label">
                            {jour.label}
                          </span>
                        </label>
                      );
                    })}
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
              <option value="verification">Verification</option>
              <option value="inactif">Inactif</option>
              <option value="annule">Annulé</option>
            </select>
            <div className="admin-form__hint">
              Les imports valides passent automatiquement en verification pour
              etre relus avant activation.
            </div>
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
