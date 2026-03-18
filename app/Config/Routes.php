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
$routes->post('formateurs', 'Auth::createFormateur', ['filter' => 'admin']);

// =========================
// Pages protégées
// =========================
$routes->get('dashboard', 'Dashboard::index', ['filter' => 'admin']);
$routes->get('profil', 'Profil::index', ['filter' => 'user']);
$routes->get('profil-formateur', 'ProfilFormateur::index', ['filter' => 'formateur']);

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
$routes->get('formations/(:num)/inscriptions', 'InscriptionFormation::byFormation/$1', ['filter' => 'auth']);
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
// Fiches de présence
// =========================
$routes->get('fiches-presence', 'FichePresenceController::index', ['filter' => 'admin']);
$routes->get('fiches-presence/(:num)', 'FichePresenceController::show/$1', ['filter' => 'auth']);
$routes->get('mes-fiches-presence', 'FichePresenceController::myFiches', ['filter' => 'formateur']);
$routes->post('fiches-presence', 'FichePresenceController::create', ['filter' => 'auth']);
$routes->put('fiches-presence/(:num)', 'FichePresenceController::update/$1', ['filter' => 'auth']);
$routes->put('fiches-presence/(:num)/participants/(:num)', 'FichePresenceController::updateParticipantPresence/$1/$2', ['filter' => 'auth']);
$routes->delete('fiches-presence/(:num)', 'FichePresenceController::delete/$1', ['filter' => 'auth']);

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