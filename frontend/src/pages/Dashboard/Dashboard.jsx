import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import "./Dashboard.css";

// import components
import { CreationFormations } from "../../components/CreationFormations/CreationFormations";
import { FormationsCrees } from "../../components/FormationsCrees/FormationsCrees";
import { FormActif } from "../../components/FormActif/FormActif";

const API_URL = "http://localhost:8080";

const initialForm = {
  nom: "",
  formateur: "",
  lieu: "",
  description: "",
  nombre_participants: 0,
  statut: "actif",
  date_debut: "",
  date_fin: "",
};

export default function AdminFormationsPage() {
  const [formations, setFormations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingInscriptions, setLoadingInscriptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [messageInscriptions, setMessageInscriptions] = useState("");

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const isAdmin = localStorage.getItem("role") === "admin";
  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const fetchFormations = async () => {
    try {
      setLoading(true);
      setErreur("");

      const res = await fetch(`${API_URL}/formations`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || "Erreur lors du chargement des formations"
        );
      }

      setFormations(Array.isArray(data) ? data : []);
    } catch (err) {
      setErreur(err.message || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  const fetchInscriptions = async () => {
    try {
      setLoadingInscriptions(true);
      setErreur("");

      const res = await fetch(`${API_URL}/inscriptions-formations`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || "Erreur lors du chargement des inscriptions"
        );
      }

      setInscriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      setErreur(err.message || "Erreur serveur");
    } finally {
      setLoadingInscriptions(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchFormations();
      fetchInscriptions();
    }
  }, [isLoggedIn, isAdmin]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "nombre_participants" ? Number(value) : value,
    }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
    setErreur("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      formData.date_debut &&
      formData.date_fin &&
      formData.date_fin < formData.date_debut
    ) {
      setErreur("La date de fin ne peut pas être avant la date de début.");
      return;
    }

    try {
      setSaving(true);
      setErreur("");
      setMessage("");

      const url = isEditing
        ? `${API_URL}/formations/${editingId}`
        : `${API_URL}/formations`;

      const method = isEditing ? "PUT" : "POST";

      const payload = {
        nom: formData.nom.trim(),
        formateur: formData.formateur.trim(),
        lieu: formData.lieu.trim(),
        description: formData.description.trim(),
        nombre_participants: Number(formData.nombre_participants),
        statut: formData.statut,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message || "Impossible d'enregistrer la formation"
        );
      }

      resetForm();

      setMessage(
        isEditing
          ? "La formation a bien été modifiée."
          : "La formation a bien été créée."
      );

      await fetchFormations();
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (formation) => {
    setErreur("");
    setMessage("");
    setEditingId(formation.id);

    setFormData({
      nom: formation.nom || "",
      formateur: formation.formateur || "",
      lieu: formation.lieu || "",
      description: formation.description || "",
      nombre_participants: formation.nombre_participants ?? 0,
      statut: formation.statut ?? "actif",
      date_debut: formation.date_debut || "",
      date_fin: formation.date_fin || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette formation ?"
    );
    if (!confirmation) return;

    try {
      setErreur("");
      setMessage("");

      const res = await fetch(`${API_URL}/formations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message || "Impossible de supprimer la formation"
        );
      }

      if (editingId === id) {
        resetForm();
      }

      setMessage("La formation a bien été supprimée.");
      await fetchFormations();
      await fetchInscriptions();
    } catch (err) {
      setErreur(err.message || "Erreur lors de la suppression");
    }
  };

  const handleDeleteInscription = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette inscription ?"
    );
    if (!confirmation) return;

    try {
      setErreur("");
      setMessageInscriptions("");

      const res = await fetch(`${API_URL}/inscriptions-formations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message || "Impossible de supprimer l'inscription"
        );
      }

      setMessageInscriptions("L'inscription a bien été supprimée.");
      await fetchInscriptions();
    } catch (err) {
      setErreur(err.message || "Erreur lors de la suppression de l'inscription");
    }
  };

  if (!isLoggedIn || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="admin-dashboard">
      <div className="admin-dashboard__header">
        <h1 className="admin-dashboard__title">Dashboard Admin Formations</h1>
        <p className="admin-dashboard__subtitle">
          Crée, modifie et supprime les formations, puis consulte les
          inscriptions envoyées.
        </p>
      </div>

      <div className="admin-dashboard__layout">
        <CreationFormations
          isEditing={isEditing}
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          message={message}
          erreur={erreur}
          saving={saving}
          resetForm={resetForm}
        />

        <div className="admin-dashboard__content">
          <FormationsCrees
            loading={loading}
            formations={formations}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
          />

          <FormActif
            messageInscriptions={messageInscriptions}
            loadingInscriptions={loadingInscriptions}
            inscriptions={inscriptions}
            handleDeleteInscription={handleDeleteInscription}
          />
        </div>
      </div>
    </main>
  );
}