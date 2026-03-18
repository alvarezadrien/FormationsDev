<?php

namespace App\Models;

use CodeIgniter\Model;

class FormationModel extends Model
{
    protected $table = 'formations';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $useAutoIncrement = true;

    protected $allowedFields = [
        'nom',
        'formateur_id',
        'lieu',
        'description',
        'nombre_participants',
        'statut',
        'date_debut',
        'date_fin',
        'created_at',
        'updated_at',
    ];

    protected $useTimestamps = false;
}