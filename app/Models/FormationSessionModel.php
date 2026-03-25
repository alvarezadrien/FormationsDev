<?php

namespace App\Models;

use CodeIgniter\Model;

class FormationSessionModel extends Model
{
    protected $table            = 'formation_sessions';
    protected $primaryKey       = 'id';
    protected $returnType       = 'array';
    protected $useAutoIncrement = true;

    protected $allowedFields = [
        'formation_id',
        'date',
        'heure_debut',
        'heure_fin',
        'created_at',
        'updated_at',
    ];

    protected $useTimestamps = false;
}
