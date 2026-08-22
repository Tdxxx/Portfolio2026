// =========================================================
// Admin panel logic
// No backend — this builds projects.json / testimonials.json in the
// browser's memory (persisted to localStorage as a safety net) and
// lets you download them to publish manually.
// =========================================================

const STORAGE_KEY = 'admin_draft_projects';
let projects = [];
let editingId = null; // project id currently being edited, null = adding new

const ACCENT_PRESETS = [
  { name: 'Wine',   color: '#b8215f', gradient: 'linear-gradient(150deg, #33081a 0%, #7a1030 38%, #b8215f 72%, #e0679a 100%)' },
  { name: 'Terracotta', color: '#a05a2c', gradient: 'linear-gradient(150deg, #2a1a10 0%, #7a4420 45%, #c17a3f 100%)' },
  { name: 'Forest', color: '#3f8f3a', gradient: 'linear-gradient(150deg, #0e1a0d 0%, #245a24 45%, #5aa456 100%)' },
  { name: 'Ocean',  color: '#1abcfe', gradient: 'linear-gradient(150deg, #061826 0%, #0e5a7a 45%, #1abcfe 100%)' },
  { name: 'Slate',  color: '#8a8fa3', gradient: 'linear-gradient(150deg, #14161c 0%, #3a3f52 45%, #8a8fa3 100%)' },
  { name: 'Sand',   color: '#c9a15a', gradient: 'linear-gradient(150deg, #1f1a10 0%, #6a5228 45%, #c9a15a 100%)' }
];

let rowUid = 1;
const nextUid = () => rowUid++;
let detailRows = [];  // [{uid, label, caption, image, frame}]
let galleryRows = []; // [{uid, image, caption, frame, size}]

// =========================================================
// Toasts — small, friendly confirmations instead of alert() popups
// =========================================================
function toast(message, type = 'ok') {
  const stack = document.getElementById('toastStack');
  if (!stack) { console.log(message); return; }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));
  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { projects = JSON.parse(saved); } catch (e) { projects = []; }
  }

  renderAccentSwatches();
  addDetailRow();  // start with one empty row rather than a wall of fields
  addGalleryRow();
  renderProjectList();
  updatePreview();
  wireDropzone('cover_drop', 'cover_file', 'cover_preview', 'f_cover');

  document.getElementById('loadFile').addEventListener('change', handleLoadFile);
  document.getElementById('projectForm').addEventListener('submit', handleSaveProject);
  document.getElementById('clearForm').addEventListener('click', () => clearForm(true));
  document.getElementById('downloadBtn').addEventListener('click', downloadJson);
  document.getElementById('addDetailBtn').addEventListener('click', () => addDetailRow());
  document.getElementById('addGalleryBtn').addEventListener('click', () => addGalleryRow());

  // live preview updates as you type
  ['f_title', 'f_tags', 'f_textcolor', 'f_cover'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
  });

  // color picker <-> text field stay in sync
  const picker = document.getElementById('f_accentcolor_picker');
  const colorText = document.getElementById('f_accentcolor');
  picker.addEventListener('input', () => { colorText.value = picker.value; updateAccentPreview(); });
  colorText.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(colorText.value)) picker.value = colorText.value;
    updateAccentPreview();
  });
  document.getElementById('f_accentgradient').addEventListener('input', updateAccentPreview);

  initTestimonials();
}

function renderAccentSwatches() {
  const wrap = document.getElementById('accentSwatches');
  wrap.innerHTML = ACCENT_PRESETS.map(p => `
    <button type="button" class="accent-swatch" style="background:${p.gradient}" data-color="${p.color}" data-gradient="${p.gradient.replace(/"/g, '&quot;')}" title="${p.name}">
      <span>${p.name}</span>
    </button>
  `).join('') + `<button type="button" class="accent-swatch accent-swatch-clear" data-color="" data-gradient="" title="No accent — use site default">
      <span>Default</span>
    </button>`;

  wrap.querySelectorAll('.accent-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('f_accentcolor').value = btn.dataset.color;
      document.getElementById('f_accentcolor_picker').value = btn.dataset.color || '#a05a2c';
      document.getElementById('f_accentgradient').value = btn.dataset.gradient;
      updateAccentPreview();
    });
  });
  updateAccentPreview();
}

