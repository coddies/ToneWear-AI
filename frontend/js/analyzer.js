/* =============================================================================
   TONEWEAR AI — ANALYZER.JS
   Complete skin analysis wizard: upload → occasion → style → analyze → results
   ============================================================================= */

let selectedFile   = null;
let selectedOccasion = null;
let selectedStyles = [];
let analysisResult = null;

// ── DOM Ready ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initUploadZone();
  initOccasionButtons();
  initStylePills();
  initAnalyzeButton();
  initSaveButton();
  checkPreviousAnalysis();
});

// ══════════════════════════════════════════════
// STEP 1: Upload Selfie
// ══════════════════════════════════════════════
function initUploadZone() {
  const zone      = document.getElementById('upload-zone');
  const fileInput = document.getElementById('selfie-input');
  const preview   = document.getElementById('photo-preview');
  const step2     = document.getElementById('step-2-section');

  if (!zone) return;

  // Drag & Drop
  App.initDragDrop('upload-zone', 'selfie-input', handleFileSelect);

  // File input change
  if (fileInput) {
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) handleFileSelect(file);
    });
  }

  // Camera button
  const cameraBtn = document.getElementById('camera-btn');
  if (cameraBtn) {
    cameraBtn.addEventListener('click', () => {
      App.openCamera(file => {
        handleFileSelect(file);
      });
    });
  }
}

function handleFileSelect(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!validTypes.includes(file.type)) {
    App.showToast('Invalid file type', 'Please upload JPG, PNG, or WEBP', 'error');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    App.showToast('File too large', 'Maximum size is 10MB', 'error');
    return;
  }

  selectedFile = file;

  // Show preview inside the universal upload zone
  const reader = new FileReader();
  reader.onload = e => {
    const previewImg    = document.getElementById('photo-preview');
    const defaultState  = document.getElementById('uz-default-state');
    const previewState  = document.getElementById('uz-preview-state');

    if (previewImg) previewImg.src = e.target.result;
    if (defaultState) defaultState.classList.add('hidden');
    if (previewState) previewState.classList.remove('hidden');

    // Show step 2 with animation
    showStep(2);
    App.showToast('Photo uploaded!', 'Now choose your occasion 🎯', 'success');
  };
  reader.readAsDataURL(file);
}

// ══════════════════════════════════════════════
// STEP 2: Choose Occasion
// ══════════════════════════════════════════════
function initOccasionButtons() {
  const buttons = document.querySelectorAll('.occasion-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove selected from all
      buttons.forEach(b => b.classList.remove('selected'));

      // Select this
      btn.classList.add('selected');
      selectedOccasion = btn.dataset.occasion;

      // Show step 3
      showStep(3);
      updateAnalyzeButton();
    });
  });
}

// ══════════════════════════════════════════════
// STEP 3: Style Preference
// ══════════════════════════════════════════════
function initStylePills() {
  const pills = document.querySelectorAll('.style-pill');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('selected');

      const style = pill.dataset.style;
      if (pill.classList.contains('selected')) {
        if (!selectedStyles.includes(style)) selectedStyles.push(style);
      } else {
        selectedStyles = selectedStyles.filter(s => s !== style);
      }

      // Auto-select "Mix All" deselects others
      if (style === 'Mix All' && pill.classList.contains('selected')) {
        pills.forEach(p => {
          if (p.dataset.style !== 'Mix All') p.classList.remove('selected');
        });
        selectedStyles = ['Mix All'];
      }

      updateAnalyzeButton();
    });
  });
}

// ══════════════════════════════════════════════
// STEP 4: Analyze Button
// ══════════════════════════════════════════════
function initAnalyzeButton() {
  const btn = document.getElementById('analyze-btn');
  if (!btn) return;

  btn.addEventListener('click', startAnalysis);
}

function updateAnalyzeButton() {
  const btn = document.getElementById('analyze-btn');
  if (!btn) return;

  const ready = selectedFile && selectedOccasion;
  btn.disabled = !ready;
  btn.style.opacity = ready ? '1' : '0.5';

  if (ready) {
    btn.classList.add('animate-pulse-glow');
  } else {
    btn.classList.remove('animate-pulse-glow');
  }
}

