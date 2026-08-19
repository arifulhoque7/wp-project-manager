<?php

namespace WeDevs\PM\Core\Permissions;

use WeDevs\PM\Core\Permissions\Abstract_Permission;

/**
 * Guards the per-user routes (users/{id}/...).
 *
 * A caller may read their own resources; reading another user's activity feed,
 * tasks or email address requires a project-management capability. Without this
 * any logged-in user could pass another user's id in the URL and read it
 * (WPScan #43987).
 */
class Access_User extends Abstract_Permission {

    public function check() {
        $id = intval( $this->request->get_param( 'id' ) );

        if ( $id === get_current_user_id() ) {
            return true;
        }

        if ( wedevs_pm_user_can_access() ) {
            return true;
        }

        return new \WP_Error( 'pm_user', __( "You have no permission.", "wedevs-project-manager" ) );
    }
}
