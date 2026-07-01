/*
  technicalmarketing.org — shared site script
  Loaded in <head> on every page (small, local, render-blocking so the
  theme is applied before first paint — no light-to-dark flash).

  Responsibilities:
    1. Apply the saved theme immediately (before paint).
    2. On DOM ready: inject the dark-mode toggle into the masthead nav.
    3. Reading progress bar   — only on pages carrying #reading-progress.
    4. Reading time in byline  — only on those pages, and only if the
       byline does not already contain "min read".
    5. Mobile TOC active-section highlight — only if .toc-mobile is present.
*/
(function () {
  'use strict';

  /* Dark mode is offered ONLY on reading pages, which opt in with a
     data-allow-dark attribute on <html>. The art-directed home + hub pages
     stay in the signature light palette, and a saved "dark" choice does not
     leak onto them. */
  var allowDark = document.documentElement.hasAttribute('data-allow-dark');

  /* 1. Apply saved theme as early as possible (documentElement exists here). */
  try {
    if (allowDark) {
      var saved = localStorage.getItem('tm-theme');
      if (saved === 'dark' || saved === 'light') {
        document.documentElement.setAttribute('data-theme', saved);
      }
    }
  } catch (e) {}

  function onReady(fn) {
    if (document.readyState !== 'loading') { fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  }

  /* Light is always the default. Only an explicit data-theme (set by a prior
     toggle, restored from localStorage above) makes a page dark. The OS
     color scheme is intentionally ignored. */
  function effectiveTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  onReady(function () {

    /* 2. Theme toggle button, appended as the last item in the masthead nav.
          Only on reading pages that opted into dark mode. */
    var nav = document.querySelector('.masthead__nav');
    if (allowDark && nav && !document.getElementById('theme-toggle')) {
      var btn = document.createElement('button');
      btn.id = 'theme-toggle';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Toggle light and dark mode');
      btn.setAttribute('title', 'Toggle dark mode');
      btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1rem;color:var(--ink-40);padding:0 0 0 1rem;line-height:1;vertical-align:middle;';
      var icon = document.createElement('span');
      icon.id = 'theme-icon';
      icon.textContent = effectiveTheme() === 'dark' ? '☀' : '☾'; /* ☀ / ☾ */
      btn.appendChild(icon);
      nav.appendChild(btn);

      btn.addEventListener('click', function () {
        var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('tm-theme', next); } catch (e) {}
        icon.textContent = next === 'dark' ? '☀' : '☾';
      });
    }

    /* 3. Reading progress bar — only for the plain bar this script owns.
          Article pages that already ship a .reading-progress bar with their
          own scroll handler are left untouched (guard on the class). */
    var bar = document.getElementById('reading-progress');
    if (bar && !bar.classList.contains('reading-progress')) {
      var article = document.querySelector('main, article, .article-body') || document.body;
      var update = function () {
        var rect = article.getBoundingClientRect();
        var total = article.offsetHeight - window.innerHeight;
        var scrolled = -rect.top;
        var pct = total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 0;
        bar.style.width = pct + '%';
      };
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();

      /* 4. Reading time — inject into the byline if it lacks "min read". */
      var byline = document.querySelector('.cover__byline, .byline, .article-meta');
      var body = document.querySelector('main, article, .article-body');
      if (byline && body && byline.textContent.indexOf('min read') === -1) {
        var text = body.innerText || body.textContent || '';
        var words = text.trim().split(/\s+/).length;
        var minutes = Math.max(1, Math.round(words / 220));
        var span = document.createElement('span');
        span.className = 'reading-time';
        span.textContent = minutes + ' min read';
        byline.appendChild(span);
      }
    }

    /* 5. Mobile TOC active-section highlight. */
    var tocLinks = document.querySelectorAll('.toc-mobile a');
    if (tocLinks.length && 'IntersectionObserver' in window) {
      var byId = {};
      Array.prototype.forEach.call(tocLinks, function (a) {
        var href = a.getAttribute('href') || '';
        if (href.charAt(0) === '#') {
          var target = document.getElementById(href.slice(1));
          if (target) { byId[href.slice(1)] = { link: a, el: target }; }
        }
      });
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            Array.prototype.forEach.call(tocLinks, function (x) { x.classList.remove('active'); });
            var rec = byId[entry.target.id];
            if (rec) { rec.link.classList.add('active'); }
          }
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      Object.keys(byId).forEach(function (id) { obs.observe(byId[id].el); });
    }
  });
})();
