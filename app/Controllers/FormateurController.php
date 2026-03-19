<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\UserModel;
use App\Models\FormateurBioModel;

class FormateurController extends Controller
{
    public function show($id = null)
    {
        try {
            $userModel = new UserModel();
            $bioModel  = new FormateurBioModel();

            $user = $userModel->find($id);

            if (!$user) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Formateur introuvable'
                ]);
            }

            if (($user['role'] ?? '') !== 'formateur') {
                return $this->response->setStatusCode(400)->setJSON([
                    'error' => true,
                    'message' => 'Cet utilisateur n\'est pas un formateur'
                ]);
            }

            $bio = $bioModel->where('user_id', $id)->first();

            $experience = [];
            $competences = [];
            $formations = [];

            if ($bio) {
                $experience = !empty($bio['experience'])
                    ? json_decode($bio['experience'], true)
                    : [];

                $competences = !empty($bio['competences'])
                    ? json_decode($bio['competences'], true)
                    : [];

                $formations = !empty($bio['formations'])
                    ? json_decode($bio['formations'], true)
                    : [];
            }

            return $this->response->setJSON([
                'error' => false,
                'data' => [
                    'id' => (int) $user['id'],
                    'nom' => $user['nom'] ?? '',
                    'prenom' => $user['prenom'] ?? '',
                    'nom_complet' => trim(($user['prenom'] ?? '') . ' ' . ($user['nom'] ?? '')),
                    'email' => $user['email'] ?? '',
                    'role' => $user['role'] ?? '',
                    'poste' => $bio['poste'] ?? 'Formateur',
                    'specialite' => $bio['specialite'] ?? '',
                    'bio' => $bio['bio'] ?? '',
                    'telephone' => $bio['telephone'] ?? '',
                    'experience' => is_array($experience) ? $experience : [],
                    'competences' => is_array($competences) ? $competences : [],
                    'formations' => is_array($formations) ? $formations : [],
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }
}