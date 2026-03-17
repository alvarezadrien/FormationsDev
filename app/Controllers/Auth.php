<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\UserModel;

class Auth extends Controller
{
    public function register()
    {
        try {
            $model = new UserModel();
            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error' => true,
                    'message' => 'Données JSON invalides ou absentes'
                ]);
            }

            $nom = trim($data['nom'] ?? '');
            $prenom = trim($data['prenom'] ?? '');
            $email = trim($data['email'] ?? '');
            $password = trim($data['password'] ?? '');

            if ($nom === '' || $prenom === '' || $email === '' || $password === '') {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Tous les champs sont requis'
                ]);
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Adresse email invalide'
                ]);
            }

            $existingUser = $model->where('email', $email)->first();

            if ($existingUser) {
                return $this->response->setStatusCode(409)->setJSON([
                    'error' => true,
                    'message' => 'Cet email est déjà utilisé'
                ]);
            }

            $now = date('Y-m-d H:i:s');

            $payload = [
                'nom' => $nom,
                'prenom' => $prenom,
                'email' => $email,
                'password' => password_hash($password, PASSWORD_DEFAULT),
                'role' => 'user',
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $inserted = $model->insert($payload);

            if (!$inserted) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Impossible de créer le compte'
                ]);
            }

            $user = $model->find($inserted);

            return $this->response->setStatusCode(201)->setJSON([
                'error' => false,
                'message' => 'Compte créé avec succès',
                'user' => [
                    'id' => $user['id'],
                    'nom' => $user['nom'],
                    'prenom' => $user['prenom'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function login()
    {
        try {
            $model = new UserModel();
            $session = session();
            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error' => true,
                    'message' => 'Données JSON invalides ou absentes'
                ]);
            }

            $email = trim($data['email'] ?? '');
            $password = trim($data['password'] ?? '');

            if ($email === '' || $password === '') {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Email et mot de passe requis'
                ]);
            }

            $user = $model->where('email', $email)->first();

            if (!$user) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error' => true,
                    'message' => 'Identifiants invalides'
                ]);
            }

            if (empty($user['password']) || !password_verify($password, $user['password'])) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error' => true,
                    'message' => 'Identifiants invalides'
                ]);
            }

            $session->set([
                'user_id' => $user['id'],
                'nom' => $user['nom'],
                'prenom' => $user['prenom'],
                'email' => $user['email'],
                'role' => $user['role'],
                'isLoggedIn' => true
            ]);

            return $this->response->setJSON([
                'error' => false,
                'message' => 'Connexion réussie',
                'user' => [
                    'id' => $user['id'],
                    'nom' => $user['nom'],
                    'prenom' => $user['prenom'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function me()
    {
        try {
            $session = session();

            if (!$session->get('isLoggedIn')) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error' => true,
                    'message' => 'Non authentifié'
                ]);
            }

            return $this->response->setJSON([
                'error' => false,
                'user' => [
                    'id' => $session->get('user_id'),
                    'nom' => $session->get('nom'),
                    'prenom' => $session->get('prenom'),
                    'email' => $session->get('email'),
                    'role' => $session->get('role'),
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function logout()
    {
        try {
            $session = session();
            $session->destroy();

            return $this->response->setJSON([
                'error' => false,
                'message' => 'Déconnexion réussie'
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }
}