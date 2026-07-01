<?php
// ── Secure session configuration ─────────────────────────────────────────────
ini_set('session.cookie_httponly', '1');   // prevent JS access to session cookie
ini_set('session.cookie_secure', '1');     // HTTPS only
ini_set('session.cookie_samesite', 'Strict'); // CSRF protection
ini_set('session.use_strict_mode', '1');   // reject unrecognised session IDs
ini_set('session.cookie_lifetime', '0');   // expire on browser close
ini_set('session.gc_maxlifetime', '7200'); // 2 hour server-side expiry
session_start();
require_once __DIR__ . '/default-data.php';

// ── Database (MySQL) ─────────────────────────────────────────────────────────
// Set DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASS env vars,
// or update the defaults below.
define('SPAM_IP_HASH_KEY', getenv('SPAM_IP_HASH_KEY') ?: 'a3f8c2e1d94b7056af3219084ecbd5f76a018392cf54de2b71093840ebf62c51');
define('ADMIN_BASE_URL', '/admin/');

function modDbConfig(): array
{
    static $cfg;
    if ($cfg) return $cfg;
    $url = getenv('DATABASE_URL') ?: null;
    if ($url) {
        $p   = parse_url($url);
        $cfg = [
            'dsn'  => sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                              $p['host'], $p['port'] ?? 3306, ltrim($p['path'] ?? '/', '/')),
            'user' => rawurldecode($p['user'] ?? ''),
            'pass' => rawurldecode($p['pass'] ?? ''),
        ];
    } else {
        $cfg = [
            'dsn'  => sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                              getenv('DB_HOST') ?: '127.0.0.1',
                              getenv('DB_PORT') ?: '3306',
                              getenv('DB_NAME') ?: 'mod3'),
            'user' => getenv('DB_USER') ?: 'root',
            'pass' => getenv('DB_PASS') ?: '',
        ];
    }
    return $cfg;
}

function pdo()
{
    static $pdo;
    if ($pdo) return $pdo;
    ['dsn' => $dsn, 'user' => $user, 'pass' => $pass] = modDbConfig();
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

function dbQuery(string $sql, array $params = [])
{
    $stmt = pdo()->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

function dbFetch(string $sql, array $params = [])
{
    return dbQuery($sql, $params)->fetch();
}

function dbFetchAll(string $sql, array $params = [])
{
    return dbQuery($sql, $params)->fetchAll();
}

function isAdminLoggedIn(): bool
{
    return !empty($_SESSION['admin_email']);
}

function requireAdminLogin(): void
{
    if (!isAdminLoggedIn()) {
        header('Location: login.php');
        exit;
    }
}

function csrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(24));
    }
    return $_SESSION['csrf_token'];
}

