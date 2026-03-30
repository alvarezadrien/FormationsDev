import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckSquare,
  FiClock,
  FiEdit3,
  FiFolder,
  FiGrid,
  FiMail,
  FiMenu,
  FiMapPin,
  FiMessageSquare,
  FiPlus,
  FiPlayCircle,
  FiSearch,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { StatsFormations } from "../../components/StatsFormations/StatsFormations";
import { CreationFormations } from "../../components/CreationFormations/CreationFormations";
import { FormationsCrees } from "../../components/FormationsCrees/FormationsCrees";
import { FormActif } from "../../components/FormActif/FormActif";
import { AvisAdmin } from "../../components/AvisAdmin/AvisAdmin";
import { CreationCompteFormateur } from "../../components/CreationCompteFormateur/CreationCompteFormateur";
import { FichesPresenceAdmin } from "../../components/FichePresenceAdmin/FichePresenceAdmin";
import { PresenceFormateur } from "../../components/PresenceFormateur/PresenceFormateur";
import { DetailUsers } from "../../components/DetailsUsers/DetailsUsers";
import { CalendrierComplet } from "../../components/CalendrierComplet/CalendrierComplet";
import { CalculHeure } from "../../components/CalculHeure/CalculHeure";
import { GestionLocaux } from "../../components/GestionLocaux/GestionLocaux";
import { ADMIN_MENU_ITEMS } from "../../features/dashboard/config/adminSections";
import "./Dashboard.css";

const API_URL = "http://localhost:8080";

