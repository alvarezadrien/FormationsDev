<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $returnType       = 'array';
    protected $useAutoIncrement = true;

    protected $allowedFields = [
        'nom',
        'prenom',
        'email',
        'password',
        'role',
        'created_at',
        'updated_at',
    ];

    protected $useTimestamps = false;
}