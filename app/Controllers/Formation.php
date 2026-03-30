<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\FormationModel;
use App\Models\FormationSessionModel;

class Formation extends Controller
{
    private array $joursMap = [
        'lundi' => 1,
        'mardi' => 2,
        'mercredi' => 3,
        'jeudi' => 4,
        'vendredi' => 5,
        'samedi' => 6,
        'dimanche' => 7,
    ];

    private function ensureSchema(): void
    {
        $db = \Config\Database::connect();
        $fields = $db->getFieldData('formations');
        $fieldNames = array_map(static fn($field) => $field->name ?? '', $fields);
        $lieuFields = $db->getFieldData('lieu');
        $lieuFieldNames = array_map(static fn($field) => $field->name ?? '', $lieuFields);

        if (!in_array('second_formateur_id', $fieldNames, true)) {
            $db->query(
                'ALTER TABLE formations ADD COLUMN second_formateur_id INT NULL AFTER formateur_id'
            );
        }

        if (!in_array('ville', $fieldNames, true)) {
            $db->query(
                'ALTER TABLE formations ADD COLUMN ville VARCHAR(120) NULL AFTER lieu'
            );
        }

        if (!in_array('local_nom', $fieldNames, true)) {
            $db->query(
                'ALTER TABLE formations ADD COLUMN local_nom VARCHAR(120) NULL AFTER ville'
            );
        }

        if (!in_array('ville', $lieuFieldNames, true)) {
            $db->query('ALTER TABLE lieu ADD COLUMN ville VARCHAR(120) NULL AFTER nom');
        }

        if (!in_array('local_nom', $lieuFieldNames, true)) {
            $db->query('ALTER TABLE lieu ADD COLUMN local_nom VARCHAR(120) NULL AFTER ville');
        }
    }

