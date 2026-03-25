export function formatFormationJours(jours) {
  if (!jours) return "Non renseigné";

  if (Array.isArray(jours)) {
    return jours.join(", ");
  }

  if (typeof jours === "string") {
    return jours
      .split(",")
      .map((jour) => jour.trim())
      .filter(Boolean)
      .join(", ");
  }

  return "Non renseigné";
}

export function filterFormationsByQuery(formations, search) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return formations;
  }

  return formations.filter((formation) => {
    const haystack = [
      formation.nom,
      formation.lieu,
      formation.formateur_prenom,
      formation.formateur_nom,
      formation.remplacant_prenom,
      formation.remplacant_nom,
      formation.statut,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function getFormationCatalogStats(formations) {
  const actif = formations.filter((item) => item.statut === "actif").length;
  const annule = formations.filter((item) => item.statut === "annule").length;

  return {
    total: formations.length,
    actif,
    annule,
  };
}