function updateAccentPreview() {
  const preview = document.getElementById('accentPreview');
  const gradient = document.getElementById('f_accentgradient').value.trim();
  const color = document.getElementById('f_accentcolor').value.trim();
  preview.style.background = gradient || 'rgba(255,255,255,.05)';
  preview.textContent = gradient || color ? '' : 'No accent set — this project will use the site default color.';
  preview.style.color = color || 'var(--grey)';
}

// =========================================================
// Live preview card — mirrors exactly what render-projects.js builds
// =========================================================
function updatePreview() {
  const title = document.getElementById('f_title').value.trim() || 'Untitled';
  const tags = document.getElementById('f_tags').value.split(',').map(t => t.trim()).filter(Boolean);
  const dark = document.getElementById('f_textcolor').value === 'dark';
  const cover = document.getElementById('f_cover').value.trim();

  document.getElementById('previewTitle').textContent = title;
  document.getElementById('previewTitle').className = dark ? 'dark-text' : '';
  document.getElementById('previewTags').innerHTML = tags.map(t => `<span class="tag${dark ? ' tag-dark' : ''}">${t}</span>`).join('');

  const img = document.getElementById('previewImg');
  if (cover) {
    img.src = cover;
    img.style.display = 'block';
    img.onerror = () => { img.style.display = 'none'; };
  } else {
    img.style.display = 'none';
  }
}

// =========================================================
// Dynamic "Design Details" rows
// =========================================================
function syncDetailRowsFromDOM() {
  document.querySelectorAll('#detailFields .admin-detail-row').forEach(row => {
    const uid = row.dataset.uid;
    const entry = detailRows.find(d => String(d.uid) === uid);
    if (!entry) return;
    entry.label = row.querySelector('.d-label').value.trim();
    entry.caption = row.querySelector('.d-caption').value.trim();
    entry.image = row.querySelector('.d-image').value.trim();
    entry.frame = row.querySelector('.d-frame').value;
  });
}

function addDetailRow(prefill = {}) {
  syncDetailRowsFromDOM();
  detailRows.push({ uid: nextUid(), label: '', caption: '', image: '', frame: 'none', ...prefill });
  renderDetailFields();
}

function removeDetailRow(uid) {
  syncDetailRowsFromDOM();
  detailRows = detailRows.filter(d => d.uid !== uid);
  if (!detailRows.length) addDetailRowSilent();
  renderDetailFields();
}
function addDetailRowSilent() { detailRows.push({ uid: nextUid(), label: '', caption: '', image: '', frame: 'none' }); }

function renderDetailFields() {
  const wrap = document.getElementById('detailFields');
  wrap.innerHTML = detailRows.map(d => `
    <div class="admin-detail-row" data-uid="${d.uid}">
      <input type="text" class="d-label" placeholder="Label, e.g. Login Screen" value="${escapeAttr(d.label)}">
      <input type="text" class="d-caption" placeholder="Caption" value="${escapeAttr(d.caption)}">
      <div class="dropzone dropzone-compact" id="detail_drop_${d.uid}">
        <img class="dropzone-preview" id="detail_preview_${d.uid}" style="display:${d.image ? 'block' : 'none'};" ${d.image ? `src="${d.image}"` : ''}>
        <span class="dropzone-label">Drag or click</span>
        <input type="file" accept="image/*" class="dropzone-file" id="detail_file_${d.uid}">
      </div>
      <input type="text" class="d-image" placeholder="./image/detail.png" value="${escapeAttr(d.image)}">
      <select class="d-frame" title="Frame style">
        <option value="none"${d.frame === 'none' ? ' selected' : ''}>No frame</option>
        <option value="phone"${d.frame === 'phone' ? ' selected' : ''}>Phone</option>
      </select>
      <button type="button" class="row-remove-btn" title="Remove this detail" onclick="removeDetailRow(${d.uid})">&times;</button>
    </div>
  `).join('');

  detailRows.forEach(d => {
    wireDropzone(`detail_drop_${d.uid}`, `detail_file_${d.uid}`, `detail_preview_${d.uid}`, null, (path) => {
      wrap.querySelector(`.admin-detail-row[data-uid="${d.uid}"] .d-image`).value = path;
    });
    if (d.image) setDropzonePreviewFromPath(`detail_preview_${d.uid}`, `detail_drop_${d.uid}`, d.image);
  });
}

