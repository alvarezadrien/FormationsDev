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
                    'error'   => true,
                    'message' => 'Formateur introuvable'
                ]);
            }

            if (($user['role'] ?? '') !== 'formateur') {
                return $this->response->setStatusCode(400)->setJSON([
                    'error'   => true,
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
                'data'  => [
                    'id'                => (int) $user['id'],
                    'nom'               => $user['nom'] ?? '',
                    'prenom'            => $user['prenom'] ?? '',
                    'nom_complet'       => trim(($user['prenom'] ?? '') . ' ' . ($user['nom'] ?? '')),
                    'email'             => $user['email'] ?? '',
                    'role'              => $user['role'] ?? '',
                    'poste'             => $bio['poste'] ?? 'Formateur',
                    'specialite'        => $bio['specialite'] ?? '',
                    'bio'               => $bio['bio'] ?? '',
                    'telephone'         => $bio['telephone'] ?? '',
                    'travaille_samedi'  => isset($bio['travaille_samedi']) ? (bool) $bio['travaille_samedi'] : false,
                    'est_remplacant'    => isset($bio['est_remplacant']) ? (bool) $bio['est_remplacant'] : false,
                    'experience'        => is_array($experience) ? $experience : [],
                    'competences'       => is_array($competences) ? $competences : [],
                    'formations'        => is_array($formations) ? $formations : [],
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error'   => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function updateMyBio()
    {
        try {
            $session = session();
            $userId  = $session->get('user_id');

            if (!$userId) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error'   => true,
                    'message' => 'Utilisateur non authentifié'
                ]);
            }

            $userModel = new UserModel();
            $bioModel  = new FormateurBioModel();

            $user = $userModel->find($userId);

            if (!$user) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error'   => true,
                    'message' => 'Utilisateur introuvable'
                ]);
            }

            if (($user['role'] ?? '') !== 'formateur') {
                return $this->response->setStatusCode(403)->setJSON([
                    'error'   => true,
                    'message' => 'Accès refusé : réservé aux formateurs'
                ]);
            }

            $input = $this->request->getJSON(true);

            if (!$input) {
                $input = $this->request->getRawInput();
            }

            $data = [
                'poste'            => $input['poste'] ?? null,
                'specialite'       => $input['specialite'] ?? null,
                'bio'              => $input['bio'] ?? null,
                'telephone'        => $input['telephone'] ?? null,
                'travaille_samedi' => !empty($input['travaille_samedi']) ? 1 : 0,
                'est_remplacant'   => !empty($input['est_remplacant']) ? 1 : 0,
                'experience'       => isset($input['experience']) ? json_encode($input['experience'], JSON_UNESCAPED_UNICODE) : json_encode([]),
                'competences'      => isset($input['competences']) ? json_encode($input['competences'], JSON_UNESCAPED_UNICODE) : json_encode([]),
                'formations'       => isset($input['formations']) ? json_encode($input['formations'], JSON_UNESCAPED_UNICODE) : json_encode([]),
            ];

            $existingBio = $bioModel->where('user_id', $userId)->first();

            if ($existingBio) {
                $bioModel->update($existingBio['id'], $data);
            } else {
                $data['user_id'] = $userId;
                $bioModel->insert($data);
            }

            $updatedBio = $bioModel->where('user_id', $userId)->first();

            return $this->response->setJSON([
                'error'   => false,
                'message' => 'Fiche formateur mise à jour avec succès',
                'data'    => [
                    'user_id'            => (int) $userId,
                    'poste'              => $updatedBio['poste'] ?? '',
                    'specialite'         => $updatedBio['specialite'] ?? '',
                    'bio'                => $updatedBio['bio'] ?? '',
                    'telephone'          => $updatedBio['telephone'] ?? '',
                    'travaille_samedi'   => isset($updatedBio['travaille_samedi']) ? (bool) $updatedBio['travaille_samedi'] : false,
                    'est_remplacant'     => isset($updatedBio['est_remplacant']) ? (bool) $updatedBio['est_remplacant'] : false,
                    'experience'         => !empty($updatedBio['experience']) ? json_decode($updatedBio['experience'], true) : [],
                    'competences'        => !empty($updatedBio['competences']) ? json_decode($updatedBio['competences'], true) : [],
                    'formations'         => !empty($updatedBio['formations']) ? json_decode($updatedBio['formations'], true) : [],
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error'   => true,
                'message' => $e->getMessage()
            ]);
        }
    }
}