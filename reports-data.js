/**
 * reports-data.js
 * Data access layer for the Live Safety Heatmap on the Sahayika home page.
 * Ported from the standalone SafePath project, adapted to:
 *  - reuse the shared `supabaseClient` (from supabase-client.js) instead of
 *    creating a second Supabase connection to a different project
 *  - run as a plain script (no ES module import/export) so it loads
 *    alongside Sahayika's existing non-module app.js
 *
 * Reports are stored fully anonymously — no user_id, no auth required to
 * read or write. Coordinates are randomized 50-100m before saving.
 */
(function () {
    const SUBMISSIONS_KEY = 'sahayika_report_submissions';
    const RATE_LIMIT_COUNT = 5;
    const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

    /**
     * Applies a random 50-100m offset to coordinates for reporter privacy.
     */
    function applyRandomOffset(lat, lng) {
        const minOffsetMeters = 50;
        const maxOffsetMeters = 100;
        const distance = minOffsetMeters + Math.random() * (maxOffsetMeters - minOffsetMeters);
        const angle = Math.random() * 2 * Math.PI;

        const latOffset = (distance * Math.cos(angle)) / 111111;
        const lngOffset = (distance * Math.sin(angle)) / (111111 * Math.cos(lat * Math.PI / 180));

        return { lat: lat + latOffset, lng: lng + lngOffset };
    }

    /**
     * Fetches all reports, newest first.
     */
    async function getReports() {
        const { data, error } = await supabaseClient
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reports:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Adds a new report after applying the privacy offset and rate-limit check.
     * Returns the saved row, or null if blocked/failed.
     */
    async function addReport(reportInput) {
        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
            console.warn('Submission blocked: rate limit exceeded.');
            return null;
        }

        const offsetCoords = applyRandomOffset(reportInput.lat, reportInput.lng);

        const report = {
            lat: offsetCoords.lat,
            lng: offsetCoords.lng,
            category: reportInput.category,
            note: reportInput.note ? reportInput.note.substring(0, 100) : null
        };

        const { data, error } = await supabaseClient
            .from('reports')
            .insert([report])
            .select();

        if (error) {
            console.error('Error saving report:', error);
            return null;
        }

        recordSubmission();
        return data[0];
    }

    /**
     * Client-side rate limit: max 5 submissions per 10 minutes per browser.
     */
    function checkRateLimit() {
        try {
            const raw = localStorage.getItem(SUBMISSIONS_KEY);
            const now = Date.now();
            if (!raw) return { allowed: true, remaining: RATE_LIMIT_COUNT, resetTime: 0 };

            let submissions = JSON.parse(raw).filter(ts => (now - ts) < RATE_LIMIT_WINDOW_MS);
            localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));

            if (submissions.length >= RATE_LIMIT_COUNT) {
                const oldest = Math.min(...submissions);
                return { allowed: false, remaining: 0, resetTime: oldest + RATE_LIMIT_WINDOW_MS };
            }
            return { allowed: true, remaining: RATE_LIMIT_COUNT - submissions.length, resetTime: 0 };
        } catch (e) {
            console.warn('localStorage unavailable for rate limiting:', e);
            return { allowed: true, remaining: 1, resetTime: 0 };
        }
    }

    function recordSubmission() {
        try {
            const raw = localStorage.getItem(SUBMISSIONS_KEY) || '[]';
            const submissions = JSON.parse(raw);
            submissions.push(Date.now());
            localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
        } catch (e) {
            console.warn('Could not record submission timestamp:', e);
        }
    }

    // Expose to app.js
    window.SahayikaReports = {
        getReports,
        addReport,
        checkRateLimit,
        applyRandomOffset
    };
})();