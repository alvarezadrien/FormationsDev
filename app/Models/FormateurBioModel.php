<?php

namespace App\Models;

use CodeIgniter\Model;

class FormateurBioModel extends Model
{
    protected $table            = 'formateur_bios';
    protected $primaryKey       = 'id';
    protected $returnType       = 'array';
    protected $useAutoIncrement = true;

    protected $allowedFields = [
        'user_id',
        'poste',
        'specialite',
        'bio',
        'telephone',
        'travaille_samedi',
        'est_remplacant',
        'est_co_animation',
        'experience',
        'competences',
        'formations',
        'created_at',
        'updated_at',
    ];

    protected $useTimestamps = false;
}
