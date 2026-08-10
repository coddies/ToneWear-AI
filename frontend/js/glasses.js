/* =============================================================================
   TONEWEAR AI — GLASSES.JS (COMPLETE REBUILD v2)
   7-Section Flow: Upload → Auto-Analyze → Results → Strips → Try-On → Compare
   ============================================================================= */

'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let uploadedFile      = null;
let uploadedDataURL   = null;
let selectedFrameKey  = null;
let compareFrames     = [];          // [key1, key2]
let voteLeft          = 0;
let voteRight         = 0;
let analysisResult    = null;

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_ANALYSIS = {
  faceShape:    { shape: 'Oval', emoji: '⬭', confidence: 96, desc: 'Balanced proportions, slightly wider at cheekbones' },
  skinTone:     { name: 'Warm Olive', hex: '#C8956C', confidence: 91, undertone: 'Warm' },
  measurements: { width: 'Medium', jawline: 'Soft', bridge: 'Medium', size: '52-18-145' },
  styleDNA:     ['Professional', 'Modern', 'Minimal', 'Warm Tone'],
  bestFor:      ['Wayfarer', 'Clubmaster', 'Rectangle'],
  avoid:        ['Tiny Round', 'Oversized Square'],
};

const RECOMMENDATIONS = [
  {
    key:   'aviator',
    name:  'Gold Aviator',
    style: 'Classic',
    emoji: '🥽',
    scores: { overall: 95, color: 91, face: 97, style: 94 },
    why: "Your oval face has balanced proportions. Aviator frames add definition without elongating. The gold tone perfectly complements your warm olive skin.",
    roast: {
      problems: [
        "Your current frames are too wide — they cover your eyebrows",
        "Round shape visually rounds your face further",
        "Dark heavy frame overpowers your warm features",
      ],
      better: [
        "Aviator's teardrop shape adds structure to soft jawline",
        "Gold bridge matches your warm skin undertone exactly",
        "Slim frame lets your natural features stand out",
      ],
    },
  },
  {
    key:   'wayfarer',
    name:  'Classic Wayfarer',
    style: 'Bold',
    emoji: '🕶️',
    scores: { overall: 92, color: 88, face: 94, style: 90 },
    why: "Wayfarers suit oval faces because their slight angularity provides a pleasant contrast. The trapezoidal frame highlights your cheekbones and balanced jaw.",
    roast: {
      problems: [
        "Rimless frames make your features disappear",
        "Too small — frames look like they shrank in the wash",
        "No personality — like wearing furniture on your face",
      ],
      better: [
        "Bold shape frames your face intentionally",
        "Dark tone creates elegant contrast with olive skin",
        "Timeless style works for every occasion",
      ],
    },
  },
  {
    key:   'browline',
    name:  'Clubmaster',
    style: 'Vintage',
    emoji: '👓',
    scores: { overall: 89, color: 93, face: 91, style: 88 },
    why: "The browline design draws attention to your eyes and brow area, creating natural structure. Warm gold or tortoise-shell tones sync with your skin's undertone beautifully.",
    roast: {
      problems: [
        "Oversized frames make your face look smaller",
        "Wire frames disappear — people think you're not wearing glasses",
        "Wrong shape — fighting your face instead of working with it",
      ],
      better: [
        "Browline focuses attention on your strongest feature",
        "Half-rim is lighter and more comfortable for daily wear",
        "Vintage touch adds personality to your look",
      ],
    },
  },
];

const ALL_FRAMES = [
  { key: 'aviator',   name: 'Aviator',   emoji: '🥽',  file: 'assets/frames/aviator.svg'   },
  { key: 'wayfarer',  name: 'Wayfarer',  emoji: '🕶️',  file: 'assets/frames/wayfarer.svg'  },
  { key: 'browline',  name: 'Clubmaster',emoji: '👓',  file: 'assets/frames/browline.svg'  },
  { key: 'round',     name: 'Round',     emoji: '🔵',  file: 'assets/frames/round.svg'     },
  { key: 'rectangle', name: 'Rectangle', emoji: '▬',   file: 'assets/frames/rectangle.svg' },
  { key: 'cateye',    name: 'Cat-Eye',   emoji: '🐱',  file: 'assets/frames/cateye.svg'    },
  { key: 'geometric', name: 'Geometric', emoji: '🔷',  file: 'assets/frames/geometric.svg' },
  { key: 'oversized', name: 'Oversized', emoji: '🔲',  file: 'assets/frames/oversized.svg' },
];

// Recommended frame keys (from RECOMMENDATIONS)
const RECOMMENDED_KEYS = RECOMMENDATIONS.map(r => r.key);

// ── DOM Ready ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
});

// ══════════════════════════════════════════════
// SCROLL REVEAL
// ══════════════════════════════════════════════
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in-view');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  els.forEach(el => observer.observe(el));
}

// ══════════════════════════════════════════════
// SECTION 1 — UPLOAD HANDLING
// ══════════════════════════════════════════════
function handleGlassesUpload(file) {
  if (!file) return;

  // Validate
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    if (window.App?.showToast) App.showToast('Invalid file', 'Please use JPG, PNG or WEBP', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    if (window.App?.showToast) App.showToast('File too large', 'Max 10MB allowed', 'error');
    return;
  }

  uploadedFile = file;

  const reader = new FileReader();
  reader.onload = e => {
    uploadedDataURL = e.target.result;

    // Show photo preview, hide upload card
    const uploadCard    = document.getElementById('upload-card');
    const previewWrap   = document.getElementById('photo-preview-wrap');
    const uploadedPhoto = document.getElementById('uploaded-photo');

    uploadedPhoto.src = uploadedDataURL;
    uploadCard.style.display    = 'none';
    previewWrap.style.display   = 'block';

    // Auto-start analysis
    startAutoAnalysis();
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  uploadedFile    = null;
  uploadedDataURL = null;
  selectedFrameKey = null;
  analysisResult  = null;

  // Reset UI
  document.getElementById('upload-card').style.display    = '';
  document.getElementById('photo-preview-wrap').style.display = 'none';
  document.getElementById('face-file-input').value = '';

  // Hide all result sections
  ['section-analysis','section-reco','section-strips','section-tryon','section-compare'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.classList.remove('in-view'); }
  });

  // Reset compare & roast
  closeRoastCard();
  document.getElementById('friend-link-box').classList.remove('visible');
  voteLeft = voteRight = 0;
}

// ══════════════════════════════════════════════
// AUTO ANALYSIS FLOW
// ══════════════════════════════════════════════
const SCAN_MESSAGES = [
  'Detecting face landmarks...',
  'Measuring face proportions...',
  'Analyzing skin tone...',
  'Matching frame styles...',
  'Calculating suitability scores...',
];

function startAutoAnalysis() {
  const scanOverlay = document.getElementById('scan-overlay');
  const scanText    = document.getElementById('scan-text');

  // Show scan animation
  scanOverlay.classList.add('active');

  // Cycle scan messages
  let msgIdx = 0;
  scanText.textContent = SCAN_MESSAGES[0];
  const msgTimer = setInterval(() => {
    msgIdx = (msgIdx + 1) % SCAN_MESSAGES.length;
    scanText.textContent = SCAN_MESSAGES[msgIdx];
  }, 480);

  // After 2.5s simulate completion
  setTimeout(() => {
    clearInterval(msgTimer);
    scanOverlay.classList.remove('active');

    // Use mock data (real API would replace this)
    analysisResult = MOCK_ANALYSIS;
    showAnalysisResults();
  }, 2500);
}

// ══════════════════════════════════════════════
// SECTION 2 — ANALYSIS RESULTS
// ══════════════════════════════════════════════
function showAnalysisResults() {
  const r = analysisResult;

  // Face shape
  document.getElementById('face-shape-emoji').textContent  = r.faceShape.emoji;
  document.getElementById('face-shape-label').textContent  = r.faceShape.shape + ' Face';
  document.getElementById('face-conf-chip').textContent    = r.faceShape.confidence + '%';
  document.getElementById('face-shape-name').textContent   = r.faceShape.shape + ' Face';

  // Skin tone
  document.getElementById('skin-swatch').style.background = r.skinTone.hex;
  document.getElementById('skin-tone-name').textContent   = r.skinTone.name;
  document.getElementById('skin-conf-text').textContent   =
    `Confidence: ${r.skinTone.confidence}% • ${r.skinTone.undertone} undertone`;

  // Measurements
  document.getElementById('meas-width').textContent  = r.measurements.width;
  document.getElementById('meas-jaw').textContent    = r.measurements.jawline;
  document.getElementById('meas-bridge').textContent = r.measurements.bridge;
  document.getElementById('meas-size').textContent   = r.measurements.size;

  // Style DNA tags
  const tagsEl = document.getElementById('dna-tags');
  tagsEl.innerHTML = r.styleDNA.map(t => `<span class="dna-tag">${t}</span>`).join('');

  // Best for / Avoid
  document.getElementById('best-for-list').innerHTML =
    r.bestFor.map(v => `<span>✅ ${v}</span>`).join('');
  document.getElementById('avoid-list').innerHTML =
    r.avoid.map(v => `<span>🚫 ${v}</span>`).join('');

  // Show section
  showSection('section-analysis');

  // Then show recommendations after a brief pause
  setTimeout(() => {
    renderRecommendationCards();
    showSection('section-reco');

    setTimeout(() => {
      renderFrameStrips();
      showSection('section-strips');

      if (window.App?.showToast) {
        App.showToast('Analysis complete! 🎉', 'Select a frame to try it on', 'success');
      }
    }, 300);
  }, 400);
}

function showSection(id, delay = 0) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    // Trigger scroll reveal
    requestAnimationFrame(() => {
      el.classList.add('in-view');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, delay);
}

// ══════════════════════════════════════════════
// SECTION 3 — RECOMMENDATION CARDS
// ══════════════════════════════════════════════
function renderRecommendationCards() {
  const grid = document.getElementById('reco-grid');
  if (!grid) return;

  grid.innerHTML = RECOMMENDATIONS.map((rec, idx) => `
    <div class="reco-card ${idx === 0 ? 'rank-1' : ''} card-enter visible" style="animation-delay:${idx * 0.12}s">
      <div class="rank-badge">${idx + 1}</div>

      <div class="reco-frame-display">
        <img src="${ALL_FRAMES.find(f => f.key === rec.key)?.file || ''}"
             alt="${rec.name}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='block'"
             style="width:160px;height:auto;object-fit:contain">
        <span class="reco-frame-emoji" style="display:none">${rec.emoji}</span>
      </div>

      <div class="reco-body">
        <div class="reco-name">${rec.name}</div>
        <span class="reco-style-badge">${rec.style}</span>

        <div class="scores-grid">
          ${renderScoreBar('Overall Match', rec.scores.overall)}
          ${renderScoreBar('Color Match',   rec.scores.color)}
          ${renderScoreBar('Face Match',    rec.scores.face)}
          ${renderScoreBar('Style Fit',     rec.scores.style)}
        </div>

        <div class="why-text">${rec.why}</div>

        <div class="reco-actions">
          <button class="btn btn-primary btn-sm flex-1"
                  onclick="selectFrameFromCard('${rec.key}')">
            👓 Try This Frame
          </button>
          <button class="btn btn-ghost btn-sm"
                  onclick="showRoastCard(${idx})"
                  title="AI Roast">
            😂 AI Roast
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Animate progress bars after a short delay (so they're visible)
  setTimeout(() => animateScoreBars(), 600);
}

function renderScoreBar(label, pct) {
  return `
    <div class="score-row">
      <span class="score-label">${label}</span>
      <div class="score-bar-bg">
        <div class="score-bar-fill" data-pct="${pct}" style="width:0%"></div>
      </div>
      <span class="score-pct">${pct}%</span>
    </div>
  `;
}

function animateScoreBars() {
  document.querySelectorAll('.score-bar-fill[data-pct]').forEach(bar => {
    const pct = bar.dataset.pct;
    bar.style.width = pct + '%';
  });
}

// ══════════════════════════════════════════════
// SECTION 4 — AI ROAST CARD
// ══════════════════════════════════════════════
function showRoastCard(idx) {
  const rec  = RECOMMENDATIONS[idx];
  const card = document.getElementById('roast-card');

  document.getElementById('roast-frame-name').textContent = `For: ${rec.name}`;

  document.getElementById('roast-problems-list').innerHTML =
    rec.roast.problems.map(p => `
      <div class="roast-item">
        <span class="ri">❌</span>
        <span>${p}</span>
      </div>
    `).join('');

  document.getElementById('roast-better-list').innerHTML =
    rec.roast.better.map(b => `
      <div class="roast-item">
        <span class="ri">✅</span>
        <span>${b}</span>
      </div>
    `).join('');

  card.classList.add('visible');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeRoastCard() {
  document.getElementById('roast-card')?.classList.remove('visible');
}

// ══════════════════════════════════════════════
// SECTION 5 — CIRCULAR FRAME STRIPS
// ══════════════════════════════════════════════
function renderFrameStrips() {
  renderStrip('recommended-strip', ALL_FRAMES.filter(f => RECOMMENDED_KEYS.includes(f.key)), true);
  renderStrip('all-frames-strip',  ALL_FRAMES, false);
}

function renderStrip(containerId, frames, isRecommended) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = frames.map(frame => `
    <div class="f-circle ${isRecommended ? 'recommended' : ''}"
         data-frame="${frame.key}"
         id="circle-${containerId}-${frame.key}"
         onclick="selectFrame('${frame.key}')">
      <div class="f-circle-inner">
        <img src="${frame.file}" alt="${frame.name}"
             onerror="this.style.display='none';this.parentElement.innerHTML='<span>${frame.emoji}</span>'">
      </div>
      <span class="f-label">${frame.name}</span>
    </div>
  `).join('');
}

function updateStripSelections(key) {
  // Remove selected from all circles
  document.querySelectorAll('.f-circle').forEach(c => c.classList.remove('selected'));
  // Add selected to matching ones
  document.querySelectorAll(`.f-circle[data-frame="${key}"]`).forEach(c => c.classList.add('selected'));
}

// ══════════════════════════════════════════════
// SECTION 6 — TRY-ON RESULT
// ══════════════════════════════════════════════
function selectFrame(key) {
  selectedFrameKey = key;
  updateStripSelections(key);
  renderTryOnResult(key);

  // Also select from card if it matches a recommendation
  const recIdx = RECOMMENDATIONS.findIndex(r => r.key === key);
  if (recIdx >= 0) {
    // Optionally scroll to it
  }
}

function selectFrameFromCard(key) {
  selectFrame(key);
  // Scroll to try-on section
  setTimeout(() => {
    document.getElementById('section-tryon')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

function renderTryOnResult(key) {
  const frame  = ALL_FRAMES.find(f => f.key === key);
  const label  = frame ? frame.name : key;

  // Update labels
  document.getElementById('tryon-frame-badge').textContent = label;
  document.getElementById('tryon-frame-label').textContent = label;

  // Set base image
  const baseImg = document.getElementById('tryon-base-img');
  if (uploadedDataURL) {
    baseImg.src = uploadedDataURL;
  }

  // Draw glasses overlay on canvas
  baseImg.onload = () => drawGlassesOverlay(key);
  if (baseImg.complete && baseImg.naturalWidth) drawGlassesOverlay(key);

  // Show section
  showSection('section-tryon');

  // Reset friend link
  document.getElementById('friend-link-box').classList.remove('visible');

  // Compare — update first slot
  if (compareFrames.length < 2) {
    if (!compareFrames.includes(key)) compareFrames.push(key);
  } else {
    compareFrames[0] = key;
  }

  if (window.App?.showToast) {
    App.showToast(`Trying ${label} 👓`, 'Looking good!', 'success');
  }
}

function drawGlassesOverlay(frameKey) {
  const baseImg = document.getElementById('tryon-base-img');
  const canvas  = document.getElementById('tryon-canvas');
  if (!canvas || !baseImg.naturalWidth) return;

  const rect = baseImg.getBoundingClientRect();
  canvas.width  = baseImg.naturalWidth;
  canvas.height = baseImg.naturalHeight;
  canvas.style.width  = '100%';
  canvas.style.height = '100%';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Load and draw the frame SVG centered
  const frameEntry = ALL_FRAMES.find(f => f.key === frameKey);
  if (!frameEntry) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = frameEntry.file;
  img.onload = () => {
    // Position glasses precisely across the eye level
    const w  = canvas.width * 0.42;
    const h  = w * (150 / 400);
    const x  = (canvas.width - w) / 2;
    const y  = canvas.height * 0.31;   // ~31% from top for typical portrait eye level

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  };
}

// ── Try-On Actions ────────────────────────────────────────────────────────────
function downloadHD() {
  const baseImg = document.getElementById('tryon-base-img');
  const canvas  = document.getElementById('tryon-canvas');

  // Composite
  const out = document.createElement('canvas');
  out.width  = baseImg.naturalWidth  || 800;
  out.height = baseImg.naturalHeight || 600;
  const ctx  = out.getContext('2d');

  ctx.drawImage(baseImg, 0, 0);
  if (canvas && canvas.width) ctx.drawImage(canvas, 0, 0);

  out.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `tonewear-glasses-${selectedFrameKey || 'look'}-${Date.now()}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.92);

  if (window.App?.showToast) App.showToast('Downloaded! 💾', 'HD photo saved to your device', 'success');
}