// =========================================================
// Dynamic "Visuals" (gallery) rows
// =========================================================
function syncGalleryRowsFromDOM() {
  document.querySelectorAll('#galleryFields .admin-detail-row').forEach(row => {
    const uid = row.dataset.uid;
    const entry = galleryRows.find(d => String(d.uid) === uid);
    if (!entry) return;
    entry.caption = row.querySelector('.g-caption').value.trim();
    entry.image = row.querySelector('.g-image').value.trim();
    entry.frame = row.querySelector('.g-frame').value;
    entry.size = row.querySelector('.g-size').value;
  });
}

function addGalleryRow(prefill = {}) {
  syncGalleryRowsFromDOM();
  galleryRows.push({ uid: nextUid(), image: '', caption: '', frame: 'none', size: 'auto', ...prefill });
  renderGalleryFields();
}

function removeGalleryRow(uid) {
  syncGalleryRowsFromDOM();
  galleryRows = galleryRows.filter(d => d.uid !== uid);
  if (!galleryRows.length) galleryRows.push({ uid: nextUid(), image: '', caption: '', frame: 'none', size: 'auto' });
  renderGalleryFields();
}

function renderGalleryFields() {
  const wrap = document.getElementById('galleryFields');
  wrap.innerHTML = galleryRows.map(g => `
    <div class="admin-detail-row admin-gallery-row" data-uid="${g.uid}">
      <input type="text" class="g-caption" placeholder="Caption (optional)" value="${escapeAttr(g.caption)}">
      <div class="dropzone dropzone-compact" id="gallery_drop_${g.uid}">
        <img class="dropzone-preview" id="gallery_preview_${g.uid}" style="display:${g.image ? 'block' : 'none'};" ${g.image ? `src="${g.image}"` : ''}>
        <span class="dropzone-label">Drag or click</span>
        <input type="file" accept="image/*" class="dropzone-file" id="gallery_file_${g.uid}">
      </div>
      <input type="text" class="g-image" placeholder="./image/visual.png" value="${escapeAttr(g.image)}">
      <select class="g-frame" title="Frame style">
        <option value="none"${g.frame === 'none' ? ' selected' : ''}>No frame</option>
        <option value="phone"${g.frame === 'phone' ? ' selected' : ''}>Phone</option>
      </select>
      <select class="g-size" title="Width">
        <option value="auto"${g.size === 'auto' ? ' selected' : ''}>Auto width</option>
        <option value="full"${g.size === 'full' ? ' selected' : ''}>Full width</option>
      </select>
      <button type="button" class="row-remove-btn" title="Remove this visual" onclick="removeGalleryRow(${g.uid})">&times;</button>
    </div>
  `).join('');

  galleryRows.forEach(g => {
    wireDropzone(`gallery_drop_${g.uid}`, `gallery_file_${g.uid}`, `gallery_preview_${g.uid}`, null, (path) => {
      wrap.querySelector(`.admin-gallery-row[data-uid="${g.uid}"] .g-image`).value = path;
    });
    if (g.image) setDropzonePreviewFromPath(`gallery_preview_${g.uid}`, `gallery_drop_${g.uid}`, g.image);
  });
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
function wireDropzone(dropId, fileId, previewId, pathInputId, onPath) {
  const dropzone = document.getElementById(dropId);
  const fileInput = document.getElementById(fileId);
  const preview = document.getElementById(previewId);
  const pathInput = pathInputId ? document.getElementById(pathInputId) : null;
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

    const path = `./image/${file.name}`;
    if (pathInput) pathInput.value = path;
    if (onPath) onPath(path);
    if (dropId === 'cover_drop') updatePreview();
  };

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.add('drag-active');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault(); e.stopPropagation();
      dropzone.classList.remove('drag-active');
    });
  });
  dropzone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
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
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const loaded = JSON.parse(evt.target.result);
      if (!Array.isArray(loaded)) throw new Error('File is not a project list');
      projects = loaded;
      saveDraft();
      renderProjectList();
      toast(`Loaded ${loaded.length} project${loaded.length === 1 ? '' : 's'}.`, 'ok');
    } catch (err) {
      toast("Could not read that file — make sure it's a valid projects.json.", 'error');
    }
  };
  reader.readAsText(file);
}

