<?php

namespace WeDevs\PM\Core\Permissions;

use WeDevs\PM\Core\Permissions\Abstract_Permission;
use WP_REST_Request;

/**
 * Explicit opt-in for endpoints that must stay reachable without a WordPress
 * session (third-party webhooks). The router denies routes that declare no
 * permission, so "public" now has to be stated instead of implied by omission.
 * Any route using this MUST authenticate the caller itself.
 */
class Public_Access extends Abstract_Permission {
    public function check() {
        return true;
    }
}
