<?php

namespace App\Filters;

use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Filters\FilterInterface;

class FormateurFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $session = session();

        if (!$session->get('user_id') || !$session->get('isLoggedIn')) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON([
                    'error'   => true,
                    'message' => 'Non authentifié'
                ]);
        }

        if ($session->get('role') !== 'formateur') {
            return service('response')
                ->setStatusCode(403)
                ->setJSON([
                    'error'   => true,
                    'message' => 'Accès réservé aux formateurs'
                ]);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}