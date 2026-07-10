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
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.setAttribute('data-theme', 'dark');
    } else {
        html.setAttribute('data-theme', 'light');
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
    }

    window.addEventListener('hashchange', () => {
        navigateTo(window.location.hash);
    });
    navigateTo(window.location.hash);

    // Close menus/modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
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
            triggerSOS();
        });
    }
    if (decoyModeBtn) {
        decoyModeBtn.addEventListener('click', () => {
            closeEmergencySheet();
            enterGuestMode();
        });
    }
    if (exploreLinkBtn && exploreSection) {
        exploreLinkBtn.addEventListener('click', () => {
            exploreSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // Explore cards should feel instant — enable guest mode quietly on click
    document.querySelectorAll('.explore-card').forEach((card) => {
        card.addEventListener('click', () => {
            try {
                if (!localStorage.getItem('sahayika-guest')) {
                    localStorage.setItem('sahayika-guest', 'true');
                }
            } catch (e) {
                console.warn('localStorage unavailable:', e);
            }
        });
    });

    // Smooth scroll CTA
    const scrollBtn = document.querySelector('.scroll-to-info');
    if (scrollBtn) {
        scrollBtn.addEventListener('click', () => {
            showToast("Sahayika protects 10k+ active citizens daily!");
        });
    }


    // ==========================================
    // LEAFLET MAP INITIALIZATION
    // ==========================================
    let mapInstance = null;

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

        // Load tiles (will be styled via sepia/grayscale filters in style.css)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstance);

        // Zoom controller
        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

        // Define custom marker styling via Leaflet divIcon
        const createMarkerIcon = (colorClass) => {
            return L.divIcon({
                className: 'custom-map-pin',
                html: `<div class="pin-ring ${colorClass}"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
        };

        // Safe Places
        const safeSpots = [
            { name: "Verified Safe Spot: CCD Richmond", coords: [12.9726, 77.5936] },
            { name: "Verified Safe Spot: Public Library", coords: [12.9756, 77.5986] }
        ];
        safeSpots.forEach(s => {
            L.marker(s.coords, { icon: createMarkerIcon('bg-emerald') })
                .addTo(mapInstance)
                .bindPopup(`<b>${s.name}</b><br><span class="badge badge-success">Vouched Area</span>`);
        });

        // Services
        const services = [
            { name: "Police Patrol Station", coords: [12.9696, 77.5906], icon: 'bg-navy' },
            { name: "St. Martha Hospital", coords: [12.9786, 77.5956], icon: 'bg-coral' }
        ];
        services.forEach(s => {
            L.marker(s.coords, { icon: createMarkerIcon(s.icon) })
                .addTo(mapInstance)
                .bindPopup(`<b>${s.name}</b><br><span class="text-xs text-muted">Active response team</span>`);
        });

        // Unsafe Area (Red Circle)
        L.circle([12.9656, 77.5926], {
            color: '#E76F51',
            fillColor: '#E76F51',
            fillOpacity: 0.15,
            radius: 180,
            weight: 1
        }).addTo(mapInstance).bindPopup(`<b>Poor Lighting Alert</b><br><span class="text-coral">Avoid paths near park layout after 8 PM.</span>`);

        // Safe Route (Green Polyline)
        const safeRouteCoords = [
            [12.9716, 77.5946],
            [12.9726, 77.5936],
            [12.9756, 77.5986],
            [12.9786, 77.5956]
        ];
        const safeRoute = L.polyline(safeRouteCoords, {
            color: '#22C55E',
            weight: 6,
            opacity: 0.85,
            lineCap: 'round'
        }).addTo(mapInstance);

        // Alternate route (Yellow Dash Polyline)
        const altRouteCoords = [
            [12.9716, 77.5946],
            [12.9696, 77.5906],
            [12.9656, 77.5926],
            [12.9646, 77.5966]
        ];
        L.polyline(altRouteCoords, {
            color: '#F59E0B',
            weight: 4,
            opacity: 0.65,
            dashArray: '5, 10'
        }).addTo(mapInstance);

        mapInstance.fitBounds(safeRoute.getBounds(), { padding: [40, 40] });
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
        btnSubmitReport.addEventListener('click', () => {
            const type = inputReportType.value;
            const location = inputReportLoc.value || "Unknown Location";
            const desc = inputReportDesc.value;

            if (!type || !desc) {
                showToast("Please fill in incident type and description.");
                return;
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}