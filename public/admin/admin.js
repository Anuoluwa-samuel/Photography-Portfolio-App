/* ==================================================================
   Admin dashboard — small hash-routed app talking to /api/admin/*
================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let view = $('#view');
const title = $('#viewTitle');
let META = { categories: [], icons: [], statuses: [] };

/* ---------- API ---------- */
async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
  if (opts.form) init.body = opts.form;
  else if (opts.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
  const res = await fetch('/api/admin' + path, init);
  if (res.status === 401) { location.href = '/admin/login'; throw new Error('Signed out'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

/* ---------- UI helpers ---------- */
let toastTimer;
function toast(msg, isErr = false) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', isErr); t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
function openModal(html) { $('#modalBody').innerHTML = html; $('#modal').hidden = false; $('#modalClose').focus(); }
function closeModal() { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; }
$('#modalClose').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if (e.target === $('#modal')) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
const confirmIt = msg => window.confirm(msg);
const fmtDate = s => { if (!s) return '—'; const d = new Date(s.replace(' ', 'T') + (s.endsWith('Z') ? '' : 'Z')); return isNaN(d) ? s : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); };
const iconOptions = sel => META.icons.map(i => `<option ${i === sel ? 'selected' : ''}>${i}</option>`).join('');
const catOptions = sel => META.categories.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.label)}</option>`).join('');
function field(label, name, value = '', type = 'text', extra = '') {
  return `<div class="field"><label for="f_${name}">${label}</label><input id="f_${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
}
function textarea(label, name, value = '', rows = 4, hint = '') {
  return `<div class="field"><label for="f_${name}">${label}</label><textarea id="f_${name}" name="${name}" rows="${rows}">${esc(value)}</textarea></div>${hint ? `<p class="hint">${hint}</p>` : ''}`;
}

/* ---------- Sidebar / auth ---------- */
function setSidebar(open) {
  $('.sidebar').classList.toggle('open', open);
  $('#burger').setAttribute('aria-expanded', String(open));
}
$('#burger').setAttribute('aria-expanded', 'false');
$('#burger').addEventListener('click', () => setSidebar(!$('.sidebar').classList.contains('open')));
$('#sideNav').addEventListener('click', () => setSidebar(false));
document.addEventListener('click', e => {
  const sb = $('.sidebar');
  if (sb.classList.contains('open') && !sb.contains(e.target) && !$('#burger').contains(e.target)) setSidebar(false);
});
addEventListener('keydown', e => { if (e.key === 'Escape' && $('.sidebar').classList.contains('open')) setSidebar(false); });
$('#logoutBtn').addEventListener('click', async () => { await api('/logout', { method: 'POST' }); location.href = '/admin/login'; });

async function refreshBadge() {
  const s = await api('/summary');
  META = s.meta;
  const n = s.enquiries.new || 0;
  $('#newPill').hidden = !n; $('#newPill').textContent = n;
  return s;
}

