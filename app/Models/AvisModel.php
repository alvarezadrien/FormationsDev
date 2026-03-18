<?php

namespace App\Models;

use CodeIgniter\Model;

class AvisModel extends Model
{
    protected $table = 'avis';
    protected $primaryKey = 'id';
    protected $returnType = 'array';

    protected $allowedFields = [
        'user_id',
        'formation_id',
        'note',
        'commentaire',
    ];

    protected $useTimestamps = false;
}