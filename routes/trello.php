<?php

use WeDevs\PM\Core\Router\Router;
use WeDevs\PM\Core\Permissions\Authentic;
$wedevs_pm_router = Router::singleton();

$wedevs_pm_router->get( 'trello', 'WeDevs/PM/Imports/Controllers/Trello_Controller@index' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );
$wedevs_pm_router->post( 'trello', 'WeDevs/PM/Imports/Controllers/Trello_Controller@index' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );

$wedevs_pm_router->get( 'trello/test', 'WeDevs/PM/Imports/Controllers/Trello_Controller@test' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );
$wedevs_pm_router->post( 'trello/test', 'WeDevs/PM/Imports/Controllers/Trello_Controller@test' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );


$wedevs_pm_router->get( 'trello/get_user', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_user' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );
$wedevs_pm_router->post( 'trello/get_user', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_user' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );


$wedevs_pm_router->get( 'trello/get_boards', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_boards' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );
$wedevs_pm_router->post( 'trello/get_boards', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_boards' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );

$wedevs_pm_router->get( 'trello/get_lists', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_lists' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );
$wedevs_pm_router->post( 'trello/get_lists', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_lists' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );

$wedevs_pm_router->get( 'trello/get_cards', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_cards' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );
$wedevs_pm_router->post( 'trello/get_cards', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_cards' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );

$wedevs_pm_router->get( 'trello/get_subcards', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_subcards' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );
$wedevs_pm_router->post( 'trello/get_subcards', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_subcards' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );

$wedevs_pm_router->get( 'trello/get_users', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_users' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );
$wedevs_pm_router->post( 'trello/get_users', 'WeDevs/PM/Imports/Controllers/Trello_Controller@get_users' )
    ->permission( ['WeDevs\PM\Core\Permissions\Settings_Page_Access'] );