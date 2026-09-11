/* ==================================================================
   DATA — injected by the server (views/public/project.ejs only; empty on the homepage)
================================================================== */
const LIGHTBOX_ITEMS = window.LIGHTBOX_ITEMS || [];

/* ==================================================================
   HELPERS
================================================================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* graceful fallback for any image that fails to load */
function fallback(img){
  const box = img.closest('.tile, .feat, .hero-frame, .about-frame');
  if (box) box.classList.add('is-fallback');
}
window.fallback = fallback;

/* CSP blocks inline onload/onerror attributes, so every fallback-eligible
   image (hero, about, gallery tiles, featured cards) is wired up here instead. */
$$('.hero-frame img, .about-frame img, .tile img, .feat img').forEach(img => {
  img.addEventListener('error', () => fallback(img), { once:true });
});

/* ==================================================================
   PAGE CURTAIN
================================================================== */
window.addEventListener('load', () => {
  setTimeout(() => $('#curtain').classList.add('done'), reducedMotion ? 0 : 350);
});
/* safety: never leave the curtain up if load stalls on slow images */
setTimeout(() => $('#curtain').classList.add('done'), 3500);

/* ==================================================================
   NAVIGATION
================================================================== */
const nav = $('#nav'), burger = $('#burger'), navLinks = $('#navLinks');

const onScroll = () => nav.classList.toggle('scrolled', scrollY > 24);
addEventListener('scroll', onScroll, { passive:true }); onScroll();

function setMenu(open){
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  navLinks.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
$$('a', navLinks).forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && navLinks.classList.contains('open')) setMenu(false); });
matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

/* highlight the section currently in view */
const navMap = new Map($$('[data-nav]').map(a => [a.dataset.nav, a]));
const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    navMap.forEach(a => a.classList.remove('active'));
    navMap.get(en.target.id)?.classList.add('active');
  });
}, { rootMargin:'-40% 0px -55% 0px' });
['hero','about','portfolio','services','contact'].forEach(id => { const el = $('#' + id); if (el) sectionObs.observe(el); });

/* ==================================================================
   SCROLL REVEAL + STAT COUNTERS + PARALLAX
================================================================== */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting){ en.target.classList.add('in'); revealObs.unobserve(en.target); } });
}, { threshold:.15, rootMargin:'0px 0px -6% 0px' });
$$('.reveal, .reveal-img, .card-reveal').forEach(el => revealObs.observe(el));

function countUp(el){
  const target = +el.dataset.count, suffix = el.dataset.suffix || '', dur = reducedMotion ? 0 : 1600, t0 = performance.now();
  const tick = now => {
    const p = dur ? Math.min(1, (now - t0) / dur) : 1, eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const statObs = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting){ $$('.num', en.target).forEach(countUp); statObs.unobserve(en.target); } });
}, { threshold:.4 });
if ($('#stats')) statObs.observe($('#stats'));

/* subtle parallax on the hero portrait, desktop only (homepage) */
const heroMedia = $('#heroMedia');
if (heroMedia && !reducedMotion){
  addEventListener('scroll', () => {
    if (innerWidth < 901) { heroMedia.style.transform = ''; return; }
    const y = Math.min(scrollY, innerHeight);
    heroMedia.style.transform = `translateY(${y * 0.08}px)`;
  }, { passive:true });
}

/* ==================================================================
   PORTFOLIO FILTERS (homepage project grid — a plain DOM filter, no
   lightbox involved: each tile is a link straight to its project page)
================================================================== */
const gallery = $('#gallery'), galleryCount = $('#galleryCount'), filters = $('#filters');
const galleryTiles = gallery ? $$('.tile', gallery) : [];

if (filters && gallery) {
  const applyFilter = cat => {
    let shown = 0;
    galleryTiles.forEach(t => {
      const show = cat === 'all' || t.dataset.cat === cat;
      t.classList.toggle('is-hidden', !show);
      if (show){ t.style.animation = 'none'; t.offsetHeight; t.style.animation = ''; t.style.animationDelay = `${Math.min(shown, 12) * 40}ms`; shown++; }
    });
    if (galleryCount) galleryCount.textContent = `Showing ${shown} of ${galleryTiles.length} projects`;
  };
  filters.addEventListener('click', e => {
    const btn = e.target.closest('.filter'); if (!btn) return;
    $$('.filter', filters).forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    applyFilter(btn.dataset.filter);
  });
  applyFilter('all');
}
galleryTiles.forEach(tile => $$('img', tile).forEach(im => {
  if (im.complete && im.naturalWidth) im.classList.add('loaded');
  else im.addEventListener('load', () => im.classList.add('loaded'), { once:true });
}));

