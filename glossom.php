<?php
/*
Plugin Name: Glossom
Description: The Glossom Plugin allows Glossom users to create a lively Collection Cover within the post of a WP blog. The user can have a preview of each single item in the Collection Cover posted on WP and a complete view of each single Collection Cover Item in Glossom just clicking on the Collection Item thumbnail in WP
Version: 1.1.6
Author: Glossom
Author URI: http://www.glossom.com
License: GPL3

This file is part of Glossom

Glossom Plugin is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Glossom Plugin is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Glossom Plugin. If not, see <http://www.gnu.org/licenses/>
*/

add_filter('the_editor', 'addGlossomCollectionsButtonToEditor');
add_filter('the_content', 'lookForTag');
add_action('wp_print_scripts', 'addScripts');
add_action('wp_head', 'addCss');

function addScripts() {
    wp_enqueue_script('jquery');
    wp_enqueue_script('glossom', WP_PLUGIN_URL . '/glossom/js/glossom.js');
    ?>
    <script type="text/javascript">
        var glossom_plugin_path = "<?php echo WP_PLUGIN_URL . '/glossom'; ?>";
    </script>
    <?php
}

function addCss() {
    global $post;
    global $wpdb;
    $id = $post->ID;
    $content = $wpdb->get_var("SELECT post_content FROM $wpdb->posts WHERE ID = $id");
    echo '<link type="text/css" rel="stylesheet" href="' . WP_PLUGIN_URL . '/glossom/css/glossom.css" />' . "\n";
    if (is_single()) {
        $pos = strpos($content, '[glossom_collection');
        if ($pos) {
            $id = getIdFromTag($content, $pos);
            echo '<link rel="image_src" href="http://www.glossom.com/collections/embedded/'.$id.'" />';
        }
    }
    ?>
    <script type="text/javascript" charset="utf-8">
      jQuery(document).ready(function() {
        jQuery('.glossom_collection').bind("contextmenu", function(e) {
            e.preventDefault();
        });
      });
    </script>
    <?php
}

function addGlossomCollectionsButtonToEditor($editor) {
    ?>
    <script type="text/javascript">
    jQuery(document).ready(function() {
        glossom_icon = jQuery('<img/>').attr('src','<?php echo WP_PLUGIN_URL ?>/glossom/images/glossom_icon.png');
        glossom_link = jQuery('<a></a>').attr('href', '#')
                                                    .click(insertGlossomCollection);
        glossom_link.append(glossom_icon);
        jQuery('#media-buttons').append(glossom_link); 
    });
    </script>
    <?php
    return $editor;
}

# Looks for the Glossom Collections tag
function lookForTag($content) {
    $to_ret = '';
    while($pos = strpos($content, '[glossom_collection'))
    {
        $to_ret = $to_ret . substr($content, 0, $pos);
        $id = getIdFromTag($content, $pos);
        $to_ret = $to_ret . renderCollection($id);
        $content = substr($content, $pos + strlen('[glossom_collection '.$id.']'));
    }
    $to_ret = $to_ret . $content;
    return $to_ret;
}

# Takes the start position of the tag in the content, and gets the id of the collection
function getIdFromTag($content, $pos) {
    $id = substr($content, $pos+20, (strpos($content, ']', $pos)-($pos+20)) );
    return $id;
}

function renderCollection($id) {
    # Check if it is a mobile device or a rss feed
    $agent = strtolower($_SERVER['HTTP_USER_AGENT']);
    if (is_feed() || strpos($agent, 'ipad') !== false ) {
        return '<img src="http://www.glossom.com/collections/embedded/'.$id.'" />';
    } else {
        #Just to avoid to have two divs with the same id if a page contains many times the same collection
        $random_code = mt_rand();
        return '<div id="collection_container_'.$id.'_'.$random_code.'" class="glossom_collection"></div>
        <script>
            jQuery(document).ready(function() {
                jQuery.getJSON("http://www.glossom.com/restapi/collections/'.$id.'?format=json&jsoncallback=?",
                function(data) {
                    build_collection(data, "'.$id.'_'.$random_code.'");
                });
            });
        </script>';
    }
}
?>
