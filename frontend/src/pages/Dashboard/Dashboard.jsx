import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import "./Dashboard.css";

const API_URL = "http://localhost:8080";

import { StatsFormations } from "../../components/StatsFormations/StatsFormations";
import { CreationFormations } from "../../components/CreationFormations/CreationFormations";
import { FormationsCrees } from "../../components/FormationsCrees/FormationsCrees";
import { FormActif } from "../../components/FormActif/FormActif";
import { AvisAdmin } from "../../components/AvisAdmin/AvisAdmin";
import { CreationCompteFormateur } from "../../components/CreationCompteFormateur/CreationCompteFormateur";
import { FichesPresenceAdmin } from "../../components/FichePresenceAdmin/FichePresenceAdmin";
import { DetailUsers } from "../../components/DetailsUsers/DetailsUsers";
import { CalendrierComplet } from "../../components/CalendrierComplet/CalendrierComplet";

export default function AdminFormationsDashboard() {
  const [formationEnEdition, setFormationEnEdition] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("formations");
  const [authChecked, setAuthChecked] = useState(false);
  const [authValid, setAuthValid] = useState(false);

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isAdmin = localStorage.getItem("role") === "admin";

  const menuItems = useMemo(
    () => [
      {
        key: "formations",
        label: "Gestion des formations",
        description: "Créer, modifier et supprimer les formations",
      },
      {
        key: "calendrier",
        label: "Calendrier complet",
        description: "Voir tous les cours, créneaux et formateurs",
      },
      {
        key: "formateurs",
        label: "Comptes formateurs",
        description: "Créer et gérer les comptes formateurs",
      },
      {
        key: "users",
        label: "Gestion des utilisateurs",
        description: "Voir et supprimer les comptes utilisateurs",
      },
      {
        key: "actives",
        label: "Formations actives",
        description: "Consulter les formations en cours",
      },
      {
        key: "avis",
        label: "Avis",
        description: "Gérer les avis administrateur",
      },
      {
        key: "presences",
        label: "Fiches de présence",
        description: "Consulter et gérer les présences",
      },
    ],
    []
  );

  useEffect(() => {
    if (formationEnEdition) {
      setActiveSection("formations");
    }
  }, [formationEnEdition]);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      if (!isLoggedIn || !isAdmin) {
        if (isMounted) {
          setAuthValid(false);
          setAuthChecked(true);
        }
        return;
      }

      try {
        const response = await fetch(`${API_URL}/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data?.user?.role !== "admin") {
          localStorage.removeItem("role");
          localStorage.removeItem("user");
          localStorage.removeItem("isLoggedIn");
          window.dispatchEvent(new Event("auth-changed"));

          if (isMounted) {
            setAuthValid(false);
            setAuthChecked(true);
          }
          return;
        }

        if (isMounted) {
          setAuthValid(true);
          setAuthChecked(true);
        }
      } catch {
        if (isMounted) {
          setAuthValid(false);
          setAuthChecked(true);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, isAdmin]);

  const handleSectionChange = (sectionKey) => {
    setActiveSection(sectionKey);
    setMenuOpen(false);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "formations":
        return (
          <div className="admin-section admin-section--formations">
            <div className="admin-dashboard__layout">
              <div className="admin-panel">
                <div className="admin-panel__header">
                  <span className="admin-panel__eyebrow">
                    {formationEnEdition ? "Mode édition" : "Nouvelle formation"}
                  </span>
                  <h2 className="admin-panel__title">
                    {formationEnEdition
                      ? "Modifier une formation"
                      : "Créer une formation"}
                  </h2>
                  <p className="admin-panel__text">
                    {formationEnEdition
                      ? "Mets à jour les informations de la formation sélectionnée."
                      : "Ajoute une nouvelle formation à ton catalogue."}
                  </p>
                </div>

                <CreationFormations
                  formationEnEdition={formationEnEdition}
                  onSaved={() => {
                    setFormationEnEdition(null);
                    setRefreshKey((prev) => prev + 1);
                  }}
                  onCancelEdit={() => setFormationEnEdition(null)}
                />
              </div>

              <div className="admin-dashboard__content">
                <div className="admin-list">
                  <div className="admin-list__header">
                    <span className="admin-list__eyebrow">
                      Catalogue formations
                    </span>
                    <h2 className="admin-list__title">Formations créées</h2>
                    <p className="admin-list__text">
                      Retrouve toutes les formations enregistrées et gère-les
                      rapidement depuis cet espace.
                    </p>
                  </div>

                  <FormationsCrees
                    refreshKey={refreshKey}
                    onEdit={(formation) => {
                      setFormationEnEdition(formation);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onDeleted={(deletedId) => {
                      setRefreshKey((prev) => prev + 1);

                      if (formationEnEdition?.id === deletedId) {
                        setFormationEnEdition(null);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "calendrier":
        return (
          <section className="admin-section">
            <div className="admin-list">
              <div className="admin-list__header">
                <span className="admin-list__eyebrow">Planning</span>
                <h2 className="admin-list__title">Calendrier complet</h2>
                <p className="admin-list__text">
                  Consulte toutes les formations, leurs dates, leurs horaires et
                  les formateurs associés. Clique sur un créneau pour l’ouvrir
                  dans une popup et le gérer.
                </p>
              </div>

              <CalendrierComplet />
            </div>
          </section>
        );

      case "formateurs":
        return (
          <section className="admin-section">
            <div className="admin-list">
              <div className="admin-list__header">
                <span className="admin-list__eyebrow">Administration</span>
                <h2 className="admin-list__title">Comptes formateurs</h2>
                <p className="admin-list__text">
                  Crée et organise les accès formateurs depuis une interface
                  dédiée.
                </p>
              </div>
              <CreationCompteFormateur />
            </div>
          </section>
        );

      case "users":
        return (
          <section className="admin-section">
            <div className="admin-list">
              <div className="admin-list__header">
                <span className="admin-list__eyebrow">Utilisateurs</span>
                <h2 className="admin-list__title">Gestion des utilisateurs</h2>
                <p className="admin-list__text">
                  Consulte tous les comptes inscrits, distingue facilement les
                  utilisateurs, formateurs et admins, puis supprime-les si
                  nécessaire.
                </p>
              </div>
              <DetailUsers />
            </div>
          </section>
        );

      case "actives":
        return (
          <section className="admin-section">
            <div className="admin-list">
              <div className="admin-list__header">
                <span className="admin-list__eyebrow">Suivi</span>
                <h2 className="admin-list__title">Formations actives</h2>
                <p className="admin-list__text">
                  Visualise rapidement les formations actuellement actives.
                </p>
              </div>
              <FormActif />
            </div>
          </section>
        );

      case "avis":
        return (
          <section className="admin-section">
            <div className="admin-list">
              <div className="admin-list__header">
                <span className="admin-list__eyebrow">Qualité</span>
                <h2 className="admin-list__title">Gestion des avis</h2>
                <p className="admin-list__text">
                  Consulte, analyse et gère les avis liés aux formations.
                </p>
              </div>
              <AvisAdmin />
            </div>
          </section>
        );

      case "presences":
        return (
          <section className="admin-section">
            <div className="admin-list">
              <div className="admin-list__header">
                <span className="admin-list__eyebrow">Présences</span>
                <h2 className="admin-list__title">Fiches de présence</h2>
                <p className="admin-list__text">
                  Contrôle les fiches de présence et centralise leur gestion.
                </p>
              </div>
              <FichesPresenceAdmin />
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  if (!authChecked) {
    return null;
  }

  if (!authValid) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="admin-dashboard">
      <div className="admin-dashboard__topbar">
        <div className="admin-dashboard__header">
          <div>
            <span className="admin-dashboard__eyebrow">
              Espace administration
            </span>
            <h1 className="admin-dashboard__title">
              Dashboard Admin Formations
            </h1>
            <p className="admin-dashboard__subtitle">
              Gère les formations, les comptes formateurs, les utilisateurs, les
              avis, les fiches de présence et désormais tout le planning depuis
              un espace structuré et plus lisible.
            </p>
          </div>

          <button
            type="button"
            className={`admin-menu-toggle ${menuOpen ? "is-open" : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Ouvrir le menu de navigation"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <StatsFormations />
      </div>

      <div className="admin-shell">
        <aside className={`admin-sidebar ${menuOpen ? "is-open" : ""}`}>
          <div className="admin-sidebar__header">
            <h2 className="admin-sidebar__title">Navigation</h2>
            <p className="admin-sidebar__text">
              Choisis le module à afficher.
            </p>
          </div>

          <nav className="admin-sidebar__nav">
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`admin-nav-btn ${
                  activeSection === item.key ? "is-active" : ""
                }`}
                onClick={() => handleSectionChange(item.key)}
              >
                <span className="admin-nav-btn__label">{item.label}</span>
                <span className="admin-nav-btn__desc">{item.description}</span>
              </button>
            ))}
          </nav>
        </aside>

        {menuOpen && (
          <button
            type="button"
            className="admin-sidebar__backdrop"
            onClick={() => setMenuOpen(false)}
            aria-label="Fermer le menu"
          />
        )}

        <section className="admin-main">
          <div className="admin-main__header">
            <div>
              <span className="admin-main__eyebrow">Module actif</span>
              <h2 className="admin-main__title">
                {menuItems.find((item) => item.key === activeSection)?.label}
              </h2>
            </div>
          </div>

          {renderActiveSection()}
        </section>
      </div>
    </main>
  );
}