function handleSaveProject(e) {
  e.preventDefault();
  syncDetailRowsFromDOM();
  syncGalleryRowsFromDOM();

  const id = document.getElementById('f_id').value.trim();
  const title = document.getElementById('f_title').value.trim();

  if (!id || !title) {
    toast('Project ID and Title are required.', 'error');
    return;
  }

  const details = detailRows
    .filter(d => d.label || d.image || d.caption)
    .map(d => ({ label: d.label, caption: d.caption, image: d.image || './image/placeholder.png', ...(d.frame !== 'none' ? { frame: d.frame } : {}) }));

  const gallery = galleryRows
    .filter(g => g.image)
    .map(g => ({ image: g.image, ...(g.caption ? { caption: g.caption } : {}), ...(g.frame !== 'none' ? { frame: g.frame } : {}), ...(g.size !== 'auto' ? { size: g.size } : {}) }));

  const accentColor = document.getElementById('f_accentcolor').value.trim();
  const accentGradient = document.getElementById('f_accentgradient').value.trim();

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
    ...(accentColor ? { accentColor } : {}),
    ...(accentGradient ? { accentGradient } : {}),
    brief: document.getElementById('f_brief').value.trim(),
    details,
    gallery
  };

  const existingIndex = projects.findIndex(p => p.id === (editingId ?? id));
  const isUpdate = existingIndex !== -1;
  if (isUpdate) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }

  saveDraft();
  renderProjectList();
  clearForm(false);
  toast(isUpdate ? `Updated "${title}".` : `Added "${title}" to the list.`, 'ok');
}

function editProject(index) {
  const p = projects[index];
  editingId = p.id;
  document.getElementById('formHeading').textContent = `2. Editing "${p.title}"`;
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
  document.getElementById('f_accentcolor').value = p.accentColor || '';
  document.getElementById('f_accentcolor_picker').value = p.accentColor || '#a05a2c';
  document.getElementById('f_accentgradient').value = p.accentGradient || '';
  updateAccentPreview();

  setDropzonePreviewFromPath('cover_preview', 'cover_drop', p.cover);

  detailRows = (p.details && p.details.length ? p.details : [{}]).map(d => ({ uid: nextUid(), label: d.label || '', caption: d.caption || '', image: d.image || '', frame: d.frame || 'none' }));
  renderDetailFields();

  galleryRows = (p.gallery && p.gallery.length ? p.gallery : [{}]).map(g => ({ uid: nextUid(), image: g.image || '', caption: g.caption || '', frame: g.frame || 'none', size: g.size || 'auto' }));
  renderGalleryFields();

  updatePreview();
  window.scrollTo({ top: document.getElementById('projectForm').offsetTop - 90, behavior: 'smooth' });
}

function duplicateProject(index) {
  const original = projects[index];
  const copy = JSON.parse(JSON.stringify(original));
  let n = 2;
  let newId = `${copy.id}-copy`;
  while (projects.some(p => p.id === newId)) { newId = `${copy.id}-copy${n++}`; }
  copy.id = newId;
  copy.title = `${copy.title} (copy)`;
  projects.splice(index + 1, 0, copy);
  saveDraft();
  renderProjectList();
  toast(`Duplicated as "${copy.title}" — remember to give it its own images.`, 'ok');
}

function moveProject(index, dir) {
  const target = index + dir;
  if (target < 0 || target >= projects.length) return;
  [projects[index], projects[target]] = [projects[target], projects[index]];
  saveDraft();
  renderProjectList();
}

function deleteProject(index) {
  const title = projects[index].title;
  if (!confirm(`Remove "${title}" from the list?`)) return;
  projects.splice(index, 1);
  saveDraft();
  renderProjectList();
  toast(`Removed "${title}".`, 'ok');
}

