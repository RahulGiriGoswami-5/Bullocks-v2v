/**
 * Sahayika — Supabase Auth wiring.
 * Handles signup/login forms, session persistence, route guarding for
 * #view-home, the dynamic "Hello, {name}" greeting, and logout.
 *
 * Loaded before app.js — only adds behavior on top of the existing
 * tab-switching / modal-open logic already in app.js.
 */
function initAuth() {
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    const authModal = document.getElementById('auth-modal');
    const greetingText = document.querySelector('.greeting-text');

    function showError(el, message) {
        if (!el) return;
        el.textContent = message;
        el.style.display = 'block';
        el.classList.remove('form-success');
    }

    function clearError(el) {
        if (!el) return;
        el.style.display = 'none';
    }

    function setButtonLoading(btn, loading, defaultText) {
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = loading ? 'Please wait…' : defaultText;
    }

    // ==========================================
    // SIGN UP
    // ==========================================
    if (formSignup) {
        formSignup.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError(signupError);

            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const phone = document.getElementById('signup-phone').value.trim();
            const submitBtn = document.getElementById('signup-submit-btn');

            setButtonLoading(submitBtn, true);
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name, phone: phone }
                }
            });
            setButtonLoading(submitBtn, false, 'Sign Up');

            if (error) {
                showError(signupError, error.message);
                return;
            }

            // If email confirmation is ON in Supabase, there's no session yet.
            if (!data.session) {
                showError(signupError, 'Account created — check your email to confirm before logging in.');
                signupError.classList.add('form-success');
                return;
            }

            if (authModal) authModal.classList.remove('active');
            goAfterAuth();
        });
    }

    // ==========================================
    // LOGIN
    // ==========================================
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError(loginError);

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const submitBtn = document.getElementById('login-submit-btn');

            setButtonLoading(submitBtn, true);
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            setButtonLoading(submitBtn, false, 'Login');

            if (error) {
                showError(loginError, error.message);
                return;
            }

            if (authModal) authModal.classList.remove('active');
            goAfterAuth();
        });
    }

    // ==========================================
    // GREETING + PROFILE — pulls real data from `profiles`
    // ==========================================
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');

    async function loadGreeting() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        const fullName = profile && profile.full_name ? profile.full_name : '';
        const firstName = fullName ? fullName.split(' ')[0] : 'there';

        if (greetingText) greetingText.textContent = `Hello, ${firstName}`;
        if (profileName) profileName.textContent = fullName || user.email;
        if (profileEmail) profileEmail.textContent = user.email;
    }

    // ==========================================
    // ROUTE GUARD — app views require a session or guest mode
    // ==========================================
    const protectedHashes = ['#view-home', '#view-checkin', '#view-report', '#view-responders', '#view-profile'];

    async function requireAuth() {
        if (!protectedHashes.includes(window.location.hash)) return;

        const { data: { session } } = await supabaseClient.auth.getSession();
        let isGuest = false;
        try {
            isGuest = !!localStorage.getItem('sahayika-guest');
        } catch (e) {
            console.warn('localStorage unavailable:', e);
        }

        if (!session && !isGuest) {
            window.location.hash = '#view-landing';
            if (authModal) authModal.classList.add('active');
            return;
        }

        if (session) {
            await loadGreeting();
        }
    }

    window.addEventListener('hashchange', requireAuth);
    requireAuth();

    // ==========================================
    // TOOL GATING — Safety-tools list requires login before opening
    // ==========================================
    const pendingNavKey = 'sahayika-pending-nav';

    function switchToLoginTab() {
        const tabLogin = document.getElementById('tab-login');
        const tabSignup = document.getElementById('tab-signup');
        if (tabLogin && tabSignup && formLogin && formSignup) {
            tabSignup.classList.remove('active');
            tabLogin.classList.add('active');
            formSignup.style.display = 'none';
            formLogin.style.display = 'flex';
        }
    }

    function goAfterAuth() {
        let pending = null;
        try {
            pending = sessionStorage.getItem(pendingNavKey);
            if (pending) sessionStorage.removeItem(pendingNavKey);
        } catch (e) {
            console.warn('sessionStorage unavailable:', e);
        }
        window.location.hash = pending || '#view-home';
    }

    document.querySelectorAll('.explore-card').forEach((card) => {
        card.addEventListener('click', async (e) => {
            e.preventDefault();
            const targetHash = card.getAttribute('href');

            const { data: { session } } = await supabaseClient.auth.getSession();
            let isGuest = false;
            try {
                isGuest = !!localStorage.getItem('sahayika-guest');
            } catch (err) {
                console.warn('localStorage unavailable:', err);
            }

            if (session || isGuest) {
                window.location.hash = targetHash;
                return;
            }

            try {
                sessionStorage.setItem(pendingNavKey, targetHash);
            } catch (err) {
                console.warn('sessionStorage unavailable:', err);
            }
            if (authModal) authModal.classList.add('active');
            switchToLoginTab();
        });
    });

    // ==========================================
    // LOGOUT
    // ==========================================
    const logoutTriggers = document.querySelectorAll('.logout-trigger');
    logoutTriggers.forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            try {
                localStorage.removeItem('sahayika-guest');
            } catch (err) {
                console.warn('localStorage unavailable:', err);
            }
            window.location.hash = '#view-landing';
        });
    });

    // Expose for other scripts if needed
    window.SahayikaAuth = { loadGreeting, requireAuth };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}