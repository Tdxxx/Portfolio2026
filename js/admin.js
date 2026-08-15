// =========================================================
// Admin panel logic
// No backend — this builds a projects.json in the browser's
// memory (persisted to localStorage as a safety net) and lets
// you download it to publish manually.
// =========================================================

const STORAGE_KEY = 'admin_draft_projects';
let projects = [];
let editingIndex = null; // null = adding new, otherwise index being edited

const DETAIL_LABELS = ['Typography Detail', 'Grid / Layout', 'Special Element', 'Print Detail'];

function init() {
  // restore any in-progress draft so a refresh doesn't wipe your work
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { projects = JSON.parse(saved); } catch (e) { projects = []; }
  }

  renderDetailFields();
  renderProjectList();

  document.getElementById('loadFile').addEventListener('change', handleLoadFile);
  document.getElementById('projectForm').addEventListener('submit', handleSaveProject);
  document.getElementById('clearForm').addEventListener('click', clearForm);
  document.getElementById('downloadBtn').addEventListener('click', downloadJson);
}

function renderDetailFields() {
  const wrap = document.getElementById('detailFields');
  wrap.innerHTML = DETAIL_LABELS.map((label, i) => `
    <div class="admin-detail-row">
      <strong>${label}</strong>
      <input type="text" id="detail_caption_${i}" placeholder="Caption (e.g. Cropped headline treatment)">
      <input type="text" id="detail_image_${i}" placeholder="./image/eden-detail-${i + 1}.png">
    </div>
  `).join('');
}

function handleLoadFile(e) {
  const file = e.target.files[0];
  const status = document.getElementById('loadStatus');
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const loaded = JSON.parse(evt.target.result);
      if (!Array.isArray(loaded)) throw new Error('File is not a project list');
      projects = loaded;
      saveDraft();
      renderProjectList();
      status.textContent = `Loaded ${loaded.length} project(s).`;
      status.style.color = '#8fbf8f';
    } catch (err) {
      status.textContent = 'Could not read that file — make sure it\'s a valid projects.json.';
      status.style.color = '#e06a6a';
    }
  };
  reader.readAsText(file);
}

function handleSaveProject(e) {
  e.preventDefault();

  const id = document.getElementById('f_id').value.trim();
  const title = document.getElementById('f_title').value.trim();

  if (!id || !title) {
    alert('Project ID and Title are required.');
    return;
  }

  const details = DETAIL_LABELS.map((label, i) => ({
    label,
    caption: document.getElementById(`detail_caption_${i}`).value.trim(),
    image: document.getElementById(`detail_image_${i}`).value.trim() || './image/placeholder.png'
  }));

  const project = {
    id,
    title,
    client: document.getElementById('f_client').value.trim() || title,
    tags: document.getElementById('f_tags').value.split(',').map(t => t.trim()).filter(Boolean),
    cardTextColor: document.getElementById('f_textcolor').value,
    cover: document.getElementById('f_cover').value.trim() || './image/placeholder.png',
    type: document.getElementById('f_type').value.trim(),
    pages: document.getElementById('f_pages').value.trim(),
    format: document.getElementById('f_format').value.trim(),
    year: document.getElementById('f_year').value.trim(),
    brief: document.getElementById('f_brief').value.trim(),
    details
  };

  const existingIndex = projects.findIndex(p => p.id === id);
  if (existingIndex !== -1) {
    projects[existingIndex] = project; // update in place
  } else {
    projects.push(project); // add new
  }

  saveDraft();
  renderProjectList();
  clearForm();
}

function editProject(index) {
  const p = projects[index];
  document.getElementById('f_id').value = p.id;
  document.getElementById('f_title').value = p.title;
  document.getElementById('f_client').value = p.client || '';
  document.getElementById('f_tags').value = (p.tags || []).join(', ');
  document.getElementById('f_textcolor').value = p.cardTextColor || 'light';
  document.getElementById('f_cover').value = p.cover || '';
  document.getElementById('f_type').value = p.type || '';
  document.getElementById('f_pages').value = p.pages || '';
  document.getElementById('f_format').value = p.format || '';
  document.getElementById('f_year').value = p.year || '';
  document.getElementById('f_brief').value = p.brief || '';

  (p.details || []).forEach((d, i) => {
    const capEl = document.getElementById(`detail_caption_${i}`);
    const imgEl = document.getElementById(`detail_image_${i}`);
    if (capEl) capEl.value = d.caption || '';
    if (imgEl) imgEl.value = d.image || '';
  });

  window.scrollTo({ top: document.getElementById('projectForm').offsetTop - 80, behavior: 'smooth' });
}

function deleteProject(index) {
  if (!confirm(`Remove "${projects[index].title}" from the list?`)) return;
  projects.splice(index, 1);
  saveDraft();
  renderProjectList();
}

function clearForm() {
  document.getElementById('projectForm').reset();
  document.getElementById('f_textcolor').value = 'light';
}

function renderProjectList() {
  const list = document.getElementById('projectList');
  document.getElementById('countLabel').textContent = projects.length;

  if (!projects.length) {
    list.innerHTML = '<p class="admin-note">No projects yet — add one above.</p>';
    return;
  }

  list.innerHTML = projects.map((p, i) => `
    <div class="admin-project-row">
      <div>
        <strong>${p.title}</strong>
        <span class="admin-note">(${p.id})</span>
      </div>
      <div class="admin-row-actions">
        <button type="button" onclick="editProject(${i})" class="btn-secondary">Edit</button>
        <button type="button" onclick="deleteProject(${i})" class="btn-secondary btn-danger">Delete</button>
      </div>
    </div>
  `).join('');
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function downloadJson() {
  if (!projects.length) {
    alert('Add at least one project first.');
    return;
  }
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'projects.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', init);