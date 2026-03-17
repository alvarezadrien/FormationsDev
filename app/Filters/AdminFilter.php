<?php

namespace App\Filters;

use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Filters\FilterInterface;

class AdminFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (!session()->get('user_id')) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON([
                    'message' => 'Non authentifié'
                ]);
        }

        if (session()->get('user_role') !== 'admin') {
            return service('response')
                ->setStatusCode(403)
                ->setJSON([
                    'message' => 'Accès refusé : admin uniquement'
                ]);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Rien
    }
}