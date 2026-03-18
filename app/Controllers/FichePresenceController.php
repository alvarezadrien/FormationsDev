<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use App\Models\FichePresenceModel;
use App\Models\FormationModel;
use App\Models\UserModel;
use App\Models\InscriptionFormationModel;
use App\Models\FichePresenceParticipantModel;

class FichePresenceController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        try {
            $session = session();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Non authentifié'
                ], 401);
            }

            if ($session->get('role') !== 'admin') {
                return $this->respond([
                    'error' => true,
                    'message' => 'Accès interdit'
                ], 403);
            }

            $db = \Config\Database::connect();

            $fiches = $db->table('fiches_presence')
                ->select('
                    fiches_presence.id,
                    fiches_presence.formation_id,
                    fiches_presence.formateur_id,
                    fiches_presence.titre_seance,
                    fiches_presence.date_presence,
                    fiches_presence.heure_debut,
                    fiches_presence.heure_fin,
                    fiches_presence.remarques,
                    fiches_presence.created_at,
                    fiches_presence.updated_at,
                    formations.nom AS nom_formation,
                    users.nom AS nom_formateur,
                    users.prenom AS prenom_formateur,
                    users.email AS email_formateur
                ')
                ->join('formations', 'formations.id = fiches_presence.formation_id')
                ->join('users', 'users.id = fiches_presence.formateur_id')
                ->orderBy('fiches_presence.date_presence', 'DESC')
                ->orderBy('fiches_presence.created_at', 'DESC')
                ->get()
                ->getResultArray();

            return $this->respond([
                'error' => false,
                'fiches' => $fiches
            ]);
        } catch (\Throwable $e) {
            return $this->respond([
                'error' => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function myFiches()
    {
        try {
            $session = session();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Non authentifié'
                ], 401);
            }

            if ($session->get('role') !== 'formateur') {
                return $this->respond([
                    'error' => true,
                    'message' => 'Accès réservé aux formateurs'
                ], 403);
            }

            $formateurId = $session->get('user_id');
            $db = \Config\Database::connect();

            $fiches = $db->table('fiches_presence')
                ->select('
                    fiches_presence.id,
                    fiches_presence.formation_id,
                    fiches_presence.formateur_id,
                    fiches_presence.titre_seance,
                    fiches_presence.date_presence,
                    fiches_presence.heure_debut,
                    fiches_presence.heure_fin,
                    fiches_presence.remarques,
                    fiches_presence.created_at,
                    fiches_presence.updated_at,
                    formations.nom AS nom_formation
                ')
                ->join('formations', 'formations.id = fiches_presence.formation_id')
                ->where('fiches_presence.formateur_id', $formateurId)
                ->orderBy('fiches_presence.date_presence', 'DESC')
                ->orderBy('fiches_presence.created_at', 'DESC')
                ->get()
                ->getResultArray();

            return $this->respond([
                'error' => false,
                'fiches' => $fiches
            ]);
        } catch (\Throwable $e) {
            return $this->respond([
                'error' => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id = null)
    {
        try {
            $session = session();
            $ficheModel = new FichePresenceModel();
            $db = \Config\Database::connect();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Non authentifié'
                ], 401);
            }

            $fiche = $ficheModel->find($id);

            if (!$fiche) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Fiche introuvable'
                ], 404);
            }

            $role = $session->get('role');
            $userId = (int) $session->get('user_id');

            if ($role !== 'admin' && (int) $fiche['formateur_id'] !== $userId) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Accès interdit'
                ], 403);
            }

            $ficheComplete = $db->table('fiches_presence')
                ->select('
                    fiches_presence.*,
                    formations.nom AS nom_formation,
                    formations.lieu AS lieu_formation,
                    formations.description AS description_formation,
                    users.nom AS nom_formateur,
                    users.prenom AS prenom_formateur,
                    users.email AS email_formateur
                ')
                ->join('formations', 'formations.id = fiches_presence.formation_id')
                ->join('users', 'users.id = fiches_presence.formateur_id')
                ->where('fiches_presence.id', $id)
                ->get()
                ->getRowArray();

            $participants = $db->table('fiche_presence_participants')
                ->select('
                    fiche_presence_participants.id,
                    fiche_presence_participants.fiche_presence_id,
                    fiche_presence_participants.inscription_id,
                    fiche_presence_participants.present,
                    inscriptions_formations.nom,
                    inscriptions_formations.prenom,
                    inscriptions_formations.email,
                    inscriptions_formations.telephone,
                    inscriptions_formations.date_inscription
                ')
                ->join('inscriptions_formations', 'inscriptions_formations.id = fiche_presence_participants.inscription_id')
                ->where('fiche_presence_participants.fiche_presence_id', $id)
                ->orderBy('inscriptions_formations.prenom', 'ASC')
                ->orderBy('inscriptions_formations.nom', 'ASC')
                ->get()
                ->getResultArray();

            return $this->respond([
                'error' => false,
                'fiche' => $ficheComplete,
                'participants' => $participants
            ]);
        } catch (\Throwable $e) {
            return $this->respond([
                'error' => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function create()
    {
        $db = \Config\Database::connect();

        try {
            $session = session();
            $ficheModel = new FichePresenceModel();
            $formationModel = new FormationModel();
            $userModel = new UserModel();
            $inscriptionModel = new InscriptionFormationModel();
            $fichePresenceParticipantModel = new FichePresenceParticipantModel();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Non authentifié'
                ], 401);
            }

            $role = $session->get('role');

            if (!in_array($role, ['admin', 'formateur'])) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Accès interdit'
                ], 403);
            }

            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Données JSON invalides ou absentes'
                ], 400);
            }

            $formationId = isset($data['formation_id']) ? (int) $data['formation_id'] : null;
            $titreSeance = trim($data['titre_seance'] ?? '');
            $datePresence = trim($data['date_presence'] ?? '');
            $heureDebut = trim($data['heure_debut'] ?? '');
            $heureFin = trim($data['heure_fin'] ?? '');
            $remarques = trim($data['remarques'] ?? '');

            $formateurId = $role === 'admin'
                ? (isset($data['formateur_id']) ? (int) $data['formateur_id'] : null)
                : (int) $session->get('user_id');

            if (
                !$formationId ||
                !$formateurId ||
                $titreSeance === '' ||
                $datePresence === '' ||
                $heureDebut === '' ||
                $heureFin === ''
            ) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Tous les champs obligatoires doivent être remplis'
                ], 422);
            }

            $formation = $formationModel->find($formationId);
            if (!$formation) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Formation introuvable'
                ], 404);
            }

            $formateur = $userModel->find($formateurId);
            if (!$formateur || $formateur['role'] !== 'formateur') {
                return $this->respond([
                    'error' => true,
                    'message' => 'Formateur introuvable'
                ], 404);
            }

            if ($heureFin <= $heureDebut) {
                return $this->respond([
                    'error' => true,
                    'message' => 'L\'heure de fin doit être supérieure à l\'heure de début'
                ], 422);
            }

            $now = date('Y-m-d H:i:s');

            $db->transStart();

            $insertData = [
                'formation_id' => $formationId,
                'formateur_id' => $formateurId,
                'titre_seance' => $titreSeance,
                'date_presence' => $datePresence,
                'heure_debut' => $heureDebut,
                'heure_fin' => $heureFin,
                'remarques' => $remarques,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $inserted = $ficheModel->insert($insertData);

            if (!$inserted) {
                $db->transRollback();

                return $this->respond([
                    'error' => true,
                    'message' => 'Impossible de créer la fiche de présence'
                ], 500);
            }

            $ficheId = $ficheModel->getInsertID();

            $inscriptions = $inscriptionModel
                ->where('formation_id', $formationId)
                ->findAll();

            foreach ($inscriptions as $inscription) {
                $fichePresenceParticipantModel->insert([
                    'fiche_presence_id' => $ficheId,
                    'inscription_id' => $inscription['id'],
                    'present' => 0,
                ]);
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Impossible de finaliser la création de la fiche'
                ], 500);
            }

            return $this->respondCreated([
                'error' => false,
                'message' => 'Fiche de présence créée avec succès',
                'fiche_id' => $ficheId
            ]);
        } catch (\Throwable $e) {
            $db->transRollback();

            return $this->respond([
                'error' => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function update($id = null)
    {
        try {
            $session = session();
            $ficheModel = new FichePresenceModel();
            $formationModel = new FormationModel();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Non authentifié'
                ], 401);
            }

            $fiche = $ficheModel->find($id);

            if (!$fiche) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Fiche introuvable'
                ], 404);
            }

            $role = $session->get('role');
            $userId = $session->get('user_id');

            if ($role !== 'admin' && (int) $fiche['formateur_id'] !== (int) $userId) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Accès interdit'
                ], 403);
            }

            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Données JSON invalides ou absentes'
                ], 400);
            }

            $formationId = isset($data['formation_id']) ? (int) $data['formation_id'] : (int) $fiche['formation_id'];
            $titreSeance = trim($data['titre_seance'] ?? $fiche['titre_seance']);
            $datePresence = trim($data['date_presence'] ?? $fiche['date_presence']);
            $heureDebut = trim($data['heure_debut'] ?? $fiche['heure_debut']);
            $heureFin = trim($data['heure_fin'] ?? $fiche['heure_fin']);
            $remarques = trim($data['remarques'] ?? ($fiche['remarques'] ?? ''));

            $formation = $formationModel->find($formationId);
            if (!$formation) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Formation introuvable'
                ], 404);
            }

            if (
                !$formationId ||
                $titreSeance === '' ||
                $datePresence === '' ||
                $heureDebut === '' ||
                $heureFin === ''
            ) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Tous les champs obligatoires doivent être remplis'
                ], 422);
            }

            if ($heureFin <= $heureDebut) {
                return $this->respond([
                    'error' => true,
                    'message' => 'L\'heure de fin doit être supérieure à l\'heure de début'
                ], 422);
            }

            $ficheModel->update($id, [
                'formation_id' => $formationId,
                'titre_seance' => $titreSeance,
                'date_presence' => $datePresence,
                'heure_debut' => $heureDebut,
                'heure_fin' => $heureFin,
                'remarques' => $remarques,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            return $this->respond([
                'error' => false,
                'message' => 'Fiche de présence mise à jour avec succès'
            ]);
        } catch (\Throwable $e) {
            return $this->respond([
                'error' => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function updateParticipantPresence($ficheId = null, $participantId = null)
    {
        try {
            $session = session();
            $ficheModel = new FichePresenceModel();
            $participantModel = new FichePresenceParticipantModel();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Non authentifié'
                ], 401);
            }

            $fiche = $ficheModel->find($ficheId);

            if (!$fiche) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Fiche introuvable'
                ], 404);
            }

            $role = $session->get('role');
            $userId = (int) $session->get('user_id');

            if ($role !== 'admin' && (int) $fiche['formateur_id'] !== $userId) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Accès interdit'
                ], 403);
            }

            $participant = $participantModel
                ->where('id', $participantId)
                ->where('fiche_presence_id', $ficheId)
                ->first();

            if (!$participant) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Participant introuvable dans cette fiche'
                ], 404);
            }

            $data = $this->request->getJSON(true);

            if (!$data || !array_key_exists('present', $data)) {
                return $this->respond([
                    'error' => true,
                    'message' => 'La valeur de présence est obligatoire'
                ], 422);
            }

            $present = (int) ((bool) $data['present']);

            $updated = $participantModel->update($participantId, [
                'present' => $present,
            ]);

            if (!$updated) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Impossible de mettre à jour la présence'
                ], 500);
            }

            return $this->respond([
                'error' => false,
                'message' => 'Présence mise à jour avec succès'
            ]);
        } catch (\Throwable $e) {
            return $this->respond([
                'error' => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function delete($id = null)
    {
        try {
            $session = session();
            $ficheModel = new FichePresenceModel();

            if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Non authentifié'
                ], 401);
            }

            $fiche = $ficheModel->find($id);

            if (!$fiche) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Fiche introuvable'
                ], 404);
            }

            $role = $session->get('role');
            $userId = $session->get('user_id');

            if ($role !== 'admin' && (int) $fiche['formateur_id'] !== (int) $userId) {
                return $this->respond([
                    'error' => true,
                    'message' => 'Accès interdit'
                ], 403);
            }

            $ficheModel->delete($id);

            return $this->respond([
                'error' => false,
                'message' => 'Fiche de présence supprimée avec succès'
            ]);
        } catch (\Throwable $e) {
            return $this->respond([
                'error' => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}