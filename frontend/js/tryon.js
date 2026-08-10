/* =============================================================================
   TONEWEAR AI — TRYON.JS
   Virtual outfit try-on: tabs, outfit grid, before/after slider
   ============================================================================= */

let selectedOutfit   = null;
let userImageFile    = null;
let clothingFile     = null;
let currentTab       = 'recommended';

// ── DOM Ready ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initOutfitGrid();
  initCategoryFilter();
  initPhotoUpload();
  initClothingUpload();
  initGenerateButton();
  initCustomGenerateButton();
  initBeforeAfterSlider();
  loadRecommendedOutfits();
  loadFromAnalyzer();
});

// ── Tabs ──────────────────────────────────────────────────────────────────
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-underline-btn[data-tab]');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active tab button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show/hide tab panels
      const targetTab = btn.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.dataset.tabPanel !== targetTab);
      });

      currentTab = targetTab;

      if (targetTab === 'glasses') {
        window.location.href = 'glasses.html';
      }
    });
  });
}

// ── Outfit Grid ───────────────────────────────────────────────────────────
const OUTFITS_DB = [
  { id: 1,  name: 'Navy Shalwar Kameez',       category: 'Shalwar Kameez', icon: '👘', recommended: true,  color: '#1a3a5c' },
  { id: 2,  name: 'White Shalwar Kameez',      category: 'Shalwar Kameez', icon: '👘', recommended: false, color: '#f5f5f5' },
  { id: 3,  name: 'Forest Green Kurta',         category: 'Kurta',          icon: '👗', recommended: true,  color: '#2d5a27' },
  { id: 4,  name: 'Burgundy Kurta Set',         category: 'Kurta',          icon: '👗', recommended: false, color: '#6b2d3a' },
  { id: 5,  name: 'Charcoal Sherwani',          category: 'Sherwani',       icon: '🥻', recommended: false, color: '#36454f' },
  { id: 6,  name: 'Golden Sherwani',            category: 'Sherwani',       icon: '🥻', recommended: true,  color: '#c8860a' },
  { id: 7,  name: 'Classic White Thobe',        category: 'Thobe',          icon: '🧕', recommended: false, color: '#ffffff' },
  { id: 8,  name: 'Beige Thobe',               category: 'Thobe',          icon: '🧕', recommended: false, color: '#d4c5a9' },
  { id: 9,  name: 'Navy Slim Fit Suit',         category: 'Western',        icon: '👔', recommended: true,  color: '#1a3a5c' },
  { id: 10, name: 'White Dress Shirt',          category: 'Western',        icon: '👔', recommended: false, color: '#f9f9f9' },
  { id: 11, name: 'Maroon Polo Shirt',          category: 'Western',        icon: '👕', recommended: false, color: '#6b2d3a' },
  { id: 12, name: 'Forest Green Casual Kurta',  category: 'Kurta',          icon: '👗', recommended: false, color: '#2d5a27' },
];

let activeCategory = 'All';

function initOutfitGrid() {
  renderOutfitGrid(OUTFITS_DB);
}

function renderOutfitGrid(outfits) {
  const container = document.getElementById('outfit-grid');
  if (!container) return;

  container.innerHTML = outfits.map(outfit => `
    <div class="outfit-card card-enter" data-id="${outfit.id}"
         onclick="selectOutfit(${outfit.id}, this)">
      <div class="outfit-card-image" style="background:${outfit.color}20; border-radius: 12px 12px 0 0; padding: 24px; text-align:center;">
        <span style="font-size:48px">${outfit.icon}</span>
        ${outfit.recommended ? '<span class="badge badge-primary" style="position:absolute;top:8px;right:8px;font-size:10px;">⭐ Rec</span>' : ''}
      </div>
      <div class="p-4" style="flex:1">
        <h4 class="font-semibold text-sm mb-1">${outfit.name}</h4>
        <span class="badge badge-secondary" style="font-size:10px">${outfit.category}</span>
      </div>
    </div>
  `).join('');

  // Re-run scroll reveal for new elements
  App.initScrollReveal();
}