function clearForm(showToast) {
  editingId = null;
  document.getElementById('formHeading').textContent = '2. Add / Edit a Project';
  document.getElementById('projectForm').reset();
  document.getElementById('f_textcolor').value = 'light';
  document.getElementById('f_accentcolor').value = '';
  document.getElementById('f_accentgradient').value = '';
  updateAccentPreview();

  document.querySelectorAll('.dropzone-preview').forEach(p => { p.style.display = 'none'; p.src = ''; });
  document.querySelectorAll('.dropzone').forEach(d => d.classList.remove('has-preview'));

  detailRows = [];
  addDetailRowSilent();
  renderDetailFields();
  galleryRows = [{ uid: nextUid(), image: '', caption: '', frame: 'none', size: 'auto' }];
  renderGalleryFields();

  updatePreview();
  if (showToast) toast('Form cleared.', 'ok');
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
      <div class="admin-project-row-main">
        <div class="admin-project-thumb" style="${p.cover ? `background-image:url('${p.cover}')` : ''}"></div>
        <div>
          <strong>${p.title}</strong>
          <span class="admin-note">(${p.id})</span>
          <div class="tags">${(p.tags || []).map(t => `<span class="tag admin-tag-plain">${t}</span>`).join('')}</div>
        </div>
      </div>
      <div class="admin-row-actions">
        <button type="button" onclick="moveProject(${i}, -1)" class="btn-icon" title="Move up" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
        <button type="button" onclick="moveProject(${i}, 1)" class="btn-icon" title="Move down" ${i === projects.length - 1 ? 'disabled' : ''}>&darr;</button>
        <a href="project.html?id=${encodeURIComponent(p.id)}" target="_blank" class="btn-secondary">View</a>
        <button type="button" onclick="editProject(${i})" class="btn-secondary">Edit</button>
        <button type="button" onclick="duplicateProject(${i})" class="btn-secondary">Duplicate</button>
        <button type="button" onclick="deleteProject(${i})" class="btn-secondary btn-danger">Delete</button>
      </div>
    </div>
  `).join('');
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  const label = document.getElementById('autosaveLabel');
  if (label) {
    label.textContent = `Draft saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    label.classList.add('is-flash');
    setTimeout(() => label.classList.remove('is-flash'), 600);
  }
}

function downloadJson() {
  if (!projects.length) {
    toast('Add at least one project first.', 'error');
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
  toast('Downloaded projects.json — move it into data/ and publish.', 'ok');
}

function escapeAttr(str) {
  if (str === undefined || str === null) return '';
  return String(str).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
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
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const loaded = JSON.parse(evt.target.result);
      if (!Array.isArray(loaded)) throw new Error('File is not a testimonials list');
      testimonials = loaded;
      saveTestimonialsDraft();
      renderTestimonialList();
      toast(`Loaded ${loaded.length} testimonial(s).`, 'ok');
    } catch (err) {
      toast("Could not read that file — make sure it's a valid testimonials.json.", 'error');
    }
  };
  reader.readAsText(file);
}

function handleSaveTestimonial(e) {
  e.preventDefault();

  const clientName = document.getElementById('t_name').value.trim();
  const quote = document.getElementById('t_quote').value.trim();

  if (!clientName || !quote) {
    toast('Client name and review text are required.', 'error');
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
  const isUpdate = existingIndex !== -1;
  if (isUpdate) {
    testimonials[existingIndex] = testimonial;
  } else {
    testimonials.push(testimonial);
  }

  saveTestimonialsDraft();
  renderTestimonialList();
  clearTestimonialForm();
  toast(isUpdate ? `Updated review from ${clientName}.` : `Added review from ${clientName}.`, 'ok');
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
  window.scrollTo({ top: document.getElementById('testimonialForm').offsetTop - 90, behavior: 'smooth' });
}

function deleteTestimonial(index) {
  const name = testimonials[index].clientName;
  if (!confirm(`Remove the review from "${name}"?`)) return;
  testimonials.splice(index, 1);
  saveTestimonialsDraft();
  renderTestimonialList();
  toast(`Removed review from ${name}.`, 'ok');
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
        <span class="admin-note">${'★'.repeat(t.rating || 5)} — ${(t.quote || '').slice(0, 60)}${(t.quote || '').length > 60 ? '…' : ''}</span>
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
    toast('Add at least one review first.', 'error');
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
  toast('Downloaded testimonials.json — move it into data/ and publish.', 'ok');
}

document.addEventListener('DOMContentLoaded', init);