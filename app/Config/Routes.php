<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

$routes->get('/', 'Home::index');

// =========================
// Auth API
// =========================
$routes->post('login', 'Auth::login');
$routes->post('register', 'Auth::register');
$routes->post('logout', 'Auth::logout', ['filter' => 'auth']);
$routes->get('me', 'Auth::me', ['filter' => 'auth']);
$routes->put('me', 'Auth::updateMe', ['filter' => 'auth']);

// =========================
// Pages protégées
// =========================
$routes->get('dashboard', 'Dashboard::index', ['filter' => 'admin']);
$routes->get('profil', 'Profil::index', ['filter' => 'user']);

// =========================
// Formations publiques
// =========================
$routes->get('formations', 'Formation::index');
$routes->get('formations/(:num)', 'Formation::show/$1');

// =========================
// Inscriptions formations
// =========================
$routes->get('inscriptions-formations', 'InscriptionFormation::index', ['filter' => 'admin']);
$routes->get('inscriptions-formations/(:num)', 'InscriptionFormation::show/$1', ['filter' => 'admin']);
$routes->post('inscriptions-formations', 'InscriptionFormation::create');
$routes->delete('inscriptions-formations/(:num)', 'InscriptionFormation::delete/$1', ['filter' => 'admin']);

// =========================
// Formations admin
// =========================
$routes->post('formations', 'Formation::create', ['filter' => 'admin']);
$routes->put('formations/(:num)', 'Formation::update/$1', ['filter' => 'admin']);
$routes->delete('formations/(:num)', 'Formation::delete/$1', ['filter' => 'admin']);
$routes->get('formations/(:num)/edit', 'Formation::edit/$1', ['filter' => 'admin']);

// =========================
// Avis
// =========================
$routes->get('avis', 'AvisController::index');
$routes->post('avis', 'AvisController::create');
$routes->get('avis/formation/(:num)', 'AvisController::avisByFormation/$1');
$routes->get('avis/user/(:num)', 'AvisController::avisByUser/$1');
$routes->get('avis/moyenne/formation/(:num)', 'AvisController::moyenneByFormation/$1');
$routes->delete('avis/(:num)', 'AvisController::delete/$1');

// =========================
// OPTIONS pour préflight CORS
// =========================
$routes->options('(:any)', static function () {
    return service('response')->setStatusCode(200);
});