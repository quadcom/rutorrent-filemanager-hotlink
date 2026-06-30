/*
 * Hotlink plugin for nelu/rutorrent-filemanager  (v1.1)
 *
 * Adds a "Hotlink" (hard link) entry to the filemanager's right-click menu,
 * directly below "Copy".
 *
 * IMPORTANT — the filemanager's context-menu API:
 *   The filemanager fires its entry menu as a NATIVE ruTorrent stable-menu:
 *
 *       flm.triggerEvent('entryMenu', [menuArray, selectedTarget]);
 *
 *   which dispatches the jQuery event  EVENTS.entryMenu === "flm.onContextMenu"
 *   with handler signature  (event, menuArray, selectedTarget).
 *
 *   `menuArray` is a plain ARRAY (NOT a {items:{}} object).  Each element is:
 *       [label, callback]            normal item (callback = function OR eval-string)
 *       [CMENU_SEP]                  a separator
 *       [CMENU_CHILD, label, sub]    a submenu (sub is itself such an array)
 *
 *   The native "Copy" entry is:  [theUILang.fCopy, "flm.ui.getDialogs().showDialog('copy')"]
 *
 *   Helper to splice in an entry (mutates the array in place):
 *       flm.ui.addContextMenu(menu, entry, afterLabel, beforeLabel)
 *
 * Selection / paths:
 *   flm.ui.filenav.getSelection(true)  -> array of full *jail-relative* paths
 *   flm.ui.filenav.getSelectedTarget() -> single right-clicked jail-relative path
 *   flm.getCurrentPath()               -> current dir (jail-relative)
 *   Paths are relative to ruTorrent's $topDirectory; action.php resolves them.
 */
(function () {
    "use strict";

    var MENU_EVENT = 'flm.onContextMenu';

    // -----------------------------------------------------------------------
    // Menu injection
    // -----------------------------------------------------------------------
    $(document).on(MENU_EVENT, function (e, menu, selectedTarget) {
        // The current API passes an array. If we ever get something else,
        // do nothing rather than blow up the host menu.
        if (!Array.isArray(menu)) return;

        // Don't inject twice into the same menu.
        if (indexOfLabel(menu, hotlinkLabel()) >= 0) return;

        var entry = [hotlinkLabel(), function () { showDialog(); }];

        var copyLabel = uiLang('fCopy', null);
        if (copyLabel !== null &&
            flm.ui && typeof flm.ui.addContextMenu === 'function' &&
            indexOfLabel(menu, copyLabel) >= 0) {
            // Insert right after "Copy".
            flm.ui.addContextMenu(menu, entry, copyLabel);
        } else {
            // Fallback: no Copy entry in this menu — just append.
            menu.push(entry);
        }
    });

    function hotlinkLabel() {
        // Use a localized string if the host ever provides one, else literal.
        return uiLang('flm_hotlink', 'Hotlink');
    }

    function uiLang(key, fallback) {
        try {
            if (window.theUILang && typeof theUILang[key] !== 'undefined' && theUILang[key]) {
                return theUILang[key];
            }
        } catch (ex) {}
        return fallback;
    }

    function indexOfLabel(menu, label) {
        if (label === null) return -1;
        for (var i = 0; i < menu.length; i++) {
            if (menu[i] && menu[i][0] === label) return i;
        }
        return -1;
    }

    // -----------------------------------------------------------------------
    // Collect selected file paths (full, jail-relative)
    // -----------------------------------------------------------------------
    function collectPaths() {
        var paths = [];

        // Primary: every selected row, as full jail-relative paths.
        try {
            var sel = flm.ui.filenav.getSelection(true);
            if (sel && sel.length) {
                for (var i = 0; i < sel.length; i++) {
                    if (sel[i] && paths.indexOf(sel[i]) === -1) paths.push(sel[i]);
                }
            }
        } catch (ex) {}

        // Fallback: the single right-clicked target.
        if (!paths.length) {
            try {
                var t = flm.ui.filenav.getSelectedTarget();
                if (t) paths.push(t);
            } catch (ex) {}
        }

        return paths;
    }

    // -----------------------------------------------------------------------
    // Dialog
    // -----------------------------------------------------------------------
    function showDialog() {
        var paths = collectPaths();

        var cwd = '';
        try { cwd = flm.getCurrentPath() || ''; } catch (ex) {}

        var $input = $('<input>')
            .attr({ type: 'text', id: 'hl-dest-input' })
            .css({ width: '100%', 'box-sizing': 'border-box', 'font-family': 'monospace', 'font-size': '12px' })
            .val(cwd);

        var $dlg = $('<div>').css('padding', '4px').append(
            $('<label>').css({ display: 'block', 'margin-bottom': '6px' })
                        .text('Destination folder (relative to the file manager root):'),
            $input,
            $('<p>').css({ margin: '8px 0 0', 'font-size': '11px', color: '#888' })
                    .text(paths.length + ' item(s) selected')
        );

        $dlg.dialog({
            title:     'Create Hotlink(s)',
            width:     520,
            modal:     true,
            resizable: false,
            close:     function () { $(this).dialog('destroy').remove(); },
            buttons: [{
                text:  'Create Hotlink',
                click: function () {
                    var dest = $('#hl-dest-input').val();
                    dest = dest ? $.trim(dest) : '';
                    if (!dest) return;
                    $(this).dialog('close');
                    doHotlink(paths, dest);
                }
            }, {
                text:  'Cancel',
                click: function () { $(this).dialog('close'); }
            }]
        });
    }

    // -----------------------------------------------------------------------
    // POST to action.php
    // -----------------------------------------------------------------------
    function doHotlink(paths, dest) {
        if (!paths.length) {
            notify('Hotlink: no files selected', 'warning');
            return;
        }
        $.ajax({
            url:      'plugins/hotlink/action.php',
            type:     'POST',
            dataType: 'json',
            data: {
                paths: JSON.stringify(paths),
                dest:  dest
            },
            success: function (resp) {
                if (resp && resp.error) {
                    notify('Hotlink error: ' + resp.error, 'error');
                } else {
                    var n = (resp && resp.created != null) ? resp.created : paths.length;
                    notify(n + ' hotlink(s) created', 'success');
                }
                // Refresh the listing if we are looking at the destination.
                try { flm.refreshIfCurrentPath(dest); } catch (ex) {}
            },
            error: function (xhr) {
                notify('Hotlink failed: ' + (xhr.responseText || xhr.status), 'error');
            }
        });
    }

    // -----------------------------------------------------------------------
    // Notification helper (filemanager -> noty -> alert)
    // -----------------------------------------------------------------------
    function notify(msg, type) {
        try {
            if (flm.actions && typeof flm.actions.notify === 'function') {
                flm.actions.notify(msg, type || 'information', 8000);
                return;
            }
        } catch (ex) {}
        try {
            if (typeof noty === 'function') {
                noty({ text: msg, type: type || 'information' });
                return;
            }
        } catch (ex) {}
        try { alert(msg); } catch (ex) {}
    }

}());
