<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\FormateurPresenceModel;
use App\Models\FormationModel;
use App\Models\UserModel;

class FormateurPresenceController extends Controller
{
    private function columnExists(string $table, string $column): bool
    {
        $db = \Config\Database::connect();
        $fields = $db->getFieldData($table);

        foreach ($fields as $field) {
            if (($field->name ?? null) === $column) {
                return true;
            }
        }

        return false;
    }

    private function ensureTableExists(): void
    {
        $db = \Config\Database::connect();

        $db->query(
            'CREATE TABLE IF NOT EXISTS formateur_presences (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                formation_id INT UNSIGNED NOT NULL,
                formateur_id INT UNSIGNED NOT NULL,
                statut VARCHAR(20) NOT NULL DEFAULT "present",
                commentaire TEXT NULL,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                UNIQUE KEY unique_formation_formateur (formation_id, formateur_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        if (!$this->columnExists('formateur_presences', 'statut_formation_avant_absence')) {
            $db->query(
                'ALTER TABLE formateur_presences ADD COLUMN statut_formation_avant_absence VARCHAR(20) NULL AFTER commentaire'
            );
        }

        if (!$this->columnExists('formateur_presences', 'annulation_auto')) {
            $db->query(
                'ALTER TABLE formateur_presences ADD COLUMN annulation_auto TINYINT(1) NOT NULL DEFAULT 0 AFTER statut_formation_avant_absence'
            );
        }
    }

    private function buildPresenceQuery(?int $formateurId = null)
    {
        $db = \Config\Database::connect();

        $builder = $db->table('formations f')
            ->select(
                'f.id AS formation_id,
                f.nom AS formation_nom,
                f.date_debut,
                f.date_fin,
                f.heure_debut,
                f.heure_fin,
                f.lieu,
                f.statut AS formation_statut,
                formateur.id AS formateur_id,
                formateur.nom AS formateur_nom,
                formateur.prenom AS formateur_prenom,
                formateur.email AS formateur_email,
                remplacant.id AS remplacant_id,
                remplacant.nom AS remplacant_nom,
                remplacant.prenom AS remplacant_prenom,
                remplacant.email AS remplacant_email,
                COALESCE(fp.statut, "present") AS statut_presence,
                COALESCE(fp.commentaire, "") AS commentaire_presence,
                COALESCE(fp.annulation_auto, 0) AS annulation_auto'
            )
            ->join('users AS formateur', 'formateur.id = f.formateur_id', 'left')
            ->join('users AS remplacant', 'remplacant.id = f.remplacant_id', 'left')
            ->join('formateur_presences AS fp', 'fp.formation_id = f.id AND fp.formateur_id = f.formateur_id', 'left')
            ->where('f.formateur_id IS NOT NULL', null, false)
            ->orderBy('f.date_debut', 'ASC')
            ->orderBy('f.id', 'DESC');

        if ($formateurId !== null) {
            $builder->where('f.formateur_id', $formateurId);
        }

        return $builder;
    }

    private function mapPresenceRow(array $row): array
    {
        $principal = trim(($row['formateur_prenom'] ?? '') . ' ' . ($row['formateur_nom'] ?? ''));
        $remplacant = trim(($row['remplacant_prenom'] ?? '') . ' ' . ($row['remplacant_nom'] ?? ''));
        $statutPresence = $row['statut_presence'] === 'absent' ? 'absent' : 'present';

        if ($statutPresence === 'absent' && !empty($row['remplacant_id'])) {
            $coursAssurePar = $remplacant !== '' ? $remplacant : 'Remplaçant assigné';
        } else {
            $coursAssurePar = $principal !== '' ? $principal : 'Non renseigné';
        }

        return [
            'formation_id' => (int) ($row['formation_id'] ?? 0),
            'formation_nom' => $row['formation_nom'] ?? '',
            'date_debut' => $row['date_debut'] ?? null,
            'date_fin' => $row['date_fin'] ?? null,
            'heure_debut' => $row['heure_debut'] ?? null,
            'heure_fin' => $row['heure_fin'] ?? null,
            'lieu' => $row['lieu'] ?? '',
            'formation_statut' => $row['formation_statut'] ?? '',
            'formateur_id' => (int) ($row['formateur_id'] ?? 0),
            'formateur_nom_complet' => $principal !== '' ? $principal : 'Non renseigné',
            'formateur_email' => $row['formateur_email'] ?? '',
            'remplacant_id' => !empty($row['remplacant_id']) ? (int) $row['remplacant_id'] : null,
            'remplacant_nom_complet' => $remplacant !== '' ? $remplacant : '',
            'remplacant_email' => $row['remplacant_email'] ?? '',
            'statut_presence' => $statutPresence,
            'commentaire_presence' => $row['commentaire_presence'] ?? '',
            'cours_assure_par' => $coursAssurePar,
            'remplacement_effectif' => $statutPresence === 'absent' && !empty($row['remplacant_id']),
            'annulation_auto' => (int) ($row['annulation_auto'] ?? 0) === 1,
        ];
    }

    private function syncFormationStatus(array $formation, array &$presencePayload, ?array $existingPresence): void
    {
        $formationModel = new FormationModel();

        $formationId = (int) ($formation['id'] ?? 0);
        if ($formationId <= 0) {
            return;
        }

        $currentFormationStatus = strtolower((string) ($formation['statut'] ?? 'actif'));
        $presenceStatus = strtolower((string) ($presencePayload['statut'] ?? 'present'));
        $hasRemplacant = !empty($formation['remplacant_id']);

        if ($presenceStatus === 'absent' && !$hasRemplacant) {
            $previousStatus = $existingPresence['statut_formation_avant_absence'] ?? null;

            if (!$previousStatus && $currentFormationStatus !== 'annule') {
                $previousStatus = $currentFormationStatus;
            }

            $presencePayload['statut_formation_avant_absence'] = $previousStatus ?: 'actif';
            $presencePayload['annulation_auto'] = 1;

            if ($currentFormationStatus !== 'annule') {
                $formationModel->update($formationId, [
                    'statut' => 'annule',
                ]);
            }

            return;
        }

        $shouldRestore = (int) ($existingPresence['annulation_auto'] ?? 0) === 1;
        $presencePayload['annulation_auto'] = 0;

        if ($shouldRestore && $currentFormationStatus === 'annule') {
            $formationModel->update($formationId, [
                'statut' => $existingPresence['statut_formation_avant_absence'] ?? 'actif',
            ]);
        }

        $presencePayload['statut_formation_avant_absence'] = $existingPresence['statut_formation_avant_absence'] ?? null;
    }

    public function index()
    {
        try {
            $this->ensureTableExists();

            $rows = $this->buildPresenceQuery()->get()->getResultArray();

            return $this->response->setJSON([
                'error' => false,
                'presences' => array_map([$this, 'mapPresenceRow'], $rows),
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function myPresences()
    {
        try {
            $session = session();
            $userId = (int) $session->get('user_id');

            if (!$userId) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error' => true,
                    'message' => 'Utilisateur non authentifié',
                ]);
            }

            $this->ensureTableExists();

            $rows = $this->buildPresenceQuery($userId)->get()->getResultArray();

            return $this->response->setJSON([
                'error' => false,
                'presences' => array_map([$this, 'mapPresenceRow'], $rows),
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function updateMyPresence($formationId = null)
    {
        try {
            $session = session();
            $userId = (int) $session->get('user_id');

            if (!$userId) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error' => true,
                    'message' => 'Utilisateur non authentifié',
                ]);
            }

            $userModel = new UserModel();
            $formationModel = new FormationModel();
            $presenceModel = new FormateurPresenceModel();

            $user = $userModel->find($userId);

            if (!$user || ($user['role'] ?? '') !== 'formateur') {
                return $this->response->setStatusCode(403)->setJSON([
                    'error' => true,
                    'message' => 'Accès réservé aux formateurs',
                ]);
            }

            $formationId = (int) $formationId;
            $formation = $formationModel->find($formationId);

            if (!$formation) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Formation introuvable',
                ]);
            }

            if ((int) ($formation['formateur_id'] ?? 0) !== $userId) {
                return $this->response->setStatusCode(403)->setJSON([
                    'error' => true,
                    'message' => 'Vous ne pouvez modifier que vos propres formations',
                ]);
            }

            $this->ensureTableExists();

            $input = $this->request->getJSON(true);
            if (!$input) {
                $input = $this->request->getRawInput();
            }

            $statut = strtolower(trim((string) ($input['statut_presence'] ?? $input['statut'] ?? 'present')));
            if (!in_array($statut, ['present', 'absent'], true)) {
                $statut = 'present';
            }

            $commentaire = trim((string) ($input['commentaire_presence'] ?? $input['commentaire'] ?? ''));

            $payload = [
                'formation_id' => $formationId,
                'formateur_id' => $userId,
                'statut' => $statut,
                'commentaire' => $commentaire,
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $existing = $presenceModel
                ->where('formation_id', $formationId)
                ->where('formateur_id', $userId)
                ->first();

            $this->syncFormationStatus($formation, $payload, $existing);

            if ($existing) {
                $presenceModel->update($existing['id'], $payload);
            } else {
                $payload['created_at'] = date('Y-m-d H:i:s');
                $presenceModel->insert($payload);
            }

            $row = $this->buildPresenceQuery($userId)
                ->where('f.id', $formationId)
                ->get()
                ->getRowArray();

            $absenceSansRemplacant = $statut === 'absent' && empty($formation['remplacant_id']);

            return $this->response->setJSON([
                'error' => false,
                'message' => $absenceSansRemplacant
                    ? 'Votre absence a bien été enregistrée et la formation est maintenant annulée.'
                    : ($statut === 'absent'
                        ? 'Votre absence a bien été enregistrée.'
                        : 'Votre présence a bien été enregistrée.'),
                'presence' => $row ? $this->mapPresenceRow($row) : null,
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function updateAdminPresence($formationId = null)
    {
        try {
            $session = session();
            $adminId = (int) $session->get('user_id');

            if (!$adminId) {
                return $this->response->setStatusCode(401)->setJSON([
                    'error' => true,
                    'message' => 'Utilisateur non authentifié',
                ]);
            }

            $userModel = new UserModel();
            $formationModel = new FormationModel();
            $presenceModel = new FormateurPresenceModel();

            $admin = $userModel->find($adminId);

            if (!$admin || ($admin['role'] ?? '') !== 'admin') {
                return $this->response->setStatusCode(403)->setJSON([
                    'error' => true,
                    'message' => 'Accès réservé aux administrateurs',
                ]);
            }

            $formationId = (int) $formationId;
            $formation = $formationModel->find($formationId);

            if (!$formation) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Formation introuvable',
                ]);
            }

            $formateurId = (int) ($formation['formateur_id'] ?? 0);
            if ($formateurId <= 0) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error' => true,
                    'message' => 'Aucun formateur principal n’est attribué à cette formation',
                ]);
            }

            $this->ensureTableExists();

            $input = $this->request->getJSON(true);
            if (!$input) {
                $input = $this->request->getRawInput();
            }

            $statut = strtolower(trim((string) ($input['statut_presence'] ?? $input['statut'] ?? 'present')));
            if (!in_array($statut, ['present', 'absent'], true)) {
                $statut = 'present';
            }

            $commentaire = trim((string) ($input['commentaire_presence'] ?? $input['commentaire'] ?? ''));

            $payload = [
                'formation_id' => $formationId,
                'formateur_id' => $formateurId,
                'statut' => $statut,
                'commentaire' => $commentaire,
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $existing = $presenceModel
                ->where('formation_id', $formationId)
                ->where('formateur_id', $formateurId)
                ->first();

            $this->syncFormationStatus($formation, $payload, $existing);

            if ($existing) {
                $presenceModel->update($existing['id'], $payload);
            } else {
                $payload['created_at'] = date('Y-m-d H:i:s');
                $presenceModel->insert($payload);
            }

            $row = $this->buildPresenceQuery()
                ->where('f.id', $formationId)
                ->get()
                ->getRowArray();

            $absenceSansRemplacant = $statut === 'absent' && empty($formation['remplacant_id']);

            return $this->response->setJSON([
                'error' => false,
                'message' => $absenceSansRemplacant
                    ? 'L’absence du formateur a bien été enregistrée et la formation est maintenant annulée.'
                    : ($statut === 'absent'
                        ? 'L’absence du formateur a bien été enregistrée.'
                        : 'La présence du formateur a bien été enregistrée.'),
                'presence' => $row ? $this->mapPresenceRow($row) : null,
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
