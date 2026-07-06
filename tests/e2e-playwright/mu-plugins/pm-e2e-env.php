<?php
/**
 * Plugin Name: PM E2E Environment
 * Description: Test-only environment setup so the suite is deterministic on a fresh wp-env.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

// PM's REST routes resolve through rewrite rules; a fresh wp-env defaults to
// plain permalinks (?p=123) so /wp-json/pm/v2/* 404s. Force pretty permalinks
// AND write .htaccess — wp-env runs Apache/mod_rewrite, and flush_rewrite_rules()
// alone does not reliably create the file, so REST 404s without it.
add_action( 'init', function () {
    if ( get_option( 'permalink_structure' ) === '' ) {
        update_option( 'permalink_structure', '/%postname%/' );
        flush_rewrite_rules( true );
    }

    $htaccess = ABSPATH . '.htaccess';
    if ( ! file_exists( $htaccess ) || filesize( $htaccess ) === 0 ) {
        $rules = "# BEGIN WordPress\n"
            . "<IfModule mod_rewrite.c>\n"
            . "RewriteEngine On\n"
            . "RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]\n"
            . "RewriteBase /\n"
            . "RewriteRule ^index\\.php$ - [L]\n"
            . "RewriteCond %{REQUEST_FILENAME} !-f\n"
            . "RewriteCond %{REQUEST_FILENAME} !-d\n"
            . "RewriteRule . /index.php [L]\n"
            . "</IfModule>\n"
            . "# END WordPress\n";
        @file_put_contents( $htaccess, $rules );
        @chmod( $htaccess, 0644 );
    }
}, 1 );

// WP admin "pointer" tooltips (e.g. wp-reset's welcome pointer) overlay the page
// and intercept clicks on the SPA. Drop the pointer runtime entirely in tests.
add_action( 'admin_enqueue_scripts', function () {
    wp_deregister_script( 'wp-pointer' );
    wp_deregister_style( 'wp-pointer' );
}, 999 );
