<?php

namespace WeDevs\PM\Core\Permissions;

use WeDevs\PM\Core\Permissions\Abstract_Permission;

/**
 * Allow users who can manage projects globally OR hold the manager role
 * (role_id = 1) in any project. Mirrors the front-end ManagerRoute /
 * usePermissions().isManagerAnywhere, so project-scoped managers (with no
 * global capability) keep access to global manager pages such as Sprints.
 */
class Manager_Anywhere extends Abstract_Permission {

    public function check() {
        if ( function_exists( 'wedevs_pm_current_user_is_manager_anywhere' )
            && wedevs_pm_current_user_is_manager_anywhere() ) {
            return true;
        }

        return new \WP_Error( 'manager', __( "You have no permission.", "wedevs-project-manager" ) );
    }
}
