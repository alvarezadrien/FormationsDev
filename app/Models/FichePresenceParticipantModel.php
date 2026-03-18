<?php

namespace App\Models;

use CodeIgniter\Model;

class FichePresenceParticipantModel extends Model
{
    protected $table = 'fiche_presence_participants';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $useAutoIncrement = true;

    protected $allowedFields = [
        'fiche_presence_id',
        'inscription_id',
        'present',
    ];

    protected $useTimestamps = false;
}