/* ==================================================================
   LIGHTBOX (project detail page — opens LIGHTBOX_ITEMS, its own images)
================================================================== */
const lb = $('#lightbox');
if (lb && LIGHTBOX_ITEMS.length) {
  const lbImg = $('#lbImg'), lbTitle = $('#lbTitle'), lbCat = $('#lbCat'), lbCount = $('#lbCount');
  let lbIndex = 0, lastFocus = null;

  function showImage(i){
    lbIndex = (i + LIGHTBOX_ITEMS.length) % LIGHTBOX_ITEMS.length;
    const g = LIGHTBOX_ITEMS[lbIndex];
    lbImg.classList.remove('ready');
    const src = g.full;
    const pre = new Image();
    pre.onload = () => { lbImg.src = src; lbImg.alt = g.alt; requestAnimationFrame(() => lbImg.classList.add('ready')); };
    pre.onerror = () => { lbImg.src = g.thumb; lbImg.alt = g.alt; lbImg.classList.add('ready'); };
    pre.src = src;
    lbTitle.textContent = g.title;
    lbCat.textContent = '';
    lbCount.textContent = `${lbIndex + 1} / ${LIGHTBOX_ITEMS.length}`;
    /* warm the cache for neighbours */
    [1, -1].forEach(d => { const n = LIGHTBOX_ITEMS[(lbIndex + d + LIGHTBOX_ITEMS.length) % LIGHTBOX_ITEMS.length]; new Image().src = n.full; });
  }
  function openLightbox(i){
    if (i < 0) return;
    lastFocus = document.activeElement;
    lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showImage(i);
    $('#lbClose').focus();
  }
  function closeLightbox(){
    lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbImg.classList.remove('ready');
    lastFocus?.focus();
  }
  if (gallery) gallery.addEventListener('click', e => {
    const tile = e.target.closest('.tile'); if (!tile) return;
    openLightbox(LIGHTBOX_ITEMS.findIndex(g => g.id === +tile.dataset.id));
  });
  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', () => showImage(lbIndex - 1));
  $('#lbNext').addEventListener('click', () => showImage(lbIndex + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showImage(lbIndex + 1);
    if (e.key === 'ArrowLeft') showImage(lbIndex - 1);
    if (e.key === 'Tab'){ /* keep focus inside the dialog */
      const f = $$('button', lb), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });
  /* swipe on touch devices */
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive:true });
  lb.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 50) showImage(lbIndex + (dx < 0 ? 1 : -1));
  });
}

/* ==================================================================
   CONTACT FORM
================================================================== */
const form = $('#enquiryForm');
if (form) {
  const status = $('#formStatus'), submitBtn = $('#submitBtn');
  const fields = {
    name:    { el:$('#f-name'),    err:$('#e-name'),    test:v => v.trim().length >= 2 || 'Enter your name.' },
    email:   { el:$('#f-email'),   err:$('#e-email'),   test:v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Enter a valid email address.' },
    phone:   { el:$('#f-phone'),   err:$('#e-phone'),   test:v => !v.trim() || /^[+\d][\d\s()-]{6,}$/.test(v.trim()) || 'Enter a valid phone number, or leave it blank.' },
    service: { el:$('#f-service'), err:$('#e-service'), test:v => !!v || 'Choose the type of photography.' },
    date:    { el:$('#f-date'),    err:$('#e-date'),    test:v => !v || new Date(v) >= new Date(new Date().toDateString()) || 'Choose a date that hasn\'t passed.' },
    message: { el:$('#f-message'), err:$('#e-message'), test:v => v.trim().length >= 10 || 'Add a little detail so I can send an accurate quote.' },
  };

  const validateField = f => {
    const r = f.test(f.el.value);
    const ok = r === true;
    f.err.textContent = ok ? '' : r;
    f.el.setAttribute('aria-invalid', String(!ok));
    return ok;
  };
  Object.values(fields).forEach(f => {
    f.el.addEventListener('blur', () => validateField(f));
    f.el.addEventListener('input', () => { if (f.el.getAttribute('aria-invalid') === 'true') validateField(f); });
  });
  /* earliest selectable date = today */
  $('#f-date').min = new Date().toISOString().slice(0, 10);

  /* "Book <service>" buttons pre-select the service in the form */
  $$('[data-service]').forEach(a => a.addEventListener('click', () => {
    const opt = [...$('#f-service').options].find(o => o.text === a.dataset.service);
    if (opt) $('#f-service').value = opt.text;
  }));

  /* POST to the site's own API (src/routes/public.js) */
  async function submitEnquiry(data){
    const res = await fetch('/api/enquiries', { method:'POST', headers:{ 'Content-Type':'application/json', Accept:'application/json' }, body:JSON.stringify(Object.fromEntries(data)) });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, ...body };
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.className = 'form-status';
    if (form.company.value) return;                        // honeypot tripped
    const results = Object.values(fields).map(validateField);
    if (results.includes(false)){
      Object.values(fields).find(f => f.el.getAttribute('aria-invalid') === 'true')?.el.focus();
      return;
    }
    submitBtn.classList.add('is-loading');
    submitBtn.firstChild.textContent = 'Sending ';
    try {
      const res = await submitEnquiry(new FormData(form));
      if (!res.ok){
        if (res.fields) Object.entries(res.fields).forEach(([k, msg]) => { const f = fields[k]; if (f){ f.err.textContent = msg; f.el.setAttribute('aria-invalid','true'); } });
        throw new Error(res.message || 'bad response');
      }
      status.className = 'form-status ok';
      status.textContent = `Thanks, ${fields.name.el.value.trim().split(' ')[0]}. Your enquiry is in — expect a reply within one working day.`;
      form.reset();
      Object.values(fields).forEach(f => f.el.removeAttribute('aria-invalid'));
    } catch (err) {
      status.className = 'form-status err';
      status.textContent = (err && err.message && !/bad response|fetch/i.test(err.message)) ? err.message : 'The message didn\'t send. Check your connection and try again, or use the email address on the left.';
    } finally {
      submitBtn.classList.remove('is-loading');
      submitBtn.firstChild.textContent = 'Send enquiry ';
    }
  });
}

