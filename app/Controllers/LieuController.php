<?php

namespace App\Controllers;

use App\Models\LieuModel;
use CodeIgniter\RESTful\ResourceController;

class LieuController extends ResourceController
{
    protected $modelName = LieuModel::class;
    protected $format    = 'json';

    /**
     * GET /lieux
     */
    public function index()
    {
        $lieux = $this->model
            ->orderBy('nom', 'ASC')
            ->findAll();

        return $this->respond($lieux);
    }

    /**
     * GET /lieux/{id}
     */
    public function show($id = null)
    {
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
        $data = $this->request->getJSON(true);

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
        $data = $this->request->getJSON(true);

        if (!$this->model->find($id)) {
            return $this->failNotFound('Lieu non trouvé');
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
        if (!$this->model->find($id)) {
            return $this->failNotFound('Lieu non trouvé');
        }

        $this->model->delete($id);

        return $this->respondDeleted([
            'message' => 'Lieu supprimé'
        ]);
    }
}