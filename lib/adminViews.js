export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Static assets (admin/admin.css, assets/images/...) stay on disk at their
// original repo-relative paths and are served by Vercel's static hosting —
// since the Node admin pages live at /api/admin/*, paths must be root-
// relative ('/assets/...'), unlike the old PHP version's '../' hack which
// was relative to the admin/ subfolder.
export function resolveAdminImageUrl(url) {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) return '';
  if (/^(?:https?:\/\/|\/\/|\/)/i.test(trimmed)) return trimmed;
  return '/' + trimmed.replace(/^\.*\/*/, '');
}

function strimwidth(value, len) {
  const s = String(value ?? '');
  return s.length > len ? s.slice(0, len) + '…' : s;
}

function formatDate(value, opts) {
  if (!value) return '';
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return '';
  return new Date(ts).toLocaleDateString('en-GB', opts);
}

function pageShell({ title, bodyClass, head = '', body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/assets/images/favicon.png" />
  ${head}
</head>
<body class="${bodyClass}">
${body}
</body>
</html>`;
}

export function renderLoginPage({ error, csrf, email = '' }) {
  return pageShell({
    title: 'Admin Login — MOD Website',
    bodyClass: 'admin-body',
    head: `<link rel="stylesheet" href="/assets/css/style.css?v=19" />
  <link rel="stylesheet" href="/admin/admin.css" />`,
    body: `  <div class="admin-login-shell">
    <section class="admin-login-card">
      <div class="admin-login-panel">
        <a class="admin-login-brand" href="/index.html">
          <img src="/assets/images/coat-of-arms.jpg" alt="Federal coat of arms" width="52" height="52" />
          <div>
            <strong>Ministry of Defence</strong>
            <span>Secure administration login</span>
          </div>
        </a>

        ${error ? `<div class="admin-login-alert">${escapeHtml(error)}</div>` : ''}

        <form method="post" action="/api/admin/login" novalidate>
          <label for="email">Email address</label>
          <input id="email" name="email" type="email" autocomplete="email" required placeholder="admin@example.com" value="${escapeHtml(email)}" />

          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required placeholder="Password" />

          <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
          <button class="btn btn-green btn-full" type="submit">Sign in</button>
        </form>

        <p class="admin-login-footer"><a href="/">← Back to public site</a></p>
      </div>
    </section>
  </div>`,
  });
}

export function renderSetupPage({ errors = [], success = null, csrf }) {
  const dbName = process.env.DB_NAME || (process.env.DATABASE_URL ? '(from DATABASE_URL)' : 'mod3');
  return pageShell({
    title: 'Admin Setup — MOD Website',
    bodyClass: '',
    head: `<link rel="stylesheet" href="/assets/css/style.css" />
  <link rel="stylesheet" href="/admin/admin.css" />`,
    body: `  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <p class="eyebrow">Admin Setup</p>
        <h1>Install the MOD admin backend</h1>
        <p class="lead">This page creates the MySQL tables and the first administrator account for the Node.js backend.</p>
      </div>
    </header>

    ${errors.length ? `<div class="alert alert-error">
      <strong>Setup could not complete.</strong>
      <ul>
        ${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('\n        ')}
      </ul>
    </div>` : success ? `<div class="alert alert-success">${escapeHtml(success)}</div>` : ''}

    <section class="admin-section">
      <form method="post" novalidate>
        <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />

        <div class="form-row">
          <label>
            Administrator email
            <input type="email" name="admin_email" required placeholder="admin@example.com" value="admin@example.com" />
          </label>
          <label>
            Password
            <input type="password" name="admin_password" required placeholder="Choose a strong password (min. 10 characters)" />
          </label>
        </div>

        <div class="form-row">
          <label>
            Confirm password
            <input type="password" name="admin_password_confirm" required placeholder="Repeat password" />
          </label>
          <label>
            Database name
            <input type="text" disabled value="${escapeHtml(dbName)}" />
          </label>
        </div>

        <div class="form-row">
          <label>
            Setup secret <span class="field-hint">(the SETUP_SECRET environment variable)</span>
            <input type="text" name="setup_secret" required placeholder="Paste the SETUP_SECRET value" />
          </label>
        </div>

        <button type="submit" class="btn btn-green">Create admin backend</button>
      </form>
    </section>

    <section class="admin-section">
      <h2>Next steps</h2>
      <ul>
        <li>This endpoint locks itself automatically once an administrator account exists.</li>
        <li>Open <a href="/api/admin/login">/api/admin/login</a> to sign in.</li>
        <li>Use the admin dashboard to manage homepage slides, leadership headshots, and press content.</li>
      </ul>
    </section>
  </main>`,
  });
}

const DEPARTMENT_OPTIONS = [
  ['joint-services', 'Joint Services'],
  ['human-resources', 'Human Resource Management'],
  ['prs', 'Planning, Research & Statistics'],
  ['army-affairs', 'Army Affairs'],
  ['navy-affairs', 'Navy Affairs'],
  ['air-force-affairs', 'Air Force Affairs'],
  ['finance-accounts', 'Finance & Accounts'],
  ['procurement-dept', 'Procurement'],
  ['legal', 'Legal Services'],
  ['health-services', 'Health Services'],
  ['general-services', 'General Services'],
  ['public-relations', 'Information & Public Relations'],
  ['education-services', 'Education Services'],
  ['internal-audit', 'Internal Audit'],
  ['reform-coordination', 'Reform Coordination & Service Improvement'],
];

function badge(active, activeLabel = 'Active', inactiveLabel = 'Disabled') {
  return `<span class="badge badge-${active ? 'active' : 'disabled'}">${active ? activeLabel : inactiveLabel}</span>`;
}

function deleteForm(csrf, action, idField, id, confirmMsg) {
  return `<form method="post" class="inline-form" onsubmit="return confirm('${confirmMsg.replace(/'/g, "\\'")}');">
  <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
  <input type="hidden" name="action" value="${action}" />
  <input type="hidden" name="${idField}" value="${escapeHtml(id)}" />
  <button type="submit" class="btn btn-sm btn-danger">Remove</button>
</form>`;
}

function sidebarNav() {
  const items = [
    ['dashboard', 'Dashboard'],
    ['slides', 'Hero & Slider'],
    ['press', 'Press Releases'],
    ['leadership', 'Leadership'],
    ['gallery', 'Gallery'],
    ['operations', 'Operations'],
    ['procurement', 'Procurement'],
    ['annual-reports', 'Annual Reports'],
    ['directors', 'Directors'],
    ['subscribers', 'Newsletter'],
    ['submissions', 'Form Submissions'],
    ['settings', 'Site Settings'],
  ];
  return `<nav class="admin-nav" aria-label="Admin navigation">
      ${items.map(([id, label]) => `<a class="admin-nav-btn${id === 'dashboard' ? ' active' : ''}" href="#${id}">${escapeHtml(label)}</a>`).join('\n      ')}
    </nav>`;
}

function renderDashboardSection({ flash, usingFallback, csrf, slides, pressItems, leaders, subscribers, allSubmissions, galleryImages, operations }) {
  return `<section class="admin-section active" id="dashboard">
      <div class="admin-header">
        <div class="admin-header-text">
          <h1>Dashboard.</h1>
          <p>Welcome back. All edits update the public site immediately.</p>
        </div>
      </div>

      ${flash ? `<div class="alert alert-${flash.type === 'error' ? 'error' : 'success'}">${escapeHtml(flash.message)}</div>` : ''}

      ${usingFallback ? `<div class="alert alert-info" style="margin-bottom:20px;">
        <div>
          <strong>Using default content.</strong> The homepage database is empty — showing built-in defaults.
          <form method="post" style="display:inline-block; margin-left:12px;">
            <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
            <input type="hidden" name="action" value="import_defaults" />
            <button type="submit" class="btn btn-gold btn-sm">Import default content</button>
          </form>
        </div>
      </div>` : ''}

      <div class="admin-stats">
        <div class="stat-card"><div class="stat-num">${pressItems.length}</div><div class="stat-label">Press releases</div></div>
        <div class="stat-card"><div class="stat-num">${slides.length}</div><div class="stat-label">Hero slides</div></div>
        <div class="stat-card"><div class="stat-num">${subscribers.length}</div><div class="stat-label">Subscribers</div></div>
        <div class="stat-card"><div class="stat-num">${allSubmissions.length}</div><div class="stat-label">Form submissions</div></div>
        <div class="stat-card"><div class="stat-num">${leaders.length}</div><div class="stat-label">Leadership profiles</div></div>
        <div class="stat-card"><div class="stat-num">${galleryImages.length}</div><div class="stat-label">Gallery images</div></div>
        <div class="stat-card"><div class="stat-num">${operations.length}</div><div class="stat-label">Active operations</div></div>
      </div>
    </section>`;
}

function renderSlidesSection({ csrf, slides, editSlide }) {
  const rows = slides.map((s) => `<tr>
          <td><img src="${escapeHtml(resolveAdminImageUrl(s.image_url))}" alt="${escapeHtml(s.alt_text)}" style="width:64px;height:40px;object-fit:cover;border-radius:4px;" /></td>
          <td><strong>${escapeHtml(s.role_text)}</strong><p>${escapeHtml(strimwidth(s.caption_text, 60))}</p></td>
          <td>${escapeHtml(strimwidth(s.alt_text, 40))}</td>
          <td>${escapeHtml(s.sort_order)}</td>
          <td>${badge(s.active)}</td>
          <td><div class="row-actions">
            <a class="btn btn-sm btn-outline" href="?edit_slide=${escapeHtml(s.id)}#slides">Edit</a>
            ${deleteForm(csrf, 'delete_slide', 'slide_id', s.id, 'Remove this slide permanently?')}
          </div></td>
        </tr>`).join('\n        ');

  return `<section class="admin-section" id="slides">
      <div class="admin-header">
        <div class="admin-header-text"><h1>Hero &amp; Slider.</h1><p>Manage the homepage hero carousel.</p></div>
        <div class="admin-header-actions"><a class="btn btn-green btn-sm" href="#slide-edit-panel">Add slide</a></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Hero slides</h3><p>Upload a local file or provide a valid path.</p></div></div>
        ${slides.length ? `<div class="table-scroll"><table>
          <thead><tr><th>Preview</th><th>Role / Caption</th><th>Alt text</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
        ${rows}
          </tbody>
        </table></div>` : '<div class="empty-state"><p>No slides configured yet.</p></div>'}
      </div>

      <div class="panel" id="slide-edit-panel">
        <h3>${editSlide ? 'Edit slide' : 'Add new slide'}</h3>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
          <input type="hidden" name="action" value="save_slide" />
          <input type="hidden" name="slide_id" value="${escapeHtml(editSlide?.id ?? '0')}" />
          <div class="form-row">
            <label>Image path or URL<input type="text" name="slide_image_url" value="${escapeHtml(editSlide?.image_url ?? '')}" placeholder="assets/images/hero/slide-1.jpg" /></label>
            <label>Upload new image<input type="file" name="slide_image_file" accept="image/*" /></label>
          </div>
          <div class="form-row">
            <label>Alt text<input type="text" name="slide_alt" value="${escapeHtml(editSlide?.alt_text ?? '')}" /></label>
            <label>Role label<input type="text" name="slide_role" value="${escapeHtml(editSlide?.role_text ?? '')}" placeholder="e.g. Nigerian Army" /></label>
          </div>
          <div class="form-row">
            <label>Caption<textarea name="slide_caption" rows="3">${escapeHtml(editSlide?.caption_text ?? '')}</textarea></label>
            <label>Sort order<input type="number" name="slide_order" value="${escapeHtml(editSlide?.sort_order ?? '0')}" min="0" /></label>
          </div>
          <label class="checkbox-label"><input type="checkbox" name="slide_active" value="1" ${!editSlide || editSlide.active ? 'checked' : ''} /> Show this slide on the public site</label>
          <div class="form-actions">
            <button type="submit" class="btn btn-green">${editSlide ? 'Update slide' : 'Save slide'}</button>
            ${editSlide ? '<a href="/api/admin/index#slides" class="btn btn-ghost">Cancel</a>' : ''}
          </div>
        </form>
      </div>
    </section>`;
}

function renderPressSection({ csrf, pressItems, editPress }) {
  const rows = pressItems.map((p) => `<tr>
          <td><strong>${escapeHtml(p.title)}</strong>${p.excerpt ? `<p>${escapeHtml(strimwidth(p.excerpt, 70))}</p>` : ''}</td>
          <td>${escapeHtml(p.category)}</td>
          <td>${escapeHtml(p.published_at)}</td>
          <td>${badge(p.active)}</td>
          <td><div class="row-actions">
            <a class="btn btn-sm btn-outline" href="?edit_press=${escapeHtml(p.id)}#press">Edit</a>
            ${deleteForm(csrf, 'delete_press', 'press_id', p.id, 'Remove this press release?')}
          </div></td>
        </tr>`).join('\n        ');

  const publishedAt = editPress?.published_at ? new Date(editPress.published_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  return `<section class="admin-section" id="press">
      <div class="admin-header">
        <div class="admin-header-text"><h1>Press releases.</h1><p>The first active item appears as the featured story on the home page.</p></div>
        <div class="admin-header-actions"><a class="btn btn-green btn-sm" href="#press-edit-panel">New release</a></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>All press releases</h3><p>${pressItems.length} item${pressItems.length !== 1 ? 's' : ''} total</p></div></div>
        ${pressItems.length ? `<div class="table-scroll"><table>
          <thead><tr><th>Title</th><th>Category</th><th>Published</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
        ${rows}
          </tbody>
        </table></div>` : '<div class="empty-state"><p>No press releases yet.</p></div>'}
      </div>

      <div class="panel" id="press-edit-panel">
        <h3>${editPress ? 'Edit press release' : 'Add new press release'}</h3>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
          <input type="hidden" name="action" value="save_press" />
          <input type="hidden" name="press_id" value="${escapeHtml(editPress?.id ?? '0')}" />
          <div class="form-row">
            <label>Title<input type="text" name="press_title" value="${escapeHtml(editPress?.title ?? '')}" required /></label>
            <label>Category<input type="text" name="press_category" value="${escapeHtml(editPress?.category ?? '')}" placeholder="Press Office, Operations…" /></label>
          </div>
          <div class="form-row">
            <label>Published date<input type="date" name="press_published_at" value="${escapeHtml(publishedAt)}" required /></label>
            <label>Sort order<input type="number" name="press_order" value="${escapeHtml(editPress?.sort_order ?? '0')}" min="0" /></label>
          </div>
          <div class="form-row full"><label>Excerpt / summary<textarea name="press_excerpt" rows="3">${escapeHtml(editPress?.excerpt ?? '')}</textarea></label></div>
          <div class="form-row full"><label>Full article body <span class="field-hint">(supports basic HTML)</span><textarea name="press_body" rows="14">${escapeHtml(editPress?.body ?? '')}</textarea></label></div>
          <div class="form-row">
            <label>Image path<input type="text" name="press_image_url" value="${escapeHtml(editPress?.image_url ?? '')}" /></label>
            <label>Upload image<input type="file" name="press_image_file" accept="image/*" /></label>
          </div>
          <div class="form-row"><label>Slug <span class="field-hint">(auto-generated if left blank)</span><input type="text" name="press_slug" value="${escapeHtml(editPress?.slug ?? '')}" /></label></div>
          <label class="checkbox-label"><input type="checkbox" name="press_active" value="1" ${!editPress || editPress.active ? 'checked' : ''} /> Publish this release</label>
          <div class="form-actions">
            <button type="submit" class="btn btn-green">${editPress ? 'Update release' : 'Save release'}</button>
            ${editPress ? '<a href="/api/admin/index#press" class="btn btn-ghost">Cancel</a>' : ''}
          </div>
        </form>
      </div>
    </section>`;
}

function renderLeadershipSection({ csrf, leaders, editLeader }) {
  const rows = leaders.map((l) => `<tr>
          <td><img class="avatar" src="${escapeHtml(resolveAdminImageUrl(l.photo_url))}" alt="${escapeHtml(l.name)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" /></td>
          <td><strong>${escapeHtml(l.name)}</strong></td>
          <td>${escapeHtml(l.title)}<p>${escapeHtml(l.position_key)}</p></td>
          <td>${escapeHtml(l.sort_order)}</td>
          <td>${badge(l.active)}</td>
          <td><div class="row-actions">
            <a class="btn btn-sm btn-outline" href="?edit_leader=${escapeHtml(l.id)}#leadership">Edit</a>
            ${deleteForm(csrf, 'delete_leader', 'leader_id', l.id, 'Remove this leader profile?')}
          </div></td>
        </tr>`).join('\n        ');

  const positionOptions = [
    ['minister', 'Honourable Minister of Defence'],
    ['ministerOfState', 'Honourable Minister of State'],
    ['permSec', 'Permanent Secretary'],
    ['other', 'Other'],
  ];

  return `<section class="admin-section" id="leadership">
      <div class="admin-header">
        <div class="admin-header-text"><h1>Leadership.</h1><p>Minister, Minister of State, Permanent Secretary and other senior profiles.</p></div>
        <div class="admin-header-actions"><a class="btn btn-green btn-sm" href="#leadership-edit-panel">Add profile</a></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Leadership profiles</h3><p>${leaders.length} profile${leaders.length !== 1 ? 's' : ''} configured</p></div></div>
        ${leaders.length ? `<div class="table-scroll"><table>
          <thead><tr><th>Photo</th><th>Name</th><th>Position</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
        ${rows}
          </tbody>
        </table></div>` : '<div class="empty-state"><p>No leadership profiles yet.</p></div>'}
      </div>

      <div class="panel" id="leadership-edit-panel">
        <h3>${editLeader ? 'Edit leadership profile' : 'Add new profile'}</h3>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
          <input type="hidden" name="action" value="save_leader" />
          <input type="hidden" name="leader_id" value="${escapeHtml(editLeader?.id ?? '0')}" />
          <div class="form-row">
            <label>Position
              <select name="leader_position" required>
                ${positionOptions.map(([k, lbl]) => `<option value="${k}" ${editLeader?.position_key === k ? 'selected' : ''}>${escapeHtml(lbl)}</option>`).join('\n                ')}
              </select>
            </label>
            <label>Title / formal position<input type="text" name="leader_title" value="${escapeHtml(editLeader?.title ?? '')}" /></label>
          </div>
          <div class="form-row">
            <label>Full name<input type="text" name="leader_name" value="${escapeHtml(editLeader?.name ?? '')}" required /></label>
            <label>Profile page link<input type="text" name="leader_profile_link" value="${escapeHtml(editLeader?.profile_link ?? '')}" placeholder="minister.html" /></label>
          </div>
          <div class="form-row">
            <label>Photo path<input type="text" name="leader_photo_url" value="${escapeHtml(editLeader?.photo_url ?? '')}" /></label>
            <label>Upload photo<input type="file" name="leader_photo_file" accept="image/*" /></label>
          </div>
          <div class="form-row full"><label>Short biography<textarea name="leader_bio" rows="4">${escapeHtml(editLeader?.bio ?? '')}</textarea></label></div>
          <div class="form-row">
            <label>Sort order<input type="number" name="leader_order" value="${escapeHtml(editLeader?.sort_order ?? '0')}" min="0" /></label>
            <label class="checkbox-label"><input type="checkbox" name="leader_active" value="1" ${!editLeader || editLeader.active ? 'checked' : ''} /> Show on public site</label>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-green">${editLeader ? 'Update profile' : 'Save profile'}</button>
            ${editLeader ? '<a href="/api/admin/index#leadership" class="btn btn-ghost">Cancel</a>' : ''}
          </div>
        </form>
      </div>
    </section>`;
}

function renderGallerySection({ csrf, galleryImages, editGalleryImage }) {
  const rows = galleryImages.map((g) => `<tr>
          <td><img src="${escapeHtml(resolveAdminImageUrl(g.image_url))}" alt="${escapeHtml(g.alt_text)}" style="width:64px;height:40px;object-fit:cover;border-radius:4px;" /></td>
          <td>${escapeHtml(strimwidth(g.caption, 60))}</td>
          <td>${escapeHtml(g.category)}</td>
          <td>${g.event_date ? escapeHtml(formatDate(g.event_date, { day: 'numeric', month: 'short', year: 'numeric' })) : '—'}</td>
          <td>${escapeHtml(g.sort_order)}</td>
          <td>${badge(g.active, 'Active', 'Hidden')}</td>
          <td><div class="row-actions">
            <a class="btn btn-sm btn-outline" href="?edit_gallery=${escapeHtml(g.id)}#gallery">Edit</a>
            ${deleteForm(csrf, 'delete_gallery_image', 'gallery_id', g.id, 'Remove this image from the gallery?')}
          </div></td>
        </tr>`).join('\n        ');

  return `<section class="admin-section" id="gallery">
      <div class="admin-header">
        <div class="admin-header-text"><h1>Gallery.</h1><p>Manage the public photo gallery.</p></div>
        <div class="admin-header-actions"><a class="btn btn-green btn-sm" href="#gallery-edit-panel">Add image</a></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Gallery images</h3><p>Upload a file or provide a URL.</p></div></div>
        ${galleryImages.length ? `<div class="table-scroll"><table>
          <thead><tr><th>Preview</th><th>Caption</th><th>Category</th><th>Date</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
        ${rows}
          </tbody>
        </table></div>` : '<div class="empty-state"><p>No gallery images yet.</p></div>'}
      </div>

      <div class="panel" id="gallery-edit-panel">
        <h3>${editGalleryImage ? 'Edit gallery image' : 'Add gallery image'}</h3>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
          <input type="hidden" name="action" value="save_gallery_image" />
          <input type="hidden" name="gallery_id" value="${escapeHtml(editGalleryImage?.id ?? '0')}" />
          <div class="form-row">
            <label>Image URL or path<input type="text" name="gallery_image_url" value="${escapeHtml(editGalleryImage?.image_url ?? '')}" /></label>
            <label>Upload image file<input type="file" name="gallery_image_file" accept="image/*" /></label>
          </div>
          <div class="form-row">
            <label>Alt text<input type="text" name="gallery_alt" value="${escapeHtml(editGalleryImage?.alt_text ?? '')}" /></label>
            <label>Category<input type="text" name="gallery_category" value="${escapeHtml(editGalleryImage?.category ?? 'General')}" placeholder="e.g. Ministerial, Ceremonies, Security" /></label>
          </div>
          <div class="form-row">
            <label>Caption<textarea name="gallery_caption" rows="2">${escapeHtml(editGalleryImage?.caption ?? '')}</textarea></label>
            <label>Event date<input type="date" name="gallery_event_date" value="${escapeHtml(editGalleryImage?.event_date ?? '')}" /></label>
          </div>
          <div class="form-row"><label>Sort order<input type="number" name="gallery_order" value="${escapeHtml(editGalleryImage?.sort_order ?? '0')}" min="0" /></label></div>
          <label class="checkbox-label"><input type="checkbox" name="gallery_active" value="1" ${!editGalleryImage || editGalleryImage.active ? 'checked' : ''} /> Show this image on the public gallery</label>
          <div class="form-actions">
            <button type="submit" class="btn btn-green">${editGalleryImage ? 'Update image' : 'Save image'}</button>
            ${editGalleryImage ? '<a href="/api/admin/index#gallery" class="btn btn-ghost">Cancel</a>' : ''}
          </div>
        </form>
      </div>
    </section>`;
}

function renderOperationsSection({ csrf, operations, editOperation }) {
  const rows = operations.map((o) => `<tr>
          <td><strong>${escapeHtml(o.name)}</strong></td>
          <td>${escapeHtml(o.region)}</td>
          <td>${escapeHtml(strimwidth(o.description, 80))}</td>
          <td>${escapeHtml(o.sort_order)}</td>
          <td>${badge(o.active, 'Active', 'Hidden')}</td>
          <td><div class="row-actions">
            <a class="btn btn-sm btn-outline" href="?edit_operation=${escapeHtml(o.id)}#operations">Edit</a>
            ${deleteForm(csrf, 'delete_operation', 'op_id', o.id, 'Remove this operation?')}
          </div></td>
        </tr>`).join('\n        ');

  return `<section class="admin-section" id="operations">
      <div class="admin-header">
        <div class="admin-header-text"><h1>Operations.</h1><p>Manage active joint operations.</p></div>
        <div class="admin-header-actions"><a class="btn btn-green btn-sm" href="#operations-edit-panel">Add operation</a></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Active joint operations</h3><p>Add, edit or remove operations.</p></div></div>
        ${operations.length ? `<div class="table-scroll"><table>
          <thead><tr><th>Name</th><th>Region / Zone</th><th>Description</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
        ${rows}
          </tbody>
        </table></div>` : '<div class="empty-state"><p>No operations yet.</p></div>'}
      </div>

      <div class="panel" id="operations-edit-panel">
        <h3>${editOperation ? 'Edit operation' : 'Add operation'}</h3>
        <form method="post">
          <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
          <input type="hidden" name="action" value="save_operation" />
          <input type="hidden" name="op_id" value="${escapeHtml(editOperation?.id ?? '0')}" />
          <div class="form-row">
            <label>Operation name <span style="color:var(--red)">*</span><input type="text" name="op_name" value="${escapeHtml(editOperation?.name ?? '')}" required /></label>
            <label>Region / Zone<input type="text" name="op_region" value="${escapeHtml(editOperation?.region ?? '')}" /></label>
          </div>
          <div class="form-row"><label>Description<textarea name="op_description" rows="3">${escapeHtml(editOperation?.description ?? '')}</textarea></label></div>
          <div class="form-row"><label>Sort order<input type="number" name="op_order" value="${escapeHtml(editOperation?.sort_order ?? '0')}" min="0" /></label></div>
          <label class="checkbox-label"><input type="checkbox" name="op_active" value="1" ${!editOperation || editOperation.active ? 'checked' : ''} /> Show on public site</label>
          <div class="form-actions">
            <button type="submit" class="btn btn-green">${editOperation ? 'Update operation' : 'Save operation'}</button>
            ${editOperation ? '<a href="/api/admin/index#operations" class="btn btn-ghost">Cancel</a>' : ''}
          </div>
        </form>
      </div>
    </section>`;
}

function renderProcurementSection({ csrf, tenders, awards, editTender }) {
  const docLink = (url) => (url ? `<a href="${escapeHtml(url)}" target="_blank" class="btn-link">Download</a>` : '<span style="color:var(--text-3)">No file</span>');

  const tenderRows = tenders.map((t) => `<tr>
          <td><strong>${escapeHtml(strimwidth(t.title, 60))}</strong></td>
          <td>${escapeHtml(t.ref_number)}</td>
          <td>${escapeHtml(t.category)}</td>
          <td>${escapeHtml(t.method)}</td>
          <td>${t.closes_at ? escapeHtml(formatDate(t.closes_at, { day: 'numeric', month: 'short', year: 'numeric' })) : '—'}</td>
          <td>${docLink(t.doc_url)}</td>
          <td>${badge(t.active, 'Active', 'Hidden')}</td>
          <td><div class="row-actions">
            <a class="btn btn-sm btn-outline" href="?edit_tender=${t.id}#procurement">Edit</a>
            ${deleteForm(csrf, 'delete_tender', 'tender_id', t.id, 'Remove this tender?')}
          </div></td>
        </tr>`).join('\n        ');

  const awardRows = awards.map((t) => `<tr>
          <td><strong>${escapeHtml(strimwidth(t.title, 60))}</strong></td>
          <td>${escapeHtml(t.ref_number)}</td>
          <td>${escapeHtml(t.method)}</td>
          <td>${escapeHtml(strimwidth(t.description, 60))}</td>
          <td>${docLink(t.doc_url)}</td>
          <td>${badge(t.active, 'Active', 'Hidden')}</td>
          <td><div class="row-actions">
            <a class="btn btn-sm btn-outline" href="?edit_tender=${t.id}#procurement">Edit</a>
            ${deleteForm(csrf, 'delete_tender', 'tender_id', t.id, 'Remove this award?')}
          </div></td>
        </tr>`).join('\n        ');

  return `<section class="admin-section" id="procurement">
      <div class="admin-header">
        <div class="admin-header-text"><h1>Procurement.</h1><p>Manage active tenders, EOIs and contract awards. Upload bidding documents for download.</p></div>
        <div class="admin-header-actions"><a class="btn btn-green btn-sm" href="#procurement-edit-panel">Add tender</a></div>
      </div>

      <div class="panel">
        <div class="panel-head"><div><h3>Active tenders &amp; EOIs</h3></div></div>
        ${tenders.length ? `<div class="table-scroll"><table>
          <thead><tr><th>Title</th><th>Ref</th><th>Category</th><th>Method</th><th>Closing</th><th>Document</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
        ${tenderRows}
          </tbody>
        </table></div>` : '<div class="empty-state"><p>No active tenders yet.</p></div>'}
      </div>

      <div class="panel">
        <div class="panel-head"><div><h3>Contract awards</h3></div></div>
        ${awards.length ? `<div class="table-scroll"><table>
          <thead><tr><th>Title</th><th>Ref</th><th>Method</th><th>Description</th><th>Document</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
        ${awardRows}
          </tbody>
        </table></div>` : '<div class="empty-state"><p>No contract awards yet.</p></div>'}
      </div>

      <div class="panel" id="procurement-edit-panel">
        <h3>${editTender ? `Edit ${editTender.type === 'award' ? 'contract award' : 'tender'}` : 'Add tender / award'}</h3>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
          <input type="hidden" name="action" value="save_tender" />
          <input type="hidden" name="tender_id" value="${escapeHtml(editTender?.id ?? '0')}" />
          <div class="form-row">
            <label>Type
              <select name="tender_type">
                <option value="tender" ${!editTender || editTender.type === 'tender' ? 'selected' : ''}>Tender / EOI</option>
                <option value="award" ${editTender?.type === 'award' ? 'selected' : ''}>Contract Award</option>
              </select>
            </label>
            <label>Category<input type="text" name="tender_category" value="${escapeHtml(editTender?.category ?? '')}" placeholder="e.g. Supplies, Works, Services, Consultancy" /></label>
          </div>
          <div class="form-row">
            <label>Title <span style="color:var(--red)">*</span><input type="text" name="tender_title" value="${escapeHtml(editTender?.title ?? '')}" required /></label>
            <label>Reference number<input type="text" name="tender_ref" value="${escapeHtml(editTender?.ref_number ?? '')}" placeholder="e.g. MOD/2026/IT/01" /></label>
          </div>
          <div class="form-row">
            <label>Procurement method<input type="text" name="tender_method" value="${escapeHtml(editTender?.method ?? '')}" /></label>
            <label>Closing date <span class="field-hint">(tenders only)</span><input type="date" name="tender_closes_at" value="${escapeHtml(editTender?.closes_at ?? '')}" /></label>
          </div>
          <div class="form-row"><label>Description / notes<textarea name="tender_description" rows="2">${escapeHtml(editTender?.description ?? '')}</textarea></label></div>
          <div class="form-section-title">Bidding document</div>
          <div class="form-row">
            <label>Upload document <span class="field-hint">(PDF, DOC, DOCX, XLS, XLSX, ZIP)</span>
              <input type="file" name="tender_doc_file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" />
              ${editTender?.doc_url ? `<span class="field-hint">Current: <a href="${escapeHtml(editTender.doc_url)}" target="_blank">view file</a></span>` : ''}
            </label>
            <label>Or enter document URL<input type="text" name="tender_doc_url" value="${escapeHtml(editTender?.doc_url ?? '')}" /><span class="field-hint">File upload takes priority over URL</span></label>
          </div>
          <div class="form-row"><label>Sort order<input type="number" name="tender_order" value="${escapeHtml(editTender?.sort_order ?? '0')}" min="0" /></label></div>
          <label class="checkbox-label"><input type="checkbox" name="tender_active" value="1" ${!editTender || editTender.active ? 'checked' : ''} /> Show on public procurement page</label>
          <div class="form-actions">
            <button type="submit" class="btn btn-green">${editTender ? 'Update' : 'Save'}</button>
            ${editTender ? '<a href="/api/admin/index#procurement" class="btn btn-ghost">Cancel</a>' : ''}
          </div>
        </form>
      </div>
    </section>`;
}

function renderAnnualReportsSection({ csrf, annualReports, editReport }) {
  const rows = annualReports.map((r) => `<tr>
          <td><strong>${escapeHtml(r.year)}</strong></td>
          <td>${escapeHtml(strimwidth(r.title, 60))}</td>
          <td>${badge(r.status === 'latest' || r.status === 'published', r.status.charAt(0).toUpperCase() + r.status.slice(1), r.status.charAt(0).toUpperCase() + r.status.slice(1))}</td>
          <td>${r.doc_url ? `<a href="${escapeHtml(r.doc_url)}" target="_blank" class="btn-link">View PDF</a>` : '<span style="color:var(--text-3)">No file</span>'}</td>
          <td>${badge(r.active, 'Visible', 'Hidden')}</td>
          <td><div class="row-actions">
            <a class="btn btn-sm btn-outline" href="?edit_report=${r.id}#annual-reports">Edit</a>
            ${deleteForm(csrf, 'delete_report', 'report_id', r.id, 'Remove this report?')}
          </div></td>
        </tr>`).join('\n        ');

  return `<section class="admin-section" id="annual-reports">
      <div class="admin-header">
        <div class="admin-header-text"><h1>Annual Reports.</h1><p>Manage annual reports. Upload PDFs for download.</p></div>
        <div class="admin-header-actions"><a class="btn btn-green btn-sm" href="#annual-reports-edit-panel">Add report</a></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Reports library</h3></div></div>
        ${annualReports.length ? `<div class="table-scroll"><table>
          <thead><tr><th>Year</th><th>Title</th><th>Status</th><th>Document</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
        ${rows}
          </tbody>
        </table></div>` : '<div class="empty-state"><p>No reports yet.</p></div>'}
      </div>

      <div class="panel" id="annual-reports-edit-panel">
        <h3>${editReport ? 'Edit report' : 'Add annual report'}</h3>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
          <input type="hidden" name="action" value="save_report" />
          <input type="hidden" name="report_id" value="${escapeHtml(editReport?.id ?? '0')}" />
          <div class="form-row">
            <label>Year <span style="color:var(--red)">*</span><input type="number" name="report_year" value="${escapeHtml(editReport?.year ?? new Date().getFullYear())}" min="1990" max="2099" required /></label>
            <label>Status
              <select name="report_status">
                <option value="latest" ${editReport?.status === 'latest' ? 'selected' : ''}>Latest</option>
                <option value="published" ${!editReport || editReport.status === 'published' ? 'selected' : ''}>Published</option>
                <option value="pending" ${editReport?.status === 'pending' ? 'selected' : ''}>Pending / Coming soon</option>
              </select>
            </label>
          </div>
          <div class="form-row"><label>Title <span style="color:var(--red)">*</span><input type="text" name="report_title" value="${escapeHtml(editReport?.title ?? '')}" required /></label></div>
          <div class="form-row"><label>Description<textarea name="report_description" rows="2">${escapeHtml(editReport?.description ?? '')}</textarea></label></div>
          <div class="form-section-title">PDF Document</div>
          <div class="form-row">
            <label>Upload PDF
              <input type="file" name="report_doc_file" accept=".pdf,.doc,.docx" />
              ${editReport?.doc_url ? `<span class="field-hint">Current: <a href="${escapeHtml(editReport.doc_url)}" target="_blank">view file</a></span>` : ''}
            </label>
            <label>Or enter document URL<input type="text" name="report_doc_url" value="${escapeHtml(editReport?.doc_url ?? '')}" /></label>
          </div>
          <div class="form-row"><label>Sort order<input type="number" name="report_order" value="${escapeHtml(editReport?.sort_order ?? '0')}" min="0" /></label></div>
          <label class="checkbox-label"><input type="checkbox" name="report_active" value="1" ${!editReport || editReport.active ? 'checked' : ''} /> Show on public annual reports page</label>
          <div class="form-actions">
            <button type="submit" class="btn btn-green">${editReport ? 'Update report' : 'Save report'}</button>
            ${editReport ? '<a href="/api/admin/index#annual-reports" class="btn btn-ghost">Cancel</a>' : ''}
          </div>
        </form>
      </div>
    </section>`;
}

function renderDirectorsSection({ csrf, directors }) {
  const bySlug = {};
  for (const d of directors) bySlug[d.dept_slug] = d;

  const rows = DEPARTMENT_OPTIONS.map(([slug, deptName]) => {
    const dir = bySlug[slug] || null;
    const photoPath = dir ? dir.photo_url : `assets/images/directors/${slug}-director.jpg`;
    return `<tr>
          <td><img src="${escapeHtml(resolveAdminImageUrl(photoPath))}" alt="${escapeHtml(dir ? dir.director : '')}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'" /></td>
          <td><strong>${escapeHtml(deptName)}</strong></td>
          <td>${escapeHtml(dir ? dir.director : '—')}</td>
          <td>${badge(Boolean(dir), 'Database', 'Static fallback')}</td>
          <td><a class="btn btn-sm btn-outline" href="#directors" onclick="fillDirectorForm('${slug}', '${escapeHtml((dir?.director || '').replace(/'/g, "\\'"))}', '${escapeHtml((dir?.role || '').replace(/'/g, "\\'"))}', '${escapeHtml((dir?.photo_url || '').replace(/'/g, "\\'"))}')">Edit</a></td>
        </tr>`;
  }).join('\n        ');

  return `<section class="admin-section" id="directors">
      <div class="admin-header">
        <div class="admin-header-text"><h1>Directors.</h1><p>Update director names, roles and photos for each department.</p></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h3>Current directors</h3><p>Photo and name updates override the static fallback.</p></div></div>
        <div class="table-scroll"><table>
          <thead><tr><th>Photo</th><th>Department</th><th>Director name</th><th>Source</th><th>Action</th></tr></thead>
          <tbody>
        ${rows}
          </tbody>
        </table></div>
      </div>

      <div class="panel">
        <h3>Update director</h3>
        <form method="post" enctype="multipart/form-data" id="director-form">
          <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
          <input type="hidden" name="action" value="save_director" />
          <div class="form-row">
            <label>Department <span style="color:var(--red)">*</span>
              <select name="director_dept_slug" id="director-dept-slug">
                <option value="">— select department —</option>
                ${DEPARTMENT_OPTIONS.map(([slug, name]) => `<option value="${slug}">${escapeHtml(name)}</option>`).join('\n                ')}
                <option value="permanent-secretary">Office of the Permanent Secretary</option>
              </select>
            </label>
            <label>Director name <span style="color:var(--red)">*</span><input type="text" name="director_name" id="director-name" /></label>
          </div>
          <div class="form-row"><label>Role / title<input type="text" name="director_role" id="director-role" /></label></div>
          <div class="form-row">
            <label>Upload new photo<input type="file" name="director_photo_file" accept="image/*" /></label>
            <label>Or enter photo URL / path<input type="text" name="director_photo_url" id="director-photo-url" /></label>
          </div>
          <div class="form-actions"><button type="submit" class="btn btn-green">Save director</button></div>
        </form>
      </div>
    </section>
    <script>
    function fillDirectorForm(slug, name, role, photo) {
      document.getElementById('director-dept-slug').value = slug;
      document.getElementById('director-name').value = name;
      document.getElementById('director-role').value = role;
      document.getElementById('director-photo-url').value = photo;
      document.getElementById('director-form').scrollIntoView({behavior:'smooth', block:'start'});
    }
    </script>`;
}

function renderSubscribersSection({ subscribers }) {
  const rows = subscribers.map((s, i) => `<tr><td>${i + 1}</td><td><strong>${escapeHtml(s.email)}</strong></td><td>${escapeHtml(s.subscribed_at)}</td></tr>`).join('\n        ');
  return `<section class="admin-section" id="subscribers">
      <div class="admin-header">
        <div class="admin-header-text"><h1>Newsletter.</h1><p>Citizens who have subscribed to press releases and updates.</p></div>
      </div>
      <div class="panel">
        ${subscribers.length ? `<div class="table-scroll"><table>
          <thead><tr><th>#</th><th>Email address</th><th>Subscribed at</th></tr></thead>
          <tbody>
        ${rows}
          </tbody>
        </table></div>` : '<div class="empty-state"><p>No subscribers yet.</p></div>'}
      </div>
    </section>`;
}

function renderSubmissionsSection({ csrf, allSubmissions, counts }) {
  const typeMeta = { foi: ['badge-info', 'FOI'], servicom: ['badge-warn', 'SERVICOM'] };
  const rows = allSubmissions.map((s, i) => {
    const [badgeClass, typeLabel] = typeMeta[s.form_type] || ['badge-active', 'Contact'];
    const metaLines = Object.entries(s.meta || {})
      .filter(([k, v]) => v !== '' && k !== 'website')
      .map(([k, v]) => `<strong>${escapeHtml(k.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))}:</strong> ${escapeHtml(String(v))}`);
    return `<tr data-form-type="${escapeHtml(s.form_type)}">
          <td>${i + 1}</td>
          <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
          <td><strong>${escapeHtml(s.name)}</strong></td>
          <td><a href="mailto:${escapeHtml(s.email)}" style="color:var(--green);">${escapeHtml(s.email)}</a></td>
          <td>${escapeHtml(s.subject)}</td>
          <td style="white-space:nowrap;">${escapeHtml(formatDate(s.submitted_at, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</td>
          <td>${metaLines.length ? `<details style="font-size:.78rem;"><summary style="cursor:pointer;">View details</summary><div style="margin-top:6px; line-height:1.7;">${metaLines.join('<br>')}</div></details>` : '<span style="color:var(--text-3);">—</span>'}</td>
          <td>${deleteForm(csrf, 'delete_submission', 'submission_id', s.id, 'Delete this submission permanently?')}</td>
        </tr>`;
  }).join('\n        ');

  return `<section class="admin-section" id="submissions">
      <div class="admin-header">
        <div class="admin-header-text"><h1>Form Submissions.</h1><p>Contact, FOI, and SERVICOM requests submitted through the public website.</p></div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
        <button class="btn btn-sm btn-green" id="sub-tab-all" onclick="filterSubmissions('all')">All (${counts.all})</button>
        <button class="btn btn-sm btn-outline" id="sub-tab-contact" onclick="filterSubmissions('contact')">Contact (${counts.contact})</button>
        <button class="btn btn-sm btn-outline" id="sub-tab-foi" onclick="filterSubmissions('foi')">FOI (${counts.foi})</button>
        <button class="btn btn-sm btn-outline" id="sub-tab-servicom" onclick="filterSubmissions('servicom')">SERVICOM (${counts.servicom})</button>
      </div>
      <div class="panel" id="submissions-panel">
        ${allSubmissions.length ? `<div class="table-scroll"><table id="submissions-table">
          <thead><tr><th>#</th><th>Type</th><th>Name</th><th>Email</th><th>Subject / Reference</th><th>Submitted</th><th>Details</th><th>Action</th></tr></thead>
          <tbody>
        ${rows}
          </tbody>
        </table></div>` : '<div class="empty-state"><p>No submissions yet.</p></div>'}
      </div>
    </section>`;
}

function renderSettingsSection({ csrf, settings }) {
  return `<section class="admin-section" id="settings">
      <div class="admin-header">
        <div class="admin-header-text"><h1>Site settings.</h1><p>Global metadata and hero copy shown across the public website.</p></div>
      </div>
      <div class="settings-grid">
        <div class="settings-card">
          <h4>Ministry identity</h4>
          <p class="card-desc">Names and labels used in the site header, footer and metadata.</p>
          <form method="post">
            <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
            <input type="hidden" name="action" value="save_settings" />
            <div style="margin-bottom:14px;"><label>Ministry name<input type="text" name="ministry_name" value="${escapeHtml(settings.ministry_name)}" /></label></div>
            <div style="margin-bottom:14px;"><label>Country line<input type="text" name="country" value="${escapeHtml(settings.country)}" /></label></div>
            <div style="margin-bottom:20px;"><label>Last reviewed (e.g. May 2026)<input type="text" name="last_reviewed" value="${escapeHtml(settings.last_reviewed)}" /></label></div>
            <input type="hidden" name="hero_eyebrow" value="${escapeHtml(settings.hero_eyebrow)}" />
            <input type="hidden" name="hero_headline" value="${escapeHtml(settings.hero_headline)}" />
            <input type="hidden" name="hero_body" value="${escapeHtml(settings.hero_body)}" />
            <button type="submit" class="btn btn-green btn-sm">Save identity</button>
          </form>
        </div>

        <div class="settings-card">
          <h4>Homepage hero copy</h4>
          <p class="card-desc">The eyebrow label, main headline and body text in the hero section.</p>
          <form method="post">
            <input type="hidden" name="csrf" value="${escapeHtml(csrf)}" />
            <input type="hidden" name="action" value="save_settings" />
            <input type="hidden" name="ministry_name" value="${escapeHtml(settings.ministry_name)}" />
            <input type="hidden" name="country" value="${escapeHtml(settings.country)}" />
            <input type="hidden" name="last_reviewed" value="${escapeHtml(settings.last_reviewed)}" />
            <div style="margin-bottom:14px;"><label>Eyebrow label<input type="text" name="hero_eyebrow" value="${escapeHtml(settings.hero_eyebrow)}" /></label></div>
            <div style="margin-bottom:14px;"><label>Headline<input type="text" name="hero_headline" value="${escapeHtml(settings.hero_headline)}" /></label></div>
            <div style="margin-bottom:20px;"><label>Body text<textarea name="hero_body" rows="4">${escapeHtml(settings.hero_body)}</textarea></label></div>
            <button type="submit" class="btn btn-green btn-sm">Save hero copy</button>
          </form>
        </div>
      </div>
    </section>`;
}

export function renderDashboardPage(data) {
  const { csrf } = data;
  const counts = {
    all: data.allSubmissions.length,
    contact: data.allSubmissions.filter((s) => s.form_type === 'contact').length,
    foi: data.allSubmissions.filter((s) => s.form_type === 'foi').length,
    servicom: data.allSubmissions.filter((s) => s.form_type === 'servicom').length,
  };

  const body = `<div class="admin-shell" id="admin-shell">
  <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
  <aside class="admin-sidebar">
    <div class="admin-brand">
      <img src="/assets/images/coat-of-arms.jpg" alt="Nigerian Coat of Arms" />
      <div><div class="brand-name">MOD Admin</div><div class="brand-sub">Content Management</div></div>
    </div>
    <div class="admin-user">
      <div class="admin-user-avatar">A</div>
      <div class="admin-user-info"><div class="admin-user-name">Administrator</div><div class="admin-user-role">Super Admin</div></div>
    </div>
    ${sidebarNav()}
    <div class="admin-foot">
      <a href="/" target="_blank">View public site</a>
      <a href="/api/admin/logout" class="logout">Sign out</a>
    </div>
  </aside>

  <main class="admin-main">
    <div class="admin-topbar">
      <div class="topbar-left">
        <button class="sidebar-toggle" type="button" aria-expanded="false" aria-label="Toggle navigation">Menu</button>
        <div class="topbar-breadcrumb"><span>Ministry of Defence</span><span class="sep">›</span><span class="current" id="topbar-current">Dashboard</span></div>
      </div>
    </div>

    ${renderDashboardSection(data)}
    ${renderSlidesSection(data)}
    ${renderPressSection(data)}
    ${renderLeadershipSection(data)}
    ${renderGallerySection(data)}
    ${renderOperationsSection(data)}
    ${renderProcurementSection(data)}
    ${renderAnnualReportsSection(data)}
    ${renderDirectorsSection(data)}
    ${renderSubscribersSection(data)}
    ${renderSubmissionsSection({ csrf, allSubmissions: data.allSubmissions, counts })}
    ${renderSettingsSection({ csrf, settings: data.settings })}
  </main>
</div>

<script>
(function () {
  var sections   = Array.from(document.querySelectorAll('.admin-section'));
  var navButtons = Array.from(document.querySelectorAll('.admin-nav-btn'));
  var bcCurrent  = document.getElementById('topbar-current');
  var defaultSec = 'dashboard';
  var sectionLabels = {
    dashboard: 'Dashboard', slides: 'Hero & Slider', press: 'Press Releases',
    leadership: 'Leadership', gallery: 'Gallery', operations: 'Operations',
    procurement: 'Procurement', 'annual-reports': 'Annual Reports', directors: 'Directors',
    subscribers: 'Newsletter', submissions: 'Form Submissions', settings: 'Site Settings'
  };

  window.filterSubmissions = function (type) {
    document.querySelectorAll('#submissions-table tbody tr').forEach(function (row) {
      var rowType = row.dataset.formType || '';
      row.style.display = (type === 'all' || rowType === type) ? '' : 'none';
    });
    ['all', 'contact', 'foi', 'servicom'].forEach(function (t) {
      var btn = document.getElementById('sub-tab-' + t);
      if (!btn) return;
      btn.classList.toggle('btn-green', t === type);
      btn.classList.toggle('btn-outline', t !== type);
    });
  };

  function getRequestedSection() {
    var h = location.hash.replace('#', '');
    if (h && sectionLabels[h]) return h;
    var p = new URLSearchParams(location.search);
    if (p.has('edit_slide')) return 'slides';
    if (p.has('edit_press')) return 'press';
    if (p.has('edit_leader')) return 'leadership';
    if (p.has('edit_gallery')) return 'gallery';
    if (p.has('edit_operation')) return 'operations';
    if (p.has('edit_tender')) return 'procurement';
    if (p.has('edit_report')) return 'annual-reports';
    return defaultSec;
  }

  function activateSection(sectionId) {
    var id = sectionId || defaultSec;
    sections.forEach(function (s) { s.classList.toggle('active', s.id === id); });
    navButtons.forEach(function (b) { b.classList.toggle('active', b.getAttribute('href').replace('#', '') === id); });
    if (bcCurrent) bcCurrent.textContent = sectionLabels[id] || id;
  }

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var id = btn.getAttribute('href').replace('#', '') || defaultSec;
      history.pushState(null, '', '#' + id);
      activateSection(id);
    });
  });

  window.addEventListener('hashchange', function () {
    activateSection(location.hash.replace('#', '') || defaultSec);
  });

  var toggleBtn = document.querySelector('.sidebar-toggle');
  var adminShell = document.getElementById('admin-shell');
  var backdrop = document.getElementById('sidebar-backdrop');
  function setSidebarOpen(open) {
    adminShell.classList.toggle('sidebar-open', open);
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(open));
  }
  if (toggleBtn) toggleBtn.addEventListener('click', function () { setSidebarOpen(!adminShell.classList.contains('sidebar-open')); });
  if (backdrop) backdrop.addEventListener('click', function () { setSidebarOpen(false); });

  activateSection(getRequestedSection());
})();
</script>`;

  return pageShell({
    title: 'Admin Dashboard — MOD Website',
    bodyClass: 'admin-body',
    head: `<meta name="csrf-token" content="${escapeHtml(csrf)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" />
  <link rel="stylesheet" href="/admin/admin.css" />`,
    body,
  });
}

export { pageShell as adminPageShell, badge as adminBadge, deleteForm as adminDeleteForm, strimwidth, formatDate, DEPARTMENT_OPTIONS };
