<?php
/**
 * Uninstall cleanup.
 *
 * User data is intentionally preserved on uninstall — Google Workspace tokens,
 * Drive attachments, settings, and all core Project Manager data survive a
 * delete/reinstall. Only the scheduled cleanup cron is cleared, since a dangling
 * schedule for removed code is not user data.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Clear the scheduled cleanup cron only. No tables are dropped, no options deleted.
$timestamp = wp_next_scheduled( 'pm_google_workspace_cleanup' );
if ( $timestamp ) {
    wp_unschedule_event( $timestamp, 'pm_google_workspace_cleanup' );
}
wp_clear_scheduled_hook( 'pm_google_workspace_cleanup' );
