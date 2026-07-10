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

    const REPORTS_SQL_SCHEMA = `
-- SQL to create the reports table and policies:
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    anonymous BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    status TEXT DEFAULT 'pending'::text
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow public insert access
CREATE POLICY "Allow public insert access" ON public.reports 
    FOR INSERT WITH CHECK (true);

-- Allow public select access
CREATE POLICY "Allow public select access" ON public.reports 
    FOR SELECT USING (true);
`;

    /**
     * Map Supabase database errors to user-friendly messages.
     */
    function mapSupabaseError(error) {
        if (!error) return "Unknown error";
        if (error.message === "Failed to fetch") return "Network error (failed to connect to Supabase)";
        
        const code = error.code;
        const msg = error.message || "";
        
        if (code === '42501') return "Supabase permission denied (RLS policy check failed)";
        if (code === '42P01') {
            console.log("%c[Sahayika Setup Required]", "color: #ff3333; font-size: 16px; font-weight: bold;");
            console.log("The 'reports' table does not exist in your database. Please run the following SQL in your Supabase SQL Editor to create it:\n" + REPORTS_SQL_SCHEMA);
            return "Table 'reports' not found. The SQL script to create it has been printed in the browser console.";
        }
        if (code === 'PGRST204') return "Column not found (table schema mismatch)";
        if (code === '23502') return "Missing required fields";
        if (code === '23505') return "Duplicate key violation";
        
        if (msg.includes("permission") || msg.includes("policy")) return "Supabase permission denied";
        if (msg.includes("not found") || msg.includes("does not exist")) return "Table not found";
        
        return msg || "Invalid data or query execution error";
    }

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
            .select('*');

        if (error) {
            console.error('Error fetching reports:', error);
            if (error.code === '42P01') {
                console.log("%c[Sahayika Setup Required]", "color: #ff3333; font-size: 16px; font-weight: bold;");
                console.log("The 'reports' table does not exist. Run this SQL to create it:\n" + REPORTS_SQL_SCHEMA);
            }
            return [];
        }

        // Sort client-side by timestamp or created_at desc to remain compatible with different database schemas
        if (data) {
            data.sort((a, b) => {
                const dateA = new Date(a.timestamp || a.created_at || 0);
                const dateB = new Date(b.timestamp || b.created_at || 0);
                return dateB - dateA;
            });
        }

        return data || [];
    }

    /**
     * Adds a new report after applying the privacy offset and rate-limit check.
     */
    async function addReport(reportInput) {
        // Validate input data
        if (!reportInput.category) {
            const err = { message: "Missing category" };
            console.error("Selected Category: None");
            console.error("Supabase Error:", err);
            throw err;
        }
        if (reportInput.lat === undefined || reportInput.lng === undefined) {
            const err = { message: "Missing location" };
            console.error("Selected Location: None");
            console.error("Supabase Error:", err);
            throw err;
        }

        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
            const waitMins = Math.ceil((rateCheck.resetTime - Date.now()) / 60000);
            const err = { message: `Rate limit reached. Try again in ${waitMins} min(s).` };
            console.error("Supabase Error:", err);
            throw err;
        }

        const offsetCoords = applyRandomOffset(reportInput.lat, reportInput.lng);

        // Logging selected category and location as required
        console.log("Selected Category:", reportInput.category);
        console.log("Selected Location:", { lat: reportInput.lat, lng: reportInput.lng });

        // First attempt: try using the new schema requested by the user
        const newSchemaReport = {
            category: reportInput.category,
            description: reportInput.note || null,
            latitude: offsetCoords.lat,
            longitude: offsetCoords.lng,
            anonymous: reportInput.anonymous !== false,
            image_url: reportInput.image_url || null,
            status: 'pending'
        };

        console.log("Report Object (New Schema):", newSchemaReport);

        let response = await supabaseClient
            .from('reports')
            .insert([newSchemaReport])
            .select();

        console.log("Supabase Response (New Schema):", response);

        // Fallback: If new schema column check fails, fall back to old schema (lat, lng, note)
        if (response.error && (response.error.code === 'PGRST204' || response.error.message.includes('column'))) {
            console.warn("New schema columns not supported by database. Falling back to existing database columns (lat, lng, note)...");
            
            const oldSchemaReport = {
                lat: offsetCoords.lat,
                lng: offsetCoords.lng,
                category: reportInput.category,
                note: reportInput.note ? reportInput.note.substring(0, 100) : null,
                status: 'pending'
            };

            console.log("Report Object (Fallback Schema):", oldSchemaReport);
            
            response = await supabaseClient
                .from('reports')
                .insert([oldSchemaReport])
                .select();
                
            console.log("Supabase Response (Fallback Schema):", response);
        }

        if (response.error) {
            console.error("Supabase Error:", response.error);
            throw response.error;
        }

        recordSubmission();
        return response.data[0];
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
        applyRandomOffset,
        mapSupabaseError
    };
})();