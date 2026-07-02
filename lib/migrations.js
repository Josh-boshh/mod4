import pdo from './db.js';

// 1:1 port of admin/schema.sql + the extra tables added later in
// admin/config.php's runMigrations(). Idempotent (IF NOT EXISTS) —
// safe to run multiple times, but intentionally NOT called on every
// request (see scripts/migrate.js).
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS mod_admin_users (
    id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS mod_settings (
    name  VARCHAR(191) NOT NULL PRIMARY KEY,
    value TEXT         NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS mod_hero_slides (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    image_url    VARCHAR(255) NOT NULL,
    alt_text     VARCHAR(255) NOT NULL,
    role_text    VARCHAR(255) NOT NULL,
    caption_text TEXT         NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    active       TINYINT      NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS mod_leaders (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    position_key VARCHAR(64)  NOT NULL,
    title        VARCHAR(255) NOT NULL,
    name         VARCHAR(255) NOT NULL,
    bio          TEXT         NOT NULL,
    photo_url    VARCHAR(255) NOT NULL,
    profile_link VARCHAR(255) NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    active       TINYINT      NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS mod_press_items (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    excerpt      TEXT         NOT NULL,
    body         LONGTEXT     NOT NULL DEFAULT '',
    category     VARCHAR(127) NOT NULL,
    published_at DATE         NOT NULL,
    image_url    VARCHAR(255) NOT NULL,
    link_url     VARCHAR(255) NOT NULL,
    slug         VARCHAR(255) NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    active       TINYINT      NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS mod_subscribers (
    id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(191) NOT NULL UNIQUE,
    subscribed_at TIMESTAMP    NOT NULL DEFAULT NOW()
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS mod_submissions (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    form_type    VARCHAR(32)  NOT NULL,
    name         VARCHAR(255) NOT NULL,
    email        VARCHAR(191) NOT NULL,
    subject      VARCHAR(255) NOT NULL DEFAULT '',
    meta         JSON,
    submitted_at TIMESTAMP    NOT NULL DEFAULT NOW()
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE INDEX idx_sub_form_type    ON mod_submissions (form_type)`,
  `CREATE INDEX idx_sub_submitted_at ON mod_submissions (submitted_at)`,

  `CREATE TABLE IF NOT EXISTS mod_rate_limits (
    id           INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ip_hash      VARCHAR(64) NOT NULL,
    endpoint     VARCHAR(32) NOT NULL,
    hits         INT         NOT NULL DEFAULT 1,
    window_start TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE KEY uq_rate (ip_hash, endpoint)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE INDEX idx_rate_window ON mod_rate_limits (window_start)`,

  `CREATE TABLE IF NOT EXISTS mod_spam_log (
    id         INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ip_hash    VARCHAR(64) NOT NULL,
    endpoint   VARCHAR(32) NOT NULL,
    reason     VARCHAR(64) NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE INDEX idx_spam_ip ON mod_spam_log (ip_hash)`,
  `CREATE INDEX idx_spam_at ON mod_spam_log (created_at)`,

  `CREATE TABLE IF NOT EXISTS mod_gallery_images (
    id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    image_url   VARCHAR(255) NOT NULL,
    alt_text    VARCHAR(255) NOT NULL DEFAULT '',
    caption     TEXT         NOT NULL DEFAULT '',
    event_date  DATE,
    category    VARCHAR(127) NOT NULL DEFAULT 'General',
    sort_order  INT          NOT NULL DEFAULT 0,
    active      TINYINT      NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE INDEX idx_gallery_sort ON mod_gallery_images (sort_order ASC, id ASC)`,

  `CREATE TABLE IF NOT EXISTS mod_operations (
    id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    region      VARCHAR(127) NOT NULL DEFAULT '',
    name        VARCHAR(255) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    sort_order  INT          NOT NULL DEFAULT 0,
    active      TINYINT      NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE INDEX idx_ops_sort ON mod_operations (sort_order ASC, id ASC)`,

  `CREATE TABLE IF NOT EXISTS mod_tenders (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    type         ENUM('tender','award') NOT NULL DEFAULT 'tender',
    title        VARCHAR(255) NOT NULL,
    ref_number   VARCHAR(127) NOT NULL DEFAULT '',
    category     VARCHAR(127) NOT NULL DEFAULT '',
    method       VARCHAR(127) NOT NULL DEFAULT '',
    closes_at    DATE,
    doc_url      VARCHAR(255) NOT NULL DEFAULT '',
    description  TEXT         NOT NULL DEFAULT '',
    sort_order   INT          NOT NULL DEFAULT 0,
    active       TINYINT      NOT NULL DEFAULT 1,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE INDEX idx_tenders_sort ON mod_tenders (type ASC, sort_order ASC, id ASC)`,

  `CREATE TABLE IF NOT EXISTS mod_directors (
    id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    dept_slug    VARCHAR(127) NOT NULL UNIQUE,
    director     VARCHAR(255) NOT NULL,
    role         VARCHAR(255) NOT NULL DEFAULT '',
    photo_url    VARCHAR(255) NOT NULL DEFAULT '',
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW() ON UPDATE NOW()
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS mod_annual_reports (
    id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    year        SMALLINT     NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    doc_url     VARCHAR(255) NOT NULL DEFAULT '',
    status      VARCHAR(32)  NOT NULL DEFAULT 'published',
    sort_order  INT          NOT NULL DEFAULT 0,
    active      TINYINT      NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE UNIQUE INDEX idx_reports_year ON mod_annual_reports (year)`,
];

// Statements that fail harmlessly on re-run (duplicate index/key) and
// should not be logged as real errors.
const IGNORABLE_ERROR_CODES = new Set(['ER_DUP_KEYNAME', 'ER_DUP_FIELDNAME']);

export async function runMigrations() {
  const db = pdo();
  for (const sql of MIGRATIONS) {
    try {
      await db.query(sql);
    } catch (e) {
      if (!IGNORABLE_ERROR_CODES.has(e.code)) {
        console.error('[MOD migration]', e.message);
      }
    }
  }
}
