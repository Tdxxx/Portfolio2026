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
  wireDropzone('cover_drop', 'cover_file', 'cover_preview', 'f_cover');

  document.getElementById('loadFile').addEventListener('change', handleLoadFile);
  document.getElementById('projectForm').addEventListener('submit', handleSaveProject);
  document.getElementById('clearForm').addEventListener('click', clearForm);
  document.getElementById('downloadBtn').addEventListener('click', downloadJson);

  initTestimonials();
}

function renderDetailFields() {
  const wrap = document.getElementById('detailFields');
  wrap.innerHTML = DETAIL_LABELS.map((label, i) => `
    <div class="admin-detail-row">
      <strong>${label}</strong>
      <input type="text" id="detail_caption_${i}" placeholder="Caption (e.g. Cropped headline treatment)">
      <div class="dropzone" id="detail_drop_${i}" data-target="detail_image_${i}">
        <img class="dropzone-preview" id="detail_preview_${i}" style="display:none;">
        <span class="dropzone-label">Drag image here or click to browse</span>
        <input type="file" accept="image/*" class="dropzone-file" id="detail_file_${i}">
      </div>
      <input type="text" id="detail_image_${i}" placeholder="./image/eden-detail-${i + 1}.png">
    </div>
  `).join('');

  DETAIL_LABELS.forEach((_, i) => wireDropzone(`detail_drop_${i}`, `detail_file_${i}`, `detail_preview_${i}`, `detail_image_${i}`));
}

// =========================================================
// Drag-and-drop image preview
// -----------------------------------------------------------
// NOTE: this is a static site with no backend/server upload —
// there's nowhere for the browser to actually store the file.
// What this DOES do: let you drag/drop or click to pick an image,
// show you a live preview so you know it's the right one, and
// auto-fill the path field with "./image/<filename>". You still
// need to place that actual image file in your /image folder and
// commit/push it — this just removes the guesswork on the path
// and confirms visually you picked the right file.
// =========================================================
function wireDropzone(dropId, fileId, previewId, pathInputId) {
  const dropzone = document.getElementById(dropId);
  const fileInput = document.getElementById(fileId);
  const preview = document.getElementById(previewId);
  const pathInput = document.getElementById(pathInputId);
  if (!dropzone || !fileInput) return;

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = 'block';
      dropzone.classList.add('has-preview');
    };
    reader.readAsDataURL(file);

    if (pathInput && !pathInput.value.includes('/')) {
      pathInput.value = `./image/${file.name}`;
    } else if (pathInput) {
      pathInput.value = `./image/${file.name}`;
    }
  };

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });
}

