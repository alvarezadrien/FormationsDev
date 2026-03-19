<?php

namespace App\Models;

use CodeIgniter\Model;

class InscriptionFormationModel extends Model
{
    protected $table = 'inscriptions_formations';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $useAutoIncrement = true;

    protected $allowedFields = [
        'nom',
        'prenom',
        'email',
        'telephone',
        'diplome',
        'formation_id',
        'message',
        'date_inscription'
    ];

    protected $useTimestamps = false;
}