function validateCsrfToken(string $token): bool
{
    return !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function setFlash(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function flashMessage(): ?array
{
    if (empty($_SESSION['flash'])) {
        return null;
    }
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $flash;
}

function adminUrl(string $path = ''): string
{
    return ADMIN_BASE_URL . ltrim($path, '/');
}

function normalizeSlug(string $value): string
{
    $slug = strtolower(trim($value));
    $slug = preg_replace('/[^a-z0-9-]+/', '-', $slug);
    $slug = trim($slug, '-');
    return $slug ?: 'item-' . bin2hex(random_bytes(4));
}

function safeDbFetchAll(string $sql, array $params = []): array
{
    try {
        return dbFetchAll($sql, $params);
    } catch (Throwable $exception) {
        return [];
    }
}

/**
 * Ensure new tables added after initial setup exist.
 * Safe to call on every admin request — uses IF NOT EXISTS.
 */
function runMigrations(): void
{
    static $ran = false;
    if ($ran) return;
    $ran = true;

    $migrations = [
        // Core submissions table
        "CREATE TABLE IF NOT EXISTS mod_submissions (
            id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
            form_type    VARCHAR(32)  NOT NULL,
            name         VARCHAR(255) NOT NULL,
            email        VARCHAR(191) NOT NULL,
            subject      VARCHAR(255) NOT NULL DEFAULT '',
            meta         JSON,
            submitted_at TIMESTAMP    NOT NULL DEFAULT NOW()
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE INDEX idx_sub_form_type    ON mod_submissions (form_type)",
        "CREATE INDEX idx_sub_submitted_at ON mod_submissions (submitted_at)",

        // Rate-limit counters (fixed-window per hashed IP + endpoint)
        "CREATE TABLE IF NOT EXISTS mod_rate_limits (
            id           INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
            ip_hash      VARCHAR(64) NOT NULL,
            endpoint     VARCHAR(32) NOT NULL,
            hits         INT         NOT NULL DEFAULT 1,
            window_start TIMESTAMP   NOT NULL DEFAULT NOW(),
            UNIQUE KEY uq_rate (ip_hash, endpoint)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE INDEX idx_rate_window ON mod_rate_limits (window_start)",

        // Spam / rejected-submission log
        "CREATE TABLE IF NOT EXISTS mod_spam_log (
            id         INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
            ip_hash    VARCHAR(64) NOT NULL,
            endpoint   VARCHAR(32) NOT NULL,
            reason     VARCHAR(64) NOT NULL,
            created_at TIMESTAMP   NOT NULL DEFAULT NOW()
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE INDEX idx_spam_ip ON mod_spam_log (ip_hash)",
        "CREATE INDEX idx_spam_at ON mod_spam_log (created_at)",

        // Gallery images table
        "CREATE TABLE IF NOT EXISTS mod_gallery_images (\n            id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,\n            image_url   VARCHAR(255) NOT NULL,\n            alt_text    VARCHAR(255) NOT NULL DEFAULT \'\',\n            caption     TEXT         NOT NULL DEFAULT \'\',\n            event_date  DATE,\n            category    VARCHAR(127) NOT NULL DEFAULT \'General\',\n            sort_order  INT          NOT NULL DEFAULT 0,\n            active      TINYINT      NOT NULL DEFAULT 1,\n            created_at  TIMESTAMP    NOT NULL DEFAULT NOW()\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE INDEX idx_gallery_sort ON mod_gallery_images (sort_order ASC, id ASC)",

        // Add body column to press items if not exists
        "ALTER TABLE mod_press_items ADD COLUMN IF NOT EXISTS body LONGTEXT NOT NULL DEFAULT ''",

        // Active joint operations table
        "CREATE TABLE IF NOT EXISTS mod_operations (\n            id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,\n            region      VARCHAR(127) NOT NULL DEFAULT \'\',\n            name        VARCHAR(255) NOT NULL,\n            description TEXT         NOT NULL DEFAULT \'\',\n            sort_order  INT          NOT NULL DEFAULT 0,\n            active      TINYINT      NOT NULL DEFAULT 1,\n            created_at  TIMESTAMP    NOT NULL DEFAULT NOW()\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE INDEX idx_ops_sort ON mod_operations (sort_order ASC, id ASC)",

        // Procurement tenders & contract awards
        "CREATE TABLE IF NOT EXISTS mod_tenders (\n            id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,\n            type         ENUM(\'tender\',\'award\') NOT NULL DEFAULT \'tender\',\n            title        VARCHAR(255) NOT NULL,\n            ref_number   VARCHAR(127) NOT NULL DEFAULT \'\',\n            category     VARCHAR(127) NOT NULL DEFAULT \'\',\n            method       VARCHAR(127) NOT NULL DEFAULT \'\',\n            closes_at    DATE,\n            doc_url      VARCHAR(255) NOT NULL DEFAULT \'\',\n            description  TEXT         NOT NULL DEFAULT \'\',\n            sort_order   INT          NOT NULL DEFAULT 0,\n            active       TINYINT      NOT NULL DEFAULT 1,\n            created_at   TIMESTAMP    NOT NULL DEFAULT NOW()\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE INDEX idx_tenders_sort ON mod_tenders (type ASC, sort_order ASC, id ASC)",

        // Directors table — overrides departments-data.js values when set
        "CREATE TABLE IF NOT EXISTS mod_directors (\n            id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,\n            dept_slug    VARCHAR(127) NOT NULL UNIQUE,\n            director     VARCHAR(255) NOT NULL,\n            role         VARCHAR(255) NOT NULL DEFAULT \'\',\n            photo_url    VARCHAR(255) NOT NULL DEFAULT \'\',\n            updated_at   TIMESTAMP    NOT NULL DEFAULT NOW() ON UPDATE NOW()\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        // Annual reports
        "CREATE TABLE IF NOT EXISTS mod_annual_reports (\n            id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,\n            year        SMALLINT     NOT NULL,\n            title       VARCHAR(255) NOT NULL,\n            description TEXT         NOT NULL DEFAULT \'\',\n            doc_url     VARCHAR(255) NOT NULL DEFAULT \'\',\n            status      VARCHAR(32)  NOT NULL DEFAULT \'published\',\n            sort_order  INT          NOT NULL DEFAULT 0,\n            active      TINYINT      NOT NULL DEFAULT 1,\n            created_at  TIMESTAMP    NOT NULL DEFAULT NOW()\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE UNIQUE INDEX idx_reports_year ON mod_annual_reports (year)",
    ];

    foreach ($migrations as $sql) {
        try {
            pdo()->exec($sql);
        } catch (Throwable $e) {
            error_log('[MOD migration] ' . $e->getMessage());
        }
    }
}

function defaultContent(): array
{
    static $content;
    if ($content === null) {
        $content = require __DIR__ . '/default-data.php';
    }
    return $content;
}

function defaultSettings(): array
{
    return defaultContent()['settings'] ?? [];
}

function defaultHeroSlides(): array
{
    $slides = defaultContent()['slides'] ?? [];
    $result = [];
    foreach ($slides as $index => $slide) {
        $result[] = [
            'id' => 0,
            'image_url' => $slide['img'] ?? '',
            'alt_text' => $slide['alt'] ?? '',
            'role_text' => $slide['role'] ?? '',
            'caption_text' => $slide['name'] ?? '',
            'sort_order' => $index,
            'active' => 1,
        ];
    }
    return $result;
}

function defaultLeadership(): array
{
    $leaders = defaultContent()['leadership'] ?? [];
    $result = [];
    foreach ($leaders as $positionKey => $leader) {
        $result[] = [
            'id' => 0,
            'position_key' => $positionKey,
            'title' => $leader['title'] ?? '',
            'name' => $leader['name'] ?? '',
            'bio' => $leader['bio'] ?? '',
            'photo_url' => $leader['photo_url'] ?? '',
            'profile_link' => $leader['profile_link'] ?? '',
            'sort_order' => 0,
            'active' => 1,
        ];
    }
    return $result;
}

function defaultPressItems(): array
{
    $items = defaultContent()['press'] ?? [];
    $result = [];
    foreach ($items as $index => $item) {
        $result[] = [
            'id' => 0,
            'title' => $item['title'] ?? '',
            'excerpt' => $item['excerpt'] ?? '',
            'category' => $item['category'] ?? '',
            'published_at' => $item['date'] ?? '',
            'image_url' => $item['img'] ?? '',
            'link_url' => $item['url'] ?? '',
            'slug' => $item['slug'] ?? normalizeSlug($item['title'] ?? 'press-item-' . $index),
            'sort_order' => $index,
            'active' => 1,
        ];
    }
    return $result;
}

function getSetting(string $name, string $default = ''): string
{
    $defaultSettings = defaultSettings();
    try {
        $row = dbFetch('SELECT value FROM mod_settings WHERE name = ? LIMIT 1', [$name]);
    } catch (Throwable $exception) {
        $row = null;
    }
    if (!empty($row['value'])) {
        return $row['value'];
    }
    return $defaultSettings[$name] ?? $default;
}

function saveSetting(string $name, string $value): void
{
    if (dbFetch('SELECT 1 FROM mod_settings WHERE name = ? LIMIT 1', [$name])) {
        dbQuery('UPDATE mod_settings SET value = :value WHERE name = :name', ['value' => $value, 'name' => $name]);
        return;
    }
    dbQuery('INSERT INTO mod_settings (name, value) VALUES (:name, :value)', ['name' => $name, 'value' => $value]);
}

// Social media handles — stored as ordinary mod_settings rows (social_facebook,
// social_twitter, social_instagram, social_youtube, social_linkedin). Add a new
// key here (and a matching field in the admin Settings > Social media card) to
// support another platform.
function socialPlatforms(): array
{
    return ['facebook', 'twitter', 'instagram', 'youtube', 'linkedin'];
}

function getSocialLinks(): array
{
    $links = [];
    foreach (socialPlatforms() as $platform) {
        $links[$platform] = getSetting('social_' . $platform, '');
    }
    return $links;
}

function saveSocialLinks(array $values): void
{
    foreach (socialPlatforms() as $platform) {
        $url = trim($values[$platform] ?? '');
        if ($url !== '' && !preg_match('#^https?://#i', $url)) {
            $url = 'https://' . ltrim($url, '/');
        }
        saveSetting('social_' . $platform, $url);
    }
}

function getHeroSlides(bool $activeOnly = true): array
{
    $sql = 'SELECT * FROM mod_hero_slides' . ($activeOnly ? ' WHERE active = 1' : '') . ' ORDER BY sort_order ASC, id ASC';
    $rows = safeDbFetchAll($sql);
    if (!empty($rows)) {
        return $rows;
    }
    return defaultHeroSlides();
}

function getLeadership(bool $activeOnly = true): array
{
    $sql = 'SELECT * FROM mod_leaders' . ($activeOnly ? ' WHERE active = 1' : '') . ' ORDER BY sort_order ASC, id ASC';
    $rows = safeDbFetchAll($sql);
    if (!empty($rows)) {
        return $rows;
    }
    return defaultLeadership();
}

function getLeadershipByKey(string $key): array
{
    return dbFetch('SELECT * FROM mod_leaders WHERE position_key = ? LIMIT 1', [$key]) ?: [];
}

function getPressItems(bool $activeOnly = true, int $limit = 0): array
{
    // activeOnly = true is what the *public* site uses (homepage, press listing,
    // press-release detail page — all via /api/content -> MOD_STORE.press()).
    // A press item with active=1 but a future published_at is "scheduled": it
    // stays hidden from the public until that date, but remains fully visible
    // and editable in the admin (activeOnly=false).
    $sql = 'SELECT * FROM mod_press_items';
    if ($activeOnly) {
        $sql .= ' WHERE active = 1 AND published_at <= CURDATE()';
    }
    $sql .= ' ORDER BY sort_order ASC, id ASC';
    if ($limit > 0) {
        $sql .= ' LIMIT ' . (int)$limit;
    }
    $rows = safeDbFetchAll($sql);
    if (!empty($rows)) {
        return $rows;
    }
    return defaultPressItems();
}

// Status shown in the admin press list: 'disabled' (active=0), 'scheduled'
// (active=1, published_at is in the future — hidden from the public site
// until then), or 'published' (active=1, published_at is today or earlier).
function pressItemStatus(array $item): string
{
    if (empty($item['active'])) {
        return 'disabled';
    }
    $publishedAt = $item['published_at'] ?? '';
    if ($publishedAt) {
        $ts = strtotime($publishedAt);
        if ($ts !== false && $ts > strtotime('today')) {
            return 'scheduled';
        }
    }
    return 'published';
}

function getSubscribers(): array
{
    return safeDbFetchAll('SELECT email, subscribed_at FROM mod_subscribers ORDER BY subscribed_at DESC');
}

function getSubmissions(string $type = ''): array
{
    $sql    = 'SELECT * FROM mod_submissions';
    $params = [];
    if ($type) {
        $sql .= ' WHERE form_type = :type';
        $params['type'] = $type;
    }
    $sql .= ' ORDER BY submitted_at DESC';
    $rows = safeDbFetchAll($sql, $params);
    foreach ($rows as &$row) {
        $decoded = !empty($row['meta']) ? json_decode($row['meta'], true) : [];
        $row['meta'] = is_array($decoded) ? $decoded : [];
    }
    unset($row);
    return $rows;
}

function countSubmissions(string $type = ''): int
{
    $sql    = 'SELECT COUNT(*) AS n FROM mod_submissions';
    $params = [];
    if ($type) {
        $sql .= ' WHERE form_type = :type';
        $params['type'] = $type;
    }
    try {
        $row = dbFetch($sql, $params);
        return (int)($row['n'] ?? 0);
    } catch (Throwable $e) {
        return 0;
    }
}

function createAdminUser(string $email, string $password): void
{
    dbQuery('INSERT INTO mod_admin_users (email, password_hash, created_at) VALUES (:email, :hash, NOW())', [
        'email' => $email,
        'hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);
}

function checkAdminCredentials(string $email, string $password): bool
{
    // Rate limit: max 10 login attempts per IP per 15 minutes
    $ipHash = hash_hmac('sha256', ($_SERVER['REMOTE_ADDR'] ?? ''), defined('SPAM_IP_HASH_KEY') ? SPAM_IP_HASH_KEY : 'login-fallback');
    $cutoff = date('Y-m-d H:i:s', time() - 900);
    try {
        dbQuery(
            'INSERT INTO mod_rate_limits (ip_hash, endpoint, hits, window_start) VALUES (:ip, :ep, 1, NOW())
             ON DUPLICATE KEY UPDATE
               hits         = CASE WHEN window_start < :cutoff1 THEN 1 ELSE hits + 1 END,
               window_start = CASE WHEN window_start < :cutoff2 THEN NOW() ELSE window_start END',
            ['ip' => $ipHash, 'ep' => 'login', 'cutoff1' => $cutoff, 'cutoff2' => $cutoff]
        );
        $row = dbFetch('SELECT hits FROM mod_rate_limits WHERE ip_hash = :ip AND endpoint = :ep', ['ip' => $ipHash, 'ep' => 'login']);
        if ($row && (int)$row['hits'] > 10) {
            error_log('[MOD login] rate-limited IP ' . substr($ipHash, 0, 8));
            return false;
        }
    } catch (Throwable $e) { /* fail open on DB error */ }

    $row = dbFetch('SELECT password_hash FROM mod_admin_users WHERE email = ? LIMIT 1', [$email]);
    $valid = $row && password_verify($password, $row['password_hash']);

    // Constant-time comparison to prevent timing attacks
    if (!$row) {
        password_verify($password, '$2y$12$invalidhashpaddingtopreventimingtattacks00000000000000000');
    }
    return $valid;
}

function saveContentBlob(array $blob): void
{
    pdo()->beginTransaction();
    dbQuery('DELETE FROM mod_hero_slides');
    dbQuery('DELETE FROM mod_leaders');
    dbQuery('DELETE FROM mod_press_items');

    if (!empty($blob['slides']) && is_array($blob['slides'])) {
        foreach ($blob['slides'] as $index => $slide) {
            dbQuery('INSERT INTO mod_hero_slides (image_url, alt_text, role_text, caption_text, sort_order, active) VALUES (:image, :alt, :role, :caption, :order, :active)', [
                'image' => $slide['img'] ?? '',
                'alt' => $slide['alt'] ?? '',
                'role' => $slide['role'] ?? '',
                'caption' => $slide['name'] ?? '',
                'order' => $index,
                'active' => 1,
            ]);
        }
    }

    if (!empty($blob['leadership']) && is_array($blob['leadership'])) {
        foreach ($blob['leadership'] as $positionKey => $leader) {
            if (empty($leader['name'])) {
                continue;
            }
            dbQuery('INSERT INTO mod_leaders (position_key, title, name, bio, photo_url, profile_link, sort_order, active) VALUES (:position_key, :title, :name, :bio, :photo, :link, :order, :active)', [
                'position_key' => $positionKey,
                'title' => $leader['title'] ?? '',
                'name' => $leader['name'] ?? '',
                'bio' => $leader['bio'] ?? '',
                'photo' => $leader['photo'] ?? '',
                'link' => $leader['profile_link'] ?? '',
                'order' => 0,
                'active' => 1,
            ]);
        }
    }

    if (!empty($blob['press']) && is_array($blob['press'])) {
        foreach ($blob['press'] as $index => $item) {
            $publishedAt = null;
            if (!empty($item['date'])) {
                $publishedAt = date('Y-m-d', strtotime($item['date']));
            }
            if (!$publishedAt) {
                $publishedAt = date('Y-m-d');
            }
            dbQuery('INSERT INTO mod_press_items (title, excerpt, category, published_at, image_url, link_url, slug, sort_order, active) VALUES (:title, :excerpt, :category, :published_at, :image_url, :link_url, :slug, :order, :active)', [
                'title' => $item['title'] ?? '',
                'excerpt' => $item['excerpt'] ?? '',
                'category' => $item['category'] ?? '',
                'published_at' => $publishedAt,
                'image_url' => $item['img'] ?? '',
                'link_url' => $item['url'] ?? '',
                'slug' => normalizeSlug($item['slug'] ?? $item['title'] ?? 'press-item-' . $index),
                'order' => $index,
                'active' => 1,
            ]);
        }
    }

    if (!empty($blob['settings']) && is_array($blob['settings'])) {
        foreach ($blob['settings'] as $key => $value) {
            saveSetting($key, (string)$value);
        }
    }

    pdo()->commit();
}

function getGalleryImages(bool $activeOnly = true): array
{
    $sql = 'SELECT * FROM mod_gallery_images' . ($activeOnly ? ' WHERE active = 1' : '') . ' ORDER BY sort_order ASC, id ASC';
    return safeDbFetchAll($sql);
}

function defaultGalleryImages(): array
{
    return [
        [
            'id' => 0,
            'image_url' => 'https://defence.gov.ng/wp-content/uploads/slider/cache/5c91a2fb5a3c3d7d91aa26fb98ea005d/WhatsApp-Image-2026-05-08-at-09.51.56.jpg',
            'alt_text' => 'Honourable Minister at the AMCE, Abuja',
            'caption' => 'Honourable Minister at the AMCE, Abuja — 8 May 2026',
            'event_date' => '2026-05-08',
            'category' => 'Ministerial',
            'sort_order' => 0,
            'active' => 1,
        ],
        [
            'id' => 0,
            'image_url' => 'https://defence.gov.ng/wp-content/uploads/slider/cache/7ed124706b9db62fa4aae0e8bdc44f70/WhatsApp-Image-2026-05-06-at-09.44.49.jpg',
            'alt_text' => 'Regional security meeting',
            'caption' => 'Regional security meeting — 6 May 2026',
            'event_date' => '2026-05-06',
            'category' => 'Security',
            'sort_order' => 1,
            'active' => 1,
        ],
        [
            'id' => 0,
            'image_url' => 'https://defence.gov.ng/wp-content/uploads/slider/cache/f2ac3e9cb69b47524dec83e6268b40b1/WhatsApp-Image-2026-05-05-at-16.06.33.jpg',
            'alt_text' => 'Veritas University delegation visit to Ship House',
            'caption' => 'Veritas University delegation, Ship House — 5 May 2026',
            'event_date' => '2026-05-05',
            'category' => 'Engagements',
            'sort_order' => 2,
            'active' => 1,
        ],
        [
            'id' => 0,
            'image_url' => 'https://defence.gov.ng/wp-content/uploads/slider/cache/b64dada37ea1a198b4a6e0382f45f0c0/WhatsApp-Image-2026-05-05-at-04.41.488-1.jpg',
            'alt_text' => 'Engagement on national security',
            'caption' => 'Engagement on national security — 5 May 2026',
            'event_date' => '2026-05-05',
            'category' => 'Security',
            'sort_order' => 3,
            'active' => 1,
        ],
        [
            'id' => 0,
            'image_url' => 'https://defence.gov.ng/wp-content/uploads/slider/cache/7d5dab6eb3370ef45d22dfbeceb170b0/WhatsApp-Image-2026-05-05-at-04.41.4644.jpg',
            'alt_text' => 'Address to Nigerian students',
            'caption' => 'Address to Nigerian students — 5 May 2026',
            'event_date' => '2026-05-05',
            'category' => 'Engagements',
            'sort_order' => 4,
            'active' => 1,
        ],
        [
            'id' => 0,
            'image_url' => 'https://defence.gov.ng/wp-content/uploads/slider/cache/de24e192a317d951778e07962e82686d/WhatsApp-Image-2026-04-29-at-21.34.414.jpg',
            'alt_text' => 'Inauguration of strategic committees',
            'caption' => 'Inauguration of strategic committees — 29 April 2026',
            'event_date' => '2026-04-29',
            'category' => 'Ceremonies',
            'sort_order' => 5,
            'active' => 1,
        ],
        [
            'id' => 0,
            'image_url' => 'https://defence.gov.ng/wp-content/uploads/slider/cache/39e7bd9f42f86e2e15e02a7a8e72b6bb/WhatsApp-Image-2026-04-29-at-21.34.426.jpg',
            'alt_text' => 'Strategic committee session at Ship House',
            'caption' => 'Strategic committee session, Ship House',
            'event_date' => '2026-04-29',
            'category' => 'Ceremonies',
            'sort_order' => 6,
            'active' => 1,
        ],
        [
            'id' => 0,
            'image_url' => 'assets/images/headshots/general-christopher-musa.jpeg',
            'alt_text' => 'Honourable Minister of Defence',
            'caption' => 'Honourable Minister of Defence',
            'event_date' => null,
            'category' => 'Leadership',
            'sort_order' => 7,
            'active' => 1,
        ],
        [
            'id' => 0,
            'image_url' => 'assets/images/headshots/dr-bello-matawalle.jpg',
            'alt_text' => 'Hon. Minister of State, Dr. Bello M. Matawalle',
            'caption' => 'Honourable Minister of State, Dr. Bello M. Matawalle',
            'event_date' => null,
            'category' => 'Leadership',
            'sort_order' => 8,
            'active' => 1,
        ],
    ];
}

function getOperations(bool $activeOnly = true): array
{
    $sql = 'SELECT * FROM mod_operations' . ($activeOnly ? ' WHERE active = 1' : '') . ' ORDER BY sort_order ASC, id ASC';
    return safeDbFetchAll($sql);
}

function defaultOperations(): array
{
    return [
        ['id'=>0,'region'=>'North-East','name'=>'Operation HADIN KAI','description'=>'The principal counter-insurgency operation against Boko Haram and ISWAP, headquartered in Maiduguri, Borno State. Conducts ground manoeuvre, air strikes, special operations and stabilisation across Borno, Yobe and Adamawa States.','sort_order'=>0,'active'=>1],
        ['id'=>0,'region'=>'North-West','name'=>'Operation FANSAN YAMMA','description'=>'The counter-banditry operation across Zamfara, Sokoto, Katsina and Kebbi States, integrating Army and Air Force assets with Police, NSCDC and DSS in protection-of-civilians missions.','sort_order'=>1,'active'=>1],
        ['id'=>0,'region'=>'North-Central','name'=>'Operation WHIRL STROKE','description'=>'Joint operation in the Middle Belt addressing farmer-herder conflict and rural insecurity in Benue, Taraba and Nasarawa States.','sort_order'=>2,'active'=>1],
        ['id'=>0,'region'=>'North-Central / Plateau','name'=>'Operation SAFE HAVEN','description'=>'Stability operation in Plateau and southern Kaduna States, focused on community policing and rapid response.','sort_order'=>3,'active'=>1],
        ['id'=>0,'region'=>'South-South','name'=>'Operation DELTA SAFE','description'=>'Tri-service operation in the Niger Delta, focused on counter-oil-theft, counter-piracy and protection of critical national infrastructure.','sort_order'=>4,'active'=>1],
        ['id'=>0,'region'=>'South-East','name'=>'Operation UDO KA','description'=>'Internal security operation in the South-East addressing organised criminality and unlawful armed groups.','sort_order'=>5,'active'=>1],
        ['id'=>0,'region'=>'Lake Chad','name'=>'Multi-National Joint Task Force','description'=>'Nigeria contributes the largest contingent to the MNJTF — alongside Cameroon, Chad and Niger — countering Boko Haram and ISWAP across the Lake Chad basin.','sort_order'=>6,'active'=>1],
        ['id'=>0,'region'=>'International','name'=>'UN & ECOWAS deployments','description'=>'Nigeria has contributed to more than 40 peacekeeping missions since 1960, including ECOMOG, ONUC, UNAMSIL, MINUSMA and partner missions across Africa.','sort_order'=>7,'active'=>1],
    ];
}

function getTenders(string $type = '', bool $activeOnly = true): array
{
    $where = $activeOnly ? 'WHERE active = 1' : 'WHERE 1';
    if ($type) $where .= " AND type = " . pdo()->quote($type);
    return safeDbFetchAll("SELECT * FROM mod_tenders $where ORDER BY sort_order ASC, id ASC");
}

function defaultTenders(): array
{
    return [
        ['id'=>0,'type'=>'tender','title'=>'Supply of office IT infrastructure — HQ Ship House','ref_number'=>'FMOD/2026/IT/01','category'=>'Supplies','method'=>'Open Tender · National Competitive Bidding','closes_at'=>'2026-06-12','doc_url'=>'','description'=>'','sort_order'=>0,'active'=>1],
        ['id'=>0,'type'=>'tender','title'=>'Renovation of Ship House conference rooms','ref_number'=>'FMOD/2026/WK/04','category'=>'Works','method'=>'Open Tender · Works','closes_at'=>'2026-06-28','doc_url'=>'','description'=>'','sort_order'=>1,'active'=>1],
        ['id'=>0,'type'=>'tender','title'=>'Vehicle fleet maintenance services (3-year framework)','ref_number'=>'FMOD/2026/SV/07','category'=>'Services','method'=>'EOI · Services','closes_at'=>'2026-07-05','doc_url'=>'','description'=>'','sort_order'=>2,'active'=>1],
        ['id'=>0,'type'=>'tender','title'=>'Defence-industrial advisory & feasibility study','ref_number'=>'FMOD/2026/CN/02','category'=>'Consultancy','method'=>'Restricted · Consultancy','closes_at'=>'2026-07-19','doc_url'=>'','description'=>'','sort_order'=>3,'active'=>1],
        ['id'=>0,'type'=>'award','title'=>'Medical equipment for military hospitals','ref_number'=>'FMOD/2026/AW/01','category'=>'Supplies','method'=>'National Competitive Bidding','closes_at'=>null,'doc_url'=>'','description'=>'Awarded after evaluation by the Ministerial Tenders Board.','sort_order'=>0,'active'=>1],
        ['id'=>0,'type'=>'award','title'=>'NAFRC training equipment, batch 2026A','ref_number'=>'FMOD/2026/AW/02','category'=>'Supplies','method'=>'Open Tender','closes_at'=>null,'doc_url'=>'','description'=>'Awarded for delivery to the Resettlement Centre, Oshodi.','sort_order'=>1,'active'=>1],
    ];
}

function getAnnualReports(bool $activeOnly = true): array
{
    $where = $activeOnly ? 'WHERE active = 1' : 'WHERE 1';
    return safeDbFetchAll("SELECT * FROM mod_annual_reports $where ORDER BY year DESC");
}

function defaultAnnualReports(): array
{
    $reports = [];
    $years = range(2024, 2014);
    foreach ($years as $i => $year) {
        $reports[] = [
            'id' => 0, 'year' => $year,
            'title' => 'Annual Report & Accounts ' . $year,
            'description' => 'Defence policy, budget outturn, capital projects and operations review.',
            'doc_url' => '',
            'status' => $year === 2024 ? 'latest' : 'published',
            'sort_order' => $i, 'active' => 1,
        ];
    }
    return $reports;
}

function getDirectors(): array
{
    return safeDbFetchAll('SELECT * FROM mod_directors ORDER BY dept_slug ASC');
}

function getDirectorBySlug(string $slug): array
{
    return dbFetch('SELECT * FROM mod_directors WHERE dept_slug = ? LIMIT 1', [$slug]) ?: [];
}
