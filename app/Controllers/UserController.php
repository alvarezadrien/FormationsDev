<?php

namespace App\Controllers;

use App\Models\UserModel;
use CodeIgniter\RESTful\ResourceController;

class UserController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $userModel = new UserModel();

        $users = $userModel
            ->select('id, nom, prenom, email, role, created_at, updated_at')
            ->orderBy('id', 'DESC')
            ->findAll();

        return $this->respond([
            'status' => 'success',
            'users'  => $users
        ]);
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

        if ((int)$currentAdminId === (int)$targetUser['id']) {
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