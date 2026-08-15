// =========================================================
// Renders .testimonial-card items into #testimonialcards on index.html
// Reads from data/testimonials.json — add/edit reviews via admin.html
// =========================================================

async function loadTestimonials() {
  const container = document.getElementById('testimonialcards');
  if (!container) return; // not on this page

  try {
    const res = await fetch('data/testimonials.json');
    if (!res.ok) throw new Error('Could not load testimonials.json');
    const testimonials = await res.json();

    if (!testimonials.length) {
      container.innerHTML = '<p style="color:#a8a19c;">No reviews published yet.</p>';
      return;
    }

    container.innerHTML = testimonials.map(t => `
      <div class="testimonial-card">
        <div class="testimonial-stars">${'★'.repeat(Math.min(5, Math.max(1, t.rating || 5)))}</div>
        <p class="testimonial-quote">${escapeHtml(t.quote)}</p>
        <div class="testimonial-author">
          <span class="testimonial-name">${escapeHtml(t.clientName)}</span>
          ${t.role ? `<span class="testimonial-role">${escapeHtml(t.role)}</span>` : ''}
          <span class="testimonial-source">${escapeHtml(t.source || 'Upwork')}</span>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
    container.innerHTML = '<p style="color:#a8a19c;">Could not load reviews. If you\'re opening this file directly, run a local server (e.g. <code>python3 -m http.server</code>) — fetch() is blocked on file:// URLs.</p>';
  }
}

// basic escaping so pasted review text can't break the page markup
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

document.addEventListener('DOMContentLoaded', loadTestimonials);