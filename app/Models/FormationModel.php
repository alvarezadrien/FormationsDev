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
        'remplacant_id',
        'lieu',
        'description',
        'nombre_participants',
        'statut',
        'date_debut',
        'date_fin',
        'jours',
        'type_journee',
        'heure_debut',
        'heure_fin',
        'created_at',
        'updated_at',
    ];

    protected $useTimestamps = false;

    public function getJoursArray($jours)
    {
        if (empty($jours)) {
            return [];
        }

        return array_values(array_filter(array_map('trim', explode(',', $jours))));
    }

    public function setJoursArray(array $joursArray)
    {
        $joursArray = array_values(array_unique(array_filter(array_map('trim', $joursArray))));
        return implode(',', $joursArray);
    }
}