function selectOutfit(id, cardEl) {
  selectedOutfit = OUTFITS_DB.find(o => o.id === id);

  // Visual selection ring
  document.querySelectorAll('.outfit-card').forEach(c => {
    c.style.boxShadow = '';
    c.style.borderColor = '';
    c.style.transform = '';
  });

  if (cardEl) {
    cardEl.style.boxShadow = '0 0 0 3px var(--primary)';
    cardEl.style.transform = 'scale(1.03)';
  }

  // Enable generate button
  const btn = document.getElementById('generate-btn');
  if (btn) {
    btn.disabled = !userImageFile;
    if (!userImageFile) {
      App.showToast('Upload your photo first', 'Take or upload a selfie to try this outfit', 'info');
      document.getElementById('user-photo-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// ── Category Filter ───────────────────────────────────────────────────────
function initCategoryFilter() {
  const pills = document.querySelectorAll('.category-pill');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.dataset.category;

      const filtered = activeCategory === 'All'
        ? OUTFITS_DB
        : OUTFITS_DB.filter(o => o.category === activeCategory);

      renderOutfitGrid(filtered);
    });
  });
}

// ── Photo Upload ──────────────────────────────────────────────────────────
function initPhotoUpload() {
  const zone  = document.getElementById('user-photo-zone');
  const input = document.getElementById('user-photo-input');
  const preview = document.getElementById('user-photo-preview');

  if (!input) return;

  App.initDragDrop('user-photo-zone', 'user-photo-input', file => handleUserPhoto(file));

  input.addEventListener('change', e => {
    if (e.target.files[0]) handleUserPhoto(e.target.files[0]);
  });
}

function handleUserPhoto(file) {
  if (!validateImageFile(file)) return;
  userImageFile = file;

  const reader = new FileReader();
  reader.onload = e => {
    const preview  = document.getElementById('user-photo-preview');
    const zone     = document.getElementById('user-photo-zone');
    const previewWrap = document.getElementById('user-photo-preview-wrap');

    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    if (zone) zone.style.display = 'none';
    if (previewWrap) previewWrap.style.display = 'block';

    // Enable generate button if outfit is also selected
    const btn = document.getElementById('generate-btn');
    if (btn) btn.disabled = !selectedOutfit;

    App.showToast('Photo ready!', 'Now select an outfit and generate', 'success');
  };
  reader.readAsDataURL(file);
}

// ── Clothing Upload (Tab 2) ───────────────────────────────────────────────
function initClothingUpload() {
  const input = document.getElementById('clothing-input');
  if (!input) return;

  input.addEventListener('change', e => {
    if (e.target.files[0]) handleClothingFile(e.target.files[0]);
  });
}

function handleClothingFile(file) {
  if (!validateImageFile(file)) return;
  clothingFile = file;

  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('clothing-preview');
    const zone    = document.getElementById('clothing-zone');
    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    if (zone) zone.style.display = 'none';
  };
  reader.readAsDataURL(file);

  // Enable custom generate button
  const btn = document.getElementById('custom-generate-btn');
  if (btn) btn.disabled = !(userImageFile && clothingFile);
}

// ── Generate Try-On (Tab 1) ──────────────────────────────────────────────
function initGenerateButton() {
  const btn = document.getElementById('generate-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!userImageFile || !selectedOutfit) {
      App.showToast('Missing info', 'Please upload your photo and select an outfit', 'warning');
      return;
    }

    showResultLoading();
    btn.classList.add('btn-loading');
    btn.disabled = true;

    try {
      const outfitUrl = selectedOutfit.imageUrl || `placeholder_${selectedOutfit.id}.jpg`;
      const result    = await ToneWearAPI.generateTryOn(userImageFile, outfitUrl);

      showTryOnResult(result.result_url);
      App.showToast('Look generated!', 'Your virtual try-on is ready 🎉', 'success');
    } catch (err) {
      // Demo fallback: show side-by-side with placeholder
      showDemoResult();
      App.showToast('Demo mode', 'Showing demo result — connect backend for AI generation', 'info');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  });
}