async function startAnalysis() {
  if (!selectedFile || !selectedOccasion) return;

  const styles = selectedStyles.length > 0 ? selectedStyles : ['Mix All'];

  showLoadingState();

  try {
    // Simulate/real API call
    const result = await ToneWearAPI.analyzeSkin(selectedFile, selectedOccasion, styles);
    analysisResult = result;
    hideLoadingState();
    showResults(result);
    App.saveToStorage('last_analysis', result);
    App.showToast('Analysis complete!', 'Your personalized style guide is ready ✨', 'success');
  } catch (err) {
    hideLoadingState();
    App.showToast('Analysis failed', err.message || 'Please try again', 'error');

    // Show mock results for demo
    const mockResult = getMockAnalysisResult();
    showResults(mockResult);
  }
}

// ══════════════════════════════════════════════
// LOADING STATE
// ══════════════════════════════════════════════
const loadingSteps = [
  'Uploading your photo...',
  'Detecting skin tone...',
  'Analyzing skin concerns...',
  'Generating outfit recommendations...',
  'Almost ready...'
];

function showLoadingState() {
  const overlay = document.getElementById('loading-overlay');
  const wizard  = document.getElementById('wizard-section');
  const bar     = document.getElementById('loading-progress-fill');
  const stepText = document.getElementById('loading-step-text');

  if (overlay) overlay.classList.remove('hidden');
  if (wizard)  wizard.style.opacity = '0.3';

  // Cycle loading messages
  let stepIdx  = 0;
  let progress = 0;
  if (stepText) stepText.textContent = loadingSteps[0];

  const stepTimer = setInterval(() => {
    stepIdx = Math.min(stepIdx + 1, loadingSteps.length - 1);
    if (stepText) stepText.textContent = loadingSteps[stepIdx];
  }, 1400);

  // Animate progress bar
  const progressTimer = setInterval(() => {
    progress = Math.min(progress + (100 / 70), 95);
    if (bar) bar.style.width = `${progress}%`;
    if (progress >= 95) clearInterval(progressTimer);
  }, 100);

  window._loadingTimers = { stepTimer, progressTimer };
}

function hideLoadingState() {
  const overlay = document.getElementById('loading-overlay');
  const wizard  = document.getElementById('wizard-section');
  const bar     = document.getElementById('loading-progress-fill');

  if (overlay) overlay.classList.add('hidden');
  if (wizard)  wizard.style.opacity = '1';
  if (bar)     bar.style.width = '100%';

  if (window._loadingTimers) {
    clearInterval(window._loadingTimers.stepTimer);
    clearInterval(window._loadingTimers.progressTimer);
  }
}

// ══════════════════════════════════════════════
// SHOW RESULTS
// ══════════════════════════════════════════════
function showResults(result) {
  const resultsSection = document.getElementById('results-section');
  if (!resultsSection) return;

  // Scroll to results
  resultsSection.classList.remove('hidden');

  // Populate skin tone card
  renderSkinTone(result.skin_tone);

  // Populate concerns
  renderConcerns(result.concerns);

  // Populate color palette
  renderColorPalette(result.color_palette);

  // Populate outfit recommendations
  renderOutfits(result.outfits);

  // Scroll into view
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    App.initScrollReveal(); // re-init for new elements
  }, 200);
}

function renderSkinTone(skinTone) {
  const swatchEl    = document.getElementById('skin-tone-swatch');
  const nameEl      = document.getElementById('skin-tone-name');
  const undertoneEl = document.getElementById('undertone-badge');
  const fitzEl      = document.getElementById('fitzpatrick-badge');

  if (swatchEl && skinTone.hex) {
    swatchEl.style.background = skinTone.hex;
  }
  if (nameEl && skinTone.name) nameEl.textContent = skinTone.name;
  if (undertoneEl && skinTone.undertone) {
    undertoneEl.textContent = skinTone.undertone;
    undertoneEl.className = `badge badge-${skinTone.undertone === 'Warm' ? 'warning' : skinTone.undertone === 'Cool' ? 'primary' : 'secondary'}`;
  }
  if (fitzEl && skinTone.fitzpatrick) fitzEl.textContent = `Type ${skinTone.fitzpatrick}`;
}

function renderConcerns(concerns) {
  const container = document.getElementById('concerns-container');
  if (!container) return;

  if (!concerns || concerns.length === 0) {
    container.innerHTML = '<p class="text-muted">No significant concerns detected 🎉</p>';
    return;
  }

  const severityColors = { High: 'error', Moderate: 'warning', Mild: 'success' };

  container.innerHTML = concerns.map(c => `
    <div class="concern-tag badge badge-${severityColors[c.severity] || 'primary'}">
      ${c.icon || '⚠️'} ${c.name}
      <span class="concern-severity">${c.severity}</span>
    </div>
  `).join('');
}

function renderColorPalette(palette) {
  const container = document.getElementById('color-palette-container');
  if (!container) return;

  if (!palette) return;

  const recommended = palette.recommended || [];
  const avoid       = palette.avoid || [];

  const recHtml = recommended.map(color => `
    <div class="color-item fade-up">
      <div class="color-swatch" style="background:${color.hex}" title="${color.name}"></div>
      <div class="color-info">
        <div class="color-name font-medium text-sm">${color.name}</div>
        <div class="color-hex text-xs text-muted">${color.hex}</div>
        <button class="color-why-btn text-xs text-brand" onclick="toggleColorWhy(this)">
          Why? ▼
        </button>
        <div class="color-why-text text-xs text-muted hidden">${color.why || ''}</div>
      </div>
    </div>
  `).join('');

  const avoidHtml = avoid.map(color => `
    <div class="color-avoid-item flex items-center gap-3">
      <div class="color-swatch" style="background:${color.hex}" title="${color.name}"></div>
      <div>
        <span class="font-medium text-sm">${color.name}</span>
        <div class="text-xs text-muted">${color.reason || ''}</div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="mb-6">
      <h4 class="font-semibold mb-4">✅ Colors that suit you</h4>
      <div class="color-swatches-grid">${recHtml}</div>
    </div>
    ${avoid.length ? `
    <div class="mt-6 pt-5 border-top">
      <h4 class="font-semibold mb-4 text-error">🚫 Colors to avoid</h4>
      <div class="flex flex-col gap-3">${avoidHtml}</div>
    </div>` : ''}
  `;
}

function toggleColorWhy(btn) {
  const text = btn.nextElementSibling;
  if (text) {
    text.classList.toggle('hidden');
    btn.textContent = text.classList.contains('hidden') ? 'Why? ▼' : 'Why? ▲';
  }
}

function renderOutfits(outfits) {
  const container = document.getElementById('outfits-container');
  if (!container || !outfits) return;

  container.innerHTML = outfits.map((outfit, i) => `
    <div class="glass-card outfit-card fade-up" data-stagger="${i * 100}">
      <div class="outfit-image-wrap">
        <div class="outfit-image-placeholder">
          <span style="font-size:48px">${outfit.icon || '👔'}</span>
        </div>
        ${outfit.recommended ? '<span class="recommended-badge badge badge-primary">⭐ Recommended</span>' : ''}
      </div>
      <div class="outfit-info mt-4">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-semibold text-lg">${outfit.name}</h4>
          <span class="badge badge-secondary">${outfit.type}</span>
        </div>
        <span class="badge badge-gradient mb-3">${outfit.occasion || selectedOccasion}</span>
        <p class="text-sm text-muted mb-4">
          <strong>Why it suits you:</strong> ${outfit.why || 'Perfectly matched to your skin tone'}
        </p>
        <div class="flex gap-3">
          <a href="tryon.html?outfit=${encodeURIComponent(outfit.name)}" class="btn btn-primary btn-sm flex-1">
            👕 Try This On
          </a>
          <a href="glasses.html" class="btn btn-secondary btn-sm flex-1">
            👓 Add Glasses
          </a>
        </div>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════
// SAVE ANALYSIS
// ══════════════════════════════════════════════
function initSaveButton() {
  const btn = document.getElementById('save-analysis-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!analysisResult) return;

    btn.classList.add('btn-loading');
    btn.disabled = true;

    try {
      const userId = window.Auth ? window.Auth.getCurrentUserId() : 'demo';

      const data = {
        user_id:    userId,
        occasion:   selectedOccasion,
        styles:     selectedStyles,
        result:     analysisResult,
        created_at: new Date().toISOString()
      };

      await ToneWearAPI.saveHistory(data);
      App.saveToStorage('last_analysis', data);
      App.showToast('Analysis saved!', 'View it anytime in My History 📋', 'success');
    } catch (err) {
      // Fallback to localStorage
      App.saveToStorage('last_analysis', analysisResult);
      App.showToast('Saved locally', 'Analysis saved to your device', 'info');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  });
}

// ══════════════════════════════════════════════
// STEP VISIBILITY CONTROL
// ══════════════════════════════════════════════
function showStep(stepNum) {
  const sections = {
    2: 'step-2-section',
    3: 'step-3-section',
    4: 'step-4-section'
  };

  const sectionId = sections[stepNum];
  if (!sectionId) return;

  const section = document.getElementById(sectionId);
  if (section && section.classList.contains('hidden')) {
    section.classList.remove('hidden');
    section.classList.add('animate-fade-up');
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300);
  }
}

// ══════════════════════════════════════════════
// CHECK PREVIOUS ANALYSIS
// ══════════════════════════════════════════════
function checkPreviousAnalysis() {
  const last = App.loadFromStorage ? App.loadFromStorage('last_analysis') : null;
  const banner = document.getElementById('resume-banner');

  if (last && last.result && banner) {
    banner.classList.remove('hidden');
    const resumeBtn = document.getElementById('resume-analysis-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        analysisResult = last.result;
        selectedOccasion = last.occasion;
        selectedStyles = last.styles || [];
        showResults(last.result);
        banner.classList.add('hidden');
      });
    }
  }
}

// ══════════════════════════════════════════════
// MOCK DATA (for demo / API failure fallback)
// ══════════════════════════════════════════════
function getMockAnalysisResult() {
  return {
    skin_tone: {
      hex:         '#C8956C',
      name:        'Warm Olive',
      undertone:   'Warm',
      fitzpatrick: 'IV'
    },
    concerns: [
      { name: 'Acne',       icon: '🔴', severity: 'Mild'     },
      { name: 'Dark Spots', icon: '🟤', severity: 'Moderate' },
      { name: 'Oiliness',   icon: '💧', severity: 'Mild'     }
    ],
    color_palette: {
      recommended: [
        { hex: '#1a3a5c', name: 'Deep Navy',       why: 'Creates elegant contrast with your warm olive undertone' },
        { hex: '#6b2d3a', name: 'Burgundy',         why: 'Complements your skin warmth beautifully' },
        { hex: '#2d5a27', name: 'Forest Green',     why: 'Earthy tones harmonize with warm undertones' },
        { hex: '#8b4513', name: 'Saddle Brown',     why: 'Creates monochromatic harmony with your skin' },
        { hex: '#4a0e8f', name: 'Deep Purple',      why: 'Cool depth adds stunning contrast' },
        { hex: '#c8860a', name: 'Golden Amber',     why: 'Gold tones glow against warm olive skin' }
      ],
      avoid: [
        { hex: '#ff6b6b', name: 'Bright Red',    reason: 'Clashes with warm undertones, creates uneven look' },
        { hex: '#f0e68c', name: 'Pale Yellow',   reason: 'Washes out warm olive complexion' },
        { hex: '#e0e0e0', name: 'Light Gray',    reason: 'Creates an ashy, dull appearance against your tone' }
      ]
    },
    outfits: [
      {
        icon: '👘', name: 'Navy Shalwar Kameez', type: 'Pakistani/Indian',
        occasion: 'Eid', recommended: true,
        why: 'Deep navy creates stunning contrast with your warm olive skin and looks regal for Eid celebrations'
      },
      {
        icon: '🥻', name: 'Burgundy Kurta Set', type: 'Kurta',
        occasion: 'Wedding',
        why: 'Rich burgundy harmonizes with your warm undertones while appearing luxurious for weddings'
      },
      {
        icon: '👔', name: 'Forest Green Sherwani', type: 'Sherwani',
        occasion: 'Eid',
        why: 'Earthy forest green is one of the most flattering tones for your skin type — classic and cultural'
      }
    ]
  };
}

// Expose for inline HTML calls
window.toggleColorWhy = toggleColorWhy;
