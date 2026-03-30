import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:8080";

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getLocalValidationError(localNom, villesExistantes) {
  const trimmedLocal = String(localNom || "").trim();

  if (!trimmedLocal) {
    return "Le nom du local est obligatoire.";
  }

  const normalizedLocal = normalizeKey(trimmedLocal);
  const normalizedVilles = villesExistantes.map((ville) => normalizeKey(ville));

  if (normalizedVilles.includes(normalizedLocal)) {
    return "Le nom du local ne peut pas être une ville.";
  }

  if (!/^(local|salle)\b/i.test(trimmedLocal)) {
    return 'Le nom du local doit commencer par "Local" ou "Salle".';
  }

  return "";
}

function normalizeLieu(lieu) {
  return {
    id: lieu?.id ?? "",
    nom: lieu?.nom ?? "",
    ville: lieu?.ville ?? "",
    local_nom: lieu?.local_nom ?? "",
  };
}

export function GestionLocaux() {
  const [lieux, setLieux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    ville: "",
    local_nom: "",
  });

  const fetchLieux = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/lieux`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(data?.message || "Impossible de charger les locaux.");
      }

      setLieux(Array.isArray(data) ? data.map(normalizeLieu) : []);
    } catch (err) {
      setError(err.message || "Erreur lors du chargement des locaux.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLieux();
  }, []);

  const groupedLieux = useMemo(() => {
    const groups = new Map();

    lieux.forEach((lieu) => {
      const ville = String(lieu.ville || "").trim() || "Non renseignée";
      const current = groups.get(ville) || [];
      current.push(lieu);
      groups.set(ville, current);
    });

    return Array.from(groups.entries())
      .map(([ville, items]) => ({
        ville,
        items: items.sort((a, b) =>
          String(a.local_nom || a.nom).localeCompare(
            String(b.local_nom || b.nom),
            "fr",
            { sensitivity: "base" }
          )
        ),
      }))
      .sort((a, b) =>
        a.ville.localeCompare(b.ville, "fr", { sensitivity: "base" })
      );
  }, [lieux]);

  const villesExistantes = useMemo(
    () =>
      Array.from(
        new Set(
          lieux
            .map((lieu) => String(lieu.ville || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })),
    [lieux]
  );

  useEffect(() => {
    setFormData((prev) => {
      if (villesExistantes.length === 0) {
        if (!prev.ville) {
          return prev;
        }

        return {
          ...prev,
          ville: "",
        };
      }

      if (villesExistantes.includes(prev.ville)) {
        return prev;
      }

      return {
        ...prev,
        ville: villesExistantes[0],
      };
    });
  }, [villesExistantes]);

  const handleChange = ({ target: { name, value } }) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!formData.ville.trim()) {
      setError("Choisis une ville existante.");
      return;
    }

    if (!villesExistantes.includes(formData.ville.trim())) {
      setError("La ville doit être choisie parmi celles déjà présentes en base.");
      return;
    }

    const localValidationError = getLocalValidationError(
      formData.local_nom,
      villesExistantes
    );

    if (localValidationError) {
      setError(localValidationError);
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/lieux`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ville: formData.ville.trim(),
          local_nom: formData.local_nom.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.messages?.local_nom ||
            data?.messages?.ville ||
            data?.messages?.slug ||
            data?.message ||
            "Impossible d'ajouter le local."
        );
      }

      setMessage(
        `Le local ${formData.local_nom.trim()} a bien été ajouté à ${formData.ville.trim()}.`
      );
      setFormData({
        ville: formData.ville.trim(),
        local_nom: "",
      });
      await fetchLieux();
    } catch (err) {
      setError(err.message || "Erreur lors de la création du local.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-locaux">
      <div className="admin-form__section">
        <div className="admin-form__section-head">
          <span className="admin-form__section-badge">LC</span>
          <div>
            <h3 className="admin-form__section-title">Ajouter un local</h3>
            <p className="admin-form__section-text">
              Crée de nouveaux locaux par ville pour augmenter les capacités
              d'attribution automatique.
            </p>
          </div>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form__row">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="local_ville">
                Ville
              </label>
              <select
                id="local_ville"
                className="admin-form__input"
                name="ville"
                value={formData.ville}
                onChange={handleChange}
                required
                disabled={saving || villesExistantes.length === 0}
              >
                {villesExistantes.length === 0 ? (
                  <option value="">Aucune ville disponible</option>
                ) : null}

                {villesExistantes.map((ville) => (
                  <option key={ville} value={ville}>
                    {ville}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="local_nom">
                Nom du local
              </label>
              <input
                id="local_nom"
                className="admin-form__input"
                type="text"
                name="local_nom"
                value={formData.local_nom}
                onChange={handleChange}
                placeholder="Ex: Local 7 ou Salle A"
                required
              />
              <p className="admin-form__hint">
                Utilise un vrai nom de local, par exemple `Local 7` ou `Salle
                A`. Le nom d&apos;une ville seule n&apos;est pas accepté.
              </p>
            </div>
          </div>

          {message ? (
            <div className="admin-feedback admin-feedback--success">{message}</div>
          ) : null}

          {error ? (
            <div className="admin-feedback admin-feedback--error">{error}</div>
          ) : null}

          <div className="admin-form__actions">
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={saving || villesExistantes.length === 0}
            >
              {saving ? "Ajout..." : "Ajouter le local"}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="admin-loading">Chargement des locaux...</div>
      ) : (
        <div className="admin-list__grid">
          {groupedLieux.map((group) => (
            <article key={group.ville} className="admin-card admin-card--locaux">
              <div className="admin-card__header">
                <div>
                  <span className="admin-card__eyebrow">Ville</span>
                  <h3 className="admin-card__title">{group.ville}</h3>
                </div>

                <span className="admin-hours-card__badge">
                  {group.items.length} local{group.items.length > 1 ? "aux" : ""}
                </span>
              </div>

              <div className="admin-location-list">
                {group.items.map((lieu) => (
                  <span key={lieu.id} className="admin-location-chip">
                    {lieu.local_nom || lieu.nom}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
