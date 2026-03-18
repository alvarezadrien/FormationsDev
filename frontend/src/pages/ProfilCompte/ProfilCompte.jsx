import { useEffect, useState } from "react";
import "./ProfilCompte.css";

function ProfilCompte() {
  const [userData, setUserData] = useState({
    nom: "",
    prenom: "",
    email: "",
    role: "user",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedRole = localStorage.getItem("role");

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);

      setUserData({
        nom: parsedUser.nom || "",
        prenom: parsedUser.prenom || "",
        email: parsedUser.email || "",
        role: storedRole || parsedUser.role || "user",
      });
    }
  }, []);

  return (
    <section className="profile_page">
      <div className="profile_wrapper">
        <div className="profile_banner">
          <div className="profile_banner_overlay"></div>

          <div className="profile_banner_content">
            <span className={`profile_role_badge ${userData.role}`}>
              {userData.role === "admin" ? "Administrateur" : "Utilisateur"}
            </span>

            <h1 className="profile_main_title">Mon profil</h1>

            <p className="profile_main_text">
              Retrouvez ici les informations liées à votre compte et à votre
              espace personnel.
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
                {userData.role === "admin" ? "Compte admin" : "Compte actif"}
              </span>
            </div>
          </aside>

          <div className="profile_content">
            <div className="profile_info_block">
              <h2 className="profile_section_title">Informations personnelles</h2>

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
                  <span className="profile_info_value">
                    {userData.role === "admin" ? "Administrateur" : "Utilisateur"}
                  </span>
                </div>
              </div>
            </div>

            <div className="profile_info_block">
              <h2 className="profile_section_title">Espace compte</h2>

              <p className="profile_description">
                Votre espace personnel vous permet de consulter vos informations
                de compte, gérer votre compte, déposer des avis et suivre votre
                activité sur la plateforme.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProfilCompte;