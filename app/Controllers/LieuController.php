<?php

namespace App\Controllers;

use App\Models\LieuModel;
use CodeIgniter\RESTful\ResourceController;

class LieuController extends ResourceController
{
    protected $modelName = LieuModel::class;
    protected $format    = 'json';
    private array $defaultLocaux = [
        'Bruxelles' => 6,
        'Liège' => 2,
    ];

    private function ensureSchema(): void
    {
        $db = \Config\Database::connect();
        $fields = $db->getFieldData('lieu');
        $fieldNames = array_map(static fn($field) => $field->name ?? '', $fields);

        if (!in_array('ville', $fieldNames, true)) {
            $db->query('ALTER TABLE lieu ADD COLUMN ville VARCHAR(120) NULL AFTER nom');
        }

        if (!in_array('local_nom', $fieldNames, true)) {
            $db->query('ALTER TABLE lieu ADD COLUMN local_nom VARCHAR(120) NULL AFTER ville');
        }
    }

    private function slugify(string $value): string
    {
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
        $normalized = strtolower(trim($normalized));
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?? '';
        $normalized = trim($normalized, '-');

        return $normalized !== '' ? $normalized : 'lieu';
    }

    private function normalizeKey(string $value): string
    {
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;

        return strtolower(trim($normalized));
    }

    private function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value)) {
            return $value === 1;
        }

        if (is_string($value)) {
            return in_array(strtolower(trim($value)), ['1', 'true', 'oui', 'yes', 'on'], true);
        }

        return false;
    }

    private function findExistingVilleMatch(string $ville, array $existingVilles): ?string
    {
        $normalizedVille = $this->normalizeKey($ville);

        foreach ($existingVilles as $existingVille) {
            if ($this->normalizeKey((string) $existingVille) === $normalizedVille) {
                return (string) $existingVille;
            }
        }

        return null;
    }

    private function getExistingVilles(?int $excludeLieuId = null): array
    {
        $builder = $this->model
            ->select('ville')
            ->where('ville IS NOT NULL', null, false)
            ->where('ville !=', '')
            ->distinct()
            ->orderBy('ville', 'ASC');

        if ($excludeLieuId !== null) {
            $builder->where('id !=', $excludeLieuId);
        }

        $rows = $builder->findAll();

        return array_values(array_filter(array_map(
            static fn($row) => trim((string) ($row['ville'] ?? '')),
            $rows
        )));
    }

    private function validateLieuPayload(array $data, ?int $currentId = null, bool $allowNewCity = false): ?array
    {
        $ville = trim((string) ($data['ville'] ?? ''));
        $localNom = trim((string) ($data['local_nom'] ?? ''));

        if ($ville === '') {
            return ['ville' => 'La ville est obligatoire'];
        }

        if ($localNom === '') {
            return ['local_nom' => 'Le nom du local est obligatoire'];
        }

        $existingVilles = $this->getExistingVilles($currentId);
        $matchedVille = $this->findExistingVilleMatch($ville, $existingVilles);

        if ($matchedVille === null && $currentId === null && !$allowNewCity) {
            return ['ville' => 'La ville doit être choisie parmi celles déjà présentes en base'];
        }

        $normalizedLocalNom = $this->normalizeKey($localNom);
        $normalizedVille = $this->normalizeKey($matchedVille ?? $ville);
        $normalizedVilles = array_map(fn($item) => $this->normalizeKey($item), $existingVilles);

        if ($normalizedLocalNom === $normalizedVille || in_array($normalizedLocalNom, $normalizedVilles, true)) {
            return ['local_nom' => 'Le nom du local ne peut pas être une ville'];
        }

        if (!preg_match('/^(local|salle)\b/i', $localNom)) {
            return ['local_nom' => 'Le nom du local doit commencer par "Local" ou "Salle"'];
        }

        return null;
    }

    private function inferLieuDetails(array $data): array
    {
        $nom = trim((string) ($data['nom'] ?? ''));
        $ville = trim((string) ($data['ville'] ?? ''));
        $localNom = trim((string) ($data['local_nom'] ?? ($data['local'] ?? '')));

        if (($ville === '' || $localNom === '') && $nom !== '' && str_contains($nom, ' - ')) {
            [$parsedVille, $parsedLocal] = array_map('trim', explode(' - ', $nom, 2));

            if ($ville === '') {
                $ville = $parsedVille;
            }

            if ($localNom === '') {
                $localNom = $parsedLocal;
            }
        }

        if ($nom === '' && $ville !== '' && $localNom !== '') {
            $nom = $ville . ' - ' . $localNom;
        }

        $slug = trim((string) ($data['slug'] ?? ''));
        if ($slug === '' && $nom !== '') {
            $slug = $this->slugify($nom);
        }

        return [
            'nom' => $nom,
            'slug' => $slug,
            'ville' => $ville !== '' ? $ville : null,
            'local_nom' => $localNom !== '' ? $localNom : null,
        ];
    }

    private function seedDefaultLocaux(): void
    {
        foreach ($this->defaultLocaux as $ville => $count) {
            for ($index = 1; $index <= $count; $index++) {
                $payload = $this->inferLieuDetails([
                    'ville' => $ville,
                    'local_nom' => 'Local ' . $index,
                ]);

                $exists = $this->model
                    ->where('slug', $payload['slug'])
                    ->first();

                if ($exists) {
                    continue;
                }

                $this->model->insert($payload);
            }
        }
    }

    private function backfillExistingLieux(): void
    {
        $lieux = $this->model->findAll();

        foreach ($lieux as $lieu) {
            $needsBackfill =
                empty($lieu['ville']) ||
                array_key_exists('local_nom', $lieu) && empty($lieu['local_nom']);

            if (!$needsBackfill) {
                continue;
            }

            $payload = $this->inferLieuDetails($lieu);

            $updates = [];

            if (empty($lieu['ville']) && !empty($payload['ville'])) {
                $updates['ville'] = $payload['ville'];
            }

            if (
                array_key_exists('local_nom', $lieu) &&
                empty($lieu['local_nom']) &&
                !empty($payload['local_nom'])
            ) {
                $updates['local_nom'] = $payload['local_nom'];
            }

            if (!empty($updates)) {
                $this->model->update($lieu['id'], $updates);
            }
        }
    }

    /**
     * GET /lieux
     */
    public function index()
    {
        $this->ensureSchema();
        $this->backfillExistingLieux();
        $this->seedDefaultLocaux();

        $lieux = $this->model
            ->orderBy('ville', 'ASC')
            ->orderBy('local_nom', 'ASC')
            ->orderBy('nom', 'ASC')
            ->findAll();

        return $this->respond($lieux);
    }

    /**
     * GET /lieux/{id}
     */
    public function show($id = null)
    {
        $this->ensureSchema();

        $lieu = $this->model->find($id);

        if (!$lieu) {
            return $this->failNotFound('Lieu non trouvé');
        }

        return $this->respond($lieu);
    }

    /**
     * POST /lieux
     */
    public function create()
    {
        $this->ensureSchema();
        $this->backfillExistingLieux();
        $this->seedDefaultLocaux();
        $payload = $this->request->getJSON(true) ?? [];
        $allowNewCity = $this->toBool($payload['allow_new_city'] ?? false);
        $data = $this->inferLieuDetails($payload);
        $existingVilles = $this->getExistingVilles();
        $matchedVille = $this->findExistingVilleMatch((string) ($data['ville'] ?? ''), $existingVilles);

        if ($matchedVille !== null) {
            $data['ville'] = $matchedVille;
            $data = $this->inferLieuDetails($data);
        }

        $validationErrors = $this->validateLieuPayload($data, null, $allowNewCity);
        if ($validationErrors !== null) {
            return $this->failValidationErrors($validationErrors);
        }

        if (!$this->model->insert($data)) {
            return $this->failValidationErrors($this->model->errors());
        }

        return $this->respondCreated([
            'message' => 'Lieu créé',
            'id' => $this->model->getInsertID()
        ]);
    }

    /**
     * PUT /lieux/{id}
     */
    public function update($id = null)
    {
        $this->ensureSchema();
        $this->backfillExistingLieux();
        $this->seedDefaultLocaux();
        $current = $this->model->find($id);

        if (!$current) {
            return $this->failNotFound('Lieu non trouvé');
        }

        $data = $this->inferLieuDetails(array_merge(
            $current,
            $this->request->getJSON(true) ?? []
        ));

        $validationErrors = $this->validateLieuPayload($data, (int) $id);
        if ($validationErrors !== null) {
            return $this->failValidationErrors($validationErrors);
        }

        if (!$this->model->update($id, $data)) {
            return $this->failValidationErrors($this->model->errors());
        }

        return $this->respond([
            'message' => 'Lieu mis à jour'
        ]);
    }

    /**
     * DELETE /lieux/{id}
     */
    public function delete($id = null)
    {
        $this->ensureSchema();

        if (!$this->model->find($id)) {
            return $this->failNotFound('Lieu non trouvé');
        }

        $this->model->delete($id);

        return $this->respondDeleted([
            'message' => 'Lieu supprimé'
        ]);
    }
}
