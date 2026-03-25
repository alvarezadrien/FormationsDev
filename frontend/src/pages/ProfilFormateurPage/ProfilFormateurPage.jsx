import { useEffect, useState } from "react";
import { MesDonnees } from "../../components/MesDonnees/MesDonnees";
import { FichePresenceFormateur } from "../../components/FichePresenceFormateur/FichePresenceFormateur";
import { PresenceFormateur } from "../../components/PresenceFormateur/PresenceFormateur";
import "./ProfilFormateurPage.css";

function ProfilFormateurPage() {
  const API_URL = "http://localhost:8080";

  const formatArrayInput = (value) => {
    if (Array.isArray(value)) {
      return value.filter(Boolean).join(", ");
    }

    return typeof value === "string" ? value : "";
  };

  const [userData, setUserData] = useState({
    id: "",
    nom: "",
    prenom: "",
    email: "",
    role: "formateur",
    travaille_samedi: false,
    est_remplacant: false,
    est_co_animation: false,
  });

  const [activeSection, setActiveSection] = useState("infos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [preferencesForm, setPreferencesForm] = useState({
    travaille_samedi: false,
    est_remplacant: false,
    est_co_animation: false,
  });

  const [bioForm, setBioForm] = useState({
    poste: "",
    specialite: "",
    bio: "",
    telephone: "",
    experience: "",
    competences: "",
    formations: "",
  });

  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSuccess, setPreferencesSuccess] = useState("");
  const [preferencesError, setPreferencesError] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [bioSuccess, setBioSuccess] = useState("");
  const [bioError, setBioError] = useState("");

  const normalizeBoolean = (value) => {
    return value === true || value === 1 || value === "1";
  };

  // =============================
  // LOAD USER
  // =============================
  useEffect(() => {
    const loadFormateurProfile = async () => {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      const normalizedUser = {
        id: parsedUser.id || "",
        nom: parsedUser.nom || "",
        prenom: parsedUser.prenom || "",
        email: parsedUser.email || "",
        role: parsedUser.role || "formateur",
        travaille_samedi: normalizeBoolean(parsedUser.travaille_samedi),
        est_remplacant: normalizeBoolean(parsedUser.est_remplacant),
        est_co_animation: normalizeBoolean(parsedUser.est_co_animation),
      };

      setUserData(normalizedUser);
      setPreferencesForm({
        travaille_samedi: normalizedUser.travaille_samedi,
        est_remplacant: normalizedUser.est_remplacant,
        est_co_animation: normalizedUser.est_co_animation,
      });

      if (!parsedUser.id) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/formateurs/${parsedUser.id}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "include",
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.data) {
          return;
        }

        const updatedUser = {
          ...normalizedUser,
          travaille_samedi: normalizeBoolean(data.data.travaille_samedi),
          est_remplacant: normalizeBoolean(data.data.est_remplacant),
          est_co_animation: normalizeBoolean(data.data.est_co_animation),
        };

        setUserData(updatedUser);
        setPreferencesForm({
          travaille_samedi: updatedUser.travaille_samedi,
          est_remplacant: updatedUser.est_remplacant,
          est_co_animation: updatedUser.est_co_animation,
        });
        setBioForm({
          poste: data.data.poste ?? "",
          specialite: data.data.specialite ?? "",
          bio: data.data.bio ?? "",
          telephone: data.data.telephone ?? "",
          experience: formatArrayInput(data.data.experience),
          competences: formatArrayInput(data.data.competences),
          formations: formatArrayInput(data.data.formations),
        });

        localStorage.setItem("user", JSON.stringify(updatedUser));
      } catch {
        // On conserve les valeurs locales en cas d'échec réseau.
      }
    };

    loadFormateurProfile();
  }, []);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  const handlePreferenceChange = (field, value) => {
    setPreferencesForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setPreferencesSuccess("");
    setPreferencesError("");
  };

  const handleBioChange = (field, value) => {
    setBioForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setBioSuccess("");
    setBioError("");
  };

  const buildPreferencesPayload = () => {
    return {
      travaille_samedi: preferencesForm.travaille_samedi ? 1 : 0,
      est_remplacant: preferencesForm.est_remplacant ? 1 : 0,
      est_co_animation: preferencesForm.est_co_animation ? 1 : 0,
    };
  };

  // =============================
  // SAVE
  // =============================
  const handleSavePreferences = async () => {
    try {
      setSavingPreferences(true);
      setPreferencesSuccess("");
      setPreferencesError("");

      const payload = buildPreferencesPayload();

      const response = await fetch(`${API_URL}/formateur/ma-bio`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || "Impossible d'enregistrer vos préférences."
        );
      }

      // 🔥 mise à jour propre
      const updatedUser = {
        ...userData,
        travaille_samedi: normalizeBoolean(
          data?.data?.travaille_samedi ?? payload.travaille_samedi
        ),
        est_remplacant: normalizeBoolean(
          data?.data?.est_remplacant ?? payload.est_remplacant
        ),
        est_co_animation: normalizeBoolean(
          data?.data?.est_co_animation ?? payload.est_co_animation
        ),
      };

      setUserData(updatedUser);
      setPreferencesForm({
        travaille_samedi: updatedUser.travaille_samedi,
        est_remplacant: updatedUser.est_remplacant,
        est_co_animation: updatedUser.est_co_animation,
      });

      // 🔥 IMPORTANT
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("auth-changed"));

      setPreferencesSuccess(
        data?.message || "Vos préférences ont bien été enregistrées."
      );
    } catch (err) {
      setPreferencesError(
        err.message || "Erreur lors de l'enregistrement des préférences."
      );
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleSaveBio = async () => {
    try {
      setSavingBio(true);
      setBioSuccess("");
      setBioError("");

      const payload = {
        poste: bioForm.poste.trim(),
        specialite: bioForm.specialite.trim(),
        bio: bioForm.bio.trim(),
        telephone: bioForm.telephone.trim(),
        experience: bioForm.experience,
        competences: bioForm.competences,
        formations: bioForm.formations,
        travaille_samedi: preferencesForm.travaille_samedi ? 1 : 0,
        est_remplacant: preferencesForm.est_remplacant ? 1 : 0,
        est_co_animation: preferencesForm.est_co_animation ? 1 : 0,
      };

      const response = await fetch(`${API_URL}/formateur/ma-bio`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || "Impossible d'enregistrer votre fiche bio."
        );
      }

      setBioForm({
        poste: data?.data?.poste ?? payload.poste,
        specialite: data?.data?.specialite ?? payload.specialite,
        bio: data?.data?.bio ?? payload.bio,
        telephone: data?.data?.telephone ?? payload.telephone,
        experience: formatArrayInput(data?.data?.experience ?? payload.experience),
        competences: formatArrayInput(
          data?.data?.competences ?? payload.competences
        ),
        formations: formatArrayInput(data?.data?.formations ?? payload.formations),
      });

      setBioSuccess(
        data?.message || "Votre fiche bio a bien été enregistrée."
      );
    } catch (err) {
      setBioError(
        err.message || "Erreur lors de l'enregistrement de la fiche bio."
      );
    } finally {
      setSavingBio(false);
    }
  };

  return (
    <section className="profile_page">
      <div className="profile_wrapper">
        <div className="profile_banner">
          <div className="profile_banner_overlay"></div>

          <div className="profile_banner_content">
            <span className={`profile_role_badge ${userData.role}`}>
              Formateur
            </span>

            <h1 className="profile_main_title">Profil formateur</h1>

            <p className="profile_main_text">
              Retrouvez ici vos informations et vos préférences.
            </p>
          </div>
        </div>

        <div className="profile_layout">
          <aside className="profile_sidebar">
            <div className="profile_identity_card">
              <div className="profile_avatar_circle">
                {userData.prenom?.charAt(0)}
                {userData.nom?.charAt(0)}
              </div>

              <h2 className="profile_name">
                {userData.prenom} {userData.nom}
              </h2>

              <p className="profile_email">{userData.email}</p>
            </div>

            <div className="profile_nav_desktop">
              <button
                className={`profile_nav_button ${
                  activeSection === "infos" ? "active" : ""
                }`}
                onClick={() => handleSectionChange("infos")}
              >
                Informations
              </button>

              <button
                className={`profile_nav_button ${
                  activeSection === "bio" ? "active" : ""
                }`}
                onClick={() => handleSectionChange("bio")}
              >
                Espace bio
              </button>

              <button
                className={`profile_nav_button ${
                  activeSection === "espace" ? "active" : ""
                }`}
                onClick={() => handleSectionChange("espace")}
              >
                Espace
              </button>

              <button
                className={`profile_nav_button ${
                  activeSection === "presence" ? "active" : ""
                }`}
                onClick={() => handleSectionChange("presence")}
              >
                Présence
              </button>

              <button
                className={`profile_nav_button ${
                  activeSection === "fiches" ? "active" : ""
                }`}
                onClick={() => handleSectionChange("fiches")}
              >
                Fiches
              </button>
            </div>
          </aside>

          <div className="profile_content">
            {activeSection === "infos" && (
              <div className="profile_info_block">
                <h2 className="profile_section_title">
                  Préférences formateur
                </h2>

                {preferencesError && (
                  <div className="profile_preferences_alert error">
                    {preferencesError}
                  </div>
                )}

                {preferencesSuccess && (
                  <div className="profile_preferences_alert success">
                    {preferencesSuccess}
                  </div>
                )}

                <div className="profile_preferences_grid">
                  {/* SAMEDI */}
                  <div className="profile_toggle_card">
                    <span>Disponible le samedi</span>

                    <div className="profile_toggle_actions">
                      <button
                        className={`profile_choice_btn ${
                          preferencesForm.travaille_samedi ? "active" : ""
                        }`}
                        onClick={() =>
                          handlePreferenceChange("travaille_samedi", true)
                        }
                      >
                        Oui
                      </button>

                      <button
                        className={`profile_choice_btn ${
                          !preferencesForm.travaille_samedi ? "active" : ""
                        }`}
                        onClick={() =>
                          handlePreferenceChange("travaille_samedi", false)
                        }
                      >
                        Non
                      </button>
                    </div>
                  </div>

                  {/* REMPLACANT */}
                  <div className="profile_toggle_card">
                    <span>Peut être remplaçant</span>

                    <div className="profile_toggle_actions">
                      <button
                        className={`profile_choice_btn ${
                          preferencesForm.est_remplacant ? "active" : ""
                        }`}
                        onClick={() =>
                          handlePreferenceChange("est_remplacant", true)
                        }
                      >
                        Oui
                      </button>

                      <button
                        className={`profile_choice_btn ${
                          !preferencesForm.est_remplacant ? "active" : ""
                        }`}
                        onClick={() =>
                          handlePreferenceChange("est_remplacant", false)
                        }
                      >
                        Non
                      </button>
                    </div>
                  </div>

                  <div className="profile_toggle_card">
                    <span>Peut faire de la co-animation</span>

                    <div className="profile_toggle_actions">
                      <button
                        className={`profile_choice_btn ${
                          preferencesForm.est_co_animation ? "active" : ""
                        }`}
                        onClick={() =>
                          handlePreferenceChange("est_co_animation", true)
                        }
                      >
                        Oui
                      </button>

                      <button
                        className={`profile_choice_btn ${
                          !preferencesForm.est_co_animation ? "active" : ""
                        }`}
                        onClick={() =>
                          handlePreferenceChange("est_co_animation", false)
                        }
                      >
                        Non
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  className="profile_save_preferences_btn"
                  onClick={handleSavePreferences}
                  disabled={savingPreferences}
                >
                  {savingPreferences ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            )}

            {activeSection === "bio" && (
              <div className="profile_info_block profile_bio_block">
                <h2 className="profile_section_title">Espace bio</h2>
                <p className="profile_bio_intro">
                  Complète ici ta fiche publique. Ces informations seront ensuite
                  visibles dans ta fiche bio formateur.
                </p>

                {bioError && (
                  <div className="profile_preferences_alert error">{bioError}</div>
                )}

                {bioSuccess && (
                  <div className="profile_preferences_alert success">
                    {bioSuccess}
                  </div>
                )}

                <div className="profile_bio_grid">
                  <label className="profile_bio_field">
                    <span>Poste</span>
                    <input
                      type="text"
                      value={bioForm.poste}
                      onChange={(event) =>
                        handleBioChange("poste", event.target.value)
                      }
                      placeholder="Ex: Formateur certifié"
                    />
                  </label>

                  <label className="profile_bio_field">
                    <span>Spécialité</span>
                    <input
                      type="text"
                      value={bioForm.specialite}
                      onChange={(event) =>
                        handleBioChange("specialite", event.target.value)
                      }
                      placeholder="Ex: Sécurité, secourisme, incendie"
                    />
                  </label>

                  <label className="profile_bio_field">
                    <span>Téléphone</span>
                    <input
                      type="text"
                      value={bioForm.telephone}
                      onChange={(event) =>
                        handleBioChange("telephone", event.target.value)
                      }
                      placeholder="Ex: 0470 00 00 00"
                    />
                  </label>

                  <label className="profile_bio_field profile_bio_field--full">
                    <span>Biographie</span>
                    <textarea
                      value={bioForm.bio}
                      onChange={(event) =>
                        handleBioChange("bio", event.target.value)
                      }
                      placeholder="Présente ton parcours, ta façon d'enseigner et ce que tu apportes aux apprenants."
                    />
                  </label>

                  <label className="profile_bio_field profile_bio_field--full">
                    <span>Expérience</span>
                    <textarea
                      value={bioForm.experience}
                      onChange={(event) =>
                        handleBioChange("experience", event.target.value)
                      }
                      placeholder="Sépare les éléments par des virgules"
                    />
                  </label>

                  <label className="profile_bio_field profile_bio_field--full">
                    <span>Compétences</span>
                    <textarea
                      value={bioForm.competences}
                      onChange={(event) =>
                        handleBioChange("competences", event.target.value)
                      }
                      placeholder="Ex: Pédagogie active, SST, incendie"
                    />
                  </label>

                  <label className="profile_bio_field profile_bio_field--full">
                    <span>Formations enseignées</span>
                    <textarea
                      value={bioForm.formations}
                      onChange={(event) =>
                        handleBioChange("formations", event.target.value)
                      }
                      placeholder="Liste les formations que tu enseignes, séparées par des virgules"
                    />
                  </label>
                </div>

                <button
                  className="profile_save_preferences_btn"
                  onClick={handleSaveBio}
                  disabled={savingBio}
                >
                  {savingBio ? "Enregistrement..." : "Enregistrer la fiche bio"}
                </button>
              </div>
            )}

            {activeSection === "espace" && <MesDonnees />}
            {activeSection === "presence" && <PresenceFormateur mode="formateur" />}
            {activeSection === "fiches" && <FichePresenceFormateur />}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProfilFormateurPage;
