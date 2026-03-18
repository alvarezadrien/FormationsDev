import { useState } from "react";
import { Navigate } from "react-router-dom";
import "./Dashboard.css";

import { StatsFormations } from "../../components/StatsFormations/StatsFormations";
import { CreationFormations } from "../../components/CreationFormations/CreationFormations";
import { FormationsCrees } from "../../components/FormationsCrees/FormationsCrees";
import { FormActif } from "../../components/FormActif/FormActif";
import { AvisAdmin } from "../../components/AvisAdmin/AvisAdmin";
import { CreationCompteFormateur } from "../../components/CreationCompteFormateur/CreationCompteFormateur";
import { FichesPresenceAdmin } from "../../components/FichePresenceAdmin/FichePresenceAdmin";

export default function AdminFormationsDashboard() {
  const [formationEnEdition, setFormationEnEdition] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isAdmin = localStorage.getItem("role") === "admin";

  if (!isLoggedIn || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="admin-dashboard">
      <div className="admin-dashboard__header">
        <h1 className="admin-dashboard__title">Dashboard Admin Formations</h1>
        <p className="admin-dashboard__subtitle">
          Crée, modifie et supprime les formations, gère les avis, les comptes
          formateurs et les fiches de présence.
        </p>
      </div>

      <StatsFormations />

      <div className="admin-dashboard__layout">
        <CreationFormations
          formationEnEdition={formationEnEdition}
          onSaved={() => {
            setFormationEnEdition(null);
            setRefreshKey((prev) => prev + 1);
          }}
          onCancelEdit={() => setFormationEnEdition(null)}
        />

        <div className="admin-dashboard__content">
          <CreationCompteFormateur />

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

          <FormActif />
          <AvisAdmin />
          <FichesPresenceAdmin />
        </div>
      </div>
    </main>
  );
}