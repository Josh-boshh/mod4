import { requireAdmin, validateCsrf, issueCsrfCookie, getCsrfCookie } from '../../lib/auth.js';
import { parseMultipart } from '../../lib/multipart.js';
import { uploadImage, uploadDocument } from '../../lib/upload.js';
import { renderDashboardPage } from '../../lib/adminViews.js';
import { fetch as dbFetch, query as dbQuery, safeFetchAll } from '../../lib/db.js';
import {
  getSetting,
  saveSetting,
  getHeroSlides,
  getLeadership,
  getPressItems,
  getSubscribers,
  getSubmissions,
  saveContentBlob,
  getGalleryImages,
  getOperations,
  getTenders,
  getAnnualReports,
  getDirectors,
  getDirectorBySlug,
  normalizeSlug,
} from '../../lib/content.js';
import { DEFAULT_CONTENT } from '../../lib/defaultData.js';

export const config = { api: { bodyParser: false } };

function redirect(res, anchor = '', flash = null) {
  let url = '/api/admin/index';
  const params = new URLSearchParams();
  if (flash) {
    params.set('flash_type', flash.type);
    params.set('flash_msg', flash.message);
  }
  const qs = params.toString();
  if (qs) url += '?' + qs;
  if (anchor) url += '#' + anchor;
  res.writeHead(302, { Location: url });
  res.end();
}

function checked(fields, name) {
  return Object.prototype.hasOwnProperty.call(fields, name) ? 1 : 0;
}

async function loadSettings() {
  return {
    hero_eyebrow: await getSetting('hero_eyebrow', 'Federal Republic of Nigeria'),
    hero_headline: await getSetting('hero_headline', 'Defending the sovereignty of Nigeria.'),
    hero_body: await getSetting('hero_body', 'The Ministry of Defence — the apex policy authority overseeing the Nigerian Armed Forces — provides strategic leadership for a modern, professional, mission-ready military in the service of more than 220 million citizens of the Federal Republic.'),
    last_reviewed: await getSetting('last_reviewed', 'June 2026'),
    ministry_name: await getSetting('ministry_name', 'Ministry of Defence'),
    country: await getSetting('country', 'Federal Republic of Nigeria'),
  };
}