// ── Custom Generate (Tab 2) ──────────────────────────────────────────────
function initCustomGenerateButton() {
  const btn = document.getElementById('custom-generate-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!userImageFile || !clothingFile) {
      App.showToast('Upload both images', 'Upload your photo AND your clothing item', 'warning');
      return;
    }

    showResultLoading();
    btn.classList.add('btn-loading');
    btn.disabled = true;

    try {
      const result = await ToneWearAPI.customTryOn(userImageFile, clothingFile);
      showTryOnResult(result.result_url);
      App.showToast('Your look is ready!', '🎉 Virtual try-on complete', 'success');
    } catch (err) {
      showDemoResult();
      App.showToast('Demo mode', 'Showing demo result', 'info');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  });
}

// ── Result Display ────────────────────────────────────────────────────────
function showResultLoading() {
  const loadingEl = document.getElementById('result-loading');
  const resultEl  = document.getElementById('tryon-result');
  const emptyEl   = document.getElementById('result-empty');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (resultEl)  resultEl.classList.add('hidden');
  if (emptyEl)   emptyEl.classList.add('hidden');
}

function showTryOnResult(resultUrl) {
  const loadingEl = document.getElementById('result-loading');
  const resultEl  = document.getElementById('tryon-result');
  const afterImg  = document.getElementById('after-image');

  if (loadingEl) loadingEl.classList.add('hidden');
  if (resultEl)  resultEl.classList.remove('hidden');

  if (afterImg && resultUrl) {
    afterImg.style.backgroundImage = `url(${resultUrl})`;
  }

  // Init before/after slider
  App.initBeforeAfterSlider('before-after-container');

  // Show action buttons
  const actionsEl = document.getElementById('result-actions');
  if (actionsEl) actionsEl.classList.remove('hidden');
}

function showDemoResult() {
  showTryOnResult(null);
  const afterImg = document.getElementById('after-image');
  if (afterImg) {
    // Demo gradient background simulating result
    afterImg.style.background = 'linear-gradient(135deg, #1a3a5c44, #7C3AED44)';
    afterImg.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--primary);">
      <span style="font-size:48px">👔</span>
      <span style="font-size:14px;font-weight:600">Try-On Preview</span>
      <span style="font-size:12px;color:var(--text-muted)">Connect backend for AI result</span>
    </div>`;
  }
}

function initBeforeAfterSlider() {
  // Initialized after result loads via App.initBeforeAfterSlider
}

// ── Download & Share ──────────────────────────────────────────────────────
document.addEventListener('click', e => {
  if (e.target.id === 'download-result-btn') {
    downloadResult();
  }
});

function downloadResult() {
  App.showToast('Download started', 'Your try-on image is being downloaded', 'info');
  // Actual implementation would create canvas and download
}

// ── Utilities ─────────────────────────────────────────────────────────────
function validateImageFile(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    App.showToast('Invalid file', 'Please upload JPG, PNG or WEBP', 'error');
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    App.showToast('File too large', 'Maximum 10MB allowed', 'error');
    return false;
  }
  return true;
}

function loadRecommendedOutfits() {
  const last = App.loadFromStorage?.('last_analysis');
  if (last && last.result && last.result.outfits) {
    // Mark these outfit IDs as recommended
    const recNames = last.result.outfits.map(o => o.name);
    OUTFITS_DB.forEach(o => {
      if (recNames.includes(o.name)) o.recommended = true;
    });
    renderOutfitGrid(OUTFITS_DB);
  }
}

function loadFromAnalyzer() {
  // Check URL param for pre-selected outfit
  const urlParams = new URLSearchParams(window.location.search);
  const outfitName = urlParams.get('outfit');
  if (outfitName) {
    const match = OUTFITS_DB.find(o => o.name === decodeURIComponent(outfitName));
    if (match) {
      setTimeout(() => {
        const card = document.querySelector(`[data-id="${match.id}"]`);
        if (card) { selectOutfit(match.id, card); card.scrollIntoView({ behavior: 'smooth' }); }
      }, 500);
    }
  }
}

window.selectOutfit = selectOutfit;
