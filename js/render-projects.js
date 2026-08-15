// =========================================================
// Renders .portfoliocard items into #portfoliocards on index.html
// Reads from data/projects.json — add/edit projects via admin.html
// =========================================================

async function loadPortfolioCards() {
  const container = document.getElementById('portfoliocards');
  if (!container) return; // not on this page

  try {
    const res = await fetch('data/projects.json');
    if (!res.ok) throw new Error('Could not load projects.json');
    const projects = await res.json();

    if (!projects.length) {
      container.innerHTML = '<p style="color:#a8a19c;">No projects published yet.</p>';
      return;
    }

    container.innerHTML = projects.map(p => `
      <a class="portfoliocard" href="project.html?id=${encodeURIComponent(p.id)}">
        <img src="${p.cover}" alt="${p.title}">
        <div class="portfoliocard-content">
          <h3 class="${p.cardTextColor === 'dark' ? 'dark-text' : ''}">${p.title}</h3>
          <div class="tags">
            ${p.tags.map(t => `<span class="tag${p.cardTextColor === 'dark' ? ' tag-dark' : ''}">${t}</span>`).join('')}
          </div>
        </div>
      </a>
    `).join('');

  } catch (err) {
    console.error(err);
    // Most likely cause: opening index.html directly via file:// instead of a local server.
    container.innerHTML = '<p style="color:#a8a19c;">Could not load projects. If you\'re opening this file directly, run a local server (e.g. <code>python3 -m http.server</code>) — fetch() is blocked on file:// URLs.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadPortfolioCards);