/* ==================================================================
   VIEWS
================================================================== */
const views = {
  /* ---------- Overview ---------- */
  async dashboard() {
    title.textContent = 'Overview';
    const s = await refreshBadge();
    view.innerHTML = `
      <div class="grid-4">
        <div class="stat-card"><div class="n">${s.projects}</div><div class="l">Projects</div></div>
        <div class="stat-card"><div class="n">${s.photos}</div><div class="l">Photos</div></div>
        <div class="stat-card"><div class="n">${s.categories}</div><div class="l">Categories</div></div>
        <div class="stat-card"><div class="n">${s.enquiries.new || 0}</div><div class="l">New enquiries</div></div>
      </div>
      <div class="card">
        <div class="card-head"><h2>Recent <em>projects</em></h2><a class="btn btn-ghost btn-sm" href="#/projects">See all</a></div>
        ${s.recentProjects.length ? `<div style="overflow:auto"><table>
          <thead><tr><th>Title</th><th>Category</th><th>Photos</th><th>Status</th></tr></thead>
          <tbody>${s.recentProjects.map(p => `<tr onclick="location.hash='#/projects/${p.id}'">
            <td>${esc(p.title)}</td><td>${esc(p.category_label || '—')}</td><td>${p.image_count}</td>
            <td><span class="badge ${p.published ? 'replied' : ''}">${p.published ? 'Published' : 'Draft'}</span>${p.featured ? ' <span class="badge new">★ featured</span>' : ''}</td>
          </tr>`).join('')}</tbody></table></div>` : '<p class="empty">No projects yet. Create your first one from the Projects tab.</p>'}
      </div>
      <div class="card">
        <div class="card-head"><h2>Recent <em>enquiries</em></h2><a class="btn btn-ghost btn-sm" href="#/enquiries">See all</a></div>
        ${s.recentEnquiries.length ? enquiryTable(s.recentEnquiries) : '<p class="empty">No enquiries yet. When someone submits the contact form, it shows up here.</p>'}
      </div>
      <div class="card">
        <div class="card-head"><h2>Quick <em>actions</em></h2></div>
        <div class="actions">
          <a class="btn btn-primary" href="#/projects">New project</a>
          <a class="btn btn-ghost" href="#/settings">Edit site content</a>
          <a class="btn btn-ghost" href="#/services">Edit services</a>
        </div>
      </div>`;
    bindEnquiryRows();
  },

  /* ---------- Enquiries ---------- */
  async enquiries(status = '') {
    title.textContent = 'Enquiries';
    const { items, counts } = await api('/enquiries' + (status ? `?status=${status}` : ''));
    const tab = (v, l) => `<button class="tab ${v === status ? 'active' : ''}" data-status="${v}">${l}${counts[v] ? ` (${counts[v]})` : ''}</button>`;
    view.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div class="tabs">${tab('', `All (${counts.total})`)}${tab('new', 'New')}${tab('read', 'Read')}${tab('replied', 'Replied')}${tab('archived', 'Archived')}</div>
        </div>
        ${items.length ? enquiryTable(items) : '<p class="empty">Nothing here.</p>'}
      </div>`;
    $$('.tab', view).forEach(b => b.addEventListener('click', () => views.enquiries(b.dataset.status)));
    bindEnquiryRows(() => views.enquiries(status));
  },

  /* ---------- Projects ---------- */
  async projects(id) {
    if (id) return projectEditor(id);
    title.textContent = 'Projects';
    const { items } = await api('/projects');
    view.innerHTML = `
      <div class="card">
        <div class="card-head"><h2>Projects <em>(${items.length})</em></h2><button class="btn btn-primary btn-sm" id="addProject">New project</button></div>
        ${items.length ? `<div class="gal-grid" id="projList">${items.map(projectCard).join('')}</div>` : '<p class="empty">No projects yet. Create one to start building your portfolio.</p>'}
      </div>`;

    $('#addProject').addEventListener('click', () => {
      openModal(`
        <h2>New <em>project</em></h2>
        <form id="newProjForm" style="margin-top:18px">
          ${field('Title', 'title', '', 'text', 'required autofocus')}
          <div class="field"><label>Category</label><select name="category_id"><option value="">Uncategorised</option>${catOptions()}</select></div>
          <div class="actions" style="margin-top:20px"><button class="btn btn-primary" type="submit">Create &amp; add photos</button></div>
        </form>`);
      $('#newProjForm').addEventListener('submit', async ev => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        try {
          const { item } = await api('/projects', { method: 'POST', body: { title: fd.get('title'), category_id: fd.get('category_id') || null } });
          closeModal(); toast('Project created.'); location.hash = `#/projects/${item.id}`;
        } catch (e) { toast(e.message, true); }
      });
    });

    view.onclick = async e => {
      const del = e.target.closest('[data-act="delete"]');
      if (del) {
        const card = del.closest('.gal-item'), id2 = card.dataset.id, item = items.find(x => x.id == id2);
        if (!confirmIt(`Delete "${item.title}" and all its photos? This can't be undone.`)) return;
        await api(`/projects/${id2}`, { method: 'DELETE' }); toast('Project deleted.'); views.projects();
        return;
      }
      const card = e.target.closest('.gal-item[data-id]');
      if (card) location.hash = `#/projects/${card.dataset.id}`;
    };

    enableDragSort('#projList', '.gal-item', async ids => { await api('/projects/order', { method: 'PUT', body: { ids } }); toast('Order saved.'); });
  },

  /* ---------- Categories ---------- */
  async categories() {
    title.textContent = 'Categories';
    const { items } = await api('/categories');
    view.innerHTML = `
      <div class="card">
        <div class="card-head"><h2>Categories <em>(${items.length})</em></h2><button class="btn btn-primary btn-sm" id="addCat">Add category</button></div>
        ${items.length ? `<div class="svc-list" id="catList">${items.map(c => `
          <div class="svc-row ${c.active ? '' : 'inactive'}" data-id="${c.id}" draggable="true">
            <span class="handle" title="Drag to reorder">⋮⋮</span>
            <div><div class="n">${esc(c.label)} ${c.active ? '' : '<span class="badge">hidden</span>'}</div><div class="dim">/${esc(c.slug)}</div></div>
            <div class="actions btns"><button class="icon-btn" data-act="edit" title="Edit">✎</button><button class="icon-btn danger" data-act="delete" title="Delete">✕</button></div>
          </div>`).join('')}</div>` : '<p class="empty">No categories yet.</p>'}
      </div>`;

    const openEditor = (c = { label: '', active: 1 }) => {
      openModal(`
        <h2>${c.id ? 'Edit' : 'New'} <em>category</em></h2>
        <form id="catForm" style="margin-top:18px">
          ${field('Name', 'label', c.label, 'text', 'required')}
          <label class="check"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}> Show on the website</label>
          <div class="actions" style="margin-top:20px"><button class="btn btn-primary" type="submit">Save category</button></div>
        </form>`);
      $('#catForm').addEventListener('submit', async ev => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const body = { label: fd.get('label'), active: fd.get('active') === 'on' };
        try {
          await (c.id ? api(`/categories/${c.id}`, { method: 'PATCH', body }) : api('/categories', { method: 'POST', body }));
          closeModal(); toast('Category saved.'); views.categories();
        } catch (e) { toast(e.message, true); }
      });
    };
    $('#addCat').addEventListener('click', () => openEditor());
    view.onclick = async e => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const id = btn.closest('.svc-row').dataset.id, c = items.find(x => x.id == id);
      if (btn.dataset.act === 'edit') openEditor(c);
      if (btn.dataset.act === 'delete' && confirmIt(`Delete "${c.label}"? Projects in this category become uncategorised.`)) {
        await api(`/categories/${id}`, { method: 'DELETE' }); toast('Category deleted.'); views.categories();
      }
    };
    enableDragSort('#catList', '.svc-row', async ids => { await api('/categories/order', { method: 'PUT', body: { ids } }); toast('Order saved.'); });
  },

  /* ---------- Services ---------- */
  async services() {
    title.textContent = 'Services';
    const { items } = await api('/services');
    view.innerHTML = `
      <div class="card">
        <div class="card-head"><h2>Services <em>(${items.length})</em></h2><button class="btn btn-primary btn-sm" id="addSvc">Add service</button></div>
        ${items.length ? `<div class="svc-list" id="svcList">${items.map(s => `
          <div class="svc-row ${s.active ? '' : 'inactive'}" data-id="${s.id}" draggable="true">
            <span class="handle" title="Drag to reorder">⋮⋮</span>
            <div><div class="n">${esc(s.name)} ${s.active ? '' : '<span class="badge">hidden</span>'}</div><div class="p">${esc(s.price)}</div><div class="dim">${esc(s.description)}</div></div>
            <div class="actions btns"><button class="icon-btn" data-act="edit" title="Edit">✎</button><button class="icon-btn danger" data-act="delete" title="Delete">✕</button></div>
          </div>`).join('')}</div>` : '<p class="empty">No services yet.</p>'}
      </div>`;

    const openEditor = (s = { name: '', icon: 'camera', price: '', description: '', includes: [], cta: 'Book now', active: 1 }) => {
      openModal(`
        <h2>${s.id ? 'Edit' : 'New'} <em>service</em></h2>
        <form id="svcForm" style="margin-top:18px">
          <div class="form-row">${field('Name', 'name', s.name, 'text', 'required')}${field('Starting price <small>e.g. From ₦120,000</small>', 'price', s.price)}</div>
          <div class="form-row">
            <div class="field"><label>Icon</label><select name="icon">${iconOptions(s.icon)}</select></div>
            ${field('Button label', 'cta', s.cta)}
          </div>
          ${textarea('Short description', 'description', s.description, 3)}
          ${textarea('What\'s included <small>one item per line</small>', 'includes', (s.includes || []).join('\n'), 5)}
          <label class="check"><input type="checkbox" name="active" ${s.active ? 'checked' : ''}> Show on the website</label>
          <div class="actions" style="margin-top:20px"><button class="btn btn-primary" type="submit">Save service</button></div>
        </form>`);
      $('#svcForm').addEventListener('submit', async ev => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        const body = { name: fd.get('name'), price: fd.get('price'), icon: fd.get('icon'), cta: fd.get('cta'), description: fd.get('description'), includes: fd.get('includes').split('\n'), active: fd.get('active') === 'on' };
        try {
          await (s.id ? api(`/services/${s.id}`, { method: 'PATCH', body }) : api('/services', { method: 'POST', body }));
          closeModal(); toast('Service saved.'); views.services();
        } catch (e) { toast(e.message, true); }
      });
    };
    $('#addSvc').addEventListener('click', () => openEditor());
    view.onclick = async e => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const id = btn.closest('.svc-row').dataset.id, s = items.find(x => x.id == id);
      if (btn.dataset.act === 'edit') openEditor(s);
      if (btn.dataset.act === 'delete' && confirmIt(`Delete "${s.name}"?`)) { await api(`/services/${id}`, { method: 'DELETE' }); toast('Service deleted.'); views.services(); }
    };
    enableDragSort('#svcList', '.svc-row', async ids => { await api('/services/order', { method: 'PUT', body: { ids } }); toast('Order saved.'); });
  },

  /* ---------- Site content / settings ---------- */
  async settings() {
    title.textContent = 'Site content';
    const { settings: s } = await api('/settings');
    const stats = JSON.parse(s.stats || '[]'), points = JSON.parse(s.about_points || '[]');
    const accentHint = 'Wrap the word you want in teal with double brackets, e.g. <code>Light that [[remembers]] the moment</code>.';
    view.innerHTML = `
      <form id="settingsForm">
        <fieldset><legend>Brand</legend>
          <div class="form-row-3">${field('Brand name (logo)', 'brand_name', s.brand_name)}${field('Brand tagline', 'brand_tagline', s.brand_tagline)}${field('Site name (full)', 'site_name', s.site_name)}</div>
          ${field('Photographer name', 'photographer_name', s.photographer_name)}
        </fieldset>

        <fieldset><legend>Hero</legend>
          <div class="form-row">${field('Eyebrow line', 'hero_eyebrow', s.hero_eyebrow)}${field('Headline', 'hero_title', s.hero_title)}</div>
          <p class="hint">${accentHint}</p>
          ${textarea('Intro paragraph', 'hero_intro', s.hero_intro, 3)}
          <div class="form-row">${field('Image caption', 'hero_tag', s.hero_tag)}${field('Image sub-caption', 'hero_tag_sub', s.hero_tag_sub)}</div>
          ${field('Hero image alt text', 'hero_image_alt', s.hero_image_alt)}
        </fieldset>

        <fieldset><legend>Photos</legend>
          <div class="slots">
            ${imageSlot('hero_image', 'Hero image', s.hero_image)}
            ${imageSlot('about_image', 'About portrait', s.about_image)}
          </div>
          <p class="hint" style="margin-top:14px">Uploads are cropped to 4:5 and converted to WebP.</p>
        </fieldset>

        <fieldset><legend>Featured section</legend>
          ${field('Heading', 'featured_title', s.featured_title)}
          ${textarea('Intro', 'featured_intro', s.featured_intro, 2)}
        </fieldset>

        <fieldset><legend>About</legend>
          ${field('Heading', 'about_title', s.about_title)}
          ${textarea('Biography <small>blank line between paragraphs</small>', 'about_bio', s.about_bio, 6)}
          ${field('Quote over the portrait', 'about_quote', s.about_quote)}
          ${field('About image alt text', 'about_image_alt', s.about_image_alt)}
          <label style="display:block;margin:6px 0 10px" class="eyebrow">Approach points</label>
          <div id="points">${points.map((p, i) => pointRow(p, i)).join('')}</div>
          <button type="button" class="btn btn-ghost btn-sm" id="addPoint">Add point</button>
          <label style="display:block;margin:24px 0 10px" class="eyebrow">Stats</label>
          <div id="stats">${stats.map((st, i) => statRow(st, i)).join('')}</div>
          <button type="button" class="btn btn-ghost btn-sm" id="addStat">Add stat</button>
          <div style="height:16px"></div>
        </fieldset>

        <fieldset><legend>Portfolio & services copy</legend>
          <div class="form-row">${field('Portfolio heading', 'portfolio_title', s.portfolio_title)}${field('Services heading', 'services_title', s.services_title)}</div>
          ${textarea('Portfolio intro', 'portfolio_intro', s.portfolio_intro, 2)}
          ${textarea('Services intro', 'services_intro', s.services_intro, 2)}
        </fieldset>

        <fieldset><legend>Testimonial</legend>
          ${textarea('Quote <small>leave empty to hide the section</small>', 'testimonial_text', s.testimonial_text, 3)}
          <div class="form-row">${field('Client name', 'testimonial_name', s.testimonial_name)}${field('Context', 'testimonial_meta', s.testimonial_meta)}</div>
        </fieldset>

        <fieldset><legend>Contact</legend>
          ${field('Heading', 'contact_title', s.contact_title)}
          ${textarea('Intro', 'contact_intro', s.contact_intro, 2)}
          <div class="form-row">${field('Email', 'email', s.email, 'email')}${field('Phone', 'phone', s.phone)}</div>
          <div class="form-row">${field('Location (short, e.g. Lagos, Nigeria)', 'location_short', s.location_short)}${field('Studio hours', 'hours', s.hours)}</div>
          ${field('Location / service area (full)', 'location', s.location)}
          ${textarea('Footer blurb', 'footer_blurb', s.footer_blurb, 2)}
        </fieldset>

        <fieldset><legend>Social links <small class="dim">— leave blank to hide</small></legend>
          <div class="form-row-3">
            ${field('Instagram', 'social_instagram', s.social_instagram, 'url')}${field('Facebook', 'social_facebook', s.social_facebook, 'url')}${field('TikTok', 'social_tiktok', s.social_tiktok, 'url')}
            ${field('X / Twitter', 'social_x', s.social_x, 'url')}${field('LinkedIn', 'social_linkedin', s.social_linkedin, 'url')}${field('YouTube', 'social_youtube', s.social_youtube, 'url')}
          </div>
        </fieldset>

        <fieldset><legend>SEO</legend>
          ${field('Page title', 'seo_title', s.seo_title)}
          ${textarea('Meta description', 'seo_description', s.seo_description, 2)}
          ${field('Keywords', 'seo_keywords', s.seo_keywords)}
        </fieldset>

        <div class="actions"><button class="btn btn-primary" type="submit">Save all changes</button><span class="dim">Changes go live immediately.</span></div>
      </form>`;

    $('#addPoint').addEventListener('click', () => $('#points').insertAdjacentHTML('beforeend', pointRow({ icon: 'star', title: '', text: '' }, $$('#points .rep').length)));
    $('#addStat').addEventListener('click', () => $('#stats').insertAdjacentHTML('beforeend', statRow({ icon: 'star', label: '', value: 0, suffix: '+' }, $$('#stats .rep').length)));
    view.addEventListener('click', e => { const r = e.target.closest('[data-remove]'); if (r) r.closest('.rep').remove(); });

    /* image uploads */
    $$('[data-slot]').forEach(inp => inp.addEventListener('change', async () => {
      if (!inp.files[0]) return;
      const fd = new FormData(); fd.append('photo', inp.files[0]);
      const slot = inp.closest('.slot'); slot.classList.add('loading');
      try { const r = await api(`/settings/image/${inp.dataset.slot}`, { method: 'POST', form: fd }); $('img', slot).src = r.url; toast('Image updated.'); }
      catch (e) { toast(e.message, true); } finally { slot.classList.remove('loading'); }
    }));

    $('#settingsForm').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target), body = {};
      for (const [k, v] of fd.entries()) if (!k.startsWith('_')) body[k] = v;
      body.about_points = $$('#points .rep').map(r => ({ icon: $('[name=_p_icon]', r).value, title: $('[name=_p_title]', r).value, text: $('[name=_p_text]', r).value })).filter(p => p.title);
      body.stats = $$('#stats .rep').map(r => ({ icon: $('[name=_s_icon]', r).value, label: $('[name=_s_label]', r).value, value: +$('[name=_s_value]', r).value || 0, suffix: $('[name=_s_suffix]', r).value })).filter(st => st.label);
      try { await api('/settings', { method: 'PUT', body }); toast('Site content saved.'); $('#brandName').textContent = body.brand_name || 'Admin'; }
      catch (err) { toast(err.message, true); }
    });

    function pointRow(p) {
      return `<div class="rep points"><div class="field"><label>Icon</label><select name="_p_icon">${iconOptions(p.icon)}</select></div><div class="field"><label>Title</label><input name="_p_title" value="${esc(p.title)}"></div><div class="field"><label>Text</label><input name="_p_text" value="${esc(p.text)}"></div><button type="button" class="icon-btn danger" data-remove title="Remove">✕</button></div>`;
    }
    function statRow(st) {
      return `<div class="rep"><div class="field"><label>Icon</label><select name="_s_icon">${iconOptions(st.icon)}</select></div><div class="field"><label>Label</label><input name="_s_label" value="${esc(st.label)}"></div><div class="field"><label>Value</label><input name="_s_value" type="number" value="${esc(st.value)}"></div><div class="field"><label>Suffix</label><input name="_s_suffix" value="${esc(st.suffix)}" maxlength="4"></div><button type="button" class="icon-btn danger" data-remove title="Remove">✕</button></div>`;
    }
    function imageSlot(key, label, src) {
      return `<div class="slot"><img src="${esc(src)}" alt=""><div><div class="eyebrow" style="margin-bottom:8px">${label}</div><input type="file" accept="image/*" data-slot="${key}" style="font-size:.85rem;color:var(--muted)"></div></div>`;
    }
  },

  /* ---------- Account ---------- */
  async account() {
    title.textContent = 'Account';
    view.innerHTML = `
      <div class="card" style="max-width:520px">
        <div class="card-head"><h2>Change <em>password</em></h2></div>
        <form id="pwForm">
          ${field('Current password', 'current', '', 'password', 'required autocomplete="current-password"')}
          ${field('New password <small>at least 8 characters</small>', 'next', '', 'password', 'required minlength="8" autocomplete="new-password"')}
          ${field('Repeat new password', 'repeat', '', 'password', 'required autocomplete="new-password"')}
          <p class="form-error" id="pwErr"></p>
          <button class="btn btn-primary" type="submit">Update password</button>
        </form>
      </div>`;
    $('#pwForm').addEventListener('submit', async e => {
      e.preventDefault(); const fd = new FormData(e.target); $('#pwErr').textContent = '';
      if (fd.get('next') !== fd.get('repeat')) return $('#pwErr').textContent = 'The new passwords don\'t match.';
      try { await api('/password', { method: 'POST', body: { current: fd.get('current'), next: fd.get('next') } }); toast('Password updated.'); e.target.reset(); }
      catch (err) { $('#pwErr').textContent = err.message; }
    });
  },
};

