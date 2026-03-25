<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\UserModel;
use App\Models\FormateurBioModel;

class FormateurController extends Controller
{
    private function getLinkedFormations(int $formateurId): array
    {
        $db = \Config\Database::connect();

        $rows = $db->table('formations')
            ->select('nom')
            ->groupStart()
                ->where('formateur_id', $formateurId)
                ->orWhere('remplacant_id', $formateurId)
            ->groupEnd()
            ->orderBy('nom', 'ASC')
            ->get()
            ->getResultArray();

        $names = array_map(
            static fn($row) => trim((string) ($row['nom'] ?? '')),
            $rows
        );

        return array_values(array_unique(array_filter($names)));
    }

    private function parseStoredArray($value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map('trim', $value), fn($v) => $v !== ''));
        }

        if ($value === null || $value === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return array_values(array_filter(array_map(
                static fn($item) => is_string($item) ? trim($item) : $item,
                $decoded
            ), fn($v) => $v !== '' && $v !== null));
        }

        return array_values(array_filter(array_map('trim', explode(',', (string) $value))));
    }

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
            $storedFormations = $this->parseStoredArray($bio['formations'] ?? null);
            $linkedFormations = $this->getLinkedFormations((int) $id);
            $mergedFormations = array_values(array_unique(array_filter([
                ...$storedFormations,
                ...$linkedFormations,
            ])));

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
                    'experience'        => $this->parseStoredArray($bio['experience'] ?? null),
                    'competences'       => $this->parseStoredArray($bio['competences'] ?? null),
                    'formations'        => $mergedFormations,
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
                'experience'       => json_encode(
                    is_array($input['experience'] ?? null)
                        ? $input['experience']
                        : (trim($input['experience'] ?? '') !== '' ? [trim($input['experience'])] : []),
                    JSON_UNESCAPED_UNICODE
                ),
                'competences'      => json_encode(
                    is_array($input['competences'] ?? null)
                        ? $input['competences']
                        : (trim($input['competences'] ?? '') !== '' ? array_map('trim', explode(',', $input['competences'])) : []),
                    JSON_UNESCAPED_UNICODE
                ),
                'formations'       => json_encode(
                    is_array($input['formations'] ?? null)
                        ? $input['formations']
                        : (trim($input['formations'] ?? '') !== '' ? array_map('trim', explode(',', $input['formations'])) : []),
                    JSON_UNESCAPED_UNICODE
                ),
                'updated_at'       => date('Y-m-d H:i:s'),
            ];

            $existingBio = $bioModel->where('user_id', $userId)->first();

            if ($existingBio) {
                $bioModel->update($existingBio['id'], $data);
            } else {
                $data['user_id'] = $userId;
                $data['created_at'] = date('Y-m-d H:i:s');
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
                    'experience'         => $this->parseStoredArray($updatedBio['experience'] ?? null),
                    'competences'        => $this->parseStoredArray($updatedBio['competences'] ?? null),
                    'formations'         => $this->parseStoredArray($updatedBio['formations'] ?? null),
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