const MENU_ICONS = {
  "creation-formation": FiEdit3,
  "formations-creees": FiFolder,
  calendrier: FiCalendar,
  "calcul-heure": FiClock,
  locaux: FiMapPin,
  formateurs: FiUserPlus,
  users: FiUsers,
  actives: FiPlayCircle,
  avis: FiMessageSquare,
  presences: FiCheckSquare,
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function getDisplayName(user) {
  const prenom = String(user?.prenom || "").trim();
  const nom = String(user?.nom || "").trim();
  const fallback = String(user?.email || "").trim();

  return [prenom, nom].filter(Boolean).join(" ") || fallback || "Admin";
}

function getInitials(user) {
  const prenom = String(user?.prenom || "").trim();
  const nom = String(user?.nom || "").trim();
  const source = [prenom, nom].filter(Boolean).join(" ").trim();

  if (!source) {
    return "AD";
  }

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .join("");
}

export default function AdminFormationsDashboard() {
  const [formationEnEdition, setFormationEnEdition] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("creation-formation");
  const [authChecked, setAuthChecked] = useState(false);
  const [authValid, setAuthValid] = useState(false);

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isAdmin = localStorage.getItem("role") === "admin";

  const menuItems = useMemo(() => ADMIN_MENU_ITEMS, []);
  const currentUser = useMemo(() => getStoredUser(), []);
  const displayName = useMemo(() => getDisplayName(currentUser), [currentUser]);
  const userInitials = useMemo(() => getInitials(currentUser), [currentUser]);
  const firstName =
    String(currentUser?.prenom || "").trim() || displayName.split(" ")[0];
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-BE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    []
  );

  const activeMenuItem = useMemo(
    () => menuItems.find((item) => item.key === activeSection) ?? menuItems[0],
    [activeSection, menuItems]
  );
  const normalizedSearchQuery = useMemo(
    () => searchQuery.trim().toLowerCase(),
    [searchQuery]
  );
  const filteredMenuItems = useMemo(() => {
    if (!normalizedSearchQuery) {
      return menuItems;
    }

    return menuItems.filter((item) => {
      const haystack = `${item.label} ${item.description}`.toLowerCase();
      return haystack.includes(normalizedSearchQuery) || item.key === activeSection;
    });
  }, [activeSection, menuItems, normalizedSearchQuery]);
  const ActiveSectionIcon = MENU_ICONS[activeMenuItem?.key] || FiGrid;
  const activeSectionIndex = useMemo(
    () => Math.max(menuItems.findIndex((item) => item.key === activeSection), 0) + 1,
    [activeSection, menuItems]
  );
  const quickSections = useMemo(
    () => filteredMenuItems.filter((item) => item.key !== activeSection).slice(0, 4),
    [activeSection, filteredMenuItems]
  );
  const spotlightCards = useMemo(
    () => [
      {
        key: "modules",
        label: "Modules",
        value: String(menuItems.length).padStart(2, "0"),
        text: "espaces de gestion disponibles",
        tone: "primary",
      },
      {
        key: "position",
        label: "Section active",
        value: String(activeSectionIndex).padStart(2, "0"),
        text: activeMenuItem?.label || "Navigation",
        tone: "neutral",
      },
      {
        key: "shortcuts",
        label: "Acces rapides",
        value: String(quickSections.length).padStart(2, "0"),
        text: "raccourcis visibles depuis le dashboard",
        tone: "neutral",
      },
      {
        key: "mode",
        label: "Mode",
        value: formationEnEdition ? "EDIT" : "LIVE",
        text: formationEnEdition
          ? "une formation est en cours d'edition"
          : "pilotage administratif global",
        tone: "neutral",
      },
    ],
    [
      activeMenuItem?.label,
      activeSectionIndex,
      formationEnEdition,
      menuItems.length,
      quickSections.length,
    ]
  );

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
      case "creation-formation":
        return (
          <section className="admin-section admin-section--composer">
            <div className="admin-module-hero admin-module-hero--creation">
              <div className="admin-module-hero__content">
                <span className="admin-module-hero__eyebrow">
                  Production formation
                </span>
                <h3 className="admin-module-hero__title">
                  {formationEnEdition
                    ? "Edition guidée de la formation"
                    : "Nouveau dossier de formation"}
                </h3>
                <p className="admin-module-hero__text">
                  Prépare la fiche, l’équipe pédagogique, les créneaux et la
                  planification dans un espace dédié à la création.
                </p>
              </div>

              <div className="admin-module-hero__stats">
                <div className="admin-module-hero__stat">
                  <span>Etat</span>
                  <strong>{formationEnEdition ? "Edition" : "Brouillon"}</strong>
                </div>
                <div className="admin-module-hero__stat">
                  <span>Workflow</span>
                  <strong>Création</strong>
                </div>
              </div>
            </div>

            <div className="admin-panel admin-panel--composer">
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
          </section>
        );

      case "formations-creees":
        return (
          <section className="admin-section admin-section--catalog">
            <div className="admin-module-hero admin-module-hero--catalog">
              <div className="admin-module-hero__content">
                <span className="admin-module-hero__eyebrow">
                  Pilotage catalogue
                </span>
                <h3 className="admin-module-hero__title">
                  Vue CRM des formations enregistrées
                </h3>
                <p className="admin-module-hero__text">
                  Parcours le catalogue, retrouve rapidement chaque formation
                  et ouvre l’édition depuis cette vue dédiée.
                </p>
              </div>

              <div className="admin-module-hero__stats">
                <div className="admin-module-hero__stat">
                  <span>Vue</span>
                  <strong>Catalogue</strong>
                </div>
                <div className="admin-module-hero__stat">
                  <span>Mode</span>
                  <strong>Gestion</strong>
                </div>
              </div>
            </div>

            <div className="admin-list admin-list--catalog">
              <div className="admin-list__header">
                <span className="admin-list__eyebrow">
                  Catalogue formations
                </span>
                <h2 className="admin-list__title">Formations créées</h2>
                <p className="admin-list__text">
                  Retrouve toutes les formations enregistrées et gère-les
                  rapidement depuis cet espace dédié.
                </p>
              </div>

              <FormationsCrees
                refreshKey={refreshKey}
                onEdit={(formation) => {
                  setFormationEnEdition(formation);
                  setActiveSection("creation-formation");
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
          </section>
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

      case "calcul-heure":
        return (
          <section className="admin-section">
            <div className="admin-list">
              <div className="admin-list__header">
                <span className="admin-list__eyebrow">Suivi annuel</span>
                <h2 className="admin-list__title">Calcule heure</h2>
                <p className="admin-list__text">
                  Visualise le volume attendu, les heures déjà effectuées et la
                  progression de toutes les formations actives sur l&apos;année
                  civile.
                </p>
              </div>

              <CalculHeure />
            </div>
          </section>
        );

      case "locaux":
        return (
          <section className="admin-section">
            <div className="admin-list">
              <div className="admin-list__header">
                <span className="admin-list__eyebrow">Capacité</span>
                <h2 className="admin-list__title">Gestion des locaux</h2>
                <p className="admin-list__text">
                  Ajoute de nouveaux locaux par ville pour augmenter les
                  disponibilités lors de l'attribution automatique des
                  formations.
                </p>
              </div>

              <GestionLocaux />
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
                <h2 className="admin-list__title">Présence formateurs</h2>
                <p className="admin-list__text">
                  Suis les absences des formateurs et vois immédiatement si le
                  remplaçant attribué assure le cours.
                </p>
              </div>

              <PresenceFormateur mode="admin" />
            </div>

            <div className="admin-list">
              <div className="admin-list__header">
                <span className="admin-list__eyebrow">Historique</span>
                <h2 className="admin-list__title">Fiches de présence</h2>
                <p className="admin-list__text">
                  Contrôle aussi les fiches de présence détaillées déjà créées.
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
      <div className="admin-shell">
        <aside className={`admin-sidebar ${menuOpen ? "is-open" : ""}`}>
          <div className="admin-sidebar__brand">
            <span className="admin-sidebar__brand-mark">
              <FiBookOpen />
            </span>
            <div>
              <span className="admin-sidebar__brand-kicker">Dashboard administrative</span>
              <h2 className="admin-sidebar__title">CodingFormations</h2>
            </div>
          </div>

          <div className="admin-sidebar__header">
            <p className="admin-sidebar__text">
              {normalizedSearchQuery
                ? `${filteredMenuItems.length} module(s) trouve(s)`
                : "Navigation principale"}
            </p>
          </div>

          <nav className="admin-sidebar__nav">
            {filteredMenuItems.length === 0 && normalizedSearchQuery ? (
              <div className="admin-sidebar__empty">
                Aucun module ne correspond a votre recherche.
              </div>
            ) : (
              filteredMenuItems.map((item) => {
                const ItemIcon = MENU_ICONS[item.key] || FiGrid;

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`admin-nav-btn ${
                      activeSection === item.key ? "is-active" : ""
                    }`}
                    onClick={() => handleSectionChange(item.key)}
                  >
                    <span className="admin-nav-btn__icon">
                      <ItemIcon />
                    </span>
                    <span className="admin-nav-btn__content">
                      <span className="admin-nav-btn__label">{item.label}</span>
                      <span className="admin-nav-btn__desc">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </nav>

          <div className="admin-sidebar__footer">
            <span className="admin-sidebar__footer-label">Module actif</span>
            <strong className="admin-sidebar__footer-title">
              {activeMenuItem?.label}
            </strong>
            <p className="admin-sidebar__text">
              {activeMenuItem?.description}
            </p>
          </div>
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
          <header className="admin-main-topbar">
            <button
              type="button"
              className={`admin-menu-toggle ${menuOpen ? "is-open" : ""}`}
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <FiMenu />
            </button>

            <label className="admin-searchbar" htmlFor="admin-dashboard-search">
              <span className="admin-searchbar__icon" aria-hidden="true">
                <FiSearch />
              </span>
              <input
                id="admin-dashboard-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher un module, une action ou une section"
              />
              <span className="admin-searchbar__hint">Ctrl K</span>
            </label>

            <div className="admin-main-topbar__actions">
              <button
                type="button"
                className="admin-action-btn"
                aria-label="Messagerie"
              >
                <FiMail />
              </button>
              <button
                type="button"
                className="admin-action-btn"
                aria-label="Notifications"
              >
                <FiBell />
              </button>

              <div className="admin-user-chip">
                <span className="admin-user-chip__avatar">{userInitials}</span>
                <span className="admin-user-chip__meta">
                  <strong>{displayName}</strong>
                  <span>{currentUser?.email || "admin@codingformations.local"}</span>
                </span>
              </div>
            </div>
          </header>

          <section className="admin-hero">
            <div className="admin-hero__content">
              <span className="admin-hero__eyebrow">Dashboard</span>
              <h1 className="admin-hero__title">Pilotez vos formations avec clarté</h1>
              <p className="admin-hero__text">
                {activeMenuItem?.description} Consultez vos modules, vos
                raccourcis et vos statistiques depuis une seule interface.{" "}
                {todayLabel}
              </p>
            </div>

            <div className="admin-hero__actions">
              <button
                type="button"
                className="admin-hero__action admin-hero__action--primary"
                onClick={() => handleSectionChange("creation-formation")}
              >
                <FiPlus />
                Nouvelle formation
              </button>
              <button
                type="button"
                className="admin-hero__action admin-hero__action--ghost"
                onClick={() => handleSectionChange("calendrier")}
              >
                <FiCalendar />
                Ouvrir le calendrier
              </button>
            </div>
          </section>

          <section className="admin-spotlight-grid">
            {spotlightCards.map((card) => (
              <article
                key={card.key}
                className={`admin-spotlight-card ${
                  card.tone === "primary" ? "is-primary" : ""
                }`}
              >
                <span className="admin-spotlight-card__label">{card.label}</span>
                <strong className="admin-spotlight-card__value">{card.value}</strong>
                <p className="admin-spotlight-card__text">{card.text}</p>
              </article>
            ))}
          </section>

          <section className="admin-overview">
            <div className="admin-overview__intro">
              <span className="admin-overview__eyebrow">
                Bienvenue, {firstName} !
              </span>
              <h2 className="admin-overview__title">Vue d'ensemble du pilotage</h2>
              <p className="admin-overview__text">
                Retrouve les indicateurs clés, le module actuellement
                sélectionné et les actions utiles pour avancer vite dans
                l&apos;espace d&apos;administration.
              </p>

              <div className="admin-overview__chips">
                <span className="admin-overview__chip">
                  Section {activeSectionIndex.toString().padStart(2, "0")}
                </span>
                <span className="admin-overview__chip">
                  {menuItems.length} modules disponibles
                </span>
                <span className="admin-overview__chip">
                  Connexion sécurisée
                </span>
              </div>
            </div>

            <div className="admin-shortcuts">
              <div className="admin-shortcuts__header">
                <span className="admin-shortcuts__eyebrow">Navigation rapide</span>
                <h3 className="admin-shortcuts__title">Modules recommandés</h3>
              </div>

              {quickSections.length === 0 ? (
                <div className="admin-shortcuts__empty">
                  Aucun raccourci ne correspond a votre recherche.
                </div>
              ) : (
                quickSections.map((item) => {
                  const ShortcutIcon = MENU_ICONS[item.key] || FiGrid;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      className="admin-shortcut-card"
                      onClick={() => handleSectionChange(item.key)}
                    >
                      <span className="admin-shortcut-card__icon">
                        <ShortcutIcon />
                      </span>
                      <strong className="admin-shortcut-card__title">
                        {item.label}
                      </strong>
                      <span className="admin-shortcut-card__text">
                        {item.description}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <StatsFormations />

          <div className="admin-main__header">
            <span className="admin-main__icon">
              <ActiveSectionIcon />
            </span>
            <div className="admin-main__heading">
              <span className="admin-main__eyebrow">Module actif</span>
              <h2 className="admin-main__title">
                {activeMenuItem?.label}
              </h2>
              <p className="admin-main__subtitle">
                {activeMenuItem?.description}
              </p>
            </div>
          </div>

          {renderActiveSection()}
        </section>
      </div>
    </main>
  );
}