function shareResult() {
  const frameName = ALL_FRAMES.find(f => f.key === selectedFrameKey)?.name || 'this look';
  if (navigator.share) {
    navigator.share({
      title: 'My ToneWear AI Look',
      text:  `Check out how I look in ${frameName} glasses! 👓`,
      url:   window.location.href,
    });
  } else {
    generateFriendVote();
  }
}

function generateFriendVote() {
  const code = Math.random().toString(36).slice(2, 8);
  const url  = `tonewear.ai/vote/${code}`;
  document.getElementById('friend-link-url').textContent = url;
  document.getElementById('friend-link-box').classList.add('visible');
}

function copyFriendLink() {
  const url = document.getElementById('friend-link-url').textContent;
  navigator.clipboard?.writeText(`https://${url}`).then(() => {
    if (window.App?.showToast) App.showToast('Link copied! 🔗', 'Share it with friends for a vote', 'success');
  });
}

// ══════════════════════════════════════════════
// SECTION 7 — COMPARE MODE
// ══════════════════════════════════════════════
function toggleCompareMode() {
  const section = document.getElementById('section-compare');
  if (section.style.display === 'none' || !section.style.display) {
    renderCompareMode();
    showSection('section-compare');
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  } else {
    closeCompareMode();
  }
}

function closeCompareMode() {
  const section = document.getElementById('section-compare');
  if (section) { section.style.display = 'none'; section.classList.remove('in-view'); }
}

