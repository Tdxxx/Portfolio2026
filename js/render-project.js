// =========================================================
// Renders one project's case-study page based on ?id= in the URL
// e.g. project.html?id=eden
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

    root.innerHTML = `
      <div class="case-block case-cover">
        <div class="case-cover-left">
          <div class="byline"><span class="avatar"></span> Tedo Mirianashvili</div>
          <div class="eyebrow">${escapeHtml(project.type)} · ${escapeHtml(project.year)}</div>
          <h2>${escapeHtml(project.client)}</h2>
          <div class="subtitle">${escapeHtml(project.title)}</div>
          <div class="desc">
            ${escapeHtml(project.brief)}
            <div class="meta-row">
              <div><span class="k">Type</span>${escapeHtml(project.type)}</div>
              <div><span class="k">Pages</span>${escapeHtml(project.pages)}</div>
              <div><span class="k">Format</span>${escapeHtml(project.format)}</div>
              <div><span class="k">Year</span>${escapeHtml(project.year)}</div>
            </div>
          </div>
        </div>
        <div class="case-cover-right">
          <img src="${project.cover}" alt="${escapeHtml(project.title)} cover">
        </div>
      </div>

      <div class="case-block case-section">
        <div class="label">Brief</div>
        <h3>Purpose &amp; Audience</h3>
        <p>${escapeHtml(project.brief)}</p>
      </div>

      <div class="case-block">
        <div class="case-section" style="padding-bottom:0;">
          <div class="label">Design Details</div>
        </div>
        <div class="detail-grid">
          ${project.details.map(d => `
            <div class="detail-item">
              <img src="${d.image}" alt="${escapeHtml(d.label)}">
              <span class="detail-label">${escapeHtml(d.label)}</span>
              <span class="detail-caption">${escapeHtml(d.caption)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="padding: 40px 60px 80px;">
        <a href="index.html#portfoliocards" style="color:#a05a2c; font-size:.9rem;">&larr; Back to all projects</a>
      </div>
    `;

  } catch (err) {
    console.error(err);
    root.innerHTML = `<p style="padding:60px; color:#a8a19c;">Could not load project data. If you're opening this file directly, run a local server (e.g. <code>python3 -m http.server</code>) — fetch() is blocked on file:// URLs.</p>`;
  }
}

// basic escaping so pasted project text can't break the page markup
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

document.addEventListener('DOMContentLoaded', loadProject);
