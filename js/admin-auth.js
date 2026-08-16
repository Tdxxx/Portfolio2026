// =========================================================
// Admin panel password gate.
//
// Honest scope: this is a static site with no backend, so this
// cannot be real server-side auth — anyone with dev tools and enough
// motivation could bypass it. What it DOES do: stop casual visitors,
// search-engine indexing (see the noindex meta tag on admin.html),
// and anyone who stumbles onto the URL without meaning to poke around.
//
// SETUP: open password-hash-generator.html locally, type your real
// password, copy the hash it gives you, and paste it below as
// PASSWORD_HASH. The plaintext password itself never needs to touch
// this file or live anywhere.
// =========================================================

const PASSWORD_HASH = '703f461a20c2accdafcd4a4d01007f844db13f3af348db3ade68004c9c2916ac';

(function () {
  const SESSION_KEY = 'admin_unlocked';
  const FAIL_KEY = 'admin_fail_count';
  const MAX_DELAY_STEPS = 5; // fails beyond this stop adding more delay
  const STEP_MS = 800;       // delay grows by this much per prior wrong attempt

  const body = document.body;
  const form = document.getElementById('adminLockForm');
  const input = document.getElementById('adminLockInput');
  const errorEl = document.getElementById('adminLockError');
  const logoutBtn = document.getElementById('adminLogout');

  async function sha256Hex(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function unlock() {
    body.classList.add('admin-unlocked');
    sessionStorage.setItem(SESSION_KEY, '1');
  }

  function currentDelay() {
    const fails = parseInt(sessionStorage.getItem(FAIL_KEY) || '0', 10);
    return Math.min(fails, MAX_DELAY_STEPS) * STEP_MS;
  }

  // stays unlocked for the rest of this browser tab's session
  if (sessionStorage.getItem(SESSION_KEY) === '1') unlock();

  if (PASSWORD_HASH === 'REPLACE_WITH_YOUR_GENERATED_HASH' && form) {
    errorEl.textContent = 'Setup incomplete: generate a password hash (see password-hash-generator.html) and paste it into js/admin-auth.js.';
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (PASSWORD_HASH === 'REPLACE_WITH_YOUR_GENERATED_HASH') return;

      const submitBtn = form.querySelector('button[type="submit"]');
      const delay = currentDelay();
      submitBtn.disabled = true;
      if (delay) errorEl.textContent = 'Checking…';

      if (delay) await new Promise(r => setTimeout(r, delay));

      const hash = await sha256Hex(input.value);
      submitBtn.disabled = false;

      if (hash === PASSWORD_HASH) {
        sessionStorage.removeItem(FAIL_KEY);
        errorEl.textContent = '';
        unlock();
      } else {
        const fails = parseInt(sessionStorage.getItem(FAIL_KEY) || '0', 10) + 1;
        sessionStorage.setItem(FAIL_KEY, String(fails));
        errorEl.textContent = 'Wrong password.';
        input.classList.remove('is-shake');
        void input.offsetWidth; // restart the shake animation
        input.classList.add('is-shake');
        input.value = '';
        input.focus();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem(SESSION_KEY);
      body.classList.remove('admin-unlocked');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
  }
})();