<?php

namespace App\Models;

use CodeIgniter\Model;

class FormateurPresenceModel extends Model
{
    protected $table = 'formateur_presences';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $useAutoIncrement = true;

    protected $allowedFields = [
        'formation_id',
        'formateur_id',
        'statut',
        'commentaire',
        'statut_formation_avant_absence',
        'annulation_auto',
        'created_at',
        'updated_at',
    ];

    protected $useTimestamps = false;
}
