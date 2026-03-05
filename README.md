# rutorrent-filemanager-hotlink

### Basically the same plugin as Nelu's but with hotlink functionality added to the context menu. While autotools will hotlink DL's to a secondary folder, I found that I needed to copy a seed to my remote sync folder numerous times. Using the copy command in the FileManager plugin would do the job but by creating a duplicate, taking up space and time doing so. Adding hotlinking to the plugin solves this problem.

<img width="96" height="201" alt="image" src="https://github.com/user-attachments/assets/26b7e3e2-0950-42f2-9143-64b0a0de914d" />


[![Docker Multiarch Build](https://github.com/nelu/rutorrent-filemanager/actions/workflows/docker-image.yml/badge.svg)](https://hub.docker.com/r/unzel/rutorrent-filemanager/tags)

ruTorrent file management plugin with a javascript user interface running on rTorrent bittorrent client
### Features
- supported file operations: copy, move, delete, rename, archive, extract, checksum, view, file info
- file checksum functionality with multiple alogorithms supported: sfv, sha256
- text/nfo viewer, with configurable text extensions 
- archive file support, with configurable formats
- using 7zip for archive related and file checksum operations
- option to run all operations as chroot user
- jailed home dir support
- using twigjs for views
- integrated menu in Files tab
- hotkey shortcuts for file operations: copy (ctrl+c), move (ctrl+x), paste (ctrl+v), delete, rename (F2)

### Configuration
The plugin configuration with all it's options can be edited in ``conf.php`` inside the plugin directory.

See the **[Configuration section](https://github.com/nelu/rutorrent-filemanager/wiki#configuration)** in the plugin 
[Wiki](https://github.com/nelu/rutorrent-filemanager/wiki) page for information regarding the available settings and how they work.

### Support 
Take a look at the [Wiki](https://github.com/nelu/rutorrent-filemanager/wiki) for more information.

You can open a new issue regarding your problem or discuss it directly on telegram: [https://t.me/filemanagerplugin](https://t.me/filemanagerplugin). 

Also you can contribute with feature suggestions, fixes and documentation at any time.


See these additional filemanager plugins for extended functionality:

- [filemanager-media](https://github.com/nelu/rutorrent-filemanager-media): Media view and screenshots
- [filemanager-share](https://github.com/nelu/rutorrent-filemanager-share): File sharing functionality

### Thanks
Many thanks to all contributors, users and the projects behind this plugin:
- [ruTorrent](https://github.com/Novik/ruTorrent)
- [rtorrent](https://github.com/rakshasa/rtorrent)
- [7Zip](https://www.7-zip.org/)
- [twig.js](https://github.com/twigjs/twig.js)
