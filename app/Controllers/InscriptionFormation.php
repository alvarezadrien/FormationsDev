<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\InscriptionFormationModel;
use App\Models\FormationModel;
use App\Models\FichePresenceModel;
use App\Models\FichePresenceParticipantModel;

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

    public function byFormation($formationId = null)
    {
        try {
            $formationModel = new FormationModel();
            $inscriptionModel = new InscriptionFormationModel();

            $formation = $formationModel->find($formationId);

            if (!$formation) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Formation introuvable',
                ]);
            }

            $inscriptions = $inscriptionModel
                ->where('formation_id', (int) $formationId)
                ->orderBy('prenom', 'ASC')
                ->orderBy('nom', 'ASC')
                ->findAll();

            return $this->response->setJSON([
                'error' => false,
                'formation' => $formation,
                'inscriptions' => $inscriptions,
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function create()
    {
        $db = \Config\Database::connect();

        try {
            $inscriptionModel = new InscriptionFormationModel();
            $formationModel = new FormationModel();
            $ficheModel = new FichePresenceModel();
            $ficheParticipantModel = new FichePresenceParticipantModel();

            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error' => true,
                    'message' => 'Données JSON invalides ou absentes',
                ]);
            }

            $diplomesAutorises = [
                'Pas de diplôme',
                'CEB',
                'CE1D',
                'CESS',
                'CAP',
                'Bachelier',
                'Master',
                'Doctorat',
                'Formation professionnelle',
                'Autre',
            ];

            $payload = [
                'nom' => trim($data['nom'] ?? ''),
                'prenom' => trim($data['prenom'] ?? ''),
                'email' => trim($data['email'] ?? ''),
                'telephone' => trim($data['telephone'] ?? ''),
                'diplome' => trim($data['diplome'] ?? ''),
                'formation_id' => isset($data['formation_id']) ? (int) $data['formation_id'] : 0,
                'message' => trim($data['message'] ?? ''),
            ];

            if (
                $payload['nom'] === '' ||
                $payload['prenom'] === '' ||
                $payload['email'] === '' ||
                $payload['telephone'] === '' ||
                $payload['diplome'] === '' ||
                $payload['formation_id'] <= 0
            ) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Les champs nom, prénom, email, téléphone, diplôme et formation sont obligatoires',
                ]);
            }

            if (!filter_var($payload['email'], FILTER_VALIDATE_EMAIL)) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Adresse email invalide',
                ]);
            }

            if (!in_array($payload['diplome'], $diplomesAutorises, true)) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Le diplôme sélectionné est invalide',
                ]);
            }

            $formation = $formationModel->find($payload['formation_id']);

            if (!$formation) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'La formation sélectionnée est introuvable',
                ]);
            }

            $statut = strtolower(trim((string) ($formation['statut'] ?? 'actif')));
            $placesRestantes = (int) ($formation['nombre_participants'] ?? 0);

            if ($statut !== 'actif') {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Cette formation est indisponible',
                ]);
            }

            if ($placesRestantes <= 0) {
                return $this->response->setStatusCode(422)->setJSON([
                    'error' => true,
                    'message' => 'Cette formation est complète',
                ]);
            }

            $alreadyExists = $inscriptionModel
                ->where('formation_id', $payload['formation_id'])
                ->where('email', $payload['email'])
                ->first();

            if ($alreadyExists) {
                return $this->response->setStatusCode(409)->setJSON([
                    'error' => true,
                    'message' => 'Cet email est déjà inscrit à cette formation',
                ]);
            }

            $db->transStart();

            $insertPayload = [
                'nom' => $payload['nom'],
                'prenom' => $payload['prenom'],
                'email' => $payload['email'],
                'telephone' => $payload['telephone'],
                'diplome' => $payload['diplome'],
                'formation_id' => $payload['formation_id'],
                'message' => $payload['message'],
                'date_inscription' => date('Y-m-d H:i:s'),
            ];

            $inserted = $inscriptionModel->insert($insertPayload);

            if (!$inserted) {
                $db->transRollback();

                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Impossible d’enregistrer l’inscription',
                ]);
            }

            $inscriptionId = $inscriptionModel->getInsertID();

            $updated = $formationModel->update($payload['formation_id'], [
                'nombre_participants' => $placesRestantes - 1,
            ]);

            if (!$updated) {
                $db->transRollback();

                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Impossible de mettre à jour le nombre de places',
                ]);
            }

            $fiches = $ficheModel
                ->where('formation_id', $payload['formation_id'])
                ->findAll();

            foreach ($fiches as $fiche) {
                $existsInFiche = $ficheParticipantModel
                    ->where('fiche_presence_id', $fiche['id'])
                    ->where('inscription_id', $inscriptionId)
                    ->first();

                if (!$existsInFiche) {
                    $ficheParticipantModel->insert([
                        'fiche_presence_id' => $fiche['id'],
                        'inscription_id' => $inscriptionId,
                        'present' => 0,
                    ]);
                }
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Erreur lors de l’enregistrement de l’inscription',
                ]);
            }

            $inscription = $inscriptionModel->find($inscriptionId);
            $formationUpdated = $formationModel->find($payload['formation_id']);

            return $this->response->setStatusCode(201)->setJSON([
                'error' => false,
                'message' => 'Inscription enregistrée avec succès',
                'data' => $inscription,
                'formation' => $formationUpdated,
            ]);
        } catch (\Throwable $e) {
            $db->transRollback();

            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        try {
            $inscriptionModel = new InscriptionFormationModel();
            $formationModel = new FormationModel();

            $inscription = $inscriptionModel->find($id);

            if (!$inscription) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Inscription introuvable',
                ]);
            }

            $formation = $formationModel->find($inscription['formation_id']);

            $db->transStart();

            $deleted = $inscriptionModel->delete($id);

            if (!$deleted) {
                $db->transRollback();

                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Impossible de supprimer l’inscription',
                ]);
            }

            if ($formation) {
                $placesRestantes = (int) ($formation['nombre_participants'] ?? 0);

                $formationModel->update($formation['id'], [
                    'nombre_participants' => $placesRestantes + 1,
                ]);
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->response->setStatusCode(500)->setJSON([
                    'error' => true,
                    'message' => 'Erreur lors de la suppression de l’inscription',
                ]);
            }

            return $this->response->setJSON([
                'error' => false,
                'message' => 'Inscription supprimée avec succès',
            ]);
        } catch (\Throwable $e) {
            $db->transRollback();

            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        }
    }
}