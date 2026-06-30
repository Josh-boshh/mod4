import { fetch as dbFetch, query as dbQuery, safeFetchAll, getConnection } from './db.js';
import {
  defaultSettings,
  defaultHeroSlides,
  defaultLeadership,
  defaultPressItems,
  normalizeSlug,
} from './defaultData.js';

export { normalizeSlug };

export async function getSetting(name, fallback = '') {
  let row = null;
  try {
    row = await dbFetch('SELECT value FROM mod_settings WHERE name = ? LIMIT 1', [name]);
  } catch {
    row = null;
  }
  if (row && row.value) return row.value;
  return defaultSettings()[name] ?? fallback;
}

export async function saveSetting(name, value) {
  const existing = await dbFetch('SELECT 1 FROM mod_settings WHERE name = ? LIMIT 1', [name]);
  if (existing) {
    await dbQuery('UPDATE mod_settings SET value = ? WHERE name = ?', [value, name]);
    return;
  }
  await dbQuery('INSERT INTO mod_settings (name, value) VALUES (?, ?)', [name, value]);
}

export async function getHeroSlides(activeOnly = true) {
  const sql = `SELECT * FROM mod_hero_slides${activeOnly ? ' WHERE active = 1' : ''} ORDER BY sort_order ASC, id ASC`;
  const rows = await safeFetchAll(sql);
  return rows.length ? rows : defaultHeroSlides();
}

export async function getLeadership(activeOnly = true) {
  const sql = `SELECT * FROM mod_leaders${activeOnly ? ' WHERE active = 1' : ''} ORDER BY sort_order ASC, id ASC`;
  const rows = await safeFetchAll(sql);
  return rows.length ? rows : defaultLeadership();
}

export async function getPressItems(activeOnly = true, limit = 0) {
  let sql = `SELECT * FROM mod_press_items${activeOnly ? ' WHERE active = 1' : ''} ORDER BY sort_order ASC, id ASC`;
  if (limit > 0) sql += ` LIMIT ${Number(limit)}`;
  const rows = await safeFetchAll(sql);
  return rows.length ? rows : defaultPressItems();
}

export async function getSubscribers() {
  return safeFetchAll('SELECT email, subscribed_at FROM mod_subscribers ORDER BY subscribed_at DESC');
}

export async function getSubmissions(type = '') {
  let sql = 'SELECT * FROM mod_submissions';
  const params = [];
  if (type) {
    sql += ' WHERE form_type = ?';
    params.push(type);
  }
  sql += ' ORDER BY submitted_at DESC';
  const rows = await safeFetchAll(sql, params);
  return rows.map((row) => {
    let meta = {};
    if (row.meta) {
      try {
        const decoded = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta;
        meta = decoded && typeof decoded === 'object' ? decoded : {};
      } catch {
        meta = {};
      }
    }
    return { ...row, meta };
  });
}

export async function countSubmissions(type = '') {
  let sql = 'SELECT COUNT(*) AS n FROM mod_submissions';
  const params = [];
  if (type) {
    sql += ' WHERE form_type = ?';
    params.push(type);
  }
  try {
    const row = await dbFetch(sql, params);
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function saveContentBlob(blob) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM mod_hero_slides');
    await conn.execute('DELETE FROM mod_leaders');
    await conn.execute('DELETE FROM mod_press_items');

    if (Array.isArray(blob.slides)) {
      let index = 0;
      for (const slide of blob.slides) {
        await conn.execute(
          'INSERT INTO mod_hero_slides (image_url, alt_text, role_text, caption_text, sort_order, active) VALUES (?, ?, ?, ?, ?, ?)',
          [slide.img || '', slide.alt || '', slide.role || '', slide.name || '', index, 1]
        );
        index += 1;
      }
    }

    if (blob.leadership && typeof blob.leadership === 'object') {
      for (const [positionKey, leader] of Object.entries(blob.leadership)) {
        if (!leader?.name) continue;
        await conn.execute(
          'INSERT INTO mod_leaders (position_key, title, name, bio, photo_url, profile_link, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [positionKey, leader.title || '', leader.name || '', leader.bio || '', leader.photo || '', leader.profile_link || '', 0, 1]
        );
      }
    }

    if (Array.isArray(blob.press)) {
      let index = 0;
      for (const item of blob.press) {
        let publishedAt = null;
        if (item.date) {
          const ts = Date.parse(item.date);
          if (!Number.isNaN(ts)) publishedAt = new Date(ts).toISOString().slice(0, 10);
        }
        if (!publishedAt) publishedAt = new Date().toISOString().slice(0, 10);
        await conn.execute(
          'INSERT INTO mod_press_items (title, excerpt, category, published_at, image_url, link_url, slug, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            item.title || '',
            item.excerpt || '',
            item.category || '',
            publishedAt,
            item.img || '',
            item.url || '',
            normalizeSlug(item.slug || item.title || `press-item-${index}`),
            index,
            1,
          ]
        );
        index += 1;
      }
    }

    if (blob.settings && typeof blob.settings === 'object') {
      for (const [key, value] of Object.entries(blob.settings)) {
        const existing = await conn.execute('SELECT 1 FROM mod_settings WHERE name = ? LIMIT 1', [key]);
        if (existing[0].length) {
          await conn.execute('UPDATE mod_settings SET value = ? WHERE name = ?', [String(value), key]);
        } else {
          await conn.execute('INSERT INTO mod_settings (name, value) VALUES (?, ?)', [key, String(value)]);
        }
      }
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function getGalleryImages(activeOnly = true) {
  const sql = `SELECT * FROM mod_gallery_images${activeOnly ? ' WHERE active = 1' : ''} ORDER BY sort_order ASC, id ASC`;
  return safeFetchAll(sql);
}

export async function getOperations(activeOnly = true) {
  const sql = `SELECT * FROM mod_operations${activeOnly ? ' WHERE active = 1' : ''} ORDER BY sort_order ASC, id ASC`;
  return safeFetchAll(sql);
}

export async function getTenders(type = '', activeOnly = true) {
  let where = activeOnly ? 'WHERE active = 1' : 'WHERE 1';
  const params = [];
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }
  return safeFetchAll(`SELECT * FROM mod_tenders ${where} ORDER BY sort_order ASC, id ASC`, params);
}

export async function getAnnualReports(activeOnly = true) {
  const where = activeOnly ? 'WHERE active = 1' : 'WHERE 1';
  return safeFetchAll(`SELECT * FROM mod_annual_reports ${where} ORDER BY year DESC`);
}

export async function getDirectors() {
  return safeFetchAll('SELECT * FROM mod_directors ORDER BY dept_slug ASC');
}

export async function getDirectorBySlug(slug) {
  const row = await dbFetch('SELECT * FROM mod_directors WHERE dept_slug = ? LIMIT 1', [slug]);
  return row || {};
}
