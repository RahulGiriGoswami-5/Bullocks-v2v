document.addEventListener('DOMContentLoaded', () => {
  const views = document.querySelectorAll('.view');
  const appHeader = document.querySelector('.app-header');
  const bottomNav = document.querySelector('.bottom-nav');
  const navLinks = document.querySelectorAll('.nav-menu-link, .desktop-nav-link, .nav-item');
  const navMenuToggle = document.getElementById('nav-menu-toggle');

  function navigateTo(hash) {
    if (!hash || hash === '#') {
      hash = '#view-landing';
    }

    // Default to home if somehow an invalid hash is given but usually it's fine
    let targetView = document.querySelector(hash);
    if (!targetView) {
      hash = '#view-landing';
      targetView = document.querySelector(hash);
    }

    // Hide all views
    views.forEach(view => {
      view.classList.remove('active-view');
    });

    // Show target view
    if (targetView) {
      targetView.classList.add('active-view');
      window.scrollTo(0, 0);
    }

    // Handle header and bottom nav visibility
    if (hash === '#view-landing') {
      if (appHeader) appHeader.style.display = 'none';
      if (bottomNav) bottomNav.style.display = 'none';
    } else {
      if (appHeader) appHeader.style.display = '';
      if (bottomNav) bottomNav.style.display = 'flex';
    }

    // Update active state on nav links
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === hash) {
        link.classList.add('active');
      }
    });

    // Close mobile menu if open
    if (navMenuToggle) {
      navMenuToggle.checked = false;
    }
  }

  // Listen to hash changes
  window.addEventListener('hashchange', () => {
    navigateTo(window.location.hash);
  });

  // Handle initial load
  navigateTo(window.location.hash);

  // Catch any internal clicks that should just trigger navigation
  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (link) {
      // The hashchange event will fire automatically, doing the work
    }
  });
});