export default async function handler(req, res) {
  const admin = requireAdmin(req);
  if (!admin) {
    res.writeHead(302, { Location: '/api/admin/login' });
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');
  const query = Object.fromEntries(url.searchParams.entries());

  if (req.method === 'POST') {
    await handlePost(req, res, query);
    return;
  }

  await renderGet(req, res, query);
}

async function renderGet(req, res, query) {
  const flash = query.flash_type ? { type: query.flash_type, message: query.flash_msg || '' } : null;

  const [slides, leaders, pressItems, subscribers, allSubmissions, galleryImages, operations, tenders, awards, annualReports, directors, settings] = await Promise.all([
    safeFetchAll('SELECT * FROM mod_hero_slides ORDER BY sort_order ASC, id ASC'),
    safeFetchAll('SELECT * FROM mod_leaders ORDER BY sort_order ASC, id ASC'),
    safeFetchAll('SELECT * FROM mod_press_items ORDER BY sort_order ASC, id ASC'),
    getSubscribers(),
    getSubmissions(),
    getGalleryImages(false),
    getOperations(false),
    getTenders('tender', false),
    getTenders('award', false),
    getAnnualReports(false),
    getDirectors(),
    loadSettings(),
  ]);

  const usingFallback = slides.length === 0 && leaders.length === 0 && pressItems.length === 0;
  const finalSlides = slides.length ? slides : await getHeroSlides(false);
  const finalLeaders = leaders.length ? leaders : await getLeadership(false);
  const finalPress = pressItems.length ? pressItems : await getPressItems(false);

  const editSlide = query.edit_slide ? await dbFetch('SELECT * FROM mod_hero_slides WHERE id = ? LIMIT 1', [Number(query.edit_slide)]) : null;
  const editLeader = query.edit_leader ? await dbFetch('SELECT * FROM mod_leaders WHERE id = ? LIMIT 1', [Number(query.edit_leader)]) : null;
  const editPress = query.edit_press ? await dbFetch('SELECT * FROM mod_press_items WHERE id = ? LIMIT 1', [Number(query.edit_press)]) : null;
  const editGalleryImage = query.edit_gallery ? await dbFetch('SELECT * FROM mod_gallery_images WHERE id = ? LIMIT 1', [Number(query.edit_gallery)]) : null;
  const editOperation = query.edit_operation ? await dbFetch('SELECT * FROM mod_operations WHERE id = ? LIMIT 1', [Number(query.edit_operation)]) : null;
  const editTender = query.edit_tender ? await dbFetch('SELECT * FROM mod_tenders WHERE id = ? LIMIT 1', [Number(query.edit_tender)]) : null;
  const editReport = query.edit_report ? await dbFetch('SELECT * FROM mod_annual_reports WHERE id = ? LIMIT 1', [Number(query.edit_report)]) : null;

  const csrf = issueCsrfCookie(res, getCsrfCookie(req));

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(renderDashboardPage({
    flash,
    usingFallback,
    csrf,
    slides: finalSlides,
    leaders: finalLeaders,
    pressItems: finalPress,
    subscribers,
    allSubmissions,
    galleryImages,
    operations,
    tenders,
    awards,
    annualReports,
    directors,
    settings,
    editSlide,
    editLeader,
    editPress,
    editGalleryImage,
    editOperation,
    editTender,
    editReport,
  }));
}

async function handlePost(req, res, query) {
  const { fields, files } = await parseMultipart(req);
  const csrfCookie = issueCsrfCookie(res, getCsrfCookie(req));

  if (!validateCsrf(req, fields.csrf || '')) {
    return redirect(res, '', { type: 'error', message: 'Invalid form token. Refresh and try again.' });
  }

  const action = fields.action || '';

  switch (action) {
    case 'save_slide': {
      const slideId = Number(fields.slide_id || 0);
      let imageUrl = (fields.slide_image_url || '').trim();
      const alt = (fields.slide_alt || '').trim();
      const role = (fields.slide_role || '').trim();
      const caption = (fields.slide_caption || '').trim();
      const sortOrder = Number(fields.slide_order || 0);
      const active = checked(fields, 'slide_active');

      let existing = '';
      if (slideId) {
        existing = (await dbFetch('SELECT image_url FROM mod_hero_slides WHERE id = ? LIMIT 1', [slideId]))?.image_url || '';
      }
      const imagePath = await uploadImage(files.slide_image_file, 'hero', existing);
      if (imagePath && imagePath !== existing) imageUrl = imagePath;
      else if (!imageUrl) imageUrl = existing;

      if (!imageUrl) {
        return redirect(res, 'slides', { type: 'error', message: 'Slide image is required. Upload a file or enter a valid image path.' });
      }

      if (slideId) {
        await dbQuery('UPDATE mod_hero_slides SET image_url=?, alt_text=?, role_text=?, caption_text=?, sort_order=?, active=? WHERE id=?', [imageUrl, alt, role, caption, sortOrder, active, slideId]);
      } else {
        await dbQuery('INSERT INTO mod_hero_slides (image_url, alt_text, role_text, caption_text, sort_order, active) VALUES (?, ?, ?, ?, ?, ?)', [imageUrl, alt, role, caption, sortOrder, active]);
      }
      return redirect(res, 'slides', { type: 'success', message: slideId ? 'Slide updated successfully.' : 'Slide added successfully.' });
    }

    case 'delete_slide': {
      const slideId = Number(fields.slide_id || 0);
      if (slideId) await dbQuery('DELETE FROM mod_hero_slides WHERE id = ?', [slideId]);
      return redirect(res, 'slides', { type: 'success', message: 'Slide removed.' });
    }

    case 'save_leader': {
      const leaderId = Number(fields.leader_id || 0);
      const positionKey = (fields.leader_position || '').trim();
      const title = (fields.leader_title || '').trim();
      const name = (fields.leader_name || '').trim();
      const bio = (fields.leader_bio || '').trim();
      let photoUrl = (fields.leader_photo_url || '').trim();
      const profileLink = (fields.leader_profile_link || '').trim();
      const sortOrder = Number(fields.leader_order || 0);
      const active = checked(fields, 'leader_active');

      let existing = '';
      if (leaderId) {
        existing = (await dbFetch('SELECT photo_url FROM mod_leaders WHERE id = ? LIMIT 1', [leaderId]))?.photo_url || '';
      }
      const photoPath = await uploadImage(files.leader_photo_file, 'headshots', existing);
      if (photoPath && photoPath !== existing) photoUrl = photoPath;
      else if (!photoUrl) photoUrl = existing;

      if (!positionKey || !title || !name) {
        return redirect(res, 'leadership', { type: 'error', message: 'Please provide a position, title, and name for the leader.' });
      }

      if (leaderId) {
        await dbQuery('UPDATE mod_leaders SET position_key=?, title=?, name=?, bio=?, photo_url=?, profile_link=?, sort_order=?, active=? WHERE id=?', [positionKey, title, name, bio, photoUrl, profileLink, sortOrder, active, leaderId]);
      } else {
        await dbQuery('INSERT INTO mod_leaders (position_key, title, name, bio, photo_url, profile_link, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [positionKey, title, name, bio, photoUrl, profileLink, sortOrder, active]);
      }
      return redirect(res, 'leadership', { type: 'success', message: leaderId ? 'Leadership profile updated successfully.' : 'Leadership profile added successfully.' });
    }

    case 'delete_leader': {
      const leaderId = Number(fields.leader_id || 0);
      if (leaderId) await dbQuery('DELETE FROM mod_leaders WHERE id = ?', [leaderId]);
      return redirect(res, 'leadership', { type: 'success', message: 'Leadership profile removed.' });
    }

    case 'save_press': {
      const pressId = Number(fields.press_id || 0);
      const title = (fields.press_title || '').trim();
      const excerpt = (fields.press_excerpt || '').trim();
      const body = (fields.press_body || '').trim();
      const category = (fields.press_category || '').trim();
      let publishedAt = (fields.press_published_at || '').trim();
      let imageUrl = (fields.press_image_url || '').trim();
      let slug = (fields.press_slug || '').trim();
      const sortOrder = Number(fields.press_order || 0);
      const active = checked(fields, 'press_active');

      let existing = '';
      if (pressId) {
        existing = (await dbFetch('SELECT image_url FROM mod_press_items WHERE id = ? LIMIT 1', [pressId]))?.image_url || '';
      }
      const imagePath = await uploadImage(files.press_image_file, 'press', existing);
      if (imagePath && imagePath !== existing) imageUrl = imagePath;
      else if (!imageUrl) imageUrl = existing;

      if (!title || !category || !publishedAt) {
        return redirect(res, 'press', { type: 'error', message: 'Title, category, and published date are required for press items.' });
      }
      if (!slug) slug = normalizeSlug(title);

      const ts = Date.parse(publishedAt);
      publishedAt = Number.isNaN(ts) ? new Date().toISOString().slice(0, 10) : new Date(ts).toISOString().slice(0, 10);

      if (pressId) {
        await dbQuery('UPDATE mod_press_items SET title=?, excerpt=?, body=?, category=?, published_at=?, image_url=?, link_url=?, slug=?, sort_order=?, active=? WHERE id=?', [title, excerpt, body, category, publishedAt, imageUrl, '', slug, sortOrder, active, pressId]);
      } else {
        await dbQuery('INSERT INTO mod_press_items (title, excerpt, body, category, published_at, image_url, link_url, slug, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [title, excerpt, body, category, publishedAt, imageUrl, '', slug, sortOrder, active]);
      }
      return redirect(res, 'press', { type: 'success', message: pressId ? 'Press item updated successfully.' : 'Press item added successfully.' });
    }

    case 'delete_press': {
      const pressId = Number(fields.press_id || 0);
      if (pressId) await dbQuery('DELETE FROM mod_press_items WHERE id = ?', [pressId]);
      return redirect(res, 'press', { type: 'success', message: 'Press item removed.' });
    }

    case 'delete_submission': {
      const subId = Number(fields.submission_id || 0);
      if (subId) await dbQuery('DELETE FROM mod_submissions WHERE id = ?', [subId]);
      return redirect(res, 'submissions', { type: 'success', message: 'Submission deleted.' });
    }

    case 'import_defaults': {
      await saveContentBlob(DEFAULT_CONTENT);
      return redirect(res, '', { type: 'success', message: 'Default homepage content has been imported into the database.' });
    }

    case 'save_settings': {
      await saveSetting('hero_eyebrow', (fields.hero_eyebrow || '').trim());
      await saveSetting('hero_headline', (fields.hero_headline || '').trim());
      await saveSetting('hero_body', (fields.hero_body || '').trim());
      await saveSetting('last_reviewed', (fields.last_reviewed || '').trim());
      await saveSetting('ministry_name', (fields.ministry_name || '').trim());
      await saveSetting('country', (fields.country || '').trim());
      return redirect(res, 'settings', { type: 'success', message: 'Homepage settings have been saved.' });
    }

    case 'save_gallery_image': {
      const galleryId = Number(fields.gallery_id || 0);
      let imageUrl = (fields.gallery_image_url || '').trim();
      const altText = (fields.gallery_alt || '').trim();
      const caption = (fields.gallery_caption || '').trim();
      const eventDate = (fields.gallery_event_date || '').trim() || null;
      const category = (fields.gallery_category || '').trim() || 'General';
      const sortOrder = Number(fields.gallery_order || 0);
      const active = checked(fields, 'gallery_active');

      let existing = '';
      if (galleryId) {
        existing = (await dbFetch('SELECT image_url FROM mod_gallery_images WHERE id = ? LIMIT 1', [galleryId]))?.image_url || '';
      }
      const uploadedPath = await uploadImage(files.gallery_image_file, 'gallery', existing);
      if (uploadedPath && uploadedPath !== existing) imageUrl = uploadedPath;
      else if (!imageUrl) imageUrl = existing;

      if (!imageUrl) {
        return redirect(res, 'gallery', { type: 'error', message: 'An image is required. Upload a file or enter a valid image URL.' });
      }

      if (galleryId) {
        await dbQuery('UPDATE mod_gallery_images SET image_url=?, alt_text=?, caption=?, event_date=?, category=?, sort_order=?, active=? WHERE id=?', [imageUrl, altText, caption, eventDate, category, sortOrder, active, galleryId]);
      } else {
        await dbQuery('INSERT INTO mod_gallery_images (image_url, alt_text, caption, event_date, category, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?)', [imageUrl, altText, caption, eventDate, category, sortOrder, active]);
      }
      return redirect(res, 'gallery', { type: 'success', message: galleryId ? 'Gallery image updated.' : 'Gallery image added.' });
    }

    case 'delete_gallery_image': {
      const galleryId = Number(fields.gallery_id || 0);
      if (galleryId) await dbQuery('DELETE FROM mod_gallery_images WHERE id = ?', [galleryId]);
      return redirect(res, 'gallery', { type: 'success', message: 'Gallery image removed.' });
    }

    case 'save_operation': {
      const opId = Number(fields.op_id || 0);
      const region = (fields.op_region || '').trim();
      const name = (fields.op_name || '').trim();
      const desc = (fields.op_description || '').trim();
      const sortOrder = Number(fields.op_order || 0);
      const active = checked(fields, 'op_active');

      if (!name) return redirect(res, 'operations', { type: 'error', message: 'Operation name is required.' });

      if (opId) {
        await dbQuery('UPDATE mod_operations SET region=?, name=?, description=?, sort_order=?, active=? WHERE id=?', [region, name, desc, sortOrder, active, opId]);
      } else {
        await dbQuery('INSERT INTO mod_operations (region, name, description, sort_order, active) VALUES (?, ?, ?, ?, ?)', [region, name, desc, sortOrder, active]);
      }
      return redirect(res, 'operations', { type: 'success', message: opId ? 'Operation updated.' : 'Operation added.' });
    }

    case 'delete_operation': {
      const opId = Number(fields.op_id || 0);
      if (opId) await dbQuery('DELETE FROM mod_operations WHERE id = ?', [opId]);
      return redirect(res, 'operations', { type: 'success', message: 'Operation removed.' });
    }

    case 'save_tender': {
      const tenderId = Number(fields.tender_id || 0);
      const type = ['tender', 'award'].includes(fields.tender_type) ? fields.tender_type : 'tender';
      const title = (fields.tender_title || '').trim();
      const ref = (fields.tender_ref || '').trim();
      const category = (fields.tender_category || '').trim();
      const method = (fields.tender_method || '').trim();
      const closesAt = (fields.tender_closes_at || '').trim() || null;
      const desc = (fields.tender_description || '').trim();
      const sortOrder = Number(fields.tender_order || 0);
      const active = checked(fields, 'tender_active');

      let existing = '';
      if (tenderId) {
        existing = (await dbFetch('SELECT doc_url FROM mod_tenders WHERE id = ? LIMIT 1', [tenderId]))?.doc_url || '';
      }
      let docUrl = await uploadDocument(files.tender_doc_file, 'documents/tenders', existing);
      if (docUrl === existing) docUrl = (fields.tender_doc_url || '').trim() || existing;

      if (!title) return redirect(res, 'procurement', { type: 'error', message: 'Tender title is required.' });

      if (tenderId) {
        await dbQuery('UPDATE mod_tenders SET type=?, title=?, ref_number=?, category=?, method=?, closes_at=?, doc_url=?, description=?, sort_order=?, active=? WHERE id=?', [type, title, ref, category, method, closesAt, docUrl, desc, sortOrder, active, tenderId]);
      } else {
        await dbQuery('INSERT INTO mod_tenders (type, title, ref_number, category, method, closes_at, doc_url, description, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [type, title, ref, category, method, closesAt, docUrl, desc, sortOrder, active]);
      }
      return redirect(res, 'procurement', { type: 'success', message: tenderId ? 'Tender updated.' : 'Tender added.' });
    }

    case 'delete_tender': {
      const tenderId = Number(fields.tender_id || 0);
      if (tenderId) await dbQuery('DELETE FROM mod_tenders WHERE id = ?', [tenderId]);
      return redirect(res, 'procurement', { type: 'success', message: 'Tender removed.' });
    }

    case 'save_report': {
      const reportId = Number(fields.report_id || 0);
      const year = Number(fields.report_year || 0);
      const title = (fields.report_title || '').trim();
      const desc = (fields.report_description || '').trim();
      const status = ['latest', 'published', 'pending'].includes(fields.report_status) ? fields.report_status : 'published';
      const sortOrder = Number(fields.report_order || 0);
      const active = checked(fields, 'report_active');

      let existing = '';
      if (reportId) {
        existing = (await dbFetch('SELECT doc_url FROM mod_annual_reports WHERE id = ? LIMIT 1', [reportId]))?.doc_url || '';
      }
      let docUrl = await uploadDocument(files.report_doc_file, 'documents/reports', existing);
      if (docUrl === existing) docUrl = (fields.report_doc_url || '').trim() || existing;

      if (!year || !title) return redirect(res, 'annual-reports', { type: 'error', message: 'Year and title are required.' });

      if (reportId) {
        await dbQuery('UPDATE mod_annual_reports SET year=?, title=?, description=?, doc_url=?, status=?, sort_order=?, active=? WHERE id=?', [year, title, desc, docUrl, status, sortOrder, active, reportId]);
      } else {
        await dbQuery('INSERT INTO mod_annual_reports (year, title, description, doc_url, status, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?)', [year, title, desc, docUrl, status, sortOrder, active]);
      }
      return redirect(res, 'annual-reports', { type: 'success', message: reportId ? 'Report updated.' : 'Report added.' });
    }

    case 'delete_report': {
      const reportId = Number(fields.report_id || 0);
      if (reportId) await dbQuery('DELETE FROM mod_annual_reports WHERE id = ?', [reportId]);
      return redirect(res, 'annual-reports', { type: 'success', message: 'Report removed.' });
    }

    case 'save_director': {
      const deptSlug = (fields.director_dept_slug || '').trim();
      const dirName = (fields.director_name || '').trim();
      const dirRole = (fields.director_role || '').trim();
      let photoUrl = (fields.director_photo_url || '').trim();

      const existing = (await getDirectorBySlug(deptSlug))?.photo_url || '';
      const uploaded = await uploadImage(files.director_photo_file, 'directors', existing);
      if (uploaded && uploaded !== existing) photoUrl = uploaded;
      else if (!photoUrl) photoUrl = existing;

      if (!deptSlug || !dirName) {
        return redirect(res, 'directors', { type: 'error', message: 'Department and director name are required.' });
      }

      await dbQuery(
        `INSERT INTO mod_directors (dept_slug, director, role, photo_url) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE director=?, role=?, photo_url=?`,
        [deptSlug, dirName, dirRole, photoUrl, dirName, dirRole, photoUrl]
      );
      return redirect(res, 'directors', { type: 'success', message: 'Director updated.' });
    }

    default:
      return redirect(res, '', { type: 'error', message: 'Unknown action.' });
  }
}
