<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\FormationModel;

class Formation extends Controller
{
    public function index()
    {
        try {
            $model = new FormationModel();
            $formations = $model->findAll();

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
            $model = new FormationModel();
            $formation = $model->find($id);

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

            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error' => true,
                    'message' => 'Données JSON invalides ou absentes'
                ]);
            }

            $payload = [
                'nom' => trim($data['nom'] ?? ''),
                'formateur' => trim($data['formateur'] ?? ''),
                'lieu' => trim($data['lieu'] ?? ''),
                'description' => trim($data['description'] ?? ''),
                'nombre_participants' => isset($data['nombre_participants']) ? (int) $data['nombre_participants'] : 0,
                'statut' => trim($data['statut'] ?? 'actif'),
            ];

            if (
                !$payload['nom'] ||
                !$payload['formateur'] ||
                !$payload['lieu'] ||
                !$payload['description']
            ) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Tous les champs obligatoires doivent être remplis'
                ]);
            }

            $inserted = $model->insert($payload);

            if (!$inserted) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Impossible de créer la formation'
                ]);
            }

            return $this->response->setStatusCode(201)->setJSON([
                'error' => false,
                'message' => 'Formation créée avec succès'
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

            $payload = [
                'nom' => trim($data['nom'] ?? ''),
                'formateur' => trim($data['formateur'] ?? ''),
                'lieu' => trim($data['lieu'] ?? ''),
                'description' => trim($data['description'] ?? ''),
                'nombre_participants' => isset($data['nombre_participants']) ? (int) $data['nombre_participants'] : 0,
                'statut' => trim($data['statut'] ?? 'actif'),
            ];

            if (
                !$payload['nom'] ||
                !$payload['formateur'] ||
                !$payload['lieu'] ||
                !$payload['description']
            ) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Tous les champs obligatoires doivent être remplis'
                ]);
            }

            $updated = $model->update($id, $payload);

            if (!$updated) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Impossible de modifier la formation'
                ]);
            }

            return $this->response->setJSON([
                'error' => false,
                'message' => 'Formation modifiée avec succès'
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
            $model = new FormationModel();
            $formation = $model->find($id);

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