export function normalizeBoolean(value) {
  return value === true || value === 1 || value === "1";
}

export function normalizeFormateur(formateur) {
  return {
    id: Number(formateur.id),
    nom:
      formateur.nom ||
      formateur.name ||
      formateur.full_name ||
      `${formateur.prenom || ""} ${formateur.nom || ""}`.trim() ||
      formateur.email ||
      `Formateur #${formateur.id}`,
    prenom: formateur.prenom || "",
    email: formateur.email || "",
    est_remplacant: normalizeBoolean(formateur.est_remplacant),
    travaille_samedi: normalizeBoolean(formateur.travaille_samedi),
    est_co_animation: normalizeBoolean(formateur.est_co_animation),
  };
}

export function getAvailablePrincipalFormateurs(formateurs, hasSaturdaySelected) {
  let result = [...formateurs];

  if (hasSaturdaySelected) {
    result = result.filter((formateur) => formateur.travaille_samedi === true);
  }

  return result;
}

export function getAvailableRemplacants(
  formateurs,
  { hasSaturdaySelected = false, formateurId = "", secondFormateurId = "" } = {}
) {
  let result = formateurs.filter(
    (formateur) => formateur.est_remplacant === true
  );

  if (hasSaturdaySelected) {
    result = result.filter((formateur) => formateur.travaille_samedi === true);
  }

  if (formateurId) {
    result = result.filter(
      (formateur) => String(formateur.id) !== String(formateurId)
    );
  }

  if (secondFormateurId) {
    result = result.filter(
      (formateur) => String(formateur.id) !== String(secondFormateurId)
    );
  }

  return result;
}

export function getAvailableCoAnimateurs(
  formateurs,
  { hasSaturdaySelected = false, formateurId = "", remplacantId = "" } = {}
) {
  let result = formateurs.filter(
    (formateur) => formateur.est_co_animation === true
  );

  if (hasSaturdaySelected) {
    result = result.filter((formateur) => formateur.travaille_samedi === true);
  }

  if (formateurId) {
    result = result.filter(
      (formateur) => String(formateur.id) !== String(formateurId)
    );
  }

  if (remplacantId) {
    result = result.filter(
      (formateur) => String(formateur.id) !== String(remplacantId)
    );
  }

  return result;
}

export function getDisplayedFormateurs(formateurs, availableFormateurs) {
  if (availableFormateurs.length > 0) {
    return availableFormateurs;
  }

  return formateurs;
}

export function getDisplayedRemplacants(
  formateurs,
  availableRemplacants,
  formateurId
) {
  const fallbackRemplacants = formateurs.filter(
    (formateur) => String(formateur.id) !== String(formateurId)
  );

  if (availableRemplacants.length > 0) {
    return availableRemplacants;
  }

  return fallbackRemplacants;
}
