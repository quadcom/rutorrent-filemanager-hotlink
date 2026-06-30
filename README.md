# rutorrent-filemanager-hotlink

A small [ruTorrent](https://github.com/Novik/ruTorrent) plugin that adds a
**Hotlink** (hard link) entry to the
[filemanager](https://github.com/nelu/rutorrent-filemanager) right-click menu,
directly below **Copy**.

While autotools can hardlink downloads to a secondary folder, copying a seed to
a remote sync folder with the filemanager's *Copy* creates a full duplicate —
wasting space and time. *Hotlink* creates hard links instead: the same data at a
new path, near-instant and with zero extra disk usage.

<img width="96" height="201" alt="hotlink menu entry" src="https://github.com/user-attachments/assets/26b7e3e2-0950-42f2-9143-64b0a0de914d" />

## Requirements

- ruTorrent
- The [filemanager](https://github.com/nelu/rutorrent-filemanager) plugin — this
  plugin extends its context menu and reuses its directory picker
  (declared via `plugin.dependencies: filemanager`)
- A filesystem that supports hard links. The source and destination must live on
  the **same** filesystem — hard links cannot span devices.

## Installation

Install into ruTorrent's `plugins` directory under the name `hotlink`:

```sh
cd /path/to/rutorrent/plugins
git clone https://github.com/quadcom/rutorrent-filemanager-hotlink.git hotlink
```

The deployed layout must be:

```
plugins/hotlink/
  action.php
  conf.php
  init.js
  plugin.info
```

Then reload ruTorrent (hard-refresh the browser so the new `init.js` is loaded).

## Usage

1. In the **Files** tab, select one or more files/folders.
2. Right-click and choose **Hotlink** (just below *Copy*).
3. Browse to — or type — the destination folder (relative to the file manager
   root) and click **Create Hotlink**.

A hard link to every selected item is created in the destination. Directories
are recreated and their files hard-linked recursively. Name collisions are
avoided by appending `_1`, `_2`, …

## Notes

- Hard links **cannot cross filesystems.** If the destination is on a different
  device/mount than the source, the OS returns an error, which is surfaced in
  the ruTorrent notification.
- Source and destination paths are resolved inside ruTorrent's configured top
  directory (the jail); any attempt to escape it is rejected.
- The destination dialog uses ruTorrent's native dialog manager and the
  filemanager's own directory browser (which requires the standard `_getdir`
  plugin). If `_getdir` is unavailable, the destination field still accepts a
  manually typed path.

## Credits

- Hotlink plugin by **Quadcom**.
- Built on and requires [nelu/rutorrent-filemanager](https://github.com/nelu/rutorrent-filemanager).
