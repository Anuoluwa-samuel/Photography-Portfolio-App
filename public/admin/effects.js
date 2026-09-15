/* Admin visual effects — vanilla ports of the public site's React components (the admin is not a React app):
     silk  -> components/ui/silk-background-animation.tsx  (fixed, full-page)
     bokeh -> components/ui/bokeh-background.tsx           (any element with [data-bokeh])
   Keep the palettes in sync with those files. Both follow the `dark` class, pause when not visible,
   and draw a still frame under prefers-reduced-motion. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var root = document.documentElement;
  var isDark = function () { return root.classList.contains('dark'); };
  var TAU = Math.PI * 2;

  /* ---------------- Silk background ---------------- */
  function silk() {
    var canvas = document.createElement('canvas');
    canvas.className = 'silk-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var RESOLUTION = 0.25, FRAME_MS = 1000 / 30, SPEED = 0.02, SCALE = 2, NOISE_INTENSITY = 0.8;
    var PALETTES = { light: { lo: [212, 228, 230], hi: [255, 255, 255] }, dark: { lo: [0, 0, 0], hi: [72, 82, 84] } };
    var image, time = 0, last = 0;

    function noise(x, y) {
      var G = 2.71828;
      return (G * Math.sin(G * x) * G * Math.sin(G * y) * (1 + x)) % 1;
    }
    function tealGlow(w, h, alpha) {
      var g = ctx.createRadialGradient(w * 0.88, -h * 0.08, 0, w * 0.88, -h * 0.08, Math.max(w, h) * 0.8);
      g.addColorStop(0, 'rgba(31, 209, 193, ' + alpha + ')');
      g.addColorStop(1, 'rgba(31, 209, 193, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    function draw() {
      var w = canvas.width, h = canvas.height, dark = isDark();
      var p = dark ? PALETTES.dark : PALETTES.light, d = image.data, t = SPEED * time;
      for (var y = 0; y < h; y++) {
        var v = (y / h) * SCALE;
        for (var x = 0; x < w; x++) {
          var u = (x / w) * SCALE;
          var texY = v + 0.03 * Math.sin(8 * u - t);
          var pattern = 0.6 + 0.4 * Math.sin(5 * (u + texY + Math.cos(3 * u + 5 * texY) + 0.02 * t) + Math.sin(20 * (u + texY - 0.1 * t)));
          var k = Math.min(1, Math.max(0, pattern - (noise(x, y) / 15) * NOISE_INTENSITY));
          var i = (y * w + x) * 4;
          d[i] = p.lo[0] + (p.hi[0] - p.lo[0]) * k;
          d[i + 1] = p.lo[1] + (p.hi[1] - p.lo[1]) * k;
          d[i + 2] = p.lo[2] + (p.hi[2] - p.lo[2]) * k;
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
      if (dark) {
        var vg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
        vg.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
        vg.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
        tealGlow(w, h, 0.08);
      } else {
        tealGlow(w, h, 0.14);
      }
    }
    function resize() {
      canvas.width = Math.max(1, Math.ceil(window.innerWidth * RESOLUTION));
      canvas.height = Math.max(1, Math.ceil(window.innerHeight * RESOLUTION));
      image = ctx.createImageData(canvas.width, canvas.height);
      draw();
    }
    function tick(now) {
      requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      time += last ? (now - last) / (1000 / 60) : 1;
      last = now;
      draw();
    }

    resize();
    canvas.classList.add('ready');
    window.addEventListener('resize', resize);
    new MutationObserver(draw).observe(root, { attributes: true, attributeFilter: ['class'] });
    if (!reduce.matches) requestAnimationFrame(tick);
  }

  /* ---------------- Bokeh highlights ---------------- */
  function bokeh(host) {
    var canvas = document.createElement('canvas');
    canvas.className = 'bokeh-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.prepend(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var W = 0, H = 0, items = [], raf = 0, last = 0, visible = true;
    var primary = [31, 209, 193], pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    function readColor() {
      var m = getComputedStyle(canvas).color.match(/[\d.]+/g);
      if (m && m.length >= 3) primary = [+m[0], +m[1], +m[2]];
    }
    function seed() {
      var count = Math.max(8, Math.min(44, Math.round(((W * H) / 100000) * 3)));
      items = [];
      for (var i = 0; i < count; i++) {
        var depth = Math.random(), angle = Math.random() * TAU;
        items.push({
          x: Math.random() * W, y: Math.random() * H,
          r: 14 + 64 * Math.pow(Math.random(), 1.6), depth: depth,
          vx: Math.cos(angle) * (0.4 + depth * 0.6), vy: Math.sin(angle) * (0.4 + depth * 0.6) - 0.25,
          phase: Math.random() * TAU, warm: Math.random() < 0.3,
        });
      }
    }
    function draw(now, dt) {
      var dark = isDark(), t = now / 1000;
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      for (var i = 0; i < items.length; i++) {
        var h = items[i];
        if (dt > 0) {
          h.x += h.vx * 14 * dt; h.y += h.vy * 14 * dt;
          if (h.x < -h.r) h.x = W + h.r; else if (h.x > W + h.r) h.x = -h.r;
          if (h.y < -h.r) h.y = H + h.r; else if (h.y > H + h.r) h.y = -h.r;
        }
        var px = h.x + pointer.x * (0.2 + h.depth) * 0.04;
        var py = h.y + pointer.y * (0.2 + h.depth) * 0.04;
        var twinkle = 0.7 + 0.3 * Math.sin(h.phase + t * (0.6 + h.depth));
        var a = (dark ? 0.34 : 0.42) * twinkle * (0.45 + 0.55 * h.depth);
        var c = dark && h.warm ? [255, 214, 170] : primary, rgb = c[0] + ',' + c[1] + ',' + c[2];
        var g = ctx.createRadialGradient(px, py, 0, px, py, h.r);
        g.addColorStop(0, 'rgba(' + rgb + ',' + a * 0.5 + ')');
        g.addColorStop(0.55, 'rgba(' + rgb + ',' + a * 0.5 + ')');
        g.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, h.r, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    function resize() {
      var rect = host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(rect.width)); H = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!items.length) seed();
      draw(performance.now(), 0);
    }
    function tick(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      draw(now, reduce.matches ? 0 : dt);
      if (!reduce.matches) raf = requestAnimationFrame(tick);
    }
    function wake() {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    }

    readColor();
    resize();
    new ResizeObserver(resize).observe(host);
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; if (visible) wake(); }).observe(host);
    new MutationObserver(function () { readColor(); draw(performance.now(), 0); wake(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('pointermove', function (e) {
      if (reduce.matches) return;
      var rect = host.getBoundingClientRect();
      pointer.tx = e.clientX - rect.left - rect.width / 2;
      pointer.ty = e.clientY - rect.top - rect.height / 2;
    }, { passive: true });
    document.addEventListener('visibilitychange', wake);
    wake();
  }

  /* ---------------- Sonar dot field (fixed, full-page) ----------------
     Port of components/ui/sonar-grid.tsx + components/site/site-sonar.tsx. */
  // "Content": taps on these never ping, and they keep their normal cursor.
  var CONTENT = 'a,button,input,select,textarea,label,summary,option,[role=button],[role=dialog],[contenteditable],' +
    'p,h1,h2,h3,h4,h5,h6,li,dt,dd,blockquote,figure,figcaption,img,svg,table,code,pre,small,strong,em,b,i,span,legend,' +
    '.glass,.sidebar,.topbar,.card,.stat-card,.svc-row,.gal-item,.modal,.modal-card,.login-card,.toast,.drop,.slot,.tabs,fieldset';

  function isEmptySpace(target) {
    if (!(target instanceof Element) || target.closest(CONTENT)) return false;
    for (var i = 0; i < target.childNodes.length; i++) {
      var n = target.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim()) return false;
    }
    return true;
  }

  function sonar() {
    var canvas = document.createElement('canvas');
    canvas.className = 'sonar-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var silkCanvas = document.querySelector('.silk-canvas');
    if (silkCanvas) silkCanvas.after(canvas); else document.body.prepend(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var SPACING = 26, DOT = 1.4, BASE = 0.28, PING_EVERY = 2.4, SPEED = 260, RING = 90, AMP = 2.2, MAX_RINGS = 6;
    var W = 0, H = 0, rings = [], raf = 0, timer = 0, color = '';
    var nextPing = performance.now() + PING_EVERY * 1000;

    function readColor() { color = getComputedStyle(canvas).color; }
    function addRing(x, y, born) {
      rings.push({ x: x, y: y, born: born });
      while (rings.length > MAX_RINGS) rings.shift();
    }
    function draw(now) {
      var lifetime = (Math.hypot(W, H) + RING) / SPEED;
      rings = rings.filter(function (r) { return (now - r.born) / 1000 < lifetime; });
      var live = rings.map(function (r) {
        var age = (now - r.born) / 1000, radius = age * SPEED;
        return { x: r.x, y: r.y, radius: radius, reach: radius + RING, fade: 1 - age / lifetime };
      });
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = color;
      var cols = Math.ceil(W / SPACING) + 1, rows = Math.ceil(H / SPACING) + 1;
      var ox = (W - (cols - 1) * SPACING) / 2, oy = (H - (rows - 1) * SPACING) / 2, hot = [];
      ctx.globalAlpha = BASE;
      ctx.beginPath();
      for (var i = 0; i < cols; i++) {
        var cx = ox + i * SPACING;
        for (var j = 0; j < rows; j++) {
          var cy = oy + j * SPACING, energy = 0;
          for (var k = 0; k < live.length; k++) {
            var r = live[k];
            if (Math.abs(cx - r.x) > r.reach || Math.abs(cy - r.y) > r.reach) continue;
            var d = Math.abs(Math.hypot(cx - r.x, cy - r.y) - r.radius);
            if (d >= RING) continue;
            var t = 1 - d / RING, e = t * t * (3 - 2 * t) * r.fade;
            if (e > energy) energy = e;
          }
          if (energy < 0.01) { ctx.moveTo(cx + DOT, cy); ctx.arc(cx, cy, DOT, 0, TAU); }
          else hot.push(cx, cy, energy);
        }
      }
      ctx.fill();
      for (var h = 0; h < hot.length; h += 3) {
        ctx.globalAlpha = BASE + (1 - BASE) * hot[h + 2];
        ctx.beginPath();
        ctx.arc(hot[h], hot[h + 1], DOT * (1 + AMP * hot[h + 2]), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }
    function tick(now) {
      raf = 0;
      if (document.hidden) return;
      if (reduce.matches) { rings = []; draw(now); return; }
      if (now >= nextPing) {
        addRing(W * (0.15 + Math.random() * 0.7), H * (0.2 + Math.random() * 0.6), now);
        nextPing = now + PING_EVERY * 1000;
      }
      draw(now);
      if (rings.length) raf = requestAnimationFrame(tick);
      else { clearTimeout(timer); timer = setTimeout(function () { tick(performance.now()); }, Math.max(16, nextPing - now)); }
    }
    function wake() {
      if (raf) return;
      clearTimeout(timer);
      raf = requestAnimationFrame(tick);
    }

    readColor();
    resize();
    if (!reduce.matches) addRing(W * 0.62, H * 0.4, performance.now() - 500); // seed ping
    window.addEventListener('resize', resize);
    new MutationObserver(function () { readColor(); draw(performance.now()); wake(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
    window.addEventListener('pointerdown', function (e) {
      if (reduce.matches || !isEmptySpace(e.target)) return;
      addRing(e.clientX, e.clientY, performance.now());
      wake();
    });
    var cursorOn = false;
    window.addEventListener('pointermove', function (e) {
      var on = e.pointerType === 'mouse' && isEmptySpace(e.target);
      if (on === cursorOn) return;
      cursorOn = on;
      if (on) root.dataset.sonarCursor = 'on'; else delete root.dataset.sonarCursor;
    }, { passive: true });
    wake();
  }

  function init() {
    silk();
    sonar();
    Array.prototype.forEach.call(document.querySelectorAll('[data-bokeh]'), bokeh);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
