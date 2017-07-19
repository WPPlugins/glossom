/*
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
var TED_timer;
var isiOS = false;
var agent = navigator.userAgent.toLowerCase();
if ((agent.indexOf('iphone') >= 0) ||
    (agent.indexOf('ipad') >= 0) ||
    (agent.indexOf('ipod') >= 0)) {
      isiOS = true;
}

function normalize_positioning(item_preview, collection, cell_width, cell_height) {
    container = jQuery("#" + collection);
    col_item_id = '#' + collection + ' #'+jQuery(item_preview).attr('id').replace(/_item_preview_/, '_item_');
    col_item = jQuery(col_item_id);
    item_image = col_item.find('.collection_element');

    if ((col_item.position().top + item_image.height()/2) <= (container.outerHeight()/2 + (cell_height/2)))
        preview_top_position = -(cell_height/2);
    else
        preview_top_position = container.height() + (cell_height/2) - item_preview.outerHeight();

    preview_x_rel_position = item_image.width()/2 - item_preview.outerWidth()/2;
    preview_x_begin = col_item.position().left + preview_x_rel_position;
    preview_x_end = preview_x_begin + item_preview.outerWidth();

    if (!isiOS) {
        if (preview_x_begin < -(cell_width/2))
            preview_x_begin = -(cell_width/2);
    }
    else {
        if (preview_x_begin < 0)
            preview_x_begin = 0;
    }

    if (preview_x_end > container.width() + (cell_width/2))
        preview_x_begin = container.width() + (cell_width/2) - item_preview.outerWidth();

    preview.css("top", preview_top_position + "px");
    preview.css("left", preview_x_begin + "px");
}

function showTED(item, collection, cell_width, cell_height) {
  item_ref = jQuery("#" + collection + ' #' + item);
  preview = jQuery("#" + collection + ' #' + item.replace(/_item_/,"_item_preview_"));
  normalize_positioning(preview, collection, cell_width, cell_height);
  if (preview) {
      item_ref.siblings(".grayout").fadeIn(500);
      preview.fadeIn(500);
  }
}

function insertGlossomCollection() {
    if (tinyMCE.get("content") == undefined) {
        alert('This editor is not supported. If you are using the HTML editor, please switch to the Visual one');
        return false;
    }
    tinyMCE.get("content").focus();
    tinyMCE.activeEditor.windowManager.bookmark=tinyMCE.activeEditor.selection.getBookmark("simple");
    col_id = prompt('Glossom collection id:');
    if ((col_id != null) && (col_id != '')) {
        tinyMCE.activeEditor.focus();
        if(tinymce.isIE){
            tinyMCE.activeEditor.selection.moveToBookmark(tinymce.EditorManager.activeEditor.windowManager.bookmark);
        }
        tinyMCE.activeEditor.execCommand("mceInsertContent",false,'[glossom_collection ' + col_id + ']');
    }
    return false;
}

function build_collection(data, col_id) {
    //Calculating the scale ratio to fit the post area
    collection_area = jQuery("#collection_container_" + col_id).addClass('glossom_collection_container');
    collection_area.click(function() {
        window.open('http://www.glossom.com/collections/' + (data.collection.current_url ? data.collection.current_url : data.collection.id), '_blank');
    });
    computed_width = collection_area.innerWidth();
    computed_height = Math.floor(computed_width * 0.62);
    scale_ratio = computed_width / 649;
    
    collection_area.css('height', computed_height + 'px')
                   .css('width', computed_width + 'px')
                   .css('position', 'relative');

    if (data.error) {
        if (data.error == 'This collection is not available due to privacy settings') {
            error_img = jQuery('<img/>').attr('src', glossom_plugin_path + '/images/privacy.png');
        }
        else {
            error_img = jQuery('<img/>').attr('src', glossom_plugin_path + '/images/not_available.png');
        }
        error_img.css('width', computed_width + 'px')
                 .css('height', computed_height + 'px');
        error_div = jQuery('<div></div>').addClass('collection_error')
                                         .append(error_img)
                                         .css('width', computed_width + 'px')
                                         .css('height', computed_height + 'px');
        collection_area.append(error_div);
        return;
    }
    
    collection = data.collection;
    positions = collection.positions;
    
    max_top = 0;
    max_right = 0;
    height_max_top = 0;
    width_max_right = 0;
    jQuery.each(positions, function(index, pos) {
        position = build_position(pos);
        if (pos.item.type.indexOf('VideoItem') != -1) {
            video_icon = jQuery('<div class="video_icon"/>');
            video_icon.css('background', 'transparent url("' + glossom_plugin_path + '/images/watermarking_video.png") no-repeat');
            position.append(video_icon);
        }
        collection_area.append(position);
        
        //Keep track of the most right and lower elements of the collection
        //to caluclate the real display size of the collection
        if (pos.pos[1] > max_top) {
            max_top = pos.pos[1];
            height_max_top = pos.size[1]
        }
        if (pos.pos[0] > max_right) {
            max_right = pos.pos[0];
            width_max_right = pos.size[0]
        }
        if (pos.item.type != 'TextSnippet') {
            position_preview = build_position_preview(pos, collection, computed_width);
            collection_area.append(position_preview);
        }
    });
    
    grayout_width = max_right + width_max_right;
    grayout_height = max_top + height_max_top;

    //Check if the grayout fills the collection area
    if (grayout_width < 649) {
        grayout_width = 649;
    }
    if (grayout_height < 406) {
        grayout_height = 406;
    }

    grayout = jQuery('<div></div>').addClass('grayout')
                                   .css('width', grayout_width + 'px')
                                   .css('height', grayout_height + 'px');
    collection_area.append(grayout);
    
    scale_collection(scale_ratio, "#collection_container_" + col_id);
    
    jQuery('.grayout').click(function() { hideAllTEDs(); return false; });
    jQuery('body').click(hideAllTEDs);

    if (!isiOS) {
        jQuery(".collection_item:not(.TextSnippet)").mouseover(function() {
            if (!jQuery('.collection_item_preview').is(':visible') &&
                !jQuery('.mini-body').is(':visible')) {
                col_container = jQuery(this).parent();
                clearTimeout(TED_timer);
                TED_timer = setTimeout('showTED("'+jQuery(this).attr("id")+'","' + col_container.attr('id') + '", ' + (collection.cell_width * scale_ratio) + ', ' + (collection.cell_height * scale_ratio) + ')', 1400);
            }
        });

        jQuery(".collection_item_preview").mouseout(function() {
            jQuery(this).fadeOut();
            jQuery(".grayout").fadeOut();
        });

        jQuery(".collection_item").mouseout(function() {
            clearTimeout(TED_timer);
        });
    }
    jQuery('.collection_item_preview').click(function(){
        col_item_id = '#'+jQuery(this).attr('id').replace(/_item_preview_/, '_item_');
        location.href = jQuery(col_item_id).find('.facebox').attr('href');
    });
}

function hideAllTEDs() {
    jQuery('.collection_item_preview:visible').each(function() {
        var item = jQuery(this);
        item.fadeOut()
        item.siblings(".grayout").fadeOut();
    });
}

function build_position(pos) {
    col_item = jQuery('<div></div>').addClass('collection_item')
                                    .addClass(pos.item.type)
                                    .attr('id', 'collection_item_' + pos.id)
                                    .css('position', 'absolute')
                                    .css('left', pos.pos[0] + 'px')
                                    .css('top', pos.pos[1] + 'px');

    col_element = jQuery('<div></div>').addClass('collection_element')
                                       .css('width', pos.size[0] + 'px')
                                       .css('height', pos.size[1] + 'px');

    if (pos.item.type != 'TextSnippet') {
        item_link = jQuery('<a></a>').attr('href', pos.item.url).addClass("facebox");

        if (pos.crop_filename != "") {
            item_div = jQuery('<img/>').addClass('click_me')
                                       .attr('src', pos.crop_filename)
                                       .css('width', pos.size[0] + 'px')
                                       .css('height', pos.size[1] + 'px');
        } else {
            item_div = jQuery('<img/>').addClass('click_me')
                                       .attr('src', pos.item.src_big)
                                       .css('width', pos.portion.width + 'px')
                                       .css('height', pos.portion.height + 'px')
                                       .css('margin-left', pos.portion.left + 'px')
                                       .css('margin-top', pos.portion.top + 'px');
        }
        col_element.append(item_link);
        col_element.append(item_div);
        col_item.append(col_element);
    }
    else {
        item_div = jQuery('<div></div>').html(pos.item.body);
        col_element.append(item_div);
        col_item.append(col_element);
    }
    
    return col_item;
}

function build_position_preview(pos, collection, col_width) {
    col_item = jQuery('<div></div>').attr('id', 'collection_item_preview_' + pos.id)
                                    .addClass('collection_item_preview')
                                    .css('position', 'absolute')
                                    .css('top', '-' + (collection.cell_height/2) + 'px')
                                    .css('left', '-' + (collection.cell_width/2) + 'px')
                                    .css('display', 'none');
    item_div = jQuery('<img/>').attr('src', pos.item.src_high);

    col_item.append(item_div);
    
    return col_item;
}

function scale_properties(obj, scale_ratio, properties_to_scale) {
    if (!properties_to_scale) {
        properties_to_scale = default_properties_to_scale;
    }

    if(!obj.css) {
        return;
    }
    jQuery.each(properties_to_scale, function(index, value) {
        if (obj.css(value)) {
            prev_val = parseInt(obj.css(value));
            obj.css(value, Math.round(prev_val * scale_ratio) + 'px');
        }
    }); 
}

function scale_collection(scale_ratio, container) {
    jQuery(container + ' .collection_item').each(function() {
        scale_properties(jQuery(this), scale_ratio, ['left', 'top']);
    });
    jQuery(container + ' .collection_element').each(function() {
        scale_properties(jQuery(this), scale_ratio, ['width', 'height']);
    });
    jQuery(container + ' .click_me').each(function() {
        scale_properties(jQuery(this), scale_ratio, ['width', 'height', 'margin-left', 'margin-top']);
    });
    jQuery(container + ' .collection_item_preview').each(function() {
        scale_properties(jQuery(this), scale_ratio, ['left', 'top', 'width']);
    });
    jQuery(container + ' .collection_item_preview img').each(function() {
        scale_properties(jQuery(this), scale_ratio, ['max-width', 'max-height', 'min-width', 'min-height']);
    });
    scale_properties(jQuery(container + ' .grayout'), scale_ratio, ['width',
                                                                                    'height']);
}