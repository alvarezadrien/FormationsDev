import { useEffect, useState } from "react";
import { MesDonnees } from "../../components/MesDonnees/MesDonnees";
import { FichePresenceFormateur } from "../../components/FichePresenceFormateur/FichePresenceFormateur";
import "./ProfilFormateurPage";

function ProfilFormateurPage() {
  const [userData, setUserData] = useState({
    nom: "",
    prenom: "",
    email: "",
    role: "formateur",
  });

  const [activeSection, setActiveSection] = useState("infos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedRole = localStorage.getItem("role");
    const storedNom = localStorage.getItem("nom");
    const storedPrenom = localStorage.getItem("prenom");
    const storedEmail = localStorage.getItem("email");

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);

      setUserData({
        nom: parsedUser.nom || storedNom || "",
        prenom: parsedUser.prenom || storedPrenom || "",
        email: parsedUser.email || storedEmail || "",
        role: storedRole || parsedUser.role || "formateur",
      });
    } else {
      setUserData({
        nom: storedNom || "",
        prenom: storedPrenom || "",
        email: storedEmail || "",
        role: storedRole || "formateur",
      });
    }
  }, []);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  return (
    <section className="profile_page">
      <div className="profile_wrapper">
        <div className="profile_banner">
          <div className="profile_banner_overlay"></div>

          <div className="profile_banner_content">
            <span className={`profile_role_badge ${userData.role}`}>
              {userData.role === "formateur" ? "Formateur" : "Utilisateur"}
            </span>

            <h1 className="profile_main_title">Profil formateur</h1>

            <p className="profile_main_text">
              Retrouvez ici les informations liées à votre compte formateur,
              votre espace personnel et vos fiches de présence.
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

              <span className={`profile_status_chip ${userData.role}`}>
                {userData.role === "formateur"
                  ? "Compte formateur"
                  : "Compte actif"}
              </span>
            </div>

            <div className="profile_nav_desktop">
              <button
                className={`profile_nav_button ${
                  activeSection === "infos" ? "active" : ""
                }`}
                onClick={() => handleSectionChange("infos")}
                type="button"
              >
                Informations
              </button>

              <button
                className={`profile_nav_button ${
                  activeSection === "espace" ? "active" : ""
                }`}
                onClick={() => handleSectionChange("espace")}
                type="button"
              >
                Espace formateur
              </button>

              <button
                className={`profile_nav_button ${
                  activeSection === "fiches" ? "active" : ""
                }`}
                onClick={() => handleSectionChange("fiches")}
                type="button"
              >
                Fiches de présence
              </button>
            </div>
          </aside>

          <div className="profile_content">
            <div className="profile_mobile_menu_box">
              <button
                className="profile_mobile_toggle"
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                {mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu profil"}
              </button>

              {mobileMenuOpen && (
                <div className="profile_mobile_menu">
                  <button
                    className={`profile_nav_button ${
                      activeSection === "infos" ? "active" : ""
                    }`}
                    onClick={() => handleSectionChange("infos")}
                    type="button"
                  >
                    Informations
                  </button>

                  <button
                    className={`profile_nav_button ${
                      activeSection === "espace" ? "active" : ""
                    }`}
                    onClick={() => handleSectionChange("espace")}
                    type="button"
                  >
                    Espace formateur
                  </button>

                  <button
                    className={`profile_nav_button ${
                      activeSection === "fiches" ? "active" : ""
                    }`}
                    onClick={() => handleSectionChange("fiches")}
                    type="button"
                  >
                    Fiches de présence
                  </button>
                </div>
              )}
            </div>

            {activeSection === "infos" && (
              <div className="profile_info_block">
                <h2 className="profile_section_title">
                  Informations personnelles
                </h2>

                <div className="profile_info_grid">
                  <div className="profile_info_card">
                    <span className="profile_info_label">Nom</span>
                    <span className="profile_info_value">
                      {userData.nom || "Non renseigné"}
                    </span>
                  </div>

                  <div className="profile_info_card">
                    <span className="profile_info_label">Prénom</span>
                    <span className="profile_info_value">
                      {userData.prenom || "Non renseigné"}
                    </span>
                  </div>

                  <div className="profile_info_card">
                    <span className="profile_info_label">Email</span>
                    <span className="profile_info_value">
                      {userData.email || "Non renseigné"}
                    </span>
                  </div>

                  <div className="profile_info_card">
                    <span className="profile_info_label">Rôle</span>
                    <span className="profile_info_value">Formateur</span>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "espace" && (
              <div className="profile_info_block">
                <h2 className="profile_section_title">Espace formateur</h2>

                <p className="profile_description">
                  Votre espace formateur vous permet de consulter et modifier
                  vos informations personnelles.
                </p>

                <MesDonnees />
              </div>
            )}

            {activeSection === "fiches" && (
              <div className="profile_info_block">
                <h2 className="profile_section_title">Fiches de présence</h2>

                <p className="profile_description">
                  Créez, consultez et supprimez vos fiches de présence.
                </p>

                <FichePresenceFormateur />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProfilFormateurPage;