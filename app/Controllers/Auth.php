<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\UserModel;
use App\Models\FormateurBioModel;
use Config\Database;

class Auth extends Controller
{
    private function ensureBioSchema(): void
    {
        $db = Database::connect();
        $fields = $db->getFieldData('formateur_bios');

        foreach ($fields as $field) {
            if (($field->name ?? null) === 'est_co_animation') {
                return;
            }
        }

        $db->query('ALTER TABLE formateur_bios ADD COLUMN est_co_animation TINYINT(1) NOT NULL DEFAULT 0 AFTER est_remplacant');
    }

    private function normalizeArrayField($value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map(
                static fn($item) => trim((string) $item),
                $value
            ), static fn($item) => $item !== ''));
        }

        if ($value === null) {
            return [];
        }

        $value = trim((string) $value);

        if ($value === '') {
            return [];
        }

        return array_values(array_filter(array_map('trim', explode(',', $value))));
    }

    public function register()
    {
        try {
            $model = new UserModel();
            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error'   => true,
                    'message' => 'Données JSON invalides ou absentes'
                ]);
            }

            $nom = trim($data['nom'] ?? '');
            $prenom = trim($data['prenom'] ?? '');
            $email = trim($data['email'] ?? '');
            $password = trim($data['password'] ?? '');

            if ($nom === '' || $prenom === '' || $email === '' || $password === '') {
                return $this->response->setStatusCode(422)->setJSON([
                    'error'   => true,
                    'message' => 'Tous les champs sont requis'
                ]);
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error'   => true,
                    'message' => 'Adresse email invalide'
                ]);
            }

            $existingUser = $model->where('email', $email)->first();

            if ($existingUser) {
                return $this->response->setStatusCode(409)->setJSON([
                    'error'   => true,
                    'message' => 'Cet email est déjà utilisé'
                ]);
            }

            $now = date('Y-m-d H:i:s');

            $payload = [
                'nom'        => $nom,
                'prenom'     => $prenom,
                'email'      => $email,
                'password'   => password_hash($password, PASSWORD_DEFAULT),
                'role'       => 'user',
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $inserted = $model->insert($payload, true);

            if (!$inserted) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error'   => true,
                    'message' => 'Impossible de créer le compte',
                    'details' => $model->errors(),
                ]);
            }

            $user = $model->find($inserted);

            return $this->response->setStatusCode(201)->setJSON([
                'error'   => false,
                'message' => 'Compte créé avec succès',
                'user'    => [
                    'id'     => $user['id'],
                    'nom'    => $user['nom'],
                    'prenom' => $user['prenom'],
                    'email'  => $user['email'],
                    'role'   => $user['role'],
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error'   => true,
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
                    'error'   => true,
                    'message' => 'Données JSON invalides ou absentes'
                ]);
            }

            $email = trim($data['email'] ?? '');
            $password = trim($data['password'] ?? '');

            if ($email === '' || $password === '') {
                return $this->response->setStatusCode(422)->setJSON([
                    'error'   => true,
                    'message' => 'Email et mot de passe requis'
                ]);
            }

            $user = $model->where('email', $email)->first();

            if (!$user || empty($user['password']) || !password_verify($password, $user['password'])) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error'   => true,
                    'message' => 'Identifiants invalides'
                ]);
            }

            $session->set([
                'user_id'    => $user['id'],
                'nom'        => $user['nom'],
                'prenom'     => $user['prenom'],
                'email'      => $user['email'],
                'role'       => $user['role'],
                'isLoggedIn' => true,
            ]);

            return $this->response->setJSON([
                'error'   => false,
                'message' => 'Connexion réussie',
                'user'    => [
                    'id'     => $user['id'],
                    'nom'    => $user['nom'],
                    'prenom' => $user['prenom'],
                    'email'  => $user['email'],
                    'role'   => $user['role'],
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error'   => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function me()
    {
        try {
            $session = session();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error'   => true,
                    'message' => 'Non authentifié'
                ]);
            }

            return $this->response->setJSON([
                'error' => false,
                'user'  => [
                    'id'     => $session->get('user_id'),
                    'nom'    => $session->get('nom'),
                    'prenom' => $session->get('prenom'),
                    'email'  => $session->get('email'),
                    'role'   => $session->get('role'),
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error'   => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function updateMe()
    {
        try {
            $session = session();
            $model = new UserModel();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error'   => true,
                    'message' => 'Non authentifié'
                ]);
            }

            $userId = $session->get('user_id');
            $user = $model->find($userId);

            if (!$user) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error'   => true,
                    'message' => 'Utilisateur introuvable'
                ]);
            }

            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error'   => true,
                    'message' => 'Données JSON invalides ou absentes'
                ]);
            }

            $nom = trim($data['nom'] ?? $user['nom']);
            $prenom = trim($data['prenom'] ?? $user['prenom']);
            $email = trim($data['email'] ?? $user['email']);
            $password = trim($data['password'] ?? '');

            if ($nom === '' || $prenom === '' || $email === '') {
                return $this->response->setStatusCode(422)->setJSON([
                    'error'   => true,
                    'message' => 'Nom, prénom et email sont obligatoires'
                ]);
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error'   => true,
                    'message' => 'Adresse email invalide'
                ]);
            }

            $existingUser = $model
                ->where('email', $email)
                ->where('id !=', $userId)
                ->first();

            if ($existingUser) {
                return $this->response->setStatusCode(409)->setJSON([
                    'error'   => true,
                    'message' => 'Cet email est déjà utilisé par un autre compte'
                ]);
            }

            $updateData = [
                'nom'        => $nom,
                'prenom'     => $prenom,
                'email'      => $email,
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            if ($password !== '') {
                if (strlen($password) < 6) {
                    return $this->response->setStatusCode(422)->setJSON([
                        'error'   => true,
                        'message' => 'Le mot de passe doit contenir au moins 6 caractères'
                    ]);
                }

                $updateData['password'] = password_hash($password, PASSWORD_DEFAULT);
            }

            if (!$model->update($userId, $updateData)) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error'   => true,
                    'message' => 'Impossible de mettre à jour le profil',
                    'details' => $model->errors(),
                ]);
            }

            $session->set([
                'nom'    => $nom,
                'prenom' => $prenom,
                'email'  => $email,
            ]);

            return $this->response->setJSON([
                'error'   => false,
                'message' => 'Vos données ont été mises à jour avec succès',
                'user'    => [
                    'id'     => $userId,
                    'nom'    => $nom,
                    'prenom' => $prenom,
                    'email'  => $email,
                    'role'   => $session->get('role'),
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error'   => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function createFormateur()
    {
        try {
            $this->ensureBioSchema();
            $session = session();
            $userModel = new UserModel();
            $bioModel = new FormateurBioModel();
            $db = Database::connect();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error'   => true,
                    'message' => 'Non authentifié'
                ]);
            }

            if ($session->get('role') !== 'admin') {
                return $this->response->setStatusCode(403)->setJSON([
                    'error'   => true,
                    'message' => 'Accès interdit'
                ]);
            }

            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error'   => true,
                    'message' => 'Données JSON invalides ou absentes'
                ]);
            }

            $nom = trim($data['nom'] ?? '');
            $prenom = trim($data['prenom'] ?? '');
            $email = trim($data['email'] ?? '');
            $password = trim($data['password'] ?? '');

            if ($nom === '' || $prenom === '' || $email === '' || $password === '') {
                return $this->response->setStatusCode(422)->setJSON([
                    'error'   => true,
                    'message' => 'Tous les champs sont obligatoires'
                ]);
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error'   => true,
                    'message' => 'Adresse email invalide'
                ]);
            }

            if (strlen($password) < 6) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error'   => true,
                    'message' => 'Le mot de passe doit contenir au moins 6 caractères'
                ]);
            }

            $existingUser = $userModel->where('email', $email)->first();

            if ($existingUser) {
                return $this->response->setStatusCode(409)->setJSON([
                    'error'   => true,
                    'message' => 'Cet email est déjà utilisé'
                ]);
            }

            $now = date('Y-m-d H:i:s');

            $userPayload = [
                'nom'        => $nom,
                'prenom'     => $prenom,
                'email'      => $email,
                'password'   => password_hash($password, PASSWORD_DEFAULT),
                'role'       => 'formateur',
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $bioPayload = [
                'poste'             => trim($data['poste'] ?? ''),
                'specialite'        => trim($data['specialite'] ?? ''),
                'bio'               => trim($data['bio'] ?? ''),
                'telephone'         => trim($data['telephone'] ?? ''),
                'travaille_samedi'  => !empty($data['travaille_samedi']) ? 1 : 0,
                'est_remplacant'    => !empty($data['est_remplacant']) ? 1 : 0,
                'est_co_animation'  => !empty($data['est_co_animation']) ? 1 : 0,
                'experience'        => json_encode(
                    $this->normalizeArrayField($data['experience'] ?? []),
                    JSON_UNESCAPED_UNICODE
                ),
                'competences'       => json_encode(
                    $this->normalizeArrayField($data['competences'] ?? []),
                    JSON_UNESCAPED_UNICODE
                ),
                'formations'        => json_encode(
                    $this->normalizeArrayField($data['formations'] ?? []),
                    JSON_UNESCAPED_UNICODE
                ),
                'created_at'        => $now,
                'updated_at'        => $now,
            ];

            $db->transBegin();

            $userId = $userModel->insert($userPayload, true);

            if (!$userId) {
                $db->transRollback();
                return $this->response->setStatusCode(500)->setJSON([
                    'error'   => true,
                    'message' => 'Impossible de créer le compte formateur',
                    'details' => $userModel->errors(),
                ]);
            }

            $bioPayload['user_id'] = $userId;

            $bioInserted = $bioModel->insert($bioPayload, true);

            if (!$bioInserted) {
                $db->transRollback();
                return $this->response->setStatusCode(500)->setJSON([
                    'error'   => true,
                    'message' => 'Le compte utilisateur a été créé mais la fiche bio a échoué',
                    'details' => $bioModel->errors(),
                    'payload' => $bioPayload,
                ]);
            }

            if ($db->transStatus() === false) {
                $db->transRollback();
                return $this->response->setStatusCode(500)->setJSON([
                    'error'   => true,
                    'message' => 'Transaction échouée lors de la création du formateur'
                ]);
            }

            $db->transCommit();

            $user = $userModel->find($userId);

            return $this->response->setStatusCode(201)->setJSON([
                'error'   => false,
                'message' => 'Compte formateur créé avec succès',
                'user'    => [
                    'id'                => $user['id'],
                    'nom'               => $user['nom'],
                    'prenom'            => $user['prenom'],
                    'email'             => $user['email'],
                    'role'              => $user['role'],
                    'est_remplacant'    => (int) $bioPayload['est_remplacant'],
                    'travaille_samedi'  => (int) $bioPayload['travaille_samedi'],
                    'est_co_animation'  => (int) $bioPayload['est_co_animation'],
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error'   => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function getFormateurs()
    {
        try {
            $this->ensureBioSchema();
            $session = session();
            $db = Database::connect();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error'   => true,
                    'message' => 'Non authentifié'
                ]);
            }

            $builder = $db->table('users u');
            $builder->select("
                u.id,
                u.nom,
                u.prenom,
                u.email,
                u.role,
                COALESCE(fb.est_remplacant, 0) AS est_remplacant,
                COALESCE(fb.travaille_samedi, 0) AS travaille_samedi,
                COALESCE(fb.est_co_animation, 0) AS est_co_animation,
                fb.poste,
                fb.specialite,
                fb.telephone
            ");
            $builder->join('formateur_bios fb', 'fb.user_id = u.id', 'left');
            $builder->where('u.role', 'formateur');
            $builder->orderBy('u.prenom', 'ASC');
            $builder->orderBy('u.nom', 'ASC');

            $formateurs = $builder->get()->getResultArray();

            $formateurs = array_map(static function ($row) {
                return [
                    'id'                => (int) ($row['id'] ?? 0),
                    'nom'               => $row['nom'] ?? '',
                    'prenom'            => $row['prenom'] ?? '',
                    'email'             => $row['email'] ?? '',
                    'role'              => $row['role'] ?? 'formateur',
                    'poste'             => $row['poste'] ?? '',
                    'specialite'        => $row['specialite'] ?? '',
                    'telephone'         => $row['telephone'] ?? '',
                    'est_remplacant'    => (int) ($row['est_remplacant'] ?? 0),
                    'travaille_samedi'  => (int) ($row['travaille_samedi'] ?? 0),
                    'est_co_animation'  => (int) ($row['est_co_animation'] ?? 0),
                ];
            }, $formateurs);

            return $this->response->setJSON([
                'error'      => false,
                'formateurs' => $formateurs
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error'   => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function logout()
    {
        try {
            $session = session();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error'   => true,
                    'message' => 'Non authentifié'
                ]);
            }

            $session->destroy();

            return $this->response->setJSON([
                'error'   => false,
                'message' => 'Déconnexion réussie'
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error'   => true,
                'message' => $e->getMessage()
            ]);
        }
    }
}
