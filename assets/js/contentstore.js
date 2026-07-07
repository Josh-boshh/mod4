/* =============================================================================
 *  MOD - Content Store
 *  Backend-driven content store. Reads content from PHP/MySQL APIs when
 *  available, and persists admin updates to SQL instead of localStorage.
 * ============================================================================= */
(function (window) {
  "use strict";

  const KEY = "mod-content-v1";
  const SUBS_KEY = "mod-subscribers-v1";
  const IS_ADMIN_CONTEXT = window.location.pathname.includes('/admin/');
  const CSRF_TOKEN = getCsrfToken();

  // Press releases are managed through the new admin (mod4-next, backed by
  // Supabase) instead of the legacy MySQL /api/content — this is the anon
  // (public, RLS-restricted-to-active-rows) key, safe to expose client-side.
  const SUPABASE_URL = "https://gsjhhbzjeiuvcjfazijw.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_ZV9IN1u6odtgBfA3vKI4GQ_4vOCuJms";

  const STATE = {
    content: null,
    subscribers: null,
  };

  function apiUrl(path) {
    return '/api/' + path;
  }

  function dispatchUpdate() {
    window.dispatchEvent(new CustomEvent('mod-content-updated'));
  }

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : '';
  }

  function defaults() {
    const D = window.MOD_DATA || {};
    return {
      hero: {
        eyebrow: 'Federal Republic of Nigeria',
        headline: 'Defending the sovereignty of Nigeria.',
        body: 'The Ministry of Defence - the apex policy authority overseeing the Nigerian Armed Forces - provides strategic leadership for a modern, professional, mission-ready military in the service of more than 220 million citizens of the Federal Republic.',
      },
      slides: (D.HERO_SLIDES || []).map((s) => ({ ...s })),
      press: (D.PRESS || []).map((p) => ({ ...p })),
      leadership: {
        minister: { ...((D.LEADERSHIP && D.LEADERSHIP.minister) || {}) },
        ministerOfState: { ...((D.LEADERSHIP && D.LEADERSHIP.ministerOfState) || {}) },
        permSec: { ...((D.LEADERSHIP && D.LEADERSHIP.permSec) || {}) },
      },
      directors: {},
      operations: [],
      tenders: [],
      awards: [],
      annualReports: [],
      galleryImages: [],
      speeches: [],
      customPages: [],
      customForms: [],
      settings: {
        lastReviewed: 'June 2026',
        ministryName: 'Ministry of Defence',
        country: 'Federal Republic of Nigeria',
      },
    };
  }

  function loadLocalContent() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const stored = JSON.parse(raw);
      return mergeContent(stored);
    } catch (e) {
      console.warn('[MOD_STORE] local load failed, using defaults:', e);
      return defaults();
    }
  }

  function saveLocalContent(blob) {
    try { localStorage.setItem(KEY, JSON.stringify(blob)); } catch (e) { console.warn('[MOD_STORE] local save failed:', e); }
  }

  function loadLocalSubscribers() {
    try { return JSON.parse(localStorage.getItem(SUBS_KEY) || '[]'); } catch { return []; }
  }

  function saveLocalSubscribers(list) {
    try { localStorage.setItem(SUBS_KEY, JSON.stringify(list)); } catch (e) { console.warn('[MOD_STORE] subscriber save failed:', e); }
  }

  function mergeContent(stored) {
    const d = defaults();
    return {
      hero: Object.assign({}, d.hero, stored.hero || {}),
      slides: Array.isArray(stored.slides) && stored.slides.length ? stored.slides : d.slides,
      press: Array.isArray(stored.press) && stored.press.length ? stored.press : d.press,
      leadership: {
        minister: Object.assign({}, d.leadership.minister, (stored.leadership && stored.leadership.minister) || {}),
        ministerOfState: Object.assign({}, d.leadership.ministerOfState, (stored.leadership && stored.leadership.ministerOfState) || {}),
        permSec: Object.assign({}, d.leadership.permSec, (stored.leadership && stored.leadership.permSec) || {}),
      },
      directors: Object.assign({}, d.directors, stored.directors || {}),
      operations: Array.isArray(stored.operations) && stored.operations.length ? stored.operations : d.operations,
      tenders: Array.isArray(stored.tenders) && stored.tenders.length ? stored.tenders : d.tenders,
      awards: Array.isArray(stored.awards) && stored.awards.length ? stored.awards : d.awards,
      annualReports: Array.isArray(stored.annualReports) && stored.annualReports.length ? stored.annualReports : d.annualReports,
      galleryImages: Array.isArray(stored.galleryImages) && stored.galleryImages.length ? stored.galleryImages : d.galleryImages,
      speeches: Array.isArray(stored.speeches) && stored.speeches.length ? stored.speeches : d.speeches,
      customPages: Array.isArray(stored.customPages) && stored.customPages.length ? stored.customPages : d.customPages,
      customForms: Array.isArray(stored.customForms) && stored.customForms.length ? stored.customForms : d.customForms,
      settings: Object.assign({}, d.settings, stored.settings || {}),
    };
  }

  function setContent(blob) {
    STATE.content = mergeContent(blob);
    saveLocalContent(STATE.content);
    dispatchUpdate();
  }

  function setSubscribers(list) {
    STATE.subscribers = Array.isArray(list) ? list : [];
    saveLocalSubscribers(STATE.subscribers);
    dispatchUpdate();
  }

  function formatPressDate(raw) {
    if (!raw) return '';
    const ts = Date.parse(raw);
    if (Number.isNaN(ts)) return raw;
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Mirrors the shape api/content.js produces for `press`, so nothing
  // downstream (press.html, press-release.html, render-home.js) needs to
  // know or care which backend the data came from.
  //
  // Ordered by published_at (not sort_order) and filtered to published_at
  // in the past, so the admin's date field alone controls both scheduling
  // (a future date stays hidden until it arrives) and backdating (a past
  // date slots the item into correct chronological position) — no manual
  // reordering or cron job needed.
  async function loadSupabasePress() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(
        SUPABASE_URL +
          '/rest/v1/mod_press_items?select=*&active=eq.true&deleted_at=is.null&published_at=lte.' +
          today +
          '&order=published_at.desc',
        {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
          cache: 'no-store',
        }
      );
      if (!res.ok) throw new Error('Supabase press fetch failed');
      const rows = await res.json();
      return rows.map((item) => ({
        title: item.title,
        excerpt: item.excerpt,
        body: item.body || '',
        category: item.category,
        date: formatPressDate(item.published_at),
        img: item.image_url,
        url: 'press-release.html?slug=' + encodeURIComponent(item.slug),
        slug: item.slug,
      }));
    } catch (e) {
      console.warn('[MOD_STORE] Supabase press load failed:', e);
      return null;
    }
  }

  // Admin preview links (page.html/form.html/press-release.html's
  // ?preview=1&token=... URLs) fetch a single row by slug regardless of its
  // active flag or publish date — but only with the exact per-row
  // preview_token, via the mod4_preview_row RPC (see
  // supabase/migrations/0002_preview_tokens.sql). Anon SELECT on these
  // tables is unchanged and still requires active=true, so this is the only
  // way to reach a draft row, and only if you have its specific link.
  async function previewRow(table, slug, token) {
    if (!slug || !token) return null;
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/mod4_preview_row', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_table: table, p_slug: slug, p_token: token }),
        cache: 'no-store',
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn('[MOD_STORE] preview fetch failed:', e);
      return null;
    }
  }

  async function loadSupabasePressPreview(slug, token) {
    const item = await previewRow('mod_press_items', slug, token);
    if (!item) return null;
    return {
      title: item.title,
      excerpt: item.excerpt,
      body: item.body || '',
      category: item.category,
      date: formatPressDate(item.published_at),
      img: item.image_url,
      url: 'press-release.html?slug=' + encodeURIComponent(item.slug),
      slug: item.slug,
    };
  }

  async function previewCustomPage(slug, token) {
    const item = await previewRow('mod_custom_pages', slug, token);
    if (!item) return null;
    return {
      slug: item.slug,
      title: item.title,
      metaDescription: item.meta_description,
      body: item.body,
    };
  }

  async function previewCustomForm(slug, token) {
    const item = await previewRow('mod_custom_forms', slug, token);
    if (!item) return null;
    return {
      slug: item.slug,
      title: item.title,
      description: item.description,
      fields: Array.isArray(item.fields) ? item.fields : [],
    };
  }

  function formatShortDate(raw) {
    if (!raw) return '';
    const ts = Date.parse(raw);
    if (Number.isNaN(ts)) return raw;
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatLongDate(raw) {
    if (!raw) return '';
    const ts = Date.parse(raw);
    if (Number.isNaN(ts)) return raw;
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function mapTender(t) {
    return {
      title: t.title,
      ref_number: t.ref_number,
      category: t.category,
      method: t.method,
      closes_at: formatShortDate(t.closes_at),
      doc_url: t.doc_url,
      description: t.description,
    };
  }

  // Operations, tenders/awards, annual reports and gallery images — mirrors
  // the shapes their respective legacy /api/*.php endpoints produced, so the
  // public pages' render functions don't need to change.
  async function loadSupabaseExtras() {
    try {
      const [opsRows, tenderRows, reportRows, galleryRows, speechRows] = await Promise.all([
        loadSupabaseRest('/rest/v1/mod_operations?select=*&active=eq.true&deleted_at=is.null&order=sort_order.asc'),
        loadSupabaseRest('/rest/v1/mod_tenders?select=*&active=eq.true&deleted_at=is.null&order=sort_order.asc'),
        loadSupabaseRest('/rest/v1/mod_annual_reports?select=*&active=eq.true&deleted_at=is.null&order=sort_order.asc'),
        loadSupabaseRest('/rest/v1/mod_gallery_images?select=*&active=eq.true&deleted_at=is.null&order=sort_order.asc'),
        loadSupabaseRest('/rest/v1/mod_speeches?select=*&active=eq.true&deleted_at=is.null&order=sort_order.asc'),
      ]);

      return {
        operations: opsRows.map((o) => ({ region: o.region, name: o.name, description: o.description })),
        tenders: tenderRows.filter((t) => t.type === 'tender').map(mapTender),
        awards: tenderRows.filter((t) => t.type === 'award').map(mapTender),
        annualReports: reportRows.map((r) => ({
          year: r.year,
          title: r.title,
          description: r.description,
          doc_url: r.doc_url,
          status: r.status,
        })),
        galleryImages: galleryRows.map((g) => ({
          image_url: g.image_url,
          alt_text: g.alt_text,
          caption: g.caption,
          event_date: formatLongDate(g.event_date),
          category: g.category,
        })),
        speeches: speechRows.map((s) => ({
          category: s.category,
          quote: s.quote,
          description: s.description,
        })),
      };
    } catch (e) {
      console.warn('[MOD_STORE] Supabase extras load failed:', e);
      return null;
    }
  }

  async function loadSupabaseRest(path) {
    const res = await fetch(SUPABASE_URL + path, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Supabase fetch failed: ' + path);
    return res.json();
  }

  // Admin-authored generic content pages and forms (page.html / form.html).
  async function loadSupabaseCustomContent() {
    try {
      const [pageRows, formRows] = await Promise.all([
        loadSupabaseRest('/rest/v1/mod_custom_pages?select=*&active=eq.true&deleted_at=is.null&order=sort_order.asc'),
        loadSupabaseRest('/rest/v1/mod_custom_forms?select=*&active=eq.true&deleted_at=is.null'),
      ]);
      return {
        customPages: pageRows.map((p) => ({
          slug: p.slug,
          title: p.title,
          metaDescription: p.meta_description,
          body: p.body,
        })),
        customForms: formRows.map((f) => ({
          slug: f.slug,
          title: f.title,
          description: f.description,
          fields: Array.isArray(f.fields) ? f.fields : [],
        })),
      };
    } catch (e) {
      console.warn('[MOD_STORE] Supabase custom pages/forms load failed:', e);
      return null;
    }
  }

  // Mirrors the hero/slides/leadership/settings shape api/content.js
  // produces, sourced from Supabase instead of the legacy MySQL backend.
  async function loadSupabaseSiteContent() {
    try {
      const [settingsRows, slideRows, leaderRows, directorRows] = await Promise.all([
        loadSupabaseRest('/rest/v1/mod_settings?select=name,value'),
        loadSupabaseRest('/rest/v1/mod_hero_slides?select=*&active=eq.true&deleted_at=is.null&order=sort_order.asc'),
        loadSupabaseRest('/rest/v1/mod_leaders?select=*&active=eq.true&deleted_at=is.null&order=sort_order.asc'),
        loadSupabaseRest('/rest/v1/mod_directors?select=*&deleted_at=is.null'),
      ]);

      const settings = {};
      settingsRows.forEach((row) => { settings[row.name] = row.value; });

      const leadershipMap = { minister: {}, ministerOfState: {}, permSec: {} };
      leaderRows.forEach((item) => {
        if (item.position_key in leadershipMap) {
          leadershipMap[item.position_key] = {
            title: item.title,
            name: item.name,
            bio: item.bio,
            photo: item.photo_url,
            profile_link: item.profile_link,
          };
        }
      });

      const directorsMap = {};
      directorRows.forEach((item) => {
        directorsMap[item.dept_slug] = {
          director: item.director,
          role: item.role,
          photo_url: item.photo_url,
          bio: item.bio,
        };
      });

      return {
        hero: {
          eyebrow: settings.hero_eyebrow,
          headline: settings.hero_headline,
          body: settings.hero_body,
        },
        slides: slideRows.map((slide) => ({
          img: slide.image_url,
          alt: slide.alt_text,
          role: slide.role_text,
          name: slide.caption_text,
        })),
        leadership: leadershipMap,
        directors: directorsMap,
        settings,
      };
    } catch (e) {
      console.warn('[MOD_STORE] Supabase site content load failed:', e);
      return null;
    }
  }

  async function loadBackendContent() {
    try {
      const res = await fetch(apiUrl('content'), { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Backend content not available');
      }
      const data = await res.json();
      if (data && typeof data === 'object') {
        setContent(data);
      }
    } catch (e) {
      console.warn('[MOD_STORE] backend content load failed:', e);
      if (!STATE.content) {
        STATE.content = loadLocalContent();
      }
    }

    const [supabasePress, supabaseSite, supabaseExtras, supabaseCustom] = await Promise.all([
      loadSupabasePress(),
      loadSupabaseSiteContent(),
      loadSupabaseExtras(),
      loadSupabaseCustomContent(),
    ]);

    if (supabasePress || supabaseSite || supabaseExtras || supabaseCustom) {
      const blob = loadContent();
      if (supabasePress) blob.press = supabasePress;
      if (supabaseSite) {
        blob.hero = supabaseSite.hero;
        blob.slides = supabaseSite.slides;
        blob.leadership = supabaseSite.leadership;
        blob.directors = supabaseSite.directors;
        blob.settings = supabaseSite.settings;
      }
      if (supabaseExtras) {
        blob.operations = supabaseExtras.operations;
        blob.tenders = supabaseExtras.tenders;
        blob.awards = supabaseExtras.awards;
        blob.annualReports = supabaseExtras.annualReports;
        blob.galleryImages = supabaseExtras.galleryImages;
        blob.speeches = supabaseExtras.speeches;
      }
      if (supabaseCustom) {
        blob.customPages = supabaseCustom.customPages;
        blob.customForms = supabaseCustom.customForms;
      }
      setContent(blob);
    }
  }

  async function loadBackendSubscribers() {
    if (!IS_ADMIN_CONTEXT) {
      return;
    }
    try {
      const res = await fetch(apiUrl('subscribe'), { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Backend subscribers not available');
      }
      const data = await res.json();
      if (Array.isArray(data.subscribers)) {
        setSubscribers(data.subscribers.map((s) => ({ email: s.email, when: s.subscribed_at })));
      }
    } catch (e) {
      console.warn('[MOD_STORE] backend subscribers load failed:', e);
      if (!STATE.subscribers) {
        STATE.subscribers = loadLocalSubscribers();
      }
    }
  }

  // saveBackend: kept for compatibility but no longer used — all content
  // edits now go through the admin panel PHP CRUD forms directly.
  async function saveBackend(blob) {
    if (!CSRF_TOKEN) return;
    try {
      await fetch(apiUrl('admin/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf_token: CSRF_TOKEN, blob }),
      });
    } catch (e) {
      console.warn('[MOD_STORE] backend save failed:', e);
    }
  }

  // Post a subscriber change to the backend.
  async function postSubscriber(email, action = 'add', extraFields = {}) {
    try {
      const body = { action, email, ...extraFields };
      const res = await fetch(apiUrl('subscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.ok ? await res.json() : null;
    } catch (e) {
      console.warn('[MOD_STORE] backend subscriber request failed:', e);
      return null;
    }
  }

  function loadContent() {
    if (!STATE.content) {
      STATE.content = loadLocalContent();
    }
    return STATE.content;
  }

  function loadSubscribers() {
    if (!STATE.subscribers) {
      STATE.subscribers = loadLocalSubscribers();
    }
    return STATE.subscribers;
  }

  const STORE = {
    get() { return loadContent(); },
    slides() { return loadContent().slides; },
    press() { return loadContent().press; },
    previewPress: loadSupabasePressPreview,
    previewCustomPage,
    previewCustomForm,
    leadership() { return loadContent().leadership; },
    directors() { return loadContent().directors; },
    operations() { return loadContent().operations; },
    tenders() { return loadContent().tenders; },
    awards() { return loadContent().awards; },
    annualReports() { return loadContent().annualReports; },
    galleryImages() { return loadContent().galleryImages; },
    speeches() { return loadContent().speeches; },
    customPages() { return loadContent().customPages; },
    customForms() { return loadContent().customForms; },
    hero() { return loadContent().hero; },
    settings() { return loadContent().settings; },

    save(blob) {
      setContent(blob);
      saveBackend(blob);
    },

    update(path, value) {
      const blob = loadContent();
      const parts = path.split('.');
      let cur = blob;
      for (let i = 0; i < parts.length - 1; i += 1) {
        const k = parts[i];
        if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
        cur = cur[k];
      }
      cur[parts[parts.length - 1]] = value;
      setContent(blob);
      saveBackend(blob);
    },

    export() {
      return JSON.stringify(loadContent(), null, 2);
    },

    import(json) {
      try {
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        setContent(parsed);
        saveBackend(parsed);
        return true;
      } catch (e) {
        console.warn('[MOD_STORE] import failed:', e);
        return false;
      }
    },

    reset() {
      try { localStorage.removeItem(KEY); } catch {}
      STATE.content = defaults();
      dispatchUpdate();
      if (IS_ADMIN_CONTEXT) {
        saveBackend(STATE.content);
      }
    },

    subscribers() {
      return loadSubscribers();
    },

    addSubscriber(email) {
      if (!email) return false;
      const list = loadSubscribers();
      const normalized = String(email).trim().toLowerCase();
      const exists = list.find((s) => s.email.toLowerCase() === normalized);
      if (exists) return false;
      const subscriber = { email: normalized, when: new Date().toISOString() };
      list.unshift(subscriber);
      setSubscribers(list);
      postSubscriber(normalized, 'add');
      return true;
    },

    // Validate on backend first (with full payload for spam checks), then update local list.
    async syncSubscriberFull(payload = {}) {
      const email = String(payload.email || '').trim().toLowerCase();
      if (!email) return null;
      const list   = loadSubscribers();
      const exists = list.find((s) => s.email.toLowerCase() === email);
      if (exists) {
        return { error: 'You are already subscribed with that email.' };
      }
      try {
        const { email: _e, action: _a, ...extra } = payload;
        const res = await postSubscriber(email, 'add', extra);
        if (res && res.success) {
          list.unshift({ email, when: new Date().toISOString() });
          setSubscribers(list);
        }
        return res;
      } catch (e) {
        return null;
      }
    },

    removeSubscriber(email) {
      const list = loadSubscribers().filter((s) => s.email.toLowerCase() !== String(email).toLowerCase());
      setSubscribers(list);
      if (IS_ADMIN_CONTEXT) {
        postSubscriber(email, 'remove');
      }
    },

    exportSubscribers() {
      const list = loadSubscribers();
      const rows = [['email', 'subscribed_at']].concat(list.map((s) => [s.email, s.when]));
      return rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    },
  };

  window.MOD_STORE = STORE;

  loadBackendContent();
  if (IS_ADMIN_CONTEXT) {
    loadBackendSubscribers();
  }
})(window);