/* ---------- shared renderers ---------- */
function enquiryTable(items) {
  return `<div style="overflow:auto"><table>
    <thead><tr><th>Name</th><th>Service</th><th>Preferred date</th><th>Received</th><th>Status</th></tr></thead>
    <tbody>${items.map(e => `<tr data-id="${e.id}" class="${e.status === 'new' ? 'is-new' : ''}">
      <td>${esc(e.name)}<div class="dim">${esc(e.email)}</div></td><td>${esc(e.service || '—')}</td><td>${esc(e.preferred_date || '—')}</td><td>${fmtDate(e.created_at)}</td><td><span class="badge ${e.status}">${e.status}</span></td>
    </tr>`).join('')}</tbody></table></div>`;
}
function bindEnquiryRows(after = () => views.dashboard()) {
  $$('tbody tr[data-id]', view).forEach(tr => tr.addEventListener('click', async () => {
    const e = await api(`/enquiries/${tr.dataset.id}`);
    const opt = v => `<option ${e.status === v ? 'selected' : ''}>${v}</option>`;
    openModal(`
      <h2>${esc(e.name)}</h2>
      <dl class="detail">
        <dt>Email</dt><dd><a href="mailto:${esc(e.email)}" style="color:var(--accent)">${esc(e.email)}</a></dd>
        <dt>Phone</dt><dd>${e.phone ? `<a href="tel:${esc(e.phone.replace(/[^+\d]/g, ''))}" style="color:var(--accent)">${esc(e.phone)}</a>` : '—'}</dd>
        <dt>Service</dt><dd>${esc(e.service || '—')}</dd>
        <dt>Preferred date</dt><dd>${esc(e.preferred_date || '—')}</dd>
        <dt>Received</dt><dd>${fmtDate(e.created_at)}</dd>
        <dt>Message</dt><dd class="msg">${esc(e.message)}</dd>
      </dl>
      <div class="actions" style="margin-top:22px">
        <a class="btn btn-primary" href="mailto:${esc(e.email)}?subject=${encodeURIComponent('Re: your photography enquiry')}">Reply by email</a>
        <div class="field" style="margin:0;min-width:160px"><select id="stSel">${META.statuses.map(opt).join('')}</select></div>
        <button class="btn btn-danger btn-sm" id="delEnq">Delete</button>
      </div>`);
    $('#stSel').addEventListener('change', async ev => { await api(`/enquiries/${e.id}`, { method: 'PATCH', body: { status: ev.target.value } }); toast('Status updated.'); refreshBadge(); });
    $('#delEnq').addEventListener('click', async () => { if (!confirmIt('Delete this enquiry?')) return; await api(`/enquiries/${e.id}`, { method: 'DELETE' }); closeModal(); toast('Enquiry deleted.'); after(); });
    refreshBadge();
  }));
  // refresh list when modal closes so status changes show
  $('#modalClose').onclick = () => after();   // list refreshes when the detail modal closes
}
function projectCard(p) {
  return `<div class="gal-item" data-id="${p.id}" draggable="true">
    <div class="img">${p.cover_image ? `<img src="${esc(p.cover_image)}" alt="" loading="lazy">` : ''}${p.featured ? '<span class="badge new fx">★ featured</span>' : ''}</div>
    <div class="meta"><b title="${esc(p.title)}">${esc(p.title)}</b><span>${esc(p.category_label || 'Uncategorised')} · ${p.published ? 'Published' : 'Draft'} · ${p.image_count} photo${p.image_count === 1 ? '' : 's'}</span></div>
    <div class="row"><button class="icon-btn danger" data-act="delete" title="Delete project">✕</button></div>
  </div>`;
}
function imageCard(img, project) {
  const isCover = !!project.cover_image && project.cover_image === img.src_thumb;
  return `<div class="gal-item" data-id="${img.id}" draggable="true">
    <div class="img"><img src="${esc(img.src_thumb)}" alt="" loading="lazy">${isCover ? '<span class="badge new fx">★ cover</span>' : ''}</div>
    <div class="meta"><b title="${esc(img.caption || 'Untitled')}">${esc(img.caption || 'Untitled')}</b></div>
    <div class="row"><button class="icon-btn" data-act="edit" title="Edit caption / alt text">✎</button><button class="icon-btn" data-act="cover" title="Set as cover photo">${isCover ? '★' : '☆'}</button><button class="icon-btn danger" data-act="delete" title="Delete">✕</button></div>
  </div>`;
}