// pre-fill a dropzone's preview when editing an existing project
// that already has an image path saved (best-effort — only works
// if that image is actually reachable at that relative path)
function setDropzonePreviewFromPath(previewId, dropId, path) {
  const preview = document.getElementById(previewId);
  const dropzone = document.getElementById(dropId);
  if (!preview || !path) return;
  preview.src = path;
  preview.style.display = 'block';
  if (dropzone) dropzone.classList.add('has-preview');
  preview.onerror = () => {
    preview.style.display = 'none';
    if (dropzone) dropzone.classList.remove('has-preview');
  };
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

  setDropzonePreviewFromPath('cover_preview', 'cover_drop', p.cover);

  (p.details || []).forEach((d, i) => {
    const capEl = document.getElementById(`detail_caption_${i}`);
    const imgEl = document.getElementById(`detail_image_${i}`);
    if (capEl) capEl.value = d.caption || '';
    if (imgEl) imgEl.value = d.image || '';
    setDropzonePreviewFromPath(`detail_preview_${i}`, `detail_drop_${i}`, d.image);
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

  document.querySelectorAll('.dropzone-preview').forEach(p => { p.style.display = 'none'; p.src = ''; });
  document.querySelectorAll('.dropzone').forEach(d => d.classList.remove('has-preview'));
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

// =========================================================
// Testimonials — same pattern as projects: no backend, builds
// a testimonials.json in memory (+localStorage draft) to download
// and commit to data/testimonials.json alongside your projects file.
// =========================================================
const TESTIMONIALS_STORAGE_KEY = 'admin_draft_testimonials';
let testimonials = [];

function initTestimonials() {
  const saved = localStorage.getItem(TESTIMONIALS_STORAGE_KEY);
  if (saved) {
    try { testimonials = JSON.parse(saved); } catch (e) { testimonials = []; }
  }

  renderTestimonialList();

  const form = document.getElementById('testimonialForm');
  if (!form) return; // section not on this page

  form.addEventListener('submit', handleSaveTestimonial);
  document.getElementById('clearTestimonialForm').addEventListener('click', clearTestimonialForm);
  document.getElementById('downloadTestimonialsBtn').addEventListener('click', downloadTestimonialsJson);
  document.getElementById('loadTestimonialsFile').addEventListener('change', handleLoadTestimonialsFile);
}

function handleLoadTestimonialsFile(e) {
  const file = e.target.files[0];
  const status = document.getElementById('loadTestimonialsStatus');
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const loaded = JSON.parse(evt.target.result);
      if (!Array.isArray(loaded)) throw new Error('File is not a testimonials list');
      testimonials = loaded;
      saveTestimonialsDraft();
      renderTestimonialList();
      status.textContent = `Loaded ${loaded.length} testimonial(s).`;
      status.style.color = '#8fbf8f';
    } catch (err) {
      status.textContent = 'Could not read that file — make sure it\'s a valid testimonials.json.';
      status.style.color = '#e06a6a';
    }
  };
  reader.readAsText(file);
}

function handleSaveTestimonial(e) {
  e.preventDefault();

  const clientName = document.getElementById('t_name').value.trim();
  const quote = document.getElementById('t_quote').value.trim();

  if (!clientName || !quote) {
    alert('Client name and review text are required.');
    return;
  }

  const testimonial = {
    id: document.getElementById('t_id').value.trim() || `t${Date.now()}`,
    clientName,
    role: document.getElementById('t_role').value.trim(),
    rating: Number(document.getElementById('t_rating').value) || 5,
    quote,
    source: document.getElementById('t_source').value.trim() || 'Upwork',
    projectLink: document.getElementById('t_link').value.trim()
  };

  const existingIndex = testimonials.findIndex(t => t.id === testimonial.id);
  if (existingIndex !== -1) {
    testimonials[existingIndex] = testimonial;
  } else {
    testimonials.push(testimonial);
  }

  saveTestimonialsDraft();
  renderTestimonialList();
  clearTestimonialForm();
}

function editTestimonial(index) {
  const t = testimonials[index];
  document.getElementById('t_id').value = t.id;
  document.getElementById('t_name').value = t.clientName;
  document.getElementById('t_role').value = t.role || '';
  document.getElementById('t_rating').value = t.rating || 5;
  document.getElementById('t_quote').value = t.quote;
  document.getElementById('t_source').value = t.source || 'Upwork';
  document.getElementById('t_link').value = t.projectLink || '';
  window.scrollTo({ top: document.getElementById('testimonialForm').offsetTop - 80, behavior: 'smooth' });
}

function deleteTestimonial(index) {
  if (!confirm(`Remove the review from "${testimonials[index].clientName}"?`)) return;
  testimonials.splice(index, 1);
  saveTestimonialsDraft();
  renderTestimonialList();
}

function clearTestimonialForm() {
  document.getElementById('testimonialForm').reset();
  document.getElementById('t_id').value = '';
  document.getElementById('t_rating').value = 5;
}

function renderTestimonialList() {
  const list = document.getElementById('testimonialList');
  if (!list) return;
  document.getElementById('testimonialCountLabel').textContent = testimonials.length;

  if (!testimonials.length) {
    list.innerHTML = '<p class="admin-note">No reviews yet — copy one over from your Upwork profile above.</p>';
    return;
  }

  list.innerHTML = testimonials.map((t, i) => `
    <div class="admin-project-row">
      <div>
        <strong>${t.clientName}</strong>
        <span class="admin-note">${'★'.repeat(t.rating || 5)} — ${(t.quote || '').slice(0, 60)}${t.quote.length > 60 ? '…' : ''}</span>
      </div>
      <div class="admin-row-actions">
        <button type="button" onclick="editTestimonial(${i})" class="btn-secondary">Edit</button>
        <button type="button" onclick="deleteTestimonial(${i})" class="btn-secondary btn-danger">Delete</button>
      </div>
    </div>
  `).join('');
}

function saveTestimonialsDraft() {
  localStorage.setItem(TESTIMONIALS_STORAGE_KEY, JSON.stringify(testimonials));
}

function downloadTestimonialsJson() {
  if (!testimonials.length) {
    alert('Add at least one review first.');
    return;
  }
  const blob = new Blob([JSON.stringify(testimonials, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'testimonials.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', init);