<?php
/**
 * Hotlink plugin - action.php
 *
 * Creates hard links for the selected (jail-relative) source paths into a
 * destination directory. Both the sources and the destination are resolved
 * against ruTorrent's $topDirectory jail, exactly like the filemanager does.
 *
 * Bootstrap: php/util.php
 *   - loads conf/config.php          -> defines global $topDirectory (jail root)
 *   - loads the per-user profile cfg -> may override $topDirectory (multi-user)
 *   - runs Requests::makeCSRFCheck() -> CSRF protection for this POST
 *   - registers the FileUtil autoloader
 * (The old checkToken() mechanism was removed from ruTorrent core; CSRF is now
 *  handled automatically inside util.php.)
 */

require_once(__DIR__ . '/../../php/util.php');

header('Content-Type: application/json; charset=utf-8');

function hl_fail($msg, $created = 0) {
    echo json_encode(array('error' => $msg, 'created' => $created));
    exit;
}

global $topDirectory;

$jail = @realpath($topDirectory);
if ($jail === false || !is_dir($jail)) {
    hl_fail('Server misconfigured: top directory not found.');
}
$jail = rtrim(str_replace('\\', '/', $jail), '/');

$rawPaths = isset($_POST['paths']) ? $_POST['paths'] : '[]';
$destRel  = isset($_POST['dest'])  ? (string) $_POST['dest'] : '';
$sources  = json_decode($rawPaths, true);

if (!is_array($sources) || empty($sources)) {
    hl_fail('No source paths provided.');
}
if (trim($destRel) === '') {
    hl_fail('No destination directory provided.');
}

/**
 * Resolve a jail-relative path to an absolute path guaranteed to stay inside
 * $jail. Normalises "." and ".." textually (no filesystem access), so it also
 * works for a destination that does not exist yet. Returns '' on a NUL byte or
 * any attempt to escape the jail.
 */
function hl_resolve($rel, $jail) {
    $rel = (string) $rel;
    if (strpos($rel, "\0") !== false) {
        return '';
    }
    $parts = array();
    foreach (explode('/', str_replace('\\', '/', $rel)) as $seg) {
        if ($seg === '' || $seg === '.') {
            continue;
        }
        if ($seg === '..') {
            if (empty($parts)) {
                return ''; // would climb above the jail
            }
            array_pop($parts);
            continue;
        }
        $parts[] = $seg;
    }
    $abs = $jail . (count($parts) ? '/' . implode('/', $parts) : '');
    // Final guard: must be the jail itself or strictly within it.
    if ($abs !== $jail && strpos($abs, $jail . '/') !== 0) {
        return '';
    }
    return $abs;
}

$dest = hl_resolve($destRel, $jail);
if ($dest === '') {
    hl_fail('Invalid destination path.');
}
if (!is_dir($dest)) {
    if (!@mkdir($dest, 0755, true)) {
        hl_fail('Cannot create destination directory: ' . $destRel);
    }
}

$errors  = array();
$created = 0;

foreach ($sources as $srcRel) {
    $src = hl_resolve($srcRel, $jail);
    if ($src === '' || !file_exists($src)) {
        $errors[] = 'Not found: ' . basename((string) $srcRel);
        continue;
    }
    $target = $dest . '/' . basename($src);
    if (is_dir($src)) {
        if (hl_link_dir($src, $target, $errors)) {
            $created++;
        }
    } else {
        if (hl_link_file($src, $target, $errors)) {
            $created++;
        }
    }
}

echo json_encode(
    empty($errors)
        ? array('ok' => true, 'created' => $created)
        : array('error' => implode("\n", $errors), 'created' => $created)
);
exit;

// ---------------------------------------------------------------------------

function hl_unique($base) {
    if (!file_exists($base)) {
        return $base;
    }
    $info = pathinfo($base);
    $ext  = !empty($info['extension']) ? '.' . $info['extension'] : '';
    $n = 1;
    do {
        $p = $info['dirname'] . '/' . $info['filename'] . '_' . ($n++) . $ext;
    } while (file_exists($p));
    return $p;
}

function hl_link_file($src, $dest, &$errors) {
    $dest = hl_unique($dest);
    if (@link($src, $dest)) {
        return true;
    }
    $err = error_get_last();
    $msg = ($err && isset($err['message'])) ? $err['message'] : 'hard link failed';
    // Hard links cannot span filesystems; surface that clearly.
    $errors[] = basename($src) . ': ' . $msg;
    return false;
}

function hl_link_dir($src, $dst, &$errors) {
    if (!is_dir($dst) && !@mkdir($dst, 0755, true)) {
        $errors[] = 'Cannot create: ' . basename($dst);
        return false;
    }
    $iter = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($src, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    $ok = true;
    foreach ($iter as $item) {
        $t = $dst . '/' . $iter->getSubPathName();
        if ($item->isDir()) {
            if (!is_dir($t)) {
                @mkdir($t, 0755, true);
            }
        } else {
            if (!hl_link_file($item->getPathname(), $t, $errors)) {
                $ok = false;
            }
        }
    }
    return $ok;
}
