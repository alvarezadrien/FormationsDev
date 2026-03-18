import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import "./FormFormations.css";

const API_URL = "http://localhost:8080";

export function FormFormations() {
  const location = useLocation();

  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    formation_id: "",
    message: "",
  });

  const formationIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("formation");
  }, [location.search]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setErreur("");

        const [formationsResult, meResult] = await Promise.allSettled([
          fetch(`${API_URL}/formations`, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }),
          fetch(`${API_URL}/me`, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            credentials: "include",
            signal: controller.signal,
          }),
        ]);

        if (
          formationsResult.status === "fulfilled" &&
          formationsResult.value instanceof Response
        ) {
          const res = formationsResult.value;

          let data = null;

          try {
            data = await res.json();
          } catch {
            throw new Error(
              "Réponse JSON invalide lors du chargement des formations"
            );
          }

          if (!res.ok) {
            throw new Error(
              data?.message || "Erreur lors du chargement des formations"
            );
          }

          if (!Array.isArray(data)) {
            throw new Error("Format des formations invalide");
          }

          const formationsPubliques = data
            .filter((formation) => {
              const statut = String(formation.statut ?? "actif").toLowerCase();
              return statut === "actif";
            })
            .map((formation) => ({
              id: formation.id,
              nom: formation.nom ?? "Formation sans nom",
              nombre_participants: Number(formation.nombre_participants ?? 0),
            }));

          setFormations(formationsPubliques);
        } else {
          throw new Error("Impossible de charger les formations");
        }

        if (
          meResult.status === "fulfilled" &&
          meResult.value instanceof Response
        ) {
          const res = meResult.value;

          if (res.ok) {
            let data = null;

            try {
              data = await res.json();
            } catch {
              data = null;
            }

            if (data?.user) {
              setFormData((prev) => ({
                ...prev,
                nom: data.user.nom ?? "",
                prenom: data.user.prenom ?? "",
                email: data.user.email ?? "",
              }));
            }
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setErreur(err.message || "Erreur serveur");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!formationIdFromUrl) return;
    if (formations.length === 0) return;

    const formationTrouvee = formations.find(
      (formation) =>
        String(formation.id) === String(formationIdFromUrl) &&
        formation.nombre_participants > 0
    );

    if (formationTrouvee) {
      setFormData((prev) => ({
        ...prev,
        formation_id: String(formationTrouvee.id),
      }));
    }
  }, [formationIdFromUrl, formations]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData((prev) => ({
      nom: prev.nom,
      prenom: prev.prenom,
      email: prev.email,
      telephone: "",
      formation_id: formationIdFromUrl ? String(formationIdFromUrl) : "",
      message: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setErreur("");
      setMessage("");

      if (!formData.formation_id) {
        throw new Error("Veuillez sélectionner une formation");
      }

      const payload = {
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        email: formData.email.trim(),
        telephone: formData.telephone.trim(),
        formation_id: Number(formData.formation_id),
        message: formData.message.trim(),
      };

      const res = await fetch(`${API_URL}/inscriptions-formations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      let data = {};

      try {
        data = await res.json();
      } catch {
        throw new Error(
          "Réponse JSON invalide lors de l'envoi de l'inscription"
        );
      }

      if (!res.ok) {
        throw new Error(data?.message || "Impossible d'envoyer l'inscription");
      }

      setMessage("Votre demande d’inscription a bien été envoyée.");

      setFormations((prev) =>
        prev.map((f) =>
          f.id === Number(payload.formation_id)
            ? {
                ...f,
                nombre_participants: Math.max(0, f.nombre_participants - 1),
              }
            : f
        )
      );

      resetForm();
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'envoi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="training-form-page">
      <div className="training-form-shell">
        <div className="training-form-banner">
          <span className="training-form-badge">Inscription</span>
          <h2 className="training-form-title">
            Rejoignez une formation et développez vos compétences
          </h2>
          <p className="training-form-subtitle">
            Complétez le formulaire ci-dessous pour envoyer votre demande
            d’inscription.
          </p>
        </div>

        <div className="training-form-card">
          <form className="training-form" onSubmit={handleSubmit}>
            <div className="training-form-row">
              <div className="training-field">
                <label htmlFor="nom">Nom</label>
                <input
                  id="nom"
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Votre nom"
                  required
                  disabled={saving}
                />
              </div>

              <div className="training-field">
                <label htmlFor="prenom">Prénom</label>
                <input
                  id="prenom"
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  placeholder="Votre prénom"
                  required
                  disabled={saving}
                />
              </div>
            </div>

            <div className="training-form-row">
              <div className="training-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="exemple@email.com"
                  required
                  disabled={saving}
                />
              </div>

              <div className="training-field">
                <label htmlFor="telephone">Téléphone</label>
                <input
                  id="telephone"
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  placeholder="Votre numéro"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="training-field">
              <label htmlFor="formation_id">Choisir une formation</label>
              <select
                id="formation_id"
                name="formation_id"
                value={formData.formation_id}
                onChange={handleChange}
                required
                disabled={loading || saving}
              >
                <option value="">
                  {loading
                    ? "Chargement des formations..."
                    : "Sélectionner une formation"}
                </option>

                {formations
                  .filter((formation) => formation.nombre_participants > 0)
                  .map((formation) => (
                    <option key={formation.id} value={formation.id}>
                      {formation.nom} ({formation.nombre_participants} place
                      {formation.nombre_participants > 1 ? "s" : ""})
                    </option>
                  ))}
              </select>
            </div>

            <div className="training-field">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                placeholder="Ajoutez un message ou une précision..."
                disabled={saving}
              />
            </div>

            {message && (
              <p style={{ color: "green", marginBottom: "1rem" }}>{message}</p>
            )}

            {erreur && (
              <p style={{ color: "red", marginBottom: "1rem" }}>{erreur}</p>
            )}

            <div className="training-form-actions">
              <button
                type="submit"
                className="training-submit-button"
                disabled={saving || loading}
              >
                {saving ? "Envoi en cours..." : "Envoyer la demande"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}