function renderCompareMode() {
  // Pick 2 frames: current + next recommended
  const current = selectedFrameKey || RECOMMENDATIONS[0].key;
  const other   = RECOMMENDATIONS.find(r => r.key !== current)?.key || RECOMMENDATIONS[1].key;

  const frames = [current, other];
  voteLeft  = Math.floor(Math.random() * 80) + 20;
  voteRight = Math.floor(Math.random() * 80) + 20;

  const grid = document.getElementById('compare-grid');
  if (!grid) return;

  grid.innerHTML = frames.map((key, idx) => {
    const rec   = RECOMMENDATIONS.find(r => r.key === key);
    const frame = ALL_FRAMES.find(f => f.key === key);
    const name  = frame?.name || key;
    const scores = rec?.scores;
    const votes  = idx === 0 ? voteLeft : voteRight;

    return `
      <div class="compare-col" id="compare-col-${idx}">
        <div class="compare-photo">
          ${uploadedDataURL
            ? `<img src="${uploadedDataURL}" class="compare-img" alt="Your photo">`
            : `<span style="font-size:70px">${frame?.emoji || '👓'}</span>`
          }
          <div style="position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,0.55);color:#fff;padding:4px 12px;border-radius:50px;font-size:12px;font-weight:600;backdrop-filter:blur(6px)">${name}</div>
        </div>

        <div class="compare-info">
          <div class="compare-name">${name}</div>
          ${scores ? `
          <div class="compare-scores">
            <span class="compare-chip">Match ${scores.overall}%</span>
            <span class="compare-chip">Color ${scores.color}%</span>
            <span class="compare-chip">Face ${scores.face}%</span>
          </div>` : ''}

          <button class="compare-vote-btn" id="vote-btn-${idx}"
                  onclick="castVote(${idx})">
            ${idx === 0 ? '❤️ This One!' : '👍 This One!'}
          </button>
          <span class="vote-count" id="vote-count-${idx}">${votes} votes</span>
        </div>
      </div>
    `;
  }).join('');
}

function castVote(colIdx) {
  // Animate vote
  if (colIdx === 0) voteLeft  += Math.floor(Math.random() * 5) + 1;
  else              voteRight += Math.floor(Math.random() * 5) + 1;

  // Update UI
  const countEl = document.getElementById(`vote-count-${colIdx}`);
  const btnEl   = document.getElementById(`vote-btn-${colIdx}`);
  const colEl   = document.getElementById(`compare-col-${colIdx}`);

  if (countEl) countEl.textContent = `${colIdx === 0 ? voteLeft : voteRight} votes`;
  if (btnEl)   btnEl.classList.add('voted');
  if (colEl)   colEl.classList.add('voted');

  if (window.App?.showToast) App.showToast('Vote cast! 🗳️', 'Your friends will see your pick', 'success');
}

// ── Expose globally ────────────────────────────────────────────────────────────
window.handleGlassesUpload   = handleGlassesUpload;
window.resetUpload           = resetUpload;
window.selectFrame           = selectFrame;
window.selectFrameFromCard   = selectFrameFromCard;
window.showRoastCard         = showRoastCard;
window.closeRoastCard        = closeRoastCard;
window.toggleCompareMode     = toggleCompareMode;
window.closeCompareMode      = closeCompareMode;
window.castVote              = castVote;
window.downloadHD            = downloadHD;
window.shareResult           = shareResult;
window.generateFriendVote    = generateFriendVote;
window.copyFriendLink        = copyFriendLink;
