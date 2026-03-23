<?php

namespace App\Controllers;

use App\Models\UserModel;
use CodeIgniter\RESTful\ResourceController;

class UserController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        try {
            $db = \Config\Database::connect();

            $users = $db->table('users')
                ->select("
                    users.id,
                    users.nom,
                    users.prenom,
                    users.email,
                    users.role,
                    users.created_at,
                    users.updated_at,
                    GROUP_CONCAT(DISTINCT formations.jours SEPARATOR ' | ') AS jours,
                    GROUP_CONCAT(DISTINCT formations.type_journee SEPARATOR ' | ') AS type_journee
                ")
                ->join('formations', 'formations.formateur_id = users.id', 'left')
                ->groupBy('users.id, users.nom, users.prenom, users.email, users.role, users.created_at, users.updated_at')
                ->orderBy('users.id', 'DESC')
                ->get()
                ->getResultArray();

            return $this->respond([
                'status' => 'success',
                'users'  => $users
            ]);
        } catch (\Throwable $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function delete($id = null)
    {
        $userModel = new UserModel();

        if (!$id || !is_numeric($id)) {
            return $this->failValidationErrors('ID utilisateur invalide.');
        }

        $targetUser = $userModel->find($id);

        if (!$targetUser) {
            return $this->failNotFound('Utilisateur introuvable.');
        }

        $data = $this->request->getJSON(true) ?? [];
        $adminPassword = isset($data['adminPassword']) ? $data['adminPassword'] : null;

        $currentAdminId = session()->get('user_id');

        if (!$currentAdminId) {
            return $this->failUnauthorized('Utilisateur non authentifié.');
        }

        $currentAdmin = $userModel->find($currentAdminId);

        if (!$currentAdmin || $currentAdmin['role'] !== 'admin') {
            return $this->failForbidden('Accès refusé.');
        }

        if ((int) $currentAdminId === (int) $targetUser['id']) {
            return $this->failValidationErrors('Vous ne pouvez pas supprimer votre propre compte admin.');
        }

        if ($targetUser['role'] === 'admin') {
            if (!$adminPassword) {
                return $this->failValidationErrors('Le mot de passe admin est requis pour supprimer un admin.');
            }

            if (!password_verify($adminPassword, $currentAdmin['password'])) {
                return $this->failForbidden('Mot de passe admin invalide.');
            }
        }

        $deleted = $userModel->delete($id);

        if (!$deleted) {
            return $this->failServerError('Impossible de supprimer cet utilisateur.');
        }

        return $this->respondDeleted([
            'status'  => 'success',
            'message' => 'Utilisateur supprimé avec succès.'
        ]);
    }
}