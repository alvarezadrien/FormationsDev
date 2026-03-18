<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use App\Models\FichePresenceModel;
use App\Models\FormationModel;
use App\Models\UserModel;

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

    public function create()
    {
        try {
            $session = session();
            $ficheModel = new FichePresenceModel();
            $formationModel = new FormationModel();
            $userModel = new UserModel();

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

            $formationId = $data['formation_id'] ?? null;
            $titreSeance = trim($data['titre_seance'] ?? '');
            $datePresence = trim($data['date_presence'] ?? '');
            $heureDebut = trim($data['heure_debut'] ?? '');
            $heureFin = trim($data['heure_fin'] ?? '');
            $remarques = trim($data['remarques'] ?? '');

            $formateurId = $role === 'admin'
                ? ($data['formateur_id'] ?? null)
                : $session->get('user_id');

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
                return $this->respond([
                    'error' => true,
                    'message' => 'Impossible de créer la fiche de présence'
                ], 500);
            }

            return $this->respondCreated([
                'error' => false,
                'message' => 'Fiche de présence créée avec succès',
                'fiche_id' => $ficheModel->getInsertID()
            ]);
        } catch (\Throwable $e) {
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

            $formationId = $data['formation_id'] ?? $fiche['formation_id'];
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