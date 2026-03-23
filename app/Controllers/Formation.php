<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\FormationModel;
use App\Models\UserModel;

class Formation extends Controller
{
    public function index()
    {
        try {
            $db = \Config\Database::connect();

            $formations = $db->table('formations')
                ->select('
                    formations.*,
                    users.id AS formateur_id,
                    users.nom AS formateur_nom,
                    users.prenom AS formateur_prenom,
                    users.email AS formateur_email
                ')
                ->join('users', 'users.id = formations.formateur_id', 'left')
                ->orderBy('formations.id', 'DESC')
                ->get()
                ->getResultArray();

            return $this->response->setJSON($formations);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function show($id = null)
    {
        try {
            $db = \Config\Database::connect();

            $formation = $db->table('formations')
                ->select('
                    formations.*,
                    users.id AS formateur_id,
                    users.nom AS formateur_nom,
                    users.prenom AS formateur_prenom,
                    users.email AS formateur_email
                ')
                ->join('users', 'users.id = formations.formateur_id', 'left')
                ->where('formations.id', $id)
                ->get()
                ->getRowArray();

            if (!$formation) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Formation introuvable'
                ]);
            }

            return $this->response->setJSON($formation);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function create()
    {
        try {
            $model = new FormationModel();
            $userModel = new UserModel();
            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error' => true,
                    'message' => 'Données JSON invalides ou absentes'
                ]);
            }

            $jours = $data['jours'] ?? null;

            if (is_array($jours)) {
                $jours = implode(',', array_map('trim', $jours));
            } else {
                $jours = !empty($jours) ? trim($jours) : '';
            }

            $payload = [
                'nom' => trim($data['nom'] ?? ''),
                'formateur_id' => isset($data['formateur_id']) ? (int) $data['formateur_id'] : 0,
                'lieu' => trim($data['lieu'] ?? ''),
                'description' => trim($data['description'] ?? ''),
                'nombre_participants' => isset($data['nombre_participants']) ? (int) $data['nombre_participants'] : 0,
                'statut' => trim($data['statut'] ?? 'actif'),
                'date_debut' => trim($data['date_debut'] ?? ''),
                'date_fin' => trim($data['date_fin'] ?? ''),
                'jours' => $jours,
                'type_journee' => trim($data['type_journee'] ?? ''),
            ];

            if (
                $payload['nom'] === '' ||
                $payload['formateur_id'] <= 0 ||
                $payload['lieu'] === '' ||
                $payload['description'] === '' ||
                $payload['date_debut'] === '' ||
                $payload['date_fin'] === '' ||
                $payload['jours'] === '' ||
                $payload['type_journee'] === ''
            ) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Tous les champs sont requis'
                ]);
            }

            $formateur = $userModel->find($payload['formateur_id']);

            if (!$formateur || ($formateur['role'] ?? '') !== 'formateur') {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Le formateur sélectionné est invalide'
                ]);
            }

            if ($payload['date_fin'] < $payload['date_debut']) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'La date de fin ne peut pas être antérieure à la date de début'
                ]);
            }

            $inserted = $model->insert($payload);

            if (!$inserted) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Impossible de créer la formation'
                ]);
            }

            $db = \Config\Database::connect();

            $formation = $db->table('formations')
                ->select('
                    formations.*,
                    users.id AS formateur_id,
                    users.nom AS formateur_nom,
                    users.prenom AS formateur_prenom,
                    users.email AS formateur_email
                ')
                ->join('users', 'users.id = formations.formateur_id', 'left')
                ->where('formations.id', $inserted)
                ->get()
                ->getRowArray();

            return $this->response->setStatusCode(201)->setJSON([
                'error' => false,
                'message' => 'Formation créée avec succès',
                'data' => $formation
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function update($id = null)
    {
        try {
            $model = new FormationModel();
            $userModel = new UserModel();
            $formation = $model->find($id);

            if (!$formation) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Formation introuvable'
                ]);
            }

            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error' => true,
                    'message' => 'Données JSON invalides ou absentes'
                ]);
            }

            $jours = $data['jours'] ?? ($formation['jours'] ?? '');

            if (is_array($jours)) {
                $jours = implode(',', array_map('trim', $jours));
            } else {
                $jours = trim($jours);
            }

            $payload = [
                'nom' => trim($data['nom'] ?? $formation['nom']),
                'formateur_id' => isset($data['formateur_id'])
                    ? (int) $data['formateur_id']
                    : (int) ($formation['formateur_id'] ?? 0),
                'lieu' => trim($data['lieu'] ?? $formation['lieu']),
                'description' => trim($data['description'] ?? $formation['description']),
                'nombre_participants' => isset($data['nombre_participants'])
                    ? (int) $data['nombre_participants']
                    : (int) $formation['nombre_participants'],
                'statut' => trim($data['statut'] ?? $formation['statut']),
                'date_debut' => trim($data['date_debut'] ?? ($formation['date_debut'] ?? '')),
                'date_fin' => trim($data['date_fin'] ?? ($formation['date_fin'] ?? '')),
                'jours' => $jours,
                'type_journee' => trim($data['type_journee'] ?? ($formation['type_journee'] ?? '')),
            ];

            if (
                $payload['nom'] === '' ||
                $payload['formateur_id'] <= 0 ||
                $payload['lieu'] === '' ||
                $payload['description'] === '' ||
                $payload['date_debut'] === '' ||
                $payload['date_fin'] === '' ||
                $payload['jours'] === '' ||
                $payload['type_journee'] === ''
            ) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Tous les champs sont requis'
                ]);
            }

            $formateur = $userModel->find($payload['formateur_id']);

            if (!$formateur || ($formateur['role'] ?? '') !== 'formateur') {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Le formateur sélectionné est invalide'
                ]);
            }

            if ($payload['date_fin'] < $payload['date_debut']) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'La date de fin ne peut pas être antérieure à la date de début'
                ]);
            }

            $updated = $model->update($id, $payload);

            if (!$updated) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Impossible de modifier la formation'
                ]);
            }

            $db = \Config\Database::connect();

            $formationUpdated = $db->table('formations')
                ->select('
                    formations.*,
                    users.id AS formateur_id,
                    users.nom AS formateur_nom,
                    users.prenom AS formateur_prenom,
                    users.email AS formateur_email
                ')
                ->join('users', 'users.id = formations.formateur_id', 'left')
                ->where('formations.id', $id)
                ->get()
                ->getRowArray();

            return $this->response->setJSON([
                'error' => false,
                'message' => 'Formation modifiée avec succès',
                'data' => $formationUpdated
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function delete($id = null)
    {
        try {
            $model = new FormationModel();
            $formation = $model->find($id);

            if (!$formation) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Formation introuvable'
                ]);
            }

            $deleted = $model->delete($id);

            if (!$deleted) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Impossible de supprimer la formation'
                ]);
            }

            return $this->response->setJSON([
                'error' => false,
                'message' => 'Formation supprimée avec succès'
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function edit($id = null)
    {
        try {
            $db = \Config\Database::connect();

            $formation = $db->table('formations')
                ->select('
                    formations.*,
                    users.id AS formateur_id,
                    users.nom AS formateur_nom,
                    users.prenom AS formateur_prenom,
                    users.email AS formateur_email
                ')
                ->join('users', 'users.id = formations.formateur_id', 'left')
                ->where('formations.id', $id)
                ->get()
                ->getRowArray();

            if (!$formation) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Formation introuvable'
                ]);
            }

            return $this->response->setJSON($formation);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }
}