/* ---------- Project editor (views.projects with an id) ---------- */
async function projectEditor(id) {
  title.textContent = 'Edit project';
  const { item: p, images } = await api(`/projects/${id}`);

  view.innerHTML = `
    <p style="margin-bottom:18px"><a href="#/projects" class="btn btn-ghost btn-sm">← All projects</a></p>
    <div class="card">
      <div class="card-head">
        <h2><em>${esc(p.title)}</em></h2>
        <div class="actions">
          <label class="check"><input type="checkbox" id="pubToggle" ${p.published ? 'checked' : ''}> Published</label>
          <label class="check"><input type="checkbox" id="featToggle" ${p.featured ? 'checked' : ''}> Featured</label>
          <button class="btn btn-danger btn-sm" id="delProject">Delete project</button>
        </div>
      </div>
      <form id="projForm">
        <div class="form-row">
          ${field('Title', 'title', p.title, 'text', 'required')}
          <div class="field"><label>Category</label><select name="category_id"><option value="">Uncategorised</option>${catOptions(p.category_id)}</select></div>
        </div>
        <div class="form-row">${field('Location', 'location', p.location)}${field('Date', 'date', p.date, 'date')}</div>
        ${textarea('Description', 'description', p.description, 4)}
        ${field('URL slug', 'slug', p.slug)}
        <div class="actions" style="margin-top:6px"><button class="btn btn-primary" type="submit">Save project details</button></div>
      </form>
    </div>
    <div class="card">
      <div class="card-head"><h2>Photos <em>(${images.length})</em></h2><span class="dim">Drag to reorder · ★ sets the cover photo</span></div>
      <div class="form-row">${field('Caption <small>optional, applies to this batch</small>', 'upCaption')}${field('Alt text <small>optional</small>', 'upAlt')}</div>
      <div class="drop" id="drop"><strong>Choose photos</strong> or drag them here<br><span class="dim">You can select many at once</span>
        <input type="file" id="fileInput" accept="image/*" multiple hidden></div>
      <div class="progress" id="prog" hidden><i></i></div>
      ${images.length ? `<div class="gal-grid" id="imgGrid" style="margin-top:20px">${images.map(im => imageCard(im, p)).join('')}</div>` : '<p class="empty">No photos yet — add some above.</p>'}
    </div>`;

  /* project detail form */
  $('#pubToggle').addEventListener('change', async e => { await api(`/projects/${id}`, { method: 'PATCH', body: { published: e.target.checked } }); toast(e.target.checked ? 'Project published.' : 'Project unpublished.'); });
  $('#featToggle').addEventListener('change', async e => { await api(`/projects/${id}`, { method: 'PATCH', body: { featured: e.target.checked } }); toast(e.target.checked ? 'Added to featured.' : 'Removed from featured.'); });
  $('#delProject').addEventListener('click', async () => {
    if (!confirmIt(`Delete "${p.title}" and all its photos? This can't be undone.`)) return;
    await api(`/projects/${id}`, { method: 'DELETE' }); toast('Project deleted.'); location.hash = '#/projects';
  });
  $('#projForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    try {
      await api(`/projects/${id}`, { method: 'PATCH', body: { title: fd.get('title'), category_id: fd.get('category_id') || null, location: fd.get('location'), date: fd.get('date'), description: fd.get('description'), slug: fd.get('slug') } });
      toast('Project saved.'); projectEditor(id);
    } catch (e) { toast(e.message, true); }
  });

  /* upload */
  const drop = $('#drop'), input = $('#fileInput'), prog = $('#prog');
  drop.addEventListener('click', () => input.click());
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => uploadFiles(e.dataTransfer.files));
  input.addEventListener('change', () => uploadFiles(input.files));

  async function uploadFiles(files) {
    files = [...files].filter(f => f.type.startsWith('image/'));
    if (!files.length) return toast('Pick at least one image.', true);
    prog.hidden = false; const bar = $('i', prog);
    const fd = new FormData();
    files.forEach(f => fd.append('photos', f));
    fd.append('caption', $('#f_upCaption').value); fd.append('alt', $('#f_upAlt').value);
    try {
      bar.style.width = '60%';
      await api(`/projects/${id}/images`, { method: 'POST', form: fd });
      bar.style.width = '100%';
      toast(`Uploaded ${files.length} photo${files.length > 1 ? 's' : ''}.`);
      projectEditor(id);
    } catch (e) { toast(e.message, true); prog.hidden = true; }
  }

  /* per-image edit / cover / delete */
  view.onclick = async e => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const card = btn.closest('.gal-item'), imgId = card.dataset.id, im = images.find(x => x.id == imgId);
    if (btn.dataset.act === 'delete') {
      if (!confirmIt('Delete this photo? This can\'t be undone.')) return;
      await api(`/projects/${id}/images/${imgId}`, { method: 'DELETE' }); toast('Photo deleted.'); projectEditor(id);
    }
    if (btn.dataset.act === 'cover') {
      await api(`/projects/${id}/images/${imgId}`, { method: 'PATCH', body: { cover: true } });
      toast('Cover photo updated.'); projectEditor(id);
    }
    if (btn.dataset.act === 'edit') {
      openModal(`
        <h2>Edit <em>photo</em></h2>
        <form id="imgEdit" style="margin-top:18px">
          ${field('Caption', 'caption', im.caption)}
          ${field('Alt text', 'alt', im.alt)}
          <div class="actions" style="margin-top:20px"><button class="btn btn-primary" type="submit">Save changes</button></div>
        </form>`);
      $('#imgEdit').addEventListener('submit', async ev => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        await api(`/projects/${id}/images/${imgId}`, { method: 'PATCH', body: { caption: fd.get('caption'), alt: fd.get('alt') } });
        closeModal(); toast('Saved.'); projectEditor(id);
      });
    }
  };

  enableDragSort('#imgGrid', '.gal-item', async ids => { await api(`/projects/${id}/images/order`, { method: 'PUT', body: { ids } }); toast('Order saved.'); });
}
function enableDragSort(listSel, itemSel, onDone) {
  const list = $(listSel); if (!list) return;
  let dragging = null;
  list.addEventListener('dragstart', e => { dragging = e.target.closest(itemSel); dragging?.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  list.addEventListener('dragover', e => { e.preventDefault(); const over = e.target.closest(itemSel); if (!over || over === dragging) return;
    const r = over.getBoundingClientRect(), before = (list.classList.contains('gal-grid') ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2);
    list.insertBefore(dragging, before ? over : over.nextSibling); });
  list.addEventListener('dragend', async () => { dragging?.classList.remove('dragging'); dragging = null; await onDone($$(itemSel, list).map(el => +el.dataset.id)); });
}

/* ---------- Router ---------- */
async function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
  const name = parts[0], rest = parts.slice(1);
  const fn = views[name] || views.dashboard;
  $$('[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === (views[name] ? name : 'dashboard')));
  const fresh = view.cloneNode(false); view.replaceWith(fresh); view = fresh;   // drop listeners from the previous view
  view.classList.add('loading');
  $('#modalClose').onclick = null;                                                // views may set a close callback
  try { await fn(...rest); } catch (e) { view.innerHTML = `<div class="card"><p class="form-error">${esc(e.message)}</p></div>`; }
  view.classList.remove('loading');
}
addEventListener('hashchange', route);

(async () => {
  try {
    const me = await api('/me'); $('#who').textContent = me.username;
    const { settings: s } = await api('/settings'); $('#brandName').textContent = s.brand_name || 'Admin';
    await refreshBadge();
    route();
  } catch { /* api() already redirected to login */ }
})();
