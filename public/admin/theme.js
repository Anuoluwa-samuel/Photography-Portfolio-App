/* Shared light/dark theme for the admin. Uses the same localStorage key as the public site
   (next-themes, key "theme"), so the choice follows you between the site and the dashboard.
   Loaded synchronously in <head> so the correct theme paints first. */
(function () {
  var KEY = 'theme';
  var root = document.documentElement;

  function apply(theme) {
    var dark = theme === 'dark';
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  apply(saved === 'dark' ? 'dark' : 'light'); // light (whitish) is the default, as on the site

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    var next = root.classList.contains('dark') ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (err) { /* storage blocked */ }
  });

  // Another tab (site or admin) changed the theme.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) apply(e.newValue === 'dark' ? 'dark' : 'light');
  });
})();