    public function index()
    {
        try {
            $db = \Config\Database::connect();
            $this->ensureSchema();

            $formations = $db->table('formations')
                ->select('
                    formations.*,

                    formateur.id AS formateur_id,
                    formateur.nom AS formateur_nom,
                    formateur.prenom AS formateur_prenom,
                    formateur.email AS formateur_email,

                    second_formateur.id AS second_formateur_id,
                    second_formateur.nom AS second_formateur_nom,
                    second_formateur.prenom AS second_formateur_prenom,
                    second_formateur.email AS second_formateur_email,

                    remplacant.id AS remplacant_id,
                    remplacant.nom AS remplacant_nom,
                    remplacant.prenom AS remplacant_prenom,
                    remplacant.email AS remplacant_email
                ')
                ->join('users AS formateur', 'formateur.id = formations.formateur_id', 'left')
                ->join('users AS second_formateur', 'second_formateur.id = formations.second_formateur_id', 'left')
                ->join('users AS remplacant', 'remplacant.id = formations.remplacant_id', 'left')
                ->orderBy('formations.id', 'DESC')
                ->get()
                ->getResultArray();

            if (!empty($formations)) {
                $formationIds = array_column($formations, 'id');

                $sessions = $db->table('formation_sessions')
                    ->whereIn('formation_id', $formationIds)
                    ->orderBy('date', 'ASC')
                    ->orderBy('heure_debut', 'ASC')
                    ->get()
                    ->getResultArray();

                $sessionsByFormation = [];
                foreach ($sessions as $session) {
                    $sessionsByFormation[$session['formation_id']][] = $session;
                }

                foreach ($formations as &$formation) {
                    $formation['sessions'] = $sessionsByFormation[$formation['id']] ?? [];
                    $location = $this->resolveLocationFields(
                        $formation['ville'] ?? '',
                        $formation['local_nom'] ?? '',
                        $formation['lieu'] ?? ''
                    );
                    $formation['ville'] = $location['ville'];
                    $formation['local_nom'] = $location['local_nom'];
                    $formation['lieu'] = $location['lieu'];
                }
                unset($formation);
            }

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
            $this->ensureSchema();

            $formation = $db->table('formations')
                ->select('
                    formations.*,

                    formateur.id AS formateur_id,
                    formateur.nom AS formateur_nom,
                    formateur.prenom AS formateur_prenom,
                    formateur.email AS formateur_email,

                    second_formateur.id AS second_formateur_id,
                    second_formateur.nom AS second_formateur_nom,
                    second_formateur.prenom AS second_formateur_prenom,
                    second_formateur.email AS second_formateur_email,

                    remplacant.id AS remplacant_id,
                    remplacant.nom AS remplacant_nom,
                    remplacant.prenom AS remplacant_prenom,
                    remplacant.email AS remplacant_email
                ')
                ->join('users AS formateur', 'formateur.id = formations.formateur_id', 'left')
                ->join('users AS second_formateur', 'second_formateur.id = formations.second_formateur_id', 'left')
                ->join('users AS remplacant', 'remplacant.id = formations.remplacant_id', 'left')
                ->where('formations.id', $id)
                ->get()
                ->getRowArray();

            if (!$formation) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Formation introuvable'
                ]);
            }

            $formation['sessions'] = $db->table('formation_sessions')
                ->where('formation_id', $id)
                ->orderBy('date', 'ASC')
                ->orderBy('heure_debut', 'ASC')
                ->get()
                ->getResultArray();
            $location = $this->resolveLocationFields(
                $formation['ville'] ?? '',
                $formation['local_nom'] ?? '',
                $formation['lieu'] ?? ''
            );
            $formation['ville'] = $location['ville'];
            $formation['local_nom'] = $location['local_nom'];
            $formation['lieu'] = $location['lieu'];

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
            $sessionModel = new FormationSessionModel();
            $db = \Config\Database::connect();
            $this->ensureSchema();

            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error' => true,
                    'message' => 'Données JSON invalides ou absentes'
                ]);
            }

            $validation = $this->prepareFormationData($data, null);

            if ($validation['error']) {
                return $this->response->setStatusCode($validation['status'])->setJSON([
                    'error' => true,
                    'message' => $validation['message']
                ]);
            }

            $payload = $validation['payload'];
            $sessions = $validation['sessions'];

            $db->transStart();

            $formationId = $model->insert($payload);

            if (!$formationId) {
                $errors = $model->errors();
                throw new \RuntimeException(
                    'Impossible de créer la formation' .
                    (!empty($errors) ? ' : ' . json_encode($errors, JSON_UNESCAPED_UNICODE) : '')
                );
            }

            foreach ($sessions as $session) {
                $session['formation_id'] = $formationId;

                $inserted = $sessionModel->insert($session);

                if (!$inserted) {
                    $errors = $sessionModel->errors();
                    throw new \RuntimeException(
                        'Impossible d’enregistrer une session' .
                        (!empty($errors) ? ' : ' . json_encode($errors, JSON_UNESCAPED_UNICODE) : '')
                    );
                }
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                throw new \RuntimeException('La transaction a échoué lors de la création');
            }

            $formation = $db->table('formations')
                ->select('
                    formations.*,

                    formateur.id AS formateur_id,
                    formateur.nom AS formateur_nom,
                    formateur.prenom AS formateur_prenom,
                    formateur.email AS formateur_email,

                    second_formateur.id AS second_formateur_id,
                    second_formateur.nom AS second_formateur_nom,
                    second_formateur.prenom AS second_formateur_prenom,
                    second_formateur.email AS second_formateur_email,

                    remplacant.id AS remplacant_id,
                    remplacant.nom AS remplacant_nom,
                    remplacant.prenom AS remplacant_prenom,
                    remplacant.email AS remplacant_email
                ')
                ->join('users AS formateur', 'formateur.id = formations.formateur_id', 'left')
                ->join('users AS second_formateur', 'second_formateur.id = formations.second_formateur_id', 'left')
                ->join('users AS remplacant', 'remplacant.id = formations.remplacant_id', 'left')
                ->where('formations.id', $formationId)
                ->get()
                ->getRowArray();

            $formation['sessions'] = $db->table('formation_sessions')
                ->where('formation_id', $formationId)
                ->orderBy('date', 'ASC')
                ->orderBy('heure_debut', 'ASC')
                ->get()
                ->getResultArray();
            $location = $this->resolveLocationFields(
                $formation['ville'] ?? '',
                $formation['local_nom'] ?? '',
                $formation['lieu'] ?? ''
            );
            $formation['ville'] = $location['ville'];
            $formation['local_nom'] = $location['local_nom'];
            $formation['lieu'] = $location['lieu'];

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
            $sessionModel = new FormationSessionModel();
            $db = \Config\Database::connect();
            $this->ensureSchema();

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

            $validation = $this->prepareFormationData($data, $formation);

            if ($validation['error']) {
                return $this->response->setStatusCode($validation['status'])->setJSON([
                    'error' => true,
                    'message' => $validation['message']
                ]);
            }

            $payload = $validation['payload'];
            $sessions = $validation['sessions'];

            $db->transStart();

            $updated = $model->update($id, $payload);

            if (!$updated) {
                $errors = $model->errors();
                throw new \RuntimeException(
                    'Impossible de modifier la formation' .
                    (!empty($errors) ? ' : ' . json_encode($errors, JSON_UNESCAPED_UNICODE) : '')
                );
            }

            $db->table('formation_sessions')->where('formation_id', $id)->delete();

            foreach ($sessions as $session) {
                $session['formation_id'] = $id;

                $inserted = $sessionModel->insert($session);

                if (!$inserted) {
                    $errors = $sessionModel->errors();
                    throw new \RuntimeException(
                        'Impossible d’enregistrer une session' .
                        (!empty($errors) ? ' : ' . json_encode($errors, JSON_UNESCAPED_UNICODE) : '')
                    );
                }
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                throw new \RuntimeException('La transaction a échoué lors de la mise à jour');
            }

            $formationUpdated = $db->table('formations')
                ->select('
                    formations.*,

                    formateur.id AS formateur_id,
                    formateur.nom AS formateur_nom,
                    formateur.prenom AS formateur_prenom,
                    formateur.email AS formateur_email,

                    second_formateur.id AS second_formateur_id,
                    second_formateur.nom AS second_formateur_nom,
                    second_formateur.prenom AS second_formateur_prenom,
                    second_formateur.email AS second_formateur_email,

                    remplacant.id AS remplacant_id,
                    remplacant.nom AS remplacant_nom,
                    remplacant.prenom AS remplacant_prenom,
                    remplacant.email AS remplacant_email
                ')
                ->join('users AS formateur', 'formateur.id = formations.formateur_id', 'left')
                ->join('users AS second_formateur', 'second_formateur.id = formations.second_formateur_id', 'left')
                ->join('users AS remplacant', 'remplacant.id = formations.remplacant_id', 'left')
                ->where('formations.id', $id)
                ->get()
                ->getRowArray();

            $formationUpdated['sessions'] = $db->table('formation_sessions')
                ->where('formation_id', $id)
                ->orderBy('date', 'ASC')
                ->orderBy('heure_debut', 'ASC')
                ->get()
                ->getResultArray();
            $location = $this->resolveLocationFields(
                $formationUpdated['ville'] ?? '',
                $formationUpdated['local_nom'] ?? '',
                $formationUpdated['lieu'] ?? ''
            );
            $formationUpdated['ville'] = $location['ville'];
            $formationUpdated['local_nom'] = $location['local_nom'];
            $formationUpdated['lieu'] = $location['lieu'];

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
            $db = \Config\Database::connect();

            $formation = $model->find($id);

            if (!$formation) {
                return $this->response->setStatusCode(404)->setJSON([
                    'error' => true,
                    'message' => 'Formation introuvable'
                ]);
            }

            $db->transStart();

            $db->table('formation_sessions')->where('formation_id', $id)->delete();
            $deleted = $model->delete($id);

            if (!$deleted) {
                throw new \RuntimeException('Impossible de supprimer la formation');
            }

            $db->transComplete();

            if ($db->transStatus() === false) {
                throw new \RuntimeException('La transaction a échoué lors de la suppression');
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
        return $this->show($id);
    }

    public function previewSessions()
    {
        try {
            $data = $this->request->getJSON(true);

            if (!$data) {
                return $this->response->setStatusCode(400)->setJSON([
                    'error' => true,
                    'message' => 'Données JSON invalides ou absentes'
                ]);
            }

            $preview = $this->buildSessionsFromInput($data);

            if ($preview['error']) {
                return $this->response->setStatusCode($preview['status'])->setJSON([
                    'error' => true,
                    'message' => $preview['message']
                ]);
            }

            return $this->response->setJSON([
                'error' => false,
                'message' => 'Prévisualisation générée avec succès',
                'data' => [
                    'date_debut_reelle' => $preview['date_debut_reelle'],
                    'date_fin_calculee' => $preview['date_fin_calculee'],
                    'jours' => $preview['jours'],
                    'type_journee' => $preview['type_journee'],
                    'sessions' => $preview['sessions']
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->response->setStatusCode(500)->setJSON([
                'error' => true,
                'message' => $e->getMessage()
            ]);
        }
    }

    private function prepareFormationData(array $data, ?array $existingFormation): array
    {
        $nom = trim($data['nom'] ?? ($existingFormation['nom'] ?? ''));
        $formateurId = isset($data['formateur_id'])
            ? (int) $data['formateur_id']
            : (int) ($existingFormation['formateur_id'] ?? 0);
        $secondFormateurId = array_key_exists('second_formateur_id', $data)
            ? (($data['second_formateur_id'] === null || $data['second_formateur_id'] === '') ? null : (int) $data['second_formateur_id'])
            : ($existingFormation['second_formateur_id'] ?? null);

        $remplacantId = array_key_exists('remplacant_id', $data)
            ? (($data['remplacant_id'] === null || $data['remplacant_id'] === '') ? null : (int) $data['remplacant_id'])
            : ($existingFormation['remplacant_id'] ?? null);

        $location = $this->resolveLocationFields(
            $data['ville'] ?? ($existingFormation['ville'] ?? ''),
            $data['local_nom'] ?? ($data['local'] ?? ($existingFormation['local_nom'] ?? '')),
            $data['lieu'] ?? ($existingFormation['lieu'] ?? '')
        );
        $ville = $location['ville'];
        $localNom = $location['local_nom'];
        $lieu = $location['lieu'];
        $description = trim($data['description'] ?? ($existingFormation['description'] ?? ''));
        $nombreParticipants = isset($data['nombre_participants'])
            ? (int) $data['nombre_participants']
            : (int) ($existingFormation['nombre_participants'] ?? 0);
        $statut = trim($data['statut'] ?? ($existingFormation['statut'] ?? 'actif'));

        if ($nom === '' || $formateurId <= 0 || $ville === '' || $description === '') {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'Tous les champs principaux sont requis, y compris la ville'
            ];
        }

        $formateur = $this->getFormateurWithBio($formateurId);

        if (!$formateur || ($formateur['role'] ?? '') !== 'formateur') {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'Le formateur sélectionné est invalide'
            ];
        }

        $remplacant = null;
        $secondFormateur = null;

        if ($secondFormateurId !== null) {
            $secondFormateur = $this->getFormateurWithBio($secondFormateurId);

            if (!$secondFormateur || ($secondFormateur['role'] ?? '') !== 'formateur') {
                return [
                    'error' => true,
                    'status' => 422,
                    'message' => 'Le deuxième formateur sélectionné est invalide'
                ];
            }

            if ((int) $secondFormateurId === (int) $formateurId) {
                return [
                    'error' => true,
                    'status' => 422,
                    'message' => 'Le deuxième formateur doit être différent du formateur principal'
                ];
            }
        }

        if ($remplacantId !== null) {
            $remplacant = $this->getFormateurWithBio($remplacantId);

            if (!$remplacant || ($remplacant['role'] ?? '') !== 'formateur') {
                return [
                    'error' => true,
                    'status' => 422,
                    'message' => 'Le remplaçant sélectionné est invalide'
                ];
            }

            if ((int) $remplacantId === (int) $formateurId) {
                return [
                    'error' => true,
                    'status' => 422,
                    'message' => 'Le remplaçant doit être différent du formateur principal'
                ];
            }

            if ($secondFormateurId !== null && (int) $remplacantId === (int) $secondFormateurId) {
                return [
                    'error' => true,
                    'status' => 422,
                    'message' => 'Le remplaçant doit être différent du deuxième formateur'
                ];
            }

            if (!isset($remplacant['est_remplacant']) || (int) $remplacant['est_remplacant'] !== 1) {
                return [
                    'error' => true,
                    'status' => 422,
                    'message' => 'Le formateur sélectionné ne peut pas être remplaçant'
                ];
            }
        }

        $preview = $this->buildSessionsFromInput($data, $existingFormation);

        if ($preview['error']) {
            return $preview;
        }

        $joursPreview = $preview['jours'];

        if ($remplacantId !== null && in_array('samedi', $joursPreview, true)) {
            if (!isset($remplacant['travaille_samedi']) || (int) $remplacant['travaille_samedi'] !== 1) {
                return [
                    'error' => true,
                    'status' => 422,
                    'message' => 'Le remplaçant sélectionné n’est pas disponible le samedi'
                ];
            }
        }

        if (in_array('samedi', $joursPreview, true)) {
            if (!isset($formateur['travaille_samedi']) || (int) $formateur['travaille_samedi'] !== 1) {
                return [
                    'error' => true,
                    'status' => 422,
                    'message' => 'Le formateur principal n’est pas disponible le samedi'
                ];
            }

            if ($secondFormateurId !== null && (!isset($secondFormateur['travaille_samedi']) || (int) $secondFormateur['travaille_samedi'] !== 1)) {
                return [
                    'error' => true,
                    'status' => 422,
                    'message' => 'Le deuxième formateur n’est pas disponible le samedi'
                ];
            }
        }

        if ($secondFormateurId !== null && (!isset($secondFormateur['est_co_animation']) || (int) $secondFormateur['est_co_animation'] !== 1)) {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'Le deuxième formateur n’est pas disponible pour la co-animation'
            ];
        }

        $localAssignment = $this->assignAvailableLocal(
            $ville,
            $localNom,
            $preview['sessions'],
            isset($existingFormation['id']) ? (int) $existingFormation['id'] : null
        );

        if ($localAssignment['error']) {
            return $localAssignment;
        }

        $ville = $localAssignment['ville'];
        $localNom = $localAssignment['local_nom'];
        $lieu = $localAssignment['lieu'];

        $payload = [
            'nom' => $nom,
            'formateur_id' => $formateurId,
            'second_formateur_id' => $secondFormateurId,
            'remplacant_id' => $remplacantId,
            'lieu' => $lieu,
            'ville' => $ville,
            'local_nom' => $localNom,
            'description' => $description,
            'nombre_participants' => $nombreParticipants,
            'statut' => $statut,
            'date_debut' => $preview['date_debut_reelle'],
            'date_fin' => $preview['date_fin_calculee'],
            'jours' => implode(',', $preview['jours']),
            'type_journee' => $preview['type_journee'],
            'heure_debut' => $preview['heure_debut_global'],
            'heure_fin' => $preview['heure_fin_global'],
        ];

        return [
            'error' => false,
            'payload' => $payload,
            'sessions' => $preview['sessions']
        ];
    }

    private function getFormateurWithBio(int $userId): ?array
    {
        if ($userId <= 0) {
            return null;
        }

        $db = \Config\Database::connect();

        $user = $db->table('users u')
            ->select('
                u.*,
                COALESCE(fb.est_remplacant, 0) AS est_remplacant,
                COALESCE(fb.travaille_samedi, 0) AS travaille_samedi,
                COALESCE(fb.est_co_animation, 0) AS est_co_animation
            ')
            ->join('formateur_bios fb', 'fb.user_id = u.id', 'left')
            ->where('u.id', $userId)
            ->get()
            ->getRowArray();

        return $user ?: null;
    }

    private function buildSessionsFromInput(array $data, ?array $existingFormation = null): array
    {
        $dateDebut = trim($data['date_debut'] ?? ($existingFormation['date_debut'] ?? ''));
        $dateFin = trim($data['date_fin'] ?? ($existingFormation['date_fin'] ?? ''));
        $nombreSeances = isset($data['nombre_seances']) && $data['nombre_seances'] !== ''
            ? (int) $data['nombre_seances']
            : null;

        $creneaux = $data['creneaux'] ?? null;
        $joursFallback = $data['jours'] ?? ($existingFormation['jours'] ?? []);
        $typeJourneeFallback = trim($data['type_journee'] ?? ($existingFormation['type_journee'] ?? ''));
        $heureDebutFallback = trim($data['heure_debut'] ?? ($existingFormation['heure_debut'] ?? ''));
        $heureFinFallback = trim($data['heure_fin'] ?? ($existingFormation['heure_fin'] ?? ''));

        if ($dateDebut === '') {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'La date de début est requise'
            ];
        }

        if (!$this->isValidDate($dateDebut)) {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'La date de début est invalide'
            ];
        }

        $normalizedCreneaux = $this->normalizeCreneaux(
            $creneaux,
            $joursFallback,
            $typeJourneeFallback,
            $heureDebutFallback,
            $heureFinFallback
        );

        if (empty($normalizedCreneaux)) {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'Veuillez définir au moins un créneau valide'
            ];
        }

        if ($dateFin !== '' && !$this->isValidDate($dateFin)) {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'La date de fin est invalide'
            ];
        }

        if ($dateFin !== '' && $dateFin < $dateDebut) {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'La date de fin ne peut pas être antérieure à la date de début'
            ];
        }

        if ($dateFin === '' && (!$nombreSeances || $nombreSeances <= 0)) {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'Veuillez renseigner une date de fin ou un nombre de séances'
            ];
        }

        $sessions = $this->generateSessions(
            $dateDebut,
            $normalizedCreneaux,
            $dateFin !== '' ? $dateFin : null,
            $nombreSeances
        );

        if (empty($sessions)) {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'Aucune session n’a pu être générée avec les paramètres fournis'
            ];
        }

        $dates = array_column($sessions, 'date');
        sort($dates);

        $jours = array_values(array_unique(array_map(fn($c) => $c['jour'], $normalizedCreneaux)));

        $heureDebutGlobal = null;
        $heureFinGlobal = null;

        foreach ($normalizedCreneaux as $index => $creneau) {
            if ($index === 0) {
                $heureDebutGlobal = $creneau['heure_debut'];
                $heureFinGlobal = $creneau['heure_fin'];
                continue;
            }

            if ($creneau['heure_debut'] !== $heureDebutGlobal || $creneau['heure_fin'] !== $heureFinGlobal) {
                $heureDebutGlobal = null;
                $heureFinGlobal = null;
                break;
            }
        }

        $typeJourneeUnique = array_values(array_unique(array_map(fn($c) => $c['type_journee'], $normalizedCreneaux)));
        $typeJournee = count($typeJourneeUnique) === 1 ? $typeJourneeUnique[0] : 'mixte';

        return [
            'error' => false,
            'date_debut_reelle' => $dates[0],
            'date_fin_calculee' => end($dates),
            'jours' => $jours,
            'type_journee' => $typeJournee,
            'heure_debut_global' => $heureDebutGlobal,
            'heure_fin_global' => $heureFinGlobal,
            'sessions' => $sessions,
        ];
    }

    private function normalizeCreneaux($creneaux, $joursFallback, string $typeJourneeFallback, string $heureDebutFallback, string $heureFinFallback): array
    {
        $result = [];
        $signatures = [];

        if (is_array($creneaux) && !empty($creneaux)) {
            foreach ($creneaux as $creneau) {
                $jours = [];

                if (isset($creneau['jour']) && trim((string) $creneau['jour']) !== '') {
                    $jours[] = strtolower(trim((string) $creneau['jour']));
                }

                if (isset($creneau['jours'])) {
                    if (is_array($creneau['jours'])) {
                        foreach ($creneau['jours'] as $jour) {
                            $jour = strtolower(trim((string) $jour));
                            if ($jour !== '') {
                                $jours[] = $jour;
                            }
                        }
                    } elseif (is_string($creneau['jours'])) {
                        foreach (explode(',', $creneau['jours']) as $jour) {
                            $jour = strtolower(trim($jour));
                            if ($jour !== '') {
                                $jours[] = $jour;
                            }
                        }
                    }
                }

                $jours = array_values(array_unique($jours));

                $typeJournee = trim($creneau['type_journee'] ?? '');
                if ($typeJournee === '') {
                    $typeJournee = 'personnalise';
                }

                $heureDebut = trim($creneau['heure_debut'] ?? '');
                $heureFin = trim($creneau['heure_fin'] ?? '');

                [$heureDebut, $heureFin] = $this->resolveHours($typeJournee, $heureDebut, $heureFin);

                if (!$this->isValidTime($heureDebut) || !$this->isValidTime($heureFin) || $heureFin <= $heureDebut) {
                    continue;
                }

                foreach ($jours as $jour) {
                    if (!isset($this->joursMap[$jour])) {
                        continue;
                    }

                    $signature = $jour . '|' . $typeJournee . '|' . $heureDebut . '|' . $heureFin;

                    if (isset($signatures[$signature])) {
                        continue;
                    }

                    $signatures[$signature] = true;

                    $result[] = [
                        'jour' => $jour,
                        'type_journee' => $typeJournee,
                        'heure_debut' => $heureDebut,
                        'heure_fin' => $heureFin,
                    ];
                }
            }
        }

        if (!empty($result)) {
            usort($result, function ($a, $b) {
                $cmpJour = $this->joursMap[$a['jour']] <=> $this->joursMap[$b['jour']];
                if ($cmpJour !== 0) {
                    return $cmpJour;
                }
                return strcmp($a['heure_debut'], $b['heure_debut']);
            });

            return $result;
        }

        if (is_string($joursFallback)) {
            $joursFallback = array_filter(array_map('trim', explode(',', $joursFallback)));
        }

        if (!is_array($joursFallback) || empty($joursFallback)) {
            return [];
        }

        foreach ($joursFallback as $jour) {
            $jour = strtolower(trim((string) $jour));

            if (!isset($this->joursMap[$jour])) {
                continue;
            }

            [$heureDebut, $heureFin] = $this->resolveHours($typeJourneeFallback, $heureDebutFallback, $heureFinFallback);

            if (!$this->isValidTime($heureDebut) || !$this->isValidTime($heureFin) || $heureFin <= $heureDebut) {
                continue;
            }

            $signature = $jour . '|' . $typeJourneeFallback . '|' . $heureDebut . '|' . $heureFin;

            if (isset($signatures[$signature])) {
                continue;
            }

            $signatures[$signature] = true;

            $result[] = [
                'jour' => $jour,
                'type_journee' => $typeJourneeFallback !== '' ? $typeJourneeFallback : 'personnalise',
                'heure_debut' => $heureDebut,
                'heure_fin' => $heureFin,
            ];
        }

        usort($result, function ($a, $b) {
            $cmpJour = $this->joursMap[$a['jour']] <=> $this->joursMap[$b['jour']];
            if ($cmpJour !== 0) {
                return $cmpJour;
            }
            return strcmp($a['heure_debut'], $b['heure_debut']);
        });

        return $result;
    }

    private function resolveHours(string $typeJournee, string $heureDebut = '', string $heureFin = ''): array
    {
        $typeJournee = trim($typeJournee);

        $presets = [
            'journee_complete' => ['09:00:00', '17:00:00'],
            'demi_journee_matin' => ['09:00:00', '12:30:00'],
            'demi_journee_apres_midi' => ['13:30:00', '17:00:00'],
            'demi_journee' => ['09:00:00', '12:30:00'],
            'soir' => ['18:00:00', '21:00:00'],
            'cours_du_soir' => ['18:00:00', '21:00:00'],
            'cours_du_jour' => ['09:00:00', '16:00:00'],
        ];

        if (isset($presets[$typeJournee])) {
            return $presets[$typeJournee];
        }

        $heureDebut = $this->normalizeTime($heureDebut);
        $heureFin = $this->normalizeTime($heureFin);

        return [$heureDebut, $heureFin];
    }

    private function generateSessions(string $dateDebut, array $creneaux, ?string $dateFin = null, ?int $nombreSeances = null): array
    {
        $sessions = [];
        $start = new \DateTimeImmutable($dateDebut);

        if ($dateFin !== null) {
            $end = new \DateTimeImmutable($dateFin);
            $cursor = $start;

            while ($cursor <= $end) {
                $dayNumber = (int) $cursor->format('N');

                foreach ($creneaux as $creneau) {
                    if ($this->joursMap[$creneau['jour']] === $dayNumber) {
                        $sessions[] = [
                            'date' => $cursor->format('Y-m-d'),
                            'heure_debut' => $creneau['heure_debut'],
                            'heure_fin' => $creneau['heure_fin'],
                        ];
                    }
                }

                $cursor = $cursor->modify('+1 day');
            }
        } else {
            $cursor = $start;
            $safety = 0;

            while (count($sessions) < $nombreSeances && $safety < 1000) {
                $dayNumber = (int) $cursor->format('N');

                foreach ($creneaux as $creneau) {
                    if ($this->joursMap[$creneau['jour']] === $dayNumber) {
                        $sessions[] = [
                            'date' => $cursor->format('Y-m-d'),
                            'heure_debut' => $creneau['heure_debut'],
                            'heure_fin' => $creneau['heure_fin'],
                        ];

                        if (count($sessions) >= $nombreSeances) {
                            break;
                        }
                    }
                }

                $cursor = $cursor->modify('+1 day');
                $safety++;
            }
        }

        usort($sessions, function ($a, $b) {
            $cmpDate = strcmp($a['date'], $b['date']);
            if ($cmpDate !== 0) {
                return $cmpDate;
            }
            return strcmp($a['heure_debut'], $b['heure_debut']);
        });

        return $sessions;
    }

    private function isValidDate(string $date): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }

    private function isValidTime(string $time): bool
    {
        $formats = ['H:i', 'H:i:s'];

        foreach ($formats as $format) {
            $t = \DateTime::createFromFormat($format, $time);
            if ($t && $t->format($format) === $time) {
                return true;
            }
        }

        return false;
    }

    private function normalizeTime(string $time): string
    {
        $time = trim($time);

        if ($time === '') {
            return '';
        }

        if (preg_match('/^\d{2}:\d{2}$/', $time)) {
            return $time . ':00';
        }

        return $time;
    }

    private function resolveLocationFields($villeInput, $localInput, $lieuInput): array
    {
        $ville = trim((string) ($villeInput ?? ''));
        $localNom = trim((string) ($localInput ?? ''));
        $lieu = trim((string) ($lieuInput ?? ''));

        if (($ville === '' || $localNom === '') && $lieu !== '' && str_contains($lieu, ' - ')) {
            [$parsedVille, $parsedLocal] = array_map('trim', explode(' - ', $lieu, 2));

            if ($ville === '') {
                $ville = $parsedVille;
            }

            if ($localNom === '') {
                $localNom = $parsedLocal;
            }
        }

        if ($lieu === '' && $ville !== '' && $localNom !== '') {
            $lieu = $ville . ' - ' . $localNom;
        }

        if ($lieu === '' && $ville !== '') {
            $lieu = $ville;
        }

        return [
            'ville' => $ville,
            'local_nom' => $localNom,
            'lieu' => $lieu,
        ];
    }

    private function assignAvailableLocal(string $ville, string $preferredLocal, array $sessions, ?int $excludeFormationId = null): array
    {
        $db = \Config\Database::connect();
        $lieux = $db->table('lieu')
            ->where('ville', $ville)
            ->orderBy('local_nom', 'ASC')
            ->orderBy('nom', 'ASC')
            ->get()
            ->getResultArray();

        if (empty($lieux)) {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'Aucun local n’est configuré pour cette ville. Ajoutez-en depuis le dashboard admin.'
            ];
        }

        $availableLocaux = $this->getAvailableLocauxForSessions(
            $ville,
            $sessions,
            $excludeFormationId
        );

        if (empty($availableLocaux)) {
            return [
                'error' => true,
                'status' => 422,
                'message' => 'Aucun local n’est disponible sur ce créneau pour cette ville. Ajoutez-en depuis le dashboard admin.'
            ];
        }

        $selectedLocal = null;

        if ($preferredLocal !== '') {
            foreach ($availableLocaux as $lieu) {
                $localName = trim((string) ($lieu['local_nom'] ?? ''));
                $fullName = trim((string) ($lieu['nom'] ?? ''));

                if ($preferredLocal === $localName || $preferredLocal === $fullName) {
                    $selectedLocal = $lieu;
                    break;
                }
            }
        }

        if ($selectedLocal === null) {
            $selectedLocal = $availableLocaux[0];
        }

        $location = $this->resolveLocationFields(
            $selectedLocal['ville'] ?? $ville,
            $selectedLocal['local_nom'] ?? '',
            $selectedLocal['nom'] ?? ''
        );

        return [
            'error' => false,
            'ville' => $location['ville'],
            'local_nom' => $location['local_nom'],
            'lieu' => $location['lieu'],
        ];
    }

    private function getAvailableLocauxForSessions(string $ville, array $sessions, ?int $excludeFormationId = null): array
    {
        $db = \Config\Database::connect();
        $lieux = $db->table('lieu')
            ->where('ville', $ville)
            ->orderBy('local_nom', 'ASC')
            ->orderBy('nom', 'ASC')
            ->get()
            ->getResultArray();

        if (empty($lieux)) {
            return [];
        }

        $formations = $db->table('formations')
            ->select('id, lieu, ville, local_nom, statut')
            ->where('statut !=', 'annule')
            ->get()
            ->getResultArray();

        $candidateFormationIds = [];
        $occupiedLocaux = [];

        foreach ($formations as $formation) {
            $formationId = (int) ($formation['id'] ?? 0);

            if ($formationId <= 0 || ($excludeFormationId !== null && $formationId === $excludeFormationId)) {
                continue;
            }

            $location = $this->resolveLocationFields(
                $formation['ville'] ?? '',
                $formation['local_nom'] ?? '',
                $formation['lieu'] ?? ''
            );

            if ($location['ville'] !== $ville || $location['local_nom'] === '') {
                continue;
            }

            $candidateFormationIds[$formationId] = $location['local_nom'];
        }

        if (!empty($candidateFormationIds)) {
            $existingSessions = $db->table('formation_sessions')
                ->whereIn('formation_id', array_keys($candidateFormationIds))
                ->orderBy('date', 'ASC')
                ->orderBy('heure_debut', 'ASC')
                ->get()
                ->getResultArray();

            foreach ($existingSessions as $existingSession) {
                $formationId = (int) ($existingSession['formation_id'] ?? 0);
                $localNom = $candidateFormationIds[$formationId] ?? null;

                if ($localNom === null) {
                    continue;
                }

                foreach ($sessions as $newSession) {
                    if ($this->sessionsOverlap($newSession, $existingSession)) {
                        $occupiedLocaux[$localNom] = true;
                        break;
                    }
                }
            }
        }

        return array_values(array_filter($lieux, function ($lieu) use ($occupiedLocaux) {
            $location = $this->resolveLocationFields(
                $lieu['ville'] ?? '',
                $lieu['local_nom'] ?? '',
                $lieu['nom'] ?? ''
            );

            return $location['local_nom'] !== '' && !isset($occupiedLocaux[$location['local_nom']]);
        }));
    }

    private function sessionsOverlap(array $firstSession, array $secondSession): bool
    {
        $firstDate = trim((string) ($firstSession['date'] ?? ''));
        $secondDate = trim((string) ($secondSession['date'] ?? ''));

        if ($firstDate === '' || $secondDate === '' || $firstDate !== $secondDate) {
            return false;
        }

        $firstStart = $this->normalizeTime((string) ($firstSession['heure_debut'] ?? ''));
        $firstEnd = $this->normalizeTime((string) ($firstSession['heure_fin'] ?? ''));
        $secondStart = $this->normalizeTime((string) ($secondSession['heure_debut'] ?? ''));
        $secondEnd = $this->normalizeTime((string) ($secondSession['heure_fin'] ?? ''));

        if ($firstStart === '' || $firstEnd === '' || $secondStart === '' || $secondEnd === '') {
            return false;
        }

        return $firstStart < $secondEnd && $secondStart < $firstEnd;
    }
}
