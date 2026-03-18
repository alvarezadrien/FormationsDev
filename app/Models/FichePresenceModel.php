<?php

namespace App\Models;

use CodeIgniter\Model;

class FichePresenceModel extends Model
{
    protected $table = 'fiches_presence';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $useAutoIncrement = true;

    protected $allowedFields = [
        'formation_id',
        'formateur_id',
        'titre_seance',
        'date_presence',
        'heure_debut',
        'heure_fin',
        'remarques',
        'created_at',
        'updated_at',
    ];

    protected $useTimestamps = false;
}