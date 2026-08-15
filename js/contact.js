// =========================================================
// Contact form submission — sends to Formspree (no backend needed)
// Docs: https://help.formspree.io/hc/en-us/articles/360013470374
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const note = form.querySelector('.form-note');
  const button = form.querySelector('.btn-send');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.querySelector('#c_name').value.trim();
    const email = form.querySelector('#c_email').value.trim();
    const message = form.querySelector('#c_message').value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !emailOk || !message) {
      note.textContent = 'Please fill in your name, a valid email, and a message.';
      note.style.color = '#e06a6a';
      return;
    }

    if (form.action.includes('YOUR_FORM_ID')) {
      note.textContent = 'Form not connected yet — replace YOUR_FORM_ID in contact.html with your real Formspree endpoint.';
      note.style.color = '#e06a6a';
      return;
    }

    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = 'SENDING...';
    note.textContent = '';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });

      if (res.ok) {
        note.textContent = "Message sent — thanks, I'll get back to you soon.";
        note.style.color = '#8fbf8f';
        form.reset();
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.errors?.map(e => e.message).join(', ') || 'Something went wrong.';
        throw new Error(msg);
      }
    } catch (err) {
      console.error(err);
      note.textContent = 'Could not send your message — please email tedo.mirianashvili@gmail.com directly instead.';
      note.style.color = '#e06a6a';
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
});