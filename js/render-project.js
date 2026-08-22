// =========================================================
// Renders one project's case-study page based on ?id= in the URL
// e.g. project.html?id=sapperavi
// =========================================================

async function loadProject() {
  const root = document.getElementById('caseStudyRoot');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    root.innerHTML = `<p style="padding:60px; color:#a8a19c;">No project specified. <a href="index.html" style="color:#fff; text-decoration:underline;">Back to home</a>.</p>`;
    return;
  }

  try {
    const res = await fetch('data/projects.json');
    if (!res.ok) throw new Error('Could not load projects.json');
    const projects = await res.json();
    const project = projects.find(p => p.id === id);

    if (!project) {
      root.innerHTML = `<p style="padding:60px; color:#a8a19c;">Project not found. <a href="index.html" style="color:#fff; text-decoration:underline;">Back to home</a>.</p>`;
      return;
    }

    document.title = `${project.title} — Tedo Mirianashvili`;

    // per-project brand color, falls back to the site's default terracotta
    // accent everywhere a .case-block uses var(--case-accent)
    if (project.accentColor) {
      root.style.setProperty('--case-accent', project.accentColor);
    }
    const coverBg = project.accentGradient || 'var(--near-black)';

    const metaRow = buildMetaRow(project);
    const detailGrid = (project.details || []).length ? `
      <div class="case-block">
        <div class="case-section" style="padding-bottom:0;">
          <div class="label">Design Details</div>
        </div>
        <div class="detail-grid">
          ${project.details.map(d => `
            <div class="detail-item">
              ${frameImage(d.image, d.label, d.frame)}
              <span class="detail-label">${escapeHtml(d.label)}</span>
              ${d.caption ? `<span class="detail-caption">${escapeHtml(d.caption)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>` : '';

    // Visuals — a dedicated, caption-light section for showing uploaded
    // images big. Only renders if the project actually has gallery images.
    const galleryBlock = (project.gallery || []).length ? `
      <div class="case-block case-gallery-block">
        <div class="case-section" style="padding-bottom:0;">
          <div class="label">Visuals</div>
          <h3>The Full Look</h3>
        </div>
        <div class="case-gallery">
          ${project.gallery.map(g => `
            <figure class="gallery-item${g.size === 'full' ? ' gallery-item-full' : ''}">
              ${frameImage(g.image, g.caption || project.title, g.frame, true)}
              ${g.caption ? `<figcaption>${escapeHtml(g.caption)}</figcaption>` : ''}
            </figure>
          `).join('')}
        </div>
      </div>` : '';

    root.innerHTML = `
      <div class="case-block case-cover">
        <div class="case-cover-left">
          <div class="byline"><span class="avatar"></span> Tedo Mirianashvili</div>
          ${project.type || project.year ? `<div class="eyebrow">${[escapeHtml(project.type), escapeHtml(project.year)].filter(Boolean).join(' · ')}</div>` : ''}
          <h2>${escapeHtml(project.client)}</h2>
          ${project.title ? `<div class="subtitle">${escapeHtml(project.title)}</div>` : ''}
          <div class="desc">
            ${escapeHtml(project.brief)}
            ${metaRow}
          </div>
        </div>
        <div class="case-cover-right" style="background:${coverBg}">
          <img src="${project.cover}" alt="${escapeHtml(project.title)} cover" onclick="openLightbox('${project.cover}', '${escapeHtml(project.title)}')">
        </div>
      </div>

      ${project.brief ? `
      <div class="case-block case-section">
        <div class="label">Brief</div>
        <h3>Purpose &amp; Audience</h3>
        <p>${escapeHtml(project.brief)}</p>
      </div>` : ''}

      ${detailGrid}

      ${galleryBlock}

      <div style="padding: 40px 60px 80px;">
        <a href="index.html#portfoliocards" class="case-back-link">&larr; Back to all projects</a>
      </div>
    `;

  } catch (err) {
    console.error(err);
    root.innerHTML = `<p style="padding:60px; color:#a8a19c;">Could not load project data. If you're opening this file directly, run a local server (e.g. <code>python3 -m http.server</code>) — fetch() is blocked on file:// URLs.</p>`;
  }
}

// only shows meta fields that actually have a value, instead of
// leaving blank "Pages" / "Year" pills when a project skipped them
function buildMetaRow(project) {
  const fields = [
    ['Type', project.type],
    ['Pages', project.pages],
    ['Format', project.format],
    ['Year', project.year]
  ].filter(([, v]) => v);

  if (!fields.length) return '';
  return `<div class="meta-row">
    ${fields.map(([k, v]) => `<div><span class="k">${k}</span>${escapeHtml(v)}</div>`).join('')}
  </div>`;
}

// wraps an <img> in a phone-bezel frame when frame === 'phone',
// otherwise returns a plain image. `big` = true adds the lightbox
// click handler (used by the Visuals gallery).
function frameImage(src, alt, frame, big) {
  const altSafe = escapeHtml(alt || '');
  const click = ` onclick="openLightbox('${src}', '${altSafe}')"`;
  if (frame === 'phone') {
    return `<div class="device-frame"${big ? click : ''}>
      <div class="device-notch"></div>
      <img src="${src}" alt="${altSafe}"${!big ? click : ''}>
    </div>`;
  }
  return `<img src="${src}" alt="${altSafe}"${click}>`;
}

// basic escaping so pasted project text can't break the page markup
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&#39;');
}

// =========================================================
// Lightbox — click any case-study image (detail or gallery) to see
// it large. Closes on backdrop click, close button, or Esc.
// =========================================================
function ensureLightbox() {
  if (document.getElementById('lightbox')) return;
  const el = document.createElement('div');
  el.id = 'lightbox';
  el.className = 'lightbox';
  el.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="Close" onclick="closeLightbox()">&times;</button>
    <figure>
      <img id="lightboxImg" src="" alt="">
      <figcaption id="lightboxCaption"></figcaption>
    </figure>
  `;
  el.addEventListener('click', (e) => { if (e.target === el) closeLightbox(); });
  document.body.appendChild(el);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
}

function openLightbox(src, caption) {
  ensureLightbox();
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxCaption').textContent = caption || '';
  document.getElementById('lightbox').classList.add('is-open');
  document.body.classList.add('lightbox-locked');
}

function closeLightbox() {
  const el = document.getElementById('lightbox');
  if (!el) return;
  el.classList.remove('is-open');
  document.body.classList.remove('lightbox-locked');
}

document.addEventListener('DOMContentLoaded', loadProject);