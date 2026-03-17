<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\InscriptionFormationModel;
use App\Models\FormationModel;

class InscriptionFormation extends Controller
{
    public function index()
    {
        try {
            $model = new InscriptionFormationModel();

            $inscriptions = $model->select('
                    inscriptions_formations.*,
                    formations.nom as formation_nom
                ')
                ->join('formations', 'formations.id = inscriptions_formations.formation_id')
                ->orderBy('inscriptions_formations.id', 'DESC')
                ->findAll();

            return $this->response->setJSON($inscriptions);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function show($id = null)
    {
        try {
            $model = new InscriptionFormationModel();

            $inscription = $model->select('
                    inscriptions_formations.*,
                    formations.nom as formation_nom
                ')
                ->join('formations', 'formations.id = inscriptions_formations.formation_id')
                ->where('inscriptions_formations.id', $id)
                ->first();

            if (!$inscription) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Inscription introuvable',
                ]);
            }

            return $this->response->setJSON($inscription);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function create()
    {
        try {
            $inscriptionModel = new InscriptionFormationModel();
            $formationModel = new FormationModel();

            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error' => true,
                    'message' => 'Données JSON invalides ou absentes',
                ]);
            }

            $payload = [
                'nom' => trim($data['nom'] ?? ''),
                'prenom' => trim($data['prenom'] ?? ''),
                'email' => trim($data['email'] ?? ''),
                'telephone' => trim($data['telephone'] ?? ''),
                'formation_id' => isset($data['formation_id']) ? (int) $data['formation_id'] : 0,
                'message' => trim($data['message'] ?? ''),
            ];

            if (
                $payload['nom'] === '' ||
                $payload['prenom'] === '' ||
                $payload['email'] === '' ||
                $payload['telephone'] === '' ||
                $payload['formation_id'] <= 0
            ) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Les champs nom, prénom, email, téléphone et formation sont obligatoires',
                ]);
            }

            if (!filter_var($payload['email'], FILTER_VALIDATE_EMAIL)) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Adresse email invalide',
                ]);
            }

            $formation = $formationModel->find($payload['formation_id']);

            if (!$formation) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'La formation sélectionnée est introuvable',
                ]);
            }

            $inserted = $inscriptionModel->insert($payload);

            if (!$inserted) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Impossible d’enregistrer l’inscription',
                ]);
            }

            $inscription = $inscriptionModel->find($inserted);

            return $this->response->setStatusCode(201)->setJSON([
                'error' => false,
                'message' => 'Inscription enregistrée avec succès',
                'data' => $inscription,
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function delete($id = null)
    {
        try {
            $model = new InscriptionFormationModel();
            $inscription = $model->find($id);

            if (!$inscription) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Inscription introuvable',
                ]);
            }

            $deleted = $model->delete($id);

            if (!$deleted) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Impossible de supprimer l’inscription',
                ]);
            }

            return $this->response->setJSON([
                'error' => false,
                'message' => 'Inscription supprimée avec succès',
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        }
    }
}