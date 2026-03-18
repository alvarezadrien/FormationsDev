<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class AdminFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $session = session();

        // Vérifie si l'utilisateur est connecté
        if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON([
                    'error'   => true,
                    'message' => 'Non authentifié'
                ]);
        }

        // Vérifie si l'utilisateur est admin
        if ($session->get('role') !== 'admin') {
            return service('response')
                ->setStatusCode(403)
                ->setJSON([
                    'error'   => true,
                    'message' => 'Accès refusé : admin uniquement'
                ]);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Rien à faire
    }
}