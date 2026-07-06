<?php
// Silence WP "doing it wrong" notices so they don't pollute the debug log or
// inject admin notices that overlay the SPA during e2e runs.
add_filter( 'doing_it_wrong_trigger_error', '__return_false' );
