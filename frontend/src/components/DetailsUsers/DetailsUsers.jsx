import React, { useEffect, useMemo, useState } from "react";
import "./DetailsUsers.css";

export function DetailUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");

  const [openModal, setOpenModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const API_URL = "http://localhost:8080";

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/users`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors du chargement des utilisateurs.");
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchRole = selectedRole === "all" || user.role === selectedRole;
      const texte = `${user.nom} ${user.prenom} ${user.email} ${user.role}`.toLowerCase();
      const matchSearch = texte.includes(search.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, selectedRole, search]);

  const handleOpenDeleteModal = (user) => {
    setUserToDelete(user);
    setAdminPassword("");
    setError("");
    setSuccessMessage("");
    setOpenModal(true);
  };

  const handleCloseDeleteModal = () => {
    setOpenModal(false);
    setUserToDelete(null);
    setAdminPassword("");
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);
      setError("");
      setSuccessMessage("");

      if (userToDelete.role === "admin" && !adminPassword.trim()) {
        setError("Le mot de passe admin est obligatoire pour supprimer un admin.");
        setDeleting(false);
        return;
      }

      const response = await fetch(`${API_URL}/users/${userToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminPassword: userToDelete.role === "admin" ? adminPassword : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la suppression.");
      }

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setSuccessMessage(data.message || "Utilisateur supprimé avec succès.");
      handleCloseDeleteModal();
    } catch (err) {
      setError(err.message || "Erreur lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="detail-users-loading">Chargement des utilisateurs...</div>;
  }

  return (
    <div className="detail-users-container">
      <div className="detail-users-header">
        <h2 className="detail-users-title">Gestion des utilisateurs</h2>

        <div className="detail-users-filters">
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="detail-users-input"
          />

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="detail-users-select"
          >
            <option value="all">Tous les rôles</option>
            <option value="user">Utilisateurs</option>
            <option value="formateur">Formateurs</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {error && <div className="detail-users-alert error">{error}</div>}
      {successMessage && <div className="detail-users-alert success">{successMessage}</div>}

      <div className="detail-users-table-wrapper">
        <div className="detail-users-table-scroll">
          <table className="detail-users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th className="action-cell">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.nom}</td>
                    <td>{user.prenom}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role === "admin"
                          ? "Admin"
                          : user.role === "formateur"
                          ? "Formateur"
                          : "Utilisateur"}
                      </span>
                    </td>
                    <td className="action-cell">
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(user)}
                        className="detail-users-delete-btn"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="detail-users-empty">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openModal && userToDelete && (
        <div className="detail-users-modal-overlay">
          <div className="detail-users-modal">
            <h3 className="detail-users-modal-title">Confirmer la suppression</h3>

            <p className="detail-users-modal-text">
              Voulez-vous vraiment supprimer :
              <br />
              <span className="detail-users-modal-strong">
                {userToDelete.prenom} {userToDelete.nom}
              </span>
              <br />
              <span className="detail-users-modal-email">{userToDelete.email}</span>
              <br />
              <span className="detail-users-modal-role">Rôle : {userToDelete.role}</span>
            </p>

            {userToDelete.role === "admin" && (
              <div className="detail-users-password-group">
                <label className="detail-users-password-label">
                  Mot de passe de l'admin connecté
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Entrez votre mot de passe admin"
                  className="detail-users-password-input"
                />
                <div className="detail-users-password-help">
                  Obligatoire pour supprimer un compte admin.
                </div>
              </div>
            )}

            <div className="detail-users-modal-actions">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                className="detail-users-cancel-btn"
                disabled={deleting}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                className="detail-users-confirm-btn"
                disabled={deleting}
              >
                {deleting ? "Suppression..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}