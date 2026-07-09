/**
 * Sahayika — Theme Toggle (Dark / Light Mode)
 * This is the only JavaScript file allowed in Phase 1.
 * Persists the user's preference to localStorage and respects system preference.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'sahayika-theme';
  var html = document.documentElement;

  // Determine initial theme
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') {
    html.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
  }

  // Bind toggle button(s) — every page has one with id="theme-toggle"
  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
      var current = html.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
    });
  });
})();
