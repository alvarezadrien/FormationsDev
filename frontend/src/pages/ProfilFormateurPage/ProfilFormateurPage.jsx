import { useEffect, useState } from "react";
import { MesDonnees } from "../../components/MesDonnees/MesDonnees";
import { FichePresenceFormateur } from "../../components/FichePresenceFormateur/FichePresenceFormateur";
import "./ProfilFormateurPage.css";

function ProfilFormateurPage() {
  const API_URL = "http://localhost:8080";

  const [userData, setUserData] = useState({
    id: "",
    nom: "",
    prenom: "",
    email: "",
    role: "formateur",
    travaille_samedi: false,
    est_remplacant: false,
  });

  const [activeSection, setActiveSection] = useState("infos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [preferencesForm, setPreferencesForm] = useState({
    travaille_samedi: false,
    est_remplacant: false,
  });

  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSuccess, setPreferencesSuccess] = useState("");
  const [preferencesError, setPreferencesError] = useState("");

  const normalizeBoolean = (value) => {
    return value === true || value === 1 || value === "1";
  };

  // =============================
  // LOAD USER
  // =============================
  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);

      const normalizedUser = {
        id: parsedUser.id || "",
        nom: parsedUser.nom || "",
        prenom: parsedUser.prenom || "",
        email: parsedUser.email || "",
        role: parsedUser.role || "formateur",
        travaille_samedi: normalizeBoolean(parsedUser.travaille_samedi),
        est_remplacant: normalizeBoolean(parsedUser.est_remplacant),
      };

      setUserData(normalizedUser);
      setPreferencesForm({
        travaille_samedi: normalizedUser.travaille_samedi,
        est_remplacant: normalizedUser.est_remplacant,
      });
    }
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

  const buildPreferencesPayload = () => {
    return {
      travaille_samedi: preferencesForm.travaille_samedi ? 1 : 0,
      est_remplacant: preferencesForm.est_remplacant ? 1 : 0,
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

      const response = await fetch(`${API_URL}/me`, {
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
        travaille_samedi: !!payload.travaille_samedi,
        est_remplacant: !!payload.est_remplacant,
      };

      setUserData(updatedUser);
      setPreferencesForm({
        travaille_samedi: updatedUser.travaille_samedi,
        est_remplacant: updatedUser.est_remplacant,
      });

      // 🔥 IMPORTANT
      localStorage.setItem("user", JSON.stringify(updatedUser));

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
                  activeSection === "espace" ? "active" : ""
                }`}
                onClick={() => handleSectionChange("espace")}
              >
                Espace
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

            {activeSection === "espace" && <MesDonnees />}
            {activeSection === "fiches" && <FichePresenceFormateur />}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProfilFormateurPage;