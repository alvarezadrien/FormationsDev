<?php

namespace App\Controllers;

use App\Models\AvisModel;
use App\Models\FormationModel;
use App\Models\UserModel;
use CodeIgniter\RESTful\ResourceController;

class AvisController extends ResourceController
{
    protected $format = 'json';

    public function create()
    {
        $avisModel = new AvisModel();
        $formationModel = new FormationModel();
        $userModel = new UserModel();

        $data = $this->request->getJSON(true);

        $user_id = $data['user_id'] ?? null;
        $formation_id = $data['formation_id'] ?? null;
        $note = $data['note'] ?? null;
        $commentaire = trim($data['commentaire'] ?? '');

        if (!$user_id || !$formation_id || !$note || $commentaire === '') {
            return $this->respond([
                'message' => 'Tous les champs sont obligatoires'
            ], 400);
        }

        if (!is_numeric($note) || $note < 1 || $note > 5) {
            return $this->respond([
                'message' => 'La note doit être comprise entre 1 et 5'
            ], 400);
        }

        $user = $userModel->find($user_id);
        if (!$user) {
            return $this->respond([
                'message' => 'Utilisateur introuvable'
            ], 404);
        }

        $formation = $formationModel->find($formation_id);
        if (!$formation) {
            return $this->respond([
                'message' => 'Formation introuvable'
            ], 404);
        }

        $avisModel->insert([
            'user_id' => $user_id,
            'formation_id' => $formation_id,
            'note' => $note,
            'commentaire' => $commentaire,
        ]);

        return $this->respondCreated([
            'message' => 'Avis créé avec succès',
            'avis_id' => $avisModel->getInsertID()
        ]);
    }

    public function index()
    {
        $db = \Config\Database::connect();

        $avis = $db->table('avis')
            ->select('
                avis.id,
                avis.note,
                avis.commentaire,
                avis.created_at,
                avis.updated_at,
                avis.user_id,
                avis.formation_id,
                users.nom,
                users.prenom,
                users.email,
                formations.nom AS nom_formation
            ')
            ->join('users', 'users.id = avis.user_id')
            ->join('formations', 'formations.id = avis.formation_id')
            ->orderBy('avis.created_at', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond($avis);
    }

    public function avisByFormation($formationId = null)
    {
        $db = \Config\Database::connect();

        $avis = $db->table('avis')
            ->select('
                avis.id,
                avis.note,
                avis.commentaire,
                avis.created_at,
                avis.updated_at,
                avis.user_id,
                avis.formation_id,
                users.nom,
                users.prenom,
                formations.nom AS nom_formation
            ')
            ->join('users', 'users.id = avis.user_id')
            ->join('formations', 'formations.id = avis.formation_id')
            ->where('avis.formation_id', $formationId)
            ->orderBy('avis.created_at', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond($avis);
    }

    public function avisByUser($userId = null)
    {
        $db = \Config\Database::connect();

        $avis = $db->table('avis')
            ->select('
                avis.id,
                avis.note,
                avis.commentaire,
                avis.created_at,
                avis.updated_at,
                avis.user_id,
                avis.formation_id,
                formations.nom AS nom_formation
            ')
            ->join('formations', 'formations.id = avis.formation_id')
            ->where('avis.user_id', $userId)
            ->orderBy('avis.created_at', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond($avis);
    }

    public function moyenneByFormation($formationId = null)
    {
        $db = \Config\Database::connect();

        $result = $db->table('avis')
            ->select('formation_id, ROUND(AVG(note), 2) AS moyenne_note, COUNT(*) AS total_avis')
            ->where('formation_id', $formationId)
            ->get()
            ->getRowArray();

        if (!$result) {
            $result = [
                'formation_id' => (int) $formationId,
                'moyenne_note' => 0,
                'total_avis' => 0
            ];
        }

        return $this->respond($result);
    }

    public function delete($id = null)
    {
        $avisModel = new AvisModel();

        $avis = $avisModel->find($id);

        if (!$avis) {
            return $this->respond([
                'message' => 'Avis introuvable'
            ], 404);
        }

        $avisModel->delete($id);

        return $this->respond([
            'message' => 'Avis supprimé avec succès'
        ]);
    }
}