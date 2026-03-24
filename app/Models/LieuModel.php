<?php

namespace App\Models;

use CodeIgniter\Model;

class LieuModel extends Model
{
    protected $table            = 'lieu';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';

    protected $allowedFields = [
        'nom',
        'slug'
    ];

    protected $useTimestamps = false; // ⚠️ car pas de updated_at

    protected $validationRules = [
        'nom'  => 'required|min_length[2]|max_length[255]',
        'slug' => 'required|min_length[2]|max_length[255]|is_unique[lieu.slug,id,{id}]',
    ];

    protected $validationMessages = [
        'nom' => [
            'required' => 'Le nom est obligatoire'
        ],
        'slug' => [
            'required'  => 'Le slug est obligatoire',
            'is_unique' => 'Ce slug existe déjà'
        ],
    ];
}