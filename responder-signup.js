/**
 * responder-signup.js
 * Handles the "Become a Responder" modal on #view-responders.
 * Inserts applications into the `responders` Supabase table (status: pending).
 */
(function () {
    const openBtn = document.getElementById('open-responder-signup-btn');
    const modal = document.getElementById('responder-modal');
    const closeBtn = document.getElementById('responder-modal-close');
    const form = document.getElementById('form-responder');
    const msg = document.getElementById('r-msg');
    const submitBtn = document.getElementById('r-submit-btn');

    if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('active'));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting…';
            msg.style.display = 'none';

            const { error } = await supabaseClient.from('responders').insert([{
                name: document.getElementById('r-name').value.trim(),
                phone: document.getElementById('r-phone').value.trim(),
                category: document.getElementById('r-category').value,
                area: document.getElementById('r-area').value.trim(),
                status: 'pending'
            }]);

            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Application';
            msg.style.display = 'block';

            if (error) {
                msg.textContent = 'Something went wrong — please try again.';
                msg.classList.remove('form-success');
            } else {
                msg.textContent = 'Application submitted! We\'ll verify and contact you soon.';
                msg.classList.add('form-success');
                form.reset();
                setTimeout(() => modal.classList.remove('active'), 1800);
            }
        });
    }
})();