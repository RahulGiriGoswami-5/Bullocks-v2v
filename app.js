/**
 * Sahayika — Theme Toggle (Dark / Light Mode)
 * Persists the user's preference to localStorage and respects system preference.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'sahayika-theme';
    var html = document.documentElement;

    // Determine initial theme (localStorage can throw on file:// URLs or with
    // strict browser privacy settings, so guard it to avoid crashing the whole script)
    var saved = null;
    try {
        saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
        console.warn('localStorage unavailable, falling back to system theme:', e);
    }

    if (saved === 'dark' || saved === 'light') {
        html.setAttribute('data-theme', saved);
    } else {
        html.setAttribute('data-theme', 'dark');
    }

    // Bind toggle button(s) — query all elements with class "theme-toggle"
    function initTheme() {
        var toggles = document.querySelectorAll('.theme-toggle');
        toggles.forEach(function (toggle) {
            toggle.addEventListener('click', function () {
                var current = html.getAttribute('data-theme');
                var next = current === 'dark' ? 'light' : 'dark';
                html.setAttribute('data-theme', next);
                try {
                    localStorage.setItem(STORAGE_KEY, next);
                } catch (e) {
                    console.warn('Could not persist theme preference:', e);
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }
})();

function initApp() {
    // Navigation & SPA Views
    const views = document.querySelectorAll('.view');
    const appHeader = document.querySelector('.app-header');
    const bottomNav = document.querySelector('.bottom-nav');
    const navLinks = document.querySelectorAll('.nav-menu-link, .desktop-nav-link, .nav-item');
    const navMenuToggle = document.getElementById('nav-menu-toggle');

    function navigateTo(hash) {
        if (!hash || hash === '#') {
            hash = '#view-landing';
        }

        let targetView = null;
        try {
            targetView = document.querySelector(hash);
        } catch (e) {
            console.warn('Invalid hash selector parsed, falling back:', e);
        }

        if (!targetView) {
            hash = '#view-landing';
            try {
                targetView = document.querySelector(hash);
            } catch (e) {
                console.error('Landing view query failed:', e);
            }
        }

        // Toggle active view with transitions
        views.forEach(view => {
            view.classList.remove('active-view');
        });

        if (targetView) {
            targetView.classList.add('active-view');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Toggle nav headers/footers with CSS classes instead of inline style display
        if (hash === '#view-landing') {
            if (appHeader) appHeader.classList.add('hide-nav-layout');
            if (bottomNav) bottomNav.classList.add('hide-nav-layout');
        } else {
            if (appHeader) appHeader.classList.remove('hide-nav-layout');
            if (bottomNav) bottomNav.classList.remove('hide-nav-layout');
        }

        // Update active nav links
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === hash) {
                link.classList.add('active');
            }
        });

        // Close mobile drawer menu
        if (navMenuToggle) {
            navMenuToggle.checked = false;
        }

        // Invalidate Leaflet Map when home page becomes visible
        if (hash === '#view-home') {
            setTimeout(initLeafletMap, 50);
        }

        if (hash === '#view-profile') {
            if (typeof loadProfileTrustedContacts === 'function') {
                loadProfileTrustedContacts();
            }
        }
    }

    window.addEventListener('hashchange', () => {
        navigateTo(window.location.hash);
    });
    navigateTo(window.location.hash);

    // Close menus/modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (isMapFullscreen) setMapFullscreen(false);
            if (navMenuToggle) navMenuToggle.checked = false;

            const authModal = document.getElementById('auth-modal');
            if (authModal) authModal.classList.remove('active');

            const chatModal = document.getElementById('chat-modal');
            if (chatModal) chatModal.classList.remove('active');

            const historyDrawer = document.getElementById('calc-history-drawer');
            if (historyDrawer) historyDrawer.style.display = 'none';
        }
    });

    // ==========================================
    // LANDING PAGE AUTH MODAL & TABS
    // ==========================================
    const authModal = document.getElementById('auth-modal');
    const openAuthBtns = document.querySelectorAll('.open-auth-btn');
    const closeAuthBtn = document.querySelector('.modal-close');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');

    // Open modal
    openAuthBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if (authModal) authModal.classList.add('active');
            switchAuthTab(target === 'signup' ? 'signup' : 'login');
        });
    });

    // Close modal
    if (closeAuthBtn) {
        closeAuthBtn.addEventListener('click', () => {
            if (authModal) authModal.classList.remove('active');
        });
    }
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) authModal.classList.remove('active');
        });
    }

    function switchAuthTab(type) {
        if (type === 'signup') {
            tabLogin.classList.remove('active');
            tabSignup.classList.add('active');
            formLogin.style.display = 'none';
            formSignup.style.display = 'flex';
        } else {
            tabSignup.classList.remove('active');
            tabLogin.classList.add('active');
            formSignup.style.display = 'none';
            formLogin.style.display = 'flex';
        }
    }

    if (tabLogin && tabSignup) {
        tabLogin.addEventListener('click', () => switchAuthTab('login'));
        tabSignup.addEventListener('click', () => switchAuthTab('signup'));
    }

    // ==========================================
    // GUEST EMERGENCY ACCESS — no login required
    // ==========================================
    function enterGuestMode() {
        try {
            if (!localStorage.getItem('sahayika-guest')) {
                localStorage.setItem('sahayika-guest', 'true');
            }
        } catch (e) {
            console.warn('localStorage unavailable for guest mode:', e);
        }
        if (authModal) authModal.classList.remove('active');
        window.location.hash = '#view-sos';
        navigateTo('#view-sos');
    }

    const guestEmergencyBtn = document.getElementById('guest-emergency-btn');
    if (guestEmergencyBtn) {
        guestEmergencyBtn.addEventListener('click', enterGuestMode);
    }

    const modalGuestBtn = document.getElementById('modal-guest-btn');
    if (modalGuestBtn) {
        modalGuestBtn.addEventListener('click', enterGuestMode);
    }

    // ==========================================
    // EMERGENCY MEGA BUTTON + QUICK ACTION SHEET
    // ==========================================
    const emergencyMegaBtn = document.getElementById('emergency-mega-btn');
    const emergencySheetOverlay = document.getElementById('emergency-sheet-overlay');
    const closeEmergencySheetBtn = document.getElementById('close-emergency-sheet');
    const alertContactsBtn = document.getElementById('alert-contacts-btn');
    const decoyModeBtn = document.getElementById('decoy-mode-btn');
    const exploreLinkBtn = document.getElementById('explore-link-btn');
    const exploreSection = document.getElementById('explore-section');

    function openEmergencySheet() {
        if (emergencySheetOverlay) emergencySheetOverlay.classList.add('active');
    }
    function closeEmergencySheet() {
        if (emergencySheetOverlay) emergencySheetOverlay.classList.remove('active');
    }

    if (emergencyMegaBtn) {
        emergencyMegaBtn.addEventListener('click', openEmergencySheet);
    }
    if (closeEmergencySheetBtn) {
        closeEmergencySheetBtn.addEventListener('click', closeEmergencySheet);
    }
    if (emergencySheetOverlay) {
        emergencySheetOverlay.addEventListener('click', (e) => {
            if (e.target === emergencySheetOverlay) closeEmergencySheet();
        });
    }
    if (alertContactsBtn) {
        alertContactsBtn.addEventListener('click', () => {
            closeEmergencySheet();
            logToolUsage('alert_contacts');
            triggerSOS();
        });
    }
    if (decoyModeBtn) {
        decoyModeBtn.addEventListener('click', () => {
            closeEmergencySheet();
            logToolUsage('decoy_mode');
            enterGuestMode();
        });
    }

    // Log emergency call link taps
    document.querySelectorAll('a[href="tel:112"], a[href="tel:102"], a[href="tel:100"]').forEach(link => {
        link.addEventListener('click', () => {
            const key = 'call_' + link.getAttribute('href').replace('tel:', '');
            logToolUsage(key);
        });
    });
    if (exploreLinkBtn && exploreSection) {
        exploreLinkBtn.addEventListener('click', () => {
            exploreSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // NOTE: explore-card clicks are now gated by auth.js — they no longer
    // silently grant guest mode here.

    // Smooth scroll CTA
    const scrollBtn = document.querySelector('.scroll-to-info');
    if (scrollBtn) {
        scrollBtn.addEventListener('click', () => {
            showToast("Sahayika protects 10k+ active citizens daily!");
        });
    }


    // ==========================================
    // LEAFLET MAP — LIVE SAFETY HEATMAP
    // ==========================================
    let mapInstance = null;
    let reportsLayer = null;
    let activeReportPopup = null;

    const categoryColors = {
        'Poor lighting': '#F59E0B',
        'Harassment': '#DC2626',
        'Isolated / no people around': '#7C3AED',
        'Unsafe transit stop': '#2563EB',
        'Other': '#6B7280'
    };

    function initLeafletMap() {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;
        if (typeof L === 'undefined') {
            console.warn('Leaflet library not loaded; skipping map init.');
            return;
        }

        if (mapInstance) {
            mapInstance.invalidateSize();
            return;
        }

        // Initial Coordinates (Bangalore Center as standard mockup)
        mapInstance = L.map('map', {
            zoomControl: false,
            scrollWheelZoom: false
        }).setView([12.9716, 77.5946], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstance);

        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

        mapInstance.on('click', handleMapReportClick);

        renderReportPins();
    }

    // ==========================================
    // LIVE LOCATION (geolocation permission + tracking)
    // ==========================================
    let userLocationMarker = null;
    let geoWatchId = null;

    function updateUserLocationMarker(lat, lng) {
        if (!mapInstance) return;
        if (userLocationMarker) {
            mapInstance.removeLayer(userLocationMarker);
        }
        const icon = L.divIcon({
            className: 'user-location-icon',
            html: '<div class="user-location-dot"><span class="user-location-pulse"></span></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        userLocationMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 })
            .bindTooltip('You are here', { direction: 'top', offset: [0, -10] });
        userLocationMarker.addTo(mapInstance);
    }

    function requestLiveLocation(recenter) {
        if (!navigator.geolocation) {
            showToast('Live location is not supported on this device.');
            return;
        }

        // Check the actual permission state first. Browsers will NOT
        // re-show the native popup once a user has blocked it — so if
        // we blindly call getCurrentPosition again it just fails silently.
        // Checking first lets us give honest, actionable feedback instead.
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' })
                .then((status) => {
                    if (status.state === 'denied') {
                        showLocationDeniedHelp();
                        return;
                    }
                    fetchAndTrackLocation(recenter);
                })
                .catch(() => fetchAndTrackLocation(recenter)); // Permissions API not fully supported — try directly
        } else {
            fetchAndTrackLocation(recenter);
        }
    }

    function fetchAndTrackLocation(recenter) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                updateUserLocationMarker(latitude, longitude);
                if (recenter && mapInstance) {
                    mapInstance.setView([latitude, longitude], 16);
                }
                startWatchingLocation();
            },
            (err) => {
                console.warn('Geolocation error:', err);
                if (err.code === err.PERMISSION_DENIED) {
                    showLocationDeniedHelp();
                } else {
                    showToast('Could not get your live location. Please try again.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    function showLocationDeniedHelp() {
        showToast('Location is blocked for this site. Tap the lock/info icon in your browser\'s address bar → Site settings → Location → Allow — then tap the locate button again.');
    }

    function startWatchingLocation() {
        if (geoWatchId !== null || !navigator.geolocation) return;
        geoWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                updateUserLocationMarker(latitude, longitude);
            },
            (err) => console.warn('Geolocation watch error:', err),
            { enableHighAccuracy: true, maximumAge: 30000 }
        );
    }

    function stopWatchingLocation() {
        if (geoWatchId !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(geoWatchId);
            geoWatchId = null;
        }
    }

    window.addEventListener('hashchange', () => {
        if (window.location.hash !== '#view-home') {
            stopWatchingLocation();
        }
    });

    const mapLocateBtn = document.getElementById('map-locate-btn');
    if (mapLocateBtn) {
        mapLocateBtn.addEventListener('click', () => requestLiveLocation(true));
    }

    // ==========================================
    // MAP FULLSCREEN EXPAND / CLOSE
    // ==========================================
    const mapCardWrapper = document.getElementById('map-card-wrapper');
    const mapExpandBtn = document.getElementById('map-expand-btn');
    let isMapFullscreen = false;

    // Placeholder marks exactly where the map card lives in the page,
    // so we can put it back in the right spot after fullscreen closes.
    const mapCardPlaceholder = document.createComment('map-card-placeholder');

    function setMapFullscreen(expand) {
        if (!mapCardWrapper) return;
        isMapFullscreen = expand;

        if (expand) {
            // Move the map card out from under any transformed ancestor
            // (the .view fade-in animation leaves a transform applied,
            // which breaks position:fixed containment) and attach it
            // directly to <body> so "fixed" is relative to the real viewport.
            mapCardWrapper.parentNode.insertBefore(mapCardPlaceholder, mapCardWrapper);
            document.body.appendChild(mapCardWrapper);
        } else if (mapCardPlaceholder.parentNode) {
            mapCardPlaceholder.parentNode.insertBefore(mapCardWrapper, mapCardPlaceholder);
            mapCardPlaceholder.remove();
        }

        mapCardWrapper.classList.toggle('map-fullscreen-active', expand);
        document.body.classList.toggle('map-fullscreen-lock', expand);

        if (mapExpandBtn) {
            mapExpandBtn.innerHTML = expand
                ? '<i data-lucide="minimize-2"></i>'
                : '<i data-lucide="maximize-2"></i>';
            mapExpandBtn.setAttribute('title', expand ? 'Close full-screen map' : 'Expand map');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        setTimeout(() => {
            if (mapInstance) mapInstance.invalidateSize();
        }, 210);
    }

    if (mapExpandBtn) {
        mapExpandBtn.addEventListener('click', () => setMapFullscreen(!isMapFullscreen));
    }

    async function renderReportPins() {
        if (!mapInstance || !window.SahayikaReports) return;

        const reports = await window.SahayikaReports.getReports();

        if (reportsLayer) {
            mapInstance.removeLayer(reportsLayer);
        }
        reportsLayer = L.layerGroup();

        reports.forEach((r) => {
            const color = categoryColors[r.category] || categoryColors['Other'];
            const marker = L.circleMarker([r.lat, r.lng], {
                radius: 8,
                color: '#FFFFFF',
                weight: 2,
                fillColor: color,
                fillOpacity: 0.9
            });
            marker.bindTooltip(r.category, { direction: 'top', offset: [0, -8] });
            reportsLayer.addLayer(marker);
        });

        reportsLayer.addTo(mapInstance);
    }

    function handleMapReportClick(e) {
        if (activeReportPopup) {
            mapInstance.closePopup(activeReportPopup);
            activeReportPopup = null;
        }

        const { lat, lng } = e.latlng;
        let selectedCategory = '';

        const popup = L.popup({
            closeButton: true,
            closeOnClick: false,
            autoClose: false,
            className: 'custom-leaflet-popup',
            maxWidth: 240,
            minWidth: 210
        }).setLatLng(e.latlng);

        const container = document.createElement('div');
        container.className = 'report-popup-form';
        container.innerHTML = `
            <h4>Report a safety concern</h4>
            <p class="report-popup-desc">Anonymous — location is shifted ~50-100m for privacy.</p>
            <div class="report-category-grid">
                <button type="button" class="report-cat-btn" data-category="Poor lighting">💡 Poor lighting</button>
                <button type="button" class="report-cat-btn" data-category="Harassment">⚠️ Harassment</button>
                <button type="button" class="report-cat-btn" data-category="Isolated / no people around">👥 Isolated</button>
                <button type="button" class="report-cat-btn" data-category="Unsafe transit stop">🚌 Transit stop</button>
                <button type="button" class="report-cat-btn" data-category="Other">✏️ Other</button>
            </div>
            <textarea class="report-note-input" id="report-note-input" maxlength="100" placeholder="Optional note (max 100 chars)" style="display:none;"></textarea>
            <button type="button" class="btn btn-primary btn-block report-submit-btn" id="report-submit-btn" disabled>Submit Report</button>
        `;

        const catButtons = container.querySelectorAll('.report-cat-btn');
        const noteInput = container.querySelector('#report-note-input');
        const submitBtn = container.querySelector('#report-submit-btn');

        catButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                catButtons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                selectedCategory = btn.getAttribute('data-category');
                submitBtn.disabled = false;
                noteInput.style.display = selectedCategory === 'Other' ? 'block' : 'none';
            });
        });

        submitBtn.addEventListener('click', async () => {
            if (!selectedCategory || submitBtn.disabled) return;

            if (window.SahayikaReports) {
                const rateCheck = window.SahayikaReports.checkRateLimit();
                if (!rateCheck.allowed) {
                    const waitMins = Math.ceil((rateCheck.resetTime - Date.now()) / 60000);
                    showToast(`Rate limit reached. Try again in ${waitMins} min(s).`);
                    mapInstance.closePopup(popup);
                    return;
                }
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting…';

            const note = noteInput.value.trim() || null;
            const result = window.SahayikaReports
                ? await window.SahayikaReports.addReport({ lat, lng, category: selectedCategory, note })
                : null;

            if (result) {
                showToast('Safety concern reported anonymously.');
                mapInstance.closePopup(popup);
                logReportContribution(result.id || null);
                await renderReportPins();
            } else {
                showToast('Could not save report. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Report';
            }
        });

        popup.setContent(container);
        popup.openOn(mapInstance);
        activeReportPopup = popup;
    }


    // ==========================================
    // DECOY CALCULATOR & SECRET SOS
    // ==========================================
    const calcExpression = document.getElementById('calc-expression');
    const calcResult = document.getElementById('calc-result');
    const calcButtons = document.querySelectorAll('.calc-btn');
    const historyBtn = document.getElementById('calc-history-btn');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyDrawer = document.getElementById('calc-history-drawer');
    const historyList = document.getElementById('calc-history-list');
    const sosOverlay = document.getElementById('sos-alert-overlay');
    const sosCancelBtn = document.getElementById('sos-cancel-btn');
    const sosCountdownText = document.getElementById('sos-countdown-timer');

    let expressionString = '';
    let resultString = '0';
    let calculationLogs = [];
    let sosTimer = null;
    let equalsHoldTimer = null;

    // Render calc displays
    function updateCalcUI() {
        if (calcExpression) calcExpression.textContent = expressionString || '0';
        if (calcResult) calcResult.textContent = resultString || '0';
    }

    // Decoy calculations evaluator
    function evaluateDecoyCalc() {
        if (!expressionString) return;
        try {
            // Replace safe multiplication and division marks
            let cleanExpr = expressionString.replace(/&times;/g, '*').replace(/&divide;/g, '/').replace(/×/g, '*').replace(/÷/g, '/');

            // Basic math parsing via Function evaluation (secure since inputs are button clicks only)
            let evalValue = new Function(`return ${cleanExpr}`)();

            // Format response float
            if (evalValue !== undefined) {
                let rounded = Number(Math.round(evalValue + 'e6') + 'e-6');
                resultString = rounded.toString();

                // Push to history logs
                calculationLogs.unshift(`${expressionString} = ${resultString}`);
                updateHistoryList();
            }
        } catch (err) {
            resultString = 'Error';
        }
    }

    function updateHistoryList() {
        if (!historyList) return;
        if (calculationLogs.length === 0) {
            historyList.innerHTML = `<div class="history-item-empty">No calculations logged.</div>`;
        } else {
            historyList.innerHTML = calculationLogs.map(log => `
        <div class="history-item">
          <span class="hist-expr">${log.split(' = ')[0]}</span>
          <span class="hist-res">${log.split(' = ')[1]}</span>
        </div>
      `).join('');
        }
    }

    // Button logic
    calcButtons.forEach(btn => {
        // Escape standard text values
        const value = btn.textContent;
        const id = btn.id;

        if (id === 'calc-equals') {
            // Event listener for holding equals to trigger SOS
            btn.addEventListener('mousedown', () => {
                equalsHoldTimer = setTimeout(() => {
                    triggerSOS();
                }, 1500);
            });
            btn.addEventListener('mouseup', () => {
                clearTimeout(equalsHoldTimer);
            });
            btn.addEventListener('touchstart', () => {
                equalsHoldTimer = setTimeout(() => {
                    triggerSOS();
                }, 1500);
            });
            btn.addEventListener('touchend', () => {
                clearTimeout(equalsHoldTimer);
            });

            // Regular click event
            btn.addEventListener('click', () => {
                if (expressionString === '911') {
                    triggerSOS();
                    return;
                }
                evaluateDecoyCalc();
                updateCalcUI();
            });
            return;
        }

        btn.addEventListener('click', () => {
            if (id === 'calc-ac') {
                expressionString = '';
                resultString = '0';
            } else if (id === 'calc-back') {
                expressionString = expressionString.slice(0, -1);
            } else if (id === 'calc-percent') {
                expressionString += '/100';
            } else if (btn.classList.contains('calc-btn-op')) {
                let opChar = value;
                if (id === 'calc-multiply') opChar = '×';
                if (id === 'calc-divide') opChar = '÷';
                if (id === 'calc-plus') opChar = '+';
                if (id === 'calc-minus') opChar = '-';
                expressionString += opChar;
            } else {
                expressionString += value;
            }
            updateCalcUI();
        });
    });

    // History toggling
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            if (historyDrawer) historyDrawer.style.display = 'block';
        });
    }
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => {
            if (historyDrawer) historyDrawer.style.display = 'none';
        });
    }

    // SOS activation triggers
    function triggerSOS() {
        if (sosOverlay) sosOverlay.style.display = 'flex';
        let countdown = 5;
        if (sosCountdownText) sosCountdownText.textContent = countdown;

        if (sosTimer) clearInterval(sosTimer);

        sosTimer = setInterval(() => {
            countdown--;
            if (sosCountdownText) sosCountdownText.textContent = countdown;

            if (countdown <= 0) {
                clearInterval(sosTimer);
                // SOS Send success
                sosCountdownText.textContent = "SENT";
                showToast("🚨 EMERGENCY SOS SENT! Coordinates broadcasted.");
                setTimeout(() => {
                    if (sosOverlay) sosOverlay.style.display = 'none';
                    // Navigate to Home dashboard
                    window.location.hash = '#view-home';
                }, 1500);
            }
        }, 1000);
    }

    // Cancel SOS
    if (sosCancelBtn) {
        sosCancelBtn.addEventListener('click', () => {
            if (sosTimer) clearInterval(sosTimer);
            if (sosOverlay) sosOverlay.style.display = 'none';
            showToast("SOS alert cancelled.");
        });
    }

    // Quick SOS from header/dashboard banner
    const quickSOSBtn = document.getElementById('sos-quick-btn');
    if (quickSOSBtn) {
        quickSOSBtn.addEventListener('click', triggerSOS);
    }


    // ==========================================
    // SAFE CHECK-IN COUNTDOWN TIMER
    // ==========================================
    const btnStartCheckin = document.getElementById('btn-checkin-start');
    const checkinETA = document.getElementById('checkin-eta');
    const checkinDuration = document.getElementById('checkin-duration');
    const checkinDest = document.getElementById('checkin-destination');
    const timerDigits = document.getElementById('timer-digits');
    const timerStatus = document.getElementById('timer-status');

    let checkinInterval = null;

    if (btnStartCheckin) {
        btnStartCheckin.addEventListener('click', () => {
            if (checkinInterval) {
                // Stop check-in
                clearInterval(checkinInterval);
                checkinInterval = null;
                if (timerDigits) timerDigits.textContent = "00:00";
                if (timerStatus) {
                    timerStatus.textContent = "Not Active";
                    timerStatus.parentElement.classList.remove('active-timing');
                }
                btnStartCheckin.innerHTML = `<i data-lucide="play"></i> Start Check-in`;
                btnStartCheckin.classList.remove('btn-red');
                btnStartCheckin.classList.add('btn-primary');
                if (typeof lucide !== 'undefined') lucide.createIcons();
                showToast("Check-in session ended.");
            } else {
                // Start check-in countdown
                let dest = checkinDest.value || "Default Route";
                let durationMins = parseInt(checkinDuration.value) || 30;
                let totalSeconds = durationMins * 60;

                if (timerStatus) {
                    timerStatus.textContent = `Arriving at: ${dest}`;
                    timerStatus.parentElement.classList.add('active-timing');
                }
                btnStartCheckin.innerHTML = `<i data-lucide="square"></i> End Check-in`;
                btnStartCheckin.classList.remove('btn-primary');
                btnStartCheckin.classList.add('btn-red');
                lucide.createIcons();
                showToast(`Route check-in started: ${durationMins} mins.`);

                logCheckin(dest, durationMins);
                runCheckinCountdown(totalSeconds);
            }
        });
    }

    function runCheckinCountdown(seconds) {
        if (checkinInterval) clearInterval(checkinInterval);

        function updateDigits() {
            let m = Math.floor(seconds / 60);
            let s = seconds % 60;
            if (timerDigits) {
                timerDigits.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
        }

        updateDigits();

        checkinInterval = setInterval(() => {
            seconds--;
            updateDigits();
            if (seconds <= 0) {
                clearInterval(checkinInterval);
                checkinInterval = null;
                if (timerStatus) timerStatus.textContent = "ALERT EXPIRED!";
                showToast("⚠️ Time out! Safety check-in warning triggered.");
                triggerSOS(); // Trigger emergency immediately
            }
        }, 1000);
    }


    // ==========================================
    // INCIDENT REPORT TAB CONTROL
    // ==========================================
    const tabReportSubmit = document.getElementById('tab-report-submit');
    const tabReportFeed = document.getElementById('tab-report-feed');
    const contentReportSubmit = document.getElementById('report-submit-content');
    const contentReportFeed = document.getElementById('report-feed-content');

    function toggleReportTabs(activeTab) {
        if (activeTab === 'feed') {
            tabReportSubmit.classList.remove('active');
            tabReportFeed.classList.add('active');
            contentReportSubmit.style.display = 'none';
            contentReportFeed.style.display = 'block';
        } else {
            tabReportFeed.classList.remove('active');
            tabReportSubmit.classList.add('active');
            contentReportFeed.style.display = 'none';
            contentReportSubmit.style.display = 'block';
        }
    }

    if (tabReportSubmit && tabReportFeed) {
        tabReportSubmit.addEventListener('click', () => toggleReportTabs('submit'));
        tabReportFeed.addEventListener('click', () => toggleReportTabs('feed'));
    }

    // Report Form Submission & Feed Append
    const btnSubmitReport = document.getElementById('report-submit-btn');
    const inputReportType = document.getElementById('report-type');
    const inputReportDate = document.getElementById('report-date');
    const inputReportTime = document.getElementById('report-time');
    const inputReportLoc = document.getElementById('report-location');
    const inputReportDesc = document.getElementById('report-description');
    const feedList = document.querySelector('.community-feed-list');

    // Severity rating chips selection
    const sevChips = document.querySelectorAll('.severity-chips .filter-chip');
    let selectedSeverity = 'low';

    sevChips.forEach(chip => {
        chip.addEventListener('click', () => {
            sevChips.forEach(c => c.classList.remove('active', 'sev-low', 'sev-moderate', 'sev-high', 'sev-critical'));
            const sev = chip.getAttribute('data-severity');
            selectedSeverity = sev;
            chip.classList.add('active');
            if (sev === 'low') chip.classList.add('sev-low');
            else if (sev === 'moderate') chip.classList.add('sev-moderate');
            else if (sev === 'high') chip.classList.add('sev-high');
            else if (sev === 'critical') chip.classList.add('sev-critical');
        });
    });

    if (btnSubmitReport) {
        btnSubmitReport.addEventListener('click', async () => {
            const type = inputReportType.value;
            const location = inputReportLoc.value || "Unknown Location";
            const desc = inputReportDesc.value;

            if (!type || !desc) {
                showToast("Please fill in incident type and description.");
                return;
            }

            // Save to database via window.SahayikaReports
            const noteWithLocation = `Location: ${location}\n${desc}`;
            let savedReportId = null;
            
            if (window.SahayikaReports && typeof window.SahayikaReports.addReport === 'function') {
                try {
                    // We don't have lat/lng from the form, so pass 0,0 and rely on the text location in the note
                    const savedReport = await window.SahayikaReports.addReport({ 
                        lat: 0, 
                        lng: 0, 
                        category: type, 
                        note: noteWithLocation 
                    });
                    if (savedReport && savedReport.id) {
                        savedReportId = savedReport.id;
                    }
                } catch (e) {
                    console.error("Failed to save report to DB:", e);
                }
            }

            // Format category label
            let categoryLabel = type.charAt(0).toUpperCase() + type.slice(1);
            if (type === 'unsafe-area') categoryLabel = 'Unsafe Area/lighting';

            // Category Icon
            let icon = 'alert-triangle';
            if (type === 'harassment') icon = 'eye-off';
            if (type === 'stalking') icon = 'eye-off';
            if (type === 'unsafe-area') icon = 'lightbulb-off';

            // Create new feed card
            const newCard = document.createElement('div');
            newCard.className = `card feed-report-card border-left-${selectedSeverity === 'critical' || selectedSeverity === 'high' ? 'high' : 'warning'}`;
            newCard.innerHTML = `
        <div class="feed-card-header">
          <div class="reporter-info-flex">
            <div class="avatar avatar-md avatar-turquoise">PD</div>
            <div>
              <div class="reporter-name">Priya Deshmukh <span class="verification-badge" title="Verified Reporter"><i data-lucide="badge-check"></i></span></div>
              <span class="post-time">Just now &bull; Near ${location}</span>
            </div>
          </div>
          <span class="badge ${selectedSeverity === 'critical' || selectedSeverity === 'high' ? 'badge-red' : 'badge-yellow'} font-semibold">
            <i data-lucide="alert-octagon"></i> ${selectedSeverity.charAt(0).toUpperCase() + selectedSeverity.slice(1)}
          </span>
        </div>
        <div class="feed-card-body">
          <div class="category-indicator">
            <i data-lucide="${icon}" class="text-coral"></i>
            <span class="font-semibold text-xs text-navy">${categoryLabel}</span>
          </div>
          <p class="feed-report-desc">"${desc}"</p>
        </div>
        <div class="feed-card-footer">
          <button class="btn btn-xs btn-outline btn-helpful-trigger" data-count="0">
            <i data-lucide="thumbs-up"></i> Helpful (0)
          </button>
          <button class="btn btn-xs btn-ghost text-muted"><i data-lucide="share-2"></i> Share</button>
        </div>
      `;

            if (feedList) {
                feedList.insertBefore(newCard, feedList.firstChild);
            }

            // Re-create icons for new content
            if (typeof lucide !== 'undefined') lucide.createIcons();

            // Clear Form
            inputReportType.value = "";
            inputReportLoc.value = "";
            inputReportDesc.value = "";

            showToast("Report submitted anonymously!");
            
            // Log association for the active user profile
            logReportContribution(savedReportId);

            // Auto toggle to Community Feed tab
            toggleReportTabs('feed');
        });
    }

    // Upvote/Helpful count trigger on Feed
    document.body.addEventListener('click', (e) => {
        const trigger = e.target.closest('.btn-helpful-trigger');
        if (trigger) {
            let count = parseInt(trigger.getAttribute('data-count')) || 0;
            if (trigger.classList.contains('active')) {
                count--;
                trigger.classList.remove('active');
            } else {
                count++;
                trigger.classList.add('active');
                showToast("Vouched as helpful.");
            }
            trigger.setAttribute('data-count', count);
            trigger.innerHTML = `<i data-lucide="thumbs-up"></i> Helpful (${count})`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });


    // ==========================================
    // RESPONDERS CATEGORY FILTERING
    // ==========================================
    const responderFilterChips = document.querySelectorAll('.responder-filters .filter-chip');
    const responderCards = document.querySelectorAll('.responder-profile-card');

    responderFilterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            responderFilterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const filterVal = chip.getAttribute('data-filter');

            responderCards.forEach(card => {
                const cat = card.getAttribute('data-category');
                if (filterVal === 'all' || cat === filterVal) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });


    // ==========================================
    // RESPONDER SECURE MOCK CHAT SYSTEM
    // ==========================================
    const chatModal = document.getElementById('chat-modal');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    const chatMessagesContainer = document.getElementById('chat-messages-container');
    const chatForm = document.getElementById('chat-input-form');
    const chatInput = document.getElementById('chat-msg-input');
    const chatAvatar = document.getElementById('chat-responder-avatar');
    const chatName = document.getElementById('chat-responder-name');
    const chatRole = document.getElementById('chat-responder-role');

    const mockReplies = [
        "Understood. I am on my way to your zone. Keep on the main street.",
        "Coordinates verified. Patrol Unit is tracking you. ETA 4 mins.",
        "Stay in a well-lit area. I am call-active. Reach out if anyone approaches.",
        "Connecting with nearest volunteer guard to assist you. Standby."
    ];

    // Open Chat
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-msg-responder');
        if (btn) {
            const name = btn.getAttribute('data-name');
            const avatar = btn.getAttribute('data-avatar');
            const role = btn.getAttribute('data-role');

            if (chatName) chatName.textContent = name;
            if (chatAvatar) chatAvatar.textContent = avatar;
            if (chatRole) chatRole.textContent = role;

            if (chatMessagesContainer) {
                chatMessagesContainer.innerHTML = `
          <div class="chat-system-message">Secure, E2E encrypted tunnel established.</div>
          <div class="message msg-received">Hello Priya! I see you are nearby. How can I assist you right now?</div>
        `;
            }

            if (chatModal) chatModal.classList.add('active');
        }
    });

    // Close Chat
    if (chatCloseBtn) {
        chatCloseBtn.addEventListener('click', () => {
            if (chatModal) chatModal.classList.remove('active');
        });
    }

    // Send Message & Receive automated responder response
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const txt = chatInput.value.trim();
            if (!txt) return;

            // Add user message
            const userMsg = document.createElement('div');
            userMsg.className = "message msg-sent";
            userMsg.textContent = txt;
            chatMessagesContainer.appendChild(userMsg);

            chatInput.value = "";
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

            // Delayed responder reply
            setTimeout(() => {
                const reply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
                const responderMsg = document.createElement('div');
                responderMsg.className = "message msg-received";
                responderMsg.textContent = reply;
                chatMessagesContainer.appendChild(responderMsg);
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

                // Slight alert tone sound mockup
                showToast("New responder message received.");
            }, 1000);
        });
    }


    // ==========================================
    // SYSTEM TOAST NOTIFICATION COMPONENT
    // ==========================================
    function showToast(message) {
        // Remove existing toast if visible
        const existing = document.querySelector('.system-toast');
        if (existing) existing.remove();

        // Create toast container
        const toast = document.createElement('div');
        toast.className = 'system-toast';
        toast.innerHTML = `<i data-lucide="info" class="w-4 h-4"></i> <span>${message}</span>`;
        document.body.appendChild(toast);

        // Create icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Fade out and remove
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3500);
    }

    // ==========================================
    // PREMIUM LIGHT MODE MOUSE TRACKING & PARALLAX
    // ==========================================
    (function initPremiumMouseTracking() {
        let ticked = false;

        window.addEventListener('mousemove', (e) => {
            if (ticked) return;

            const theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'dark') return;

            ticked = true;
            window.requestAnimationFrame(() => {
                const clientX = e.clientX;
                const clientY = e.clientY;

                // Update mouse glow coordinates
                document.documentElement.style.setProperty('--mouse-x', `${clientX}px`);
                document.documentElement.style.setProperty('--mouse-y', `${clientY}px`);

                // Parallax movement offsets
                const relX = (clientX / window.innerWidth - 0.5);
                const relY = (clientY / window.innerHeight - 0.5);

                document.documentElement.style.setProperty('--parallax-x-1', `${relX * -40}px`);
                document.documentElement.style.setProperty('--parallax-y-1', `${relY * -40}px`);

                document.documentElement.style.setProperty('--parallax-x-2', `${relX * 35}px`);
                document.documentElement.style.setProperty('--parallax-y-2', `${relY * 35}px`);

                document.documentElement.style.setProperty('--parallax-x-3', `${relX * -25}px`);
                document.documentElement.style.setProperty('--parallax-y-3', `${relY * -25}px`);

                document.documentElement.style.setProperty('--parallax-x-4', `${relX * 20}px`);
                document.documentElement.style.setProperty('--parallax-y-4', `${relY * 20}px`);

                ticked = false;
            });
        });
    })();

} 

// ==========================================
// SUPABASE ACTIVITY LOG HELPERS
// ==========================================
async function logToolUsage(toolKey) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        await supabaseClient.from('tool_usage_log').insert({ user_id: user.id, tool_key: toolKey });
    } catch (e) { console.warn('logToolUsage:', e); }
}

async function logCheckin(destination, durationMinutes) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        await supabaseClient.from('safe_checkins').insert({ user_id: user.id, destination, duration_minutes: durationMinutes });
    } catch (e) { console.warn('logCheckin:', e); }
}

async function logReportContribution(reportId) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        await supabaseClient.from('user_report_log').insert({ user_id: user.id, report_id: reportId || null });
    } catch (e) { console.warn('logReportContribution:', e); }
}

// ==========================================
// ACHIEVEMENTS — loadAchievements() + Modal
// ==========================================
const ACHIEVEMENTS_DEF = [
    { key: 'guardian_circle',  title: 'Guardian Circle',    desc: 'Build your inner circle of trust — add 5 people who can be alerted in an emergency.',   icon: 'users',        target: 5, color: 'gold'   },
    { key: 'safe_streak',      title: 'Safe Streak',        desc: 'Stay consistent — complete a safe check-in on 7 consecutive days.',                       icon: 'flame',        target: 7, color: 'gold'   },
    { key: 'community_watcher',title: 'Community Watcher',  desc: 'Help your community — contribute 5 anonymous incident reports.',                           icon: 'file-check',   target: 5, color: 'gold'   },
    { key: 'response_ready',   title: 'Response Ready',     desc: 'Know your tools — use 4 distinct safety features (SOS, alert contacts, decoy mode, calls).', icon: 'siren',        target: 4, color: 'gold'   },
    { key: 'verified_guardian',title: 'Verified Guardian',  desc: 'Complete your safety profile — full name, phone number, and a verified email address.',      icon: 'shield-check', target: 1, color: 'gold'   }
];

function calcAllStreakStats(rows) {
    if (!rows || rows.length === 0) return { current: 0, longest: 0, history: [] };
    const dates = [...new Set(rows.map(r => new Date(r.created_at).toISOString().split('T')[0]))].sort().reverse();
    
    const history = [...dates]; // For modal display
    let currentStreak = 1;
    let longestStreak = 1;
    let tempStreak = 1;

    // Current Streak logic
    const today = new Date().toISOString().split('T')[0];
    const latestDate = dates[0];
    
    // If the latest checkin is older than yesterday, current streak is 0
    let diffDaysLatest = Math.floor((new Date(today) - new Date(latestDate)) / (1000 * 60 * 60 * 24));
    if (diffDaysLatest > 1) {
        currentStreak = 0;
    }

    for (let i = 0; i < dates.length - 1; i++) {
        let diff = Math.floor((new Date(dates[i]) - new Date(dates[i+1])) / (1000 * 60 * 60 * 24));
        
        // For current streak calculation
        if (i < currentStreak && currentStreak > 0) {
            if (diff === 1) currentStreak++;
        }

        // For longest streak calculation
        if (diff === 1) {
            tempStreak++;
            if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else {
            tempStreak = 1;
        }
    }

    if (currentStreak === 1 && diffDaysLatest > 1) currentStreak = 0;

    return { current: currentStreak, longest: longestStreak, history };
}

function calcCheckinStreak(rows) {
    return calcAllStreakStats(rows).current;
}

async function loadAchievements() {
    const container = document.getElementById('achievements-grid');
    if (!container) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        container.innerHTML = `
            <p class="text-muted text-xs" style="grid-column:1/-1;text-align:center;padding:var(--space-base) 0;">
                <i data-lucide="lock" style="width:14px;height:14px;vertical-align:middle;"></i>
                Login to track your achievement progress.
            </p>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // Fetch all data in parallel
    const [
        { count: contactCount },
        { data: checkins },
        { count: reportCount },
        { data: toolRows },
        { data: profile }
    ] = await Promise.all([
        supabaseClient.from('trusted_contacts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabaseClient.from('safe_checkins').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabaseClient.from('user_report_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabaseClient.from('tool_usage_log').select('tool_key').eq('user_id', user.id),
        supabaseClient.from('profiles').select('full_name, phone').eq('id', user.id).single()
    ]);

    const distinctTools = toolRows ? new Set(toolRows.map(r => r.tool_key)).size : 0;
    const isProfileComplete = !!(profile && profile.full_name && profile.phone && user.email_confirmed_at);

    const reportsSubmittedCount = reportCount || 0;
    const profileReportsCountEl = document.getElementById('profile-reports-count');
    if (profileReportsCountEl) {
        profileReportsCountEl.textContent = `${reportsSubmittedCount} Reports`;
    }

    const streakStats = calcAllStreakStats(checkins);
    const profileStreakCountEl = document.getElementById('profile-streak-count');
    if (profileStreakCountEl) {
        profileStreakCountEl.textContent = `${streakStats.current} Days`;
    }

    const progress = {
        guardian_circle:   contactCount || 0,
        safe_streak:       streakStats.current,
        community_watcher: reportsSubmittedCount,
        response_ready:    distinctTools,
        verified_guardian: isProfileComplete ? 1 : 0
    };

    container.innerHTML = '';
    ACHIEVEMENTS_DEF.forEach(ach => {
        const current = progress[ach.key] || 0;
        const unlocked = current >= ach.target;
        const card = document.createElement('div');
        card.className = 'card achievement-card-new';
        card.style.cursor = 'pointer';
        card.setAttribute('data-ach-key', ach.key);
        card.innerHTML = `
            <div class="achievement-badge-icon ${unlocked ? 'badge-gold' : 'badge-silver'}">
                <i data-lucide="${ach.icon}"></i>
                ${!unlocked ? '<span class="ach-lock-overlay"><i data-lucide="lock"></i></span>' : ''}
            </div>
            <div>
                <div class="font-semibold text-xs text-navy">${ach.title}</div>
                <div class="text-3xs text-muted">${unlocked ? '\u2713 Unlocked' : current + '/' + ach.target}</div>
            </div>`;
        card.addEventListener('click', () => openAchievementModal(ach, current, checkins, toolRows));
        container.appendChild(card);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
    // User Reports Modal Logic
    const profileReportsCard = document.getElementById('profile-reports-card');
    const userReportsModal = document.getElementById('user-reports-modal');
    const userReportsModalClose = document.getElementById('user-reports-modal-close');
    const userReportsList = document.getElementById('user-reports-list');
    const userReportsSummary = document.getElementById('user-reports-summary');

    if (profileReportsCard) {
        profileReportsCard.addEventListener('click', async () => {
            if (!userReportsModal) return;

            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                showToast("Please login to view your reports.");
                return;
            }

            userReportsList.innerHTML = `<div class="text-center text-muted text-xs p-md"><i data-lucide="loader" class="animate-spin w-5 h-5 mx-auto mb-xs"></i>Loading reports...</div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            userReportsModal.classList.add('active');

            try {
                // 1. Fetch user report log
                const { data: logData, error: logError } = await supabaseClient
                    .from('user_report_log')
                    .select('report_id')
                    .eq('user_id', user.id);

                if (logError) throw logError;

                const reportIds = logData.map(log => log.report_id).filter(id => id !== null);

                if (reportIds.length === 0) {
                    userReportsSummary.textContent = "0 of 0 Completed";
                    userReportsList.innerHTML = `
                        <div class="text-center text-muted" style="padding: 2rem 0;">
                            <i data-lucide="file-x" style="width: 32px; height: 32px; margin: 0 auto 8px auto; opacity: 0.5;"></i>
                            <p class="text-xs">No reports submitted yet.</p>
                        </div>
                    `;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    return;
                }

                // 2. Fetch report details
                const { data: reportsData, error: reportsError } = await supabaseClient
                    .from('reports')
                    .select('id, category, created_at, status, note')
                    .in('id', reportIds)
                    .order('created_at', { ascending: false });

                if (reportsError) throw reportsError;

                // 3. Render
                userReportsList.innerHTML = reportsData.map(report => {
                    const dateStr = new Date(report.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    });
                    
                    let categoryLabel = report.category.charAt(0).toUpperCase() + report.category.slice(1);
                    if (report.category === 'unsafe-area') categoryLabel = 'Unsafe Area/lighting';

                    let icon = 'alert-triangle';
                    let severityClass = 'badge-yellow';
                    let severityLabel = 'Moderate';
                    let borderClass = 'border-left-warning';

                    if (report.category === 'harassment' || report.category === 'stalking' || report.category === 'infrastructure') {
                        icon = 'eye-off';
                        severityClass = 'badge-red';
                        severityLabel = 'High';
                        borderClass = 'border-left-high';
                    }

                    // Extract location from note if available
                    let displayLoc = "Unknown Location";
                    let displayDesc = "Your submitted report is active.";
                    if (report.note && report.note.startsWith("Location: ")) {
                        const splitNote = report.note.split('\n');
                        displayLoc = splitNote[0].replace('Location: ', '');
                        if (splitNote.length > 1) {
                            displayDesc = splitNote.slice(1).join('\n');
                        }
                    } else if (report.note) {
                        displayDesc = report.note;
                    }
                    
                    const actualStatus = report.status || 'pending';
                    const isCompleted = actualStatus.toLowerCase() === 'completed';
                    const statusIcon = isCompleted ? 'check-circle' : 'clock';
                    const statusColor = isCompleted ? 'text-emerald' : 'text-yellow-500';

                    return `
                        <div class="card feed-report-card ${borderClass}" style="margin-bottom: 0;">
                            <div class="feed-card-header">
                                <div class="reporter-info-flex">
                                    <div class="avatar avatar-md avatar-turquoise"><i data-lucide="user"></i></div>
                                    <div>
                                        <div class="reporter-name">You <span class="verification-badge" title="Verified Reporter"><i data-lucide="badge-check"></i></span></div>
                                        <span class="post-time">${dateStr} &bull; Near ${displayLoc}</span>
                                    </div>
                                </div>
                                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                                    <span class="badge ${severityClass} font-semibold">
                                        <i data-lucide="alert-octagon"></i> ${severityLabel}
                                    </span>
                                    <span class="text-3xs font-semibold ${statusColor}" style="display:flex;align-items:center;gap:2px;">
                                        <i data-lucide="${statusIcon}" style="width:10px;height:10px;"></i> ${actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
                                    </span>
                                </div>
                            </div>
                            <div class="feed-card-body">
                                <div class="category-indicator">
                                    <i data-lucide="${icon}" class="text-coral"></i>
                                    <span class="font-semibold text-xs text-navy">${categoryLabel}</span>
                                </div>
                                <p class="feed-report-desc text-xs" style="margin-top: 6px;">"${displayDesc}"</p>
                            </div>
                        </div>
                    `;
                }).join('');
                
                userReportsSummary.textContent = `${reportsData.length} Reports Submitted`;
                if (typeof lucide !== 'undefined') lucide.createIcons();

            } catch (err) {
                console.error("Failed to load user reports:", err);
                userReportsList.innerHTML = `<div class="text-center text-red text-xs p-md">Failed to load reports.</div>`;
            }
        });
    }

    if (userReportsModalClose) {
        userReportsModalClose.addEventListener('click', () => {
            if (userReportsModal) userReportsModal.classList.remove('active');
        });
    }

    if (userReportsModal) {
        userReportsModal.addEventListener('click', (e) => {
            if (e.target === userReportsModal) userReportsModal.classList.remove('active');
        });
    }

    const btnViewAllReports = document.getElementById('btn-view-all-reports');
    if (btnViewAllReports) {
        btnViewAllReports.addEventListener('click', () => {
            if (userReportsModal) userReportsModal.classList.remove('active');
            const navReportBtn = document.getElementById('nav-report');
            if (navReportBtn) navReportBtn.click();
        });
    }

    // Streak Modal Logic
    const profileStreakCard = document.getElementById('profile-streak-card');
    const streakModal = document.getElementById('streak-modal');
    const streakModalClose = document.getElementById('streak-modal-close');
    const streakHistoryList = document.getElementById('streak-history-list');
    
    if (profileStreakCard) {
        profileStreakCard.addEventListener('click', () => {
            if (!streakModal) return;
            
            const sStats = calcAllStreakStats(checkins);
            document.getElementById('streak-current').textContent = sStats.current;
            document.getElementById('streak-longest').textContent = sStats.longest;
            
            if (sStats.history.length === 0) {
                streakHistoryList.innerHTML = `<p class="text-xs text-muted">No check-ins yet.</p>`;
            } else {
                streakHistoryList.innerHTML = sStats.history.map(dStr => {
                    const d = new Date(dStr);
                    const formattedDate = d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
                    return `
                        <div class="streak-history-item">
                            <span class="date">${formattedDate}</span>
                            <span class="time"><i data-lucide="check-circle" class="text-emerald" style="width:12px;height:12px;vertical-align:-2px;margin-right:4px;"></i>Checked in</span>
                        </div>
                    `;
                }).join('');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
            
            streakModal.classList.add('active');
        });
    }

    if (streakModalClose) {
        streakModalClose.addEventListener('click', () => {
            if (streakModal) streakModal.classList.remove('active');
        });
    }

    if (streakModal) {
        streakModal.addEventListener('click', (e) => {
            if (e.target === streakModal) streakModal.classList.remove('active');
        });
    }
}

function openAchievementModal(ach, current, checkins, toolRows) {
    const modal     = document.getElementById('achievement-modal');
    const iconWrap  = document.getElementById('ach-modal-icon');
    const iconInner = document.getElementById('ach-modal-icon-inner');
    const titleEl   = document.getElementById('ach-modal-title');
    const descEl    = document.getElementById('ach-modal-desc');
    const labelEl   = document.getElementById('ach-modal-progress-label');
    const pctEl     = document.getElementById('ach-modal-pct');
    const barEl     = document.getElementById('ach-modal-bar');
    const dateEl    = document.getElementById('ach-modal-unlock-date');
    if (!modal) return;

    const unlocked = current >= ach.target;
    const pct      = Math.min(100, Math.round((current / ach.target) * 100));

    if (iconWrap)  { iconWrap.className = 'achievement-badge-icon ' + (unlocked ? 'badge-gold' : 'badge-silver'); }
    if (iconInner) { iconInner.setAttribute('data-lucide', ach.icon); }
    if (titleEl)   titleEl.textContent = ach.title;
    if (descEl)    descEl.textContent  = ach.desc;
    if (labelEl)   labelEl.textContent = `${current} of ${ach.target}`;
    if (pctEl)     pctEl.textContent   = pct + '%';

    // Animate bar after a tick so the transition fires
    if (barEl) { barEl.style.width = '0%'; setTimeout(() => { barEl.style.width = pct + '%'; }, 30); }

    // Unlock date
    if (dateEl) {
        if (unlocked) {
            let unlockDate = null;
            if (ach.key === 'safe_streak' && checkins && checkins.length) {
                unlockDate = checkins[checkins.length - 1].created_at;
            } else if (ach.key === 'response_ready' && toolRows && toolRows.length) {
                unlockDate = toolRows[0].created_at;
            }
            dateEl.textContent = unlockDate
                ? 'Unlocked ' + new Date(unlockDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '\u2713 Achievement Unlocked';
        } else {
            dateEl.textContent = unlocked ? '' : 'Keep going — you\'re ' + (ach.target - current) + ' away!';
        }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
    modal.classList.add('active');
}

async function loadTrustedContacts() {

    const container = document.getElementById("trustedContacts");

    if (!container) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        container.innerHTML = `
            <p class="text-muted">Login to view trusted contacts.</p>
        `;
        return;
    }

    const { data, error } = await supabaseClient
        .from("trusted_contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        container.innerHTML = `
            <p class="text-muted">Unable to load contacts.</p>
        `;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `
            <p class="text-muted">No trusted contacts added yet.</p>
        `;
        return;
    }

    container.innerHTML = "";

    data.forEach(contact => {

        const initials = contact.name
            .split(" ")
            .map(word => word[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

        // Sanitize phone for safe use inside an inline onclick attribute
        const safePhone = String(contact.phone).replace(/[^0-9+\-\s]/g, "");

        container.innerHTML += `
            <div class="checkin-contact-card" style="margin-top:8px;">

                <div class="avatar avatar-md">
                    ${initials}
                </div>

                <div class="checkin-contact-info">

                    <div class="checkin-contact-name">
                        ${contact.name}
                        <span class="badge badge-success-light text-xs">
                            ${contact.relation}
                        </span>
                    </div>

                    <div class="checkin-contact-phone">
                        ${contact.phone}
                    </div>

                    <div class="checkin-contact-actions">
                        <a href="tel:${safePhone}" class="contact-action-btn contact-action-call">
                            📞 Call
                        </a>
                        <button type="button"
                            class="contact-action-btn contact-action-sms"
                            onclick="sendEmergencySms('${safePhone}')">
                            💬 SMS
                        </button>
                    </div>

                </div>

                <span class="badge badge-turquoise">
                    Trusted
                </span>

            </div>
        `;
    });

}

async function loadProfileTrustedContacts() {

    const container = document.getElementById("profileTrustedContacts");
    const countBadge = document.getElementById("profileContactCount");

    if (!container) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        container.innerHTML = `
            <p class="text-muted">Login to view trusted contacts.</p>
        `;
        if (countBadge) countBadge.textContent = "0 added";
        return;
    }

    const { data, error } = await supabaseClient
        .from("trusted_contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        container.innerHTML = `
            <p class="text-muted">Unable to load contacts.</p>
        `;
        if (countBadge) countBadge.textContent = "0 added";
        return;
    }

    if (countBadge) {
        countBadge.textContent = `${data ? data.length : 0} added`;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `
            <p class="text-muted">No trusted contacts added yet.</p>
        `;
        return;
    }

    container.innerHTML = "";

    data.forEach(contact => {

        const initials = contact.name
            .split(" ")
            .map(word => word[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

        const safePhone = String(contact.phone).replace(/[^0-9+\-\s]/g, "");

        container.innerHTML += `
            <div class="contact-item">
                <div class="avatar avatar-md">
                    ${initials}
                </div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-relation">${contact.relation} &middot; ${contact.phone}</div>
                </div>
                <div class="contact-actions">
                    <a href="tel:${safePhone}" class="btn-icon" aria-label="Call ${contact.name}">
                        <i data-lucide="phone"></i>
                    </a>
                    <button class="btn-icon" aria-label="Edit ${contact.name}">
                        <i data-lucide="pencil"></i>
                    </button>
                </div>
            </div>
        `;
    });

    if (window.lucide) {
        lucide.createIcons();
    }
}

// ==========================================
// EMERGENCY CALL & SMS — Trusted Contacts
// ==========================================
let sahayikaEmergencyCoords = null;

function buildEmergencyMessage(lat, lng) {
    const locationLine = (lat != null && lng != null)
        ? `https://maps.google.com/?q=${lat},${lng}`
        : 'Location unavailable.';

    return `🚨 EMERGENCY ALERT\nI have missed my Safe Check-in.\nMy last known location:\n${locationLine}\nPlease contact me immediately.`;
}

function sendEmergencySms(phone) {
    const compose = (lat, lng) => {
        const message = buildEmergencyMessage(lat, lng);
        window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
    };

    if (sahayikaEmergencyCoords) {
        compose(sahayikaEmergencyCoords.lat, sahayikaEmergencyCoords.lng);
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                sahayikaEmergencyCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                compose(pos.coords.latitude, pos.coords.longitude);
            },
            () => compose(null, null), // denied/failed → fall back to "Location unavailable."
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    } else {
        compose(null, null);
    }
}

async function addTrustedContact() {

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert("Please login first.");
        return;
    }

    const name = document.getElementById("contactName").value.trim();
    const relation = document.getElementById("contactRelation").value.trim();
    const phone = document.getElementById("contactPhone").value.trim();

    if (!name || !relation || !phone) {
        alert("Please fill all fields.");
        return;
    }

    const { error } = await supabaseClient
        .from("trusted_contacts")
        .insert({
            user_id: user.id,
            name: name,
            relation: relation,
            phone: phone
        });

    if (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    document.getElementById("contactName").value = "";
    document.getElementById("contactRelation").value = "";
    document.getElementById("contactPhone").value = "";

    document.getElementById("addContactForm").style.display = "none";

    const addBtn = document.getElementById("showAddContact");
    if (addBtn) addBtn.style.display = "block";

    loadTrustedContacts();
    if (typeof loadProfileTrustedContacts === 'function') {
        loadProfileTrustedContacts();
    }

    alert("Trusted Contact Added Successfully.");
}

if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', () => {

        initApp();
        loadTrustedContacts();
        loadAchievements();

        // Wire achievement modal close
        const achCloseBtn = document.getElementById('achievement-modal-close');
        if (achCloseBtn) achCloseBtn.addEventListener('click', () => {
            document.getElementById('achievement-modal').classList.remove('active');
        });
        document.getElementById('achievement-modal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('achievement-modal'))
                document.getElementById('achievement-modal').classList.remove('active');
        });

        const addBtn = document.getElementById("showAddContact");
        if (addBtn) {
            addBtn.addEventListener("click", () => {
                document.getElementById("addContactForm").style.display = "block";
                addBtn.style.display = "none";
            });
        }

        const profileAddBtn = document.getElementById("profile-add-contact-btn");
        if (profileAddBtn) {
            profileAddBtn.addEventListener("click", () => {
                window.location.hash = "#view-checkin";
                setTimeout(() => {
                    const addContactForm = document.getElementById("addContactForm");
                    const showAddBtn = document.getElementById("showAddContact");
                    if (addContactForm) addContactForm.style.display = "block";
                    if (showAddBtn) showAddBtn.style.display = "none";
                }, 100);
            });
        }

        // Re-render auth-dependent sections whenever session changes
        supabaseClient.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
                loadAchievements();
                if (typeof loadProfileTrustedContacts === 'function') loadProfileTrustedContacts();
                if (typeof loadTrustedContacts === 'function') loadTrustedContacts();
            }
        });

    });

} else {

    initApp();
    loadTrustedContacts();
    loadAchievements();

    // Wire achievement modal close
    const achCloseBtn = document.getElementById('achievement-modal-close');
    if (achCloseBtn) achCloseBtn.addEventListener('click', () => {
        document.getElementById('achievement-modal').classList.remove('active');
    });
    document.getElementById('achievement-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('achievement-modal'))
            document.getElementById('achievement-modal').classList.remove('active');
    });

    const addBtn = document.getElementById("showAddContact");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            document.getElementById("addContactForm").style.display = "block";
            addBtn.style.display = "none";
        });
    }

    const profileAddBtn = document.getElementById("profile-add-contact-btn");
    if (profileAddBtn) {
        profileAddBtn.addEventListener("click", () => {
            window.location.hash = "#view-checkin";
            setTimeout(() => {
                const addContactForm = document.getElementById("addContactForm");
                const showAddBtn = document.getElementById("showAddContact");
                if (addContactForm) addContactForm.style.display = "block";
                if (showAddBtn) showAddBtn.style.display = "none";
            }, 100);
        });
    }

    // Re-render auth-dependent sections whenever session changes
    supabaseClient.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            loadAchievements();
            if (typeof loadProfileTrustedContacts === 'function') loadProfileTrustedContacts();
            if (typeof loadTrustedContacts === 'function') loadTrustedContacts();
        }
    });

}