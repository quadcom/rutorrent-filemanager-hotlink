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
    var DIALOG_ID = 'hotlinkDialog';
    var INPUT_ID  = 'hl-dest-input';

    // Tear down any directory picker that the filemanager attached to a previous
    // instance of this dialog (it appends a browse button + a floating list that
    // must be removed, or they leak / stack across reopens).
    function destroyPicker() {
        try {
            var dlgs = flm.ui.getDialogs();
            var map = dlgs.getDirBrowser(DIALOG_ID); // {inputId: FlmDirBrowser} | false
            if (map) {
                for (var k in map) {
                    if (Object.prototype.hasOwnProperty.call(map, k)) {
                        try { map[k].hide(false); } catch (e) {}
                        dlgs.deleteDirBrowser(DIALOG_ID, k);
                    }
                }
            }
        } catch (ex) {}
    }

    function closeDialog() {
        destroyPicker();
        try { theDialogManager.hide(DIALOG_ID); } catch (ex) {}
    }

    function showDialog() {
        var paths = collectPaths();

        var cwd = '';
        try { cwd = flm.getCurrentPath() || ''; } catch (ex) {}

        // ruTorrent ships only a trimmed jQuery UI build that does NOT include
        // the `dialog` widget, so $.fn.dialog is undefined here. Use ruTorrent's
        // native dialog manager instead -- the very same API the host
        // filemanager uses (see js/ui-dialogs.js: theDialogManager.make/show/hide).
        //
        // The destination input carries the `flm-diag-nav-path` class and a fixed
        // id so we can hand it to the filemanager's own directory picker
        // (FlmDirBrowser) via getDialogs().createDirBrowser() below -- the exact
        // same picker the Copy/Move dialogs use.
        var content =
            '<div class="cont" style="padding:8px;min-width:480px;">' +
                '<p style="margin:0 0 6px;">' +
                    'Destination folder for the hotlink(s):' +
                '</p>' +
                '<div class="row"><div class="input-group mb-3">' +
                    '<input class="form-control m-0 p-1 flm-diag-nav-path" ' +
                        'id="' + INPUT_ID + '" type="text" value="">' +
                '</div></div>' +
                '<p style="margin:8px 0 0;font-size:11px;color:#888;">' +
                    paths.length + ' item(s) selected' +
                '</p>' +
                '<div class="buttons-list" style="margin-top:12px;text-align:right;">' +
                    '<button type="button" id="hl-create-btn" class="Button">Create Hotlink</button> ' +
                    '<button type="button" id="hl-cancel-btn" class="Button Cancel">Cancel</button>' +
                '</div>' +
            '</div>';

        // Rebuild fresh each time -- selection and current path may have changed.
        destroyPicker();
        try {
            if (theDialogManager.items && theDialogManager.items[DIALOG_ID]) {
                theDialogManager.hide(DIALOG_ID);
            }
        } catch (ex) {}
        $('#' + DIALOG_ID).remove();
        try { if (theDialogManager.items) delete theDialogManager.items[DIALOG_ID]; } catch (ex) {}

        // make(id, title, contentHtml, isModal)
        theDialogManager.make(DIALOG_ID, 'Create Hotlink(s)', content, true);

        var $root = $('#' + DIALOG_ID);
        var $input = $root.find('#' + INPUT_ID).val(cwd);

        // Attach the filemanager's native directory picker (adds a browse button
        // next to the input + a navigable folder list). Requires the `_getdir`
        // plugin, which the filemanager itself depends on; if it is unavailable
        // the input still works for manual entry.
        try { flm.ui.getDialogs().createDirBrowser(DIALOG_ID); } catch (ex) {}

        function submit() {
            var dest = $input.val();
            dest = dest ? $.trim(dest) : '';
            if (!dest) return;
            closeDialog();
            doHotlink(paths, dest);
        }

        $root.find('#hl-create-btn').on('click', submit);
        $root.find('#hl-cancel-btn').on('click', closeDialog);
        $input.on('keydown', function (e) {
            if (e.keyCode === 13) { e.preventDefault(); submit(); }
        });

        theDialogManager.show(DIALOG_ID);
        setTimeout(function () { $input.select().focus(); });
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
