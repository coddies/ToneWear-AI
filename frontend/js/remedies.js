/* =============================================================================
   TONEWEAR AI — REMEDIES.JS
   Skin concern selector, AI remedy generation, clothing advice, save/bookmark
   ============================================================================= */

let selectedConcerns = [];
let remediesResult   = null;
let savedRemedies    = [];

// ── DOM Ready ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initConcernCards();
  initGetRemediesBtn();
  loadSavedRemedies();
  checkPreviousAnalysis();
});

// ── Concern Cards ─────────────────────────────────────────────────────────
function initConcernCards() {
  const cards = document.querySelectorAll('.concern-card');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const concern = card.dataset.concern;
      const isSelected = card.classList.toggle('selected');

      if (isSelected) {
        selectedConcerns.push(concern);
        card.style.boxShadow = '0 0 0 3px var(--primary)';
        card.style.transform = 'scale(1.04)';
      } else {
        selectedConcerns = selectedConcerns.filter(c => c !== concern);
        card.style.boxShadow = '';
        card.style.transform = '';
      }

      // Update button state
      const btn = document.getElementById('get-remedies-btn');
      if (btn) {
        btn.disabled = selectedConcerns.length === 0;
      }
    });
  });
}

// ── Get Remedies Button ───────────────────────────────────────────────────
function initGetRemediesBtn() {
  const btn = document.getElementById('get-remedies-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (selectedConcerns.length === 0) {
      App.showToast('Select a concern', 'Please select at least one skin concern', 'warning');
      return;
    }

    btn.classList.add('btn-loading');
    btn.disabled = true;

    showLoadingState();

    try {
      const result = await ToneWearAPI.getRemedies(selectedConcerns);
      remediesResult = result;
      hideLoadingState();
      showRemedies(result);
      App.showToast('Remedies ready!', 'Your personalized skin remedies are below 🌿', 'success');
    } catch (err) {
      hideLoadingState();
      // Demo fallback
      const mock = getMockRemedies();
      remediesResult = mock;
      showRemedies(mock);
      App.showToast('Demo mode', 'Showing example remedies — connect backend for AI results', 'info');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  });
}

// ── Loading State ─────────────────────────────────────────────────────────
function showLoadingState() {
  const el = document.getElementById('remedies-loading');
  if (el) el.classList.remove('hidden');
}

function hideLoadingState() {
  const el = document.getElementById('remedies-loading');
  if (el) el.classList.add('hidden');
}

// ── Show Remedies ─────────────────────────────────────────────────────────
function showRemedies(data) {
  const section = document.getElementById('remedies-results-section');
  if (!section) return;

  section.classList.remove('hidden');

  const container = document.getElementById('remedies-cards-container');
  if (!container) return;

  container.innerHTML = '';

  // Render per-concern sections
  selectedConcerns.forEach(concern => {
    const concernData = data[concern] || data.generic || {};
    const remedies    = concernData.remedies || [];
    const clothing    = concernData.clothing_advice || '';

    const section = document.createElement('div');
    section.className = 'concern-section mb-12 fade-up';
    section.innerHTML = `
      <h3 class="text-2xl font-bold mb-6 flex items-center gap-3">
        <span>${getConcernIcon(concern)}</span>
        <span>${concern}</span>
      </h3>

      <div class="grid grid-auto gap-6 mb-8" data-stagger-group>
        ${remedies.map((remedy, i) => renderRemedyCard(remedy, concern, i)).join('')}
      </div>

      ${clothing ? `
      <div class="glass-card mb-6" style="border-left:3px solid var(--primary);">
        <h4 class="font-semibold mb-3 flex items-center gap-2">
          <span>👔</span> Dressing Advice for ${concern}
        </h4>
        <p class="text-sm text-secondary">${clothing}</p>
      </div>` : ''}
    `;

    container.appendChild(section);
  });

  // Scroll to results
  setTimeout(() => {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    App.initScrollReveal();
  }, 200);
}

function renderRemedyCard(remedy, concern, index) {
  const remedyId = `${concern}_${index}`.replace(/\s+/g, '_');

  return `
    <div class="glass-card remedy-card card-enter" id="remedy-${remedyId}">
      <div class="flex items-start justify-between mb-4">
        <h4 class="font-semibold text-lg">${remedy.name}</h4>
        <button class="bookmark-btn" onclick="toggleBookmark('${remedyId}', this)"
                title="Save remedy"
                style="width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;
                       background:var(--bg-overlay, rgba(26,86,219,0.05));
                       display:flex;align-items:center;justify-content:center;
                       transition:all 0.2s;font-size:18px;">
          🔖
        </button>
      </div>

      <div class="remedy-ingredients mb-5">
        <h5 class="text-sm font-semibold text-muted uppercase mb-3" style="letter-spacing:0.06em">
          Ingredients
        </h5>
        <div class="flex flex-col gap-2">
          ${(remedy.ingredients || []).map(ing => `
            <div class="flex items-center gap-3 text-sm">
              <span style="width:28px;text-align:center">${ing.icon || '🌿'}</span>
              <span class="font-medium">${ing.name}</span>
              <span class="text-muted ml-auto">${ing.amount || ''}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="remedy-steps mb-5">
        <h5 class="text-sm font-semibold text-muted uppercase mb-3" style="letter-spacing:0.06em">
          Instructions
        </h5>
        <ol style="list-style:none;display:flex;flex-direction:column;gap:10px;">
          ${(remedy.steps || []).map((step, i) => `
            <li class="flex gap-3 text-sm">
              <span style="width:24px;height:24px;border-radius:50%;background:var(--gradient);
                           color:#fff;display:flex;align-items:center;justify-content:center;
                           font-size:11px;font-weight:700;flex-shrink:0;">${i + 1}</span>
              <span>${step}</span>
            </li>
          `).join('')}
        </ol>
      </div>

      <div class="flex gap-3 flex-wrap pt-4" style="border-top:1px solid var(--border-subtle)">
        <div class="text-xs text-muted flex items-center gap-1">
          🕐 <strong>${remedy.time || '15 mins'}</strong>
        </div>
        <div class="text-xs text-muted flex items-center gap-1">
          📅 <strong>${remedy.frequency || '2x per week'}</strong>
        </div>
        <div class="text-xs text-success flex items-center gap-1 ml-auto">
          ✅ Results in <strong>${remedy.results || '2-3 weeks'}</strong>
        </div>
      </div>
    </div>
  `;
}

// ── Bookmark / Save ───────────────────────────────────────────────────────
function toggleBookmark(remedyId, btn) {
  const isSaved = savedRemedies.includes(remedyId);

  if (isSaved) {
    savedRemedies = savedRemedies.filter(id => id !== remedyId);
    btn.style.background = '';
    btn.textContent = '🔖';
    App.showToast('Removed', 'Remedy removed from saved list', 'info');
  } else {
    savedRemedies.push(remedyId);
    btn.style.background = 'var(--primary-light)';
    btn.textContent = '✅';
    App.showToast('Saved!', 'Remedy added to your saved list 📌', 'success');
  }

  App.saveToStorage('saved_remedies', savedRemedies);
  updateSavedSection();
}

function loadSavedRemedies() {
  const saved = App.loadFromStorage?.('saved_remedies');
  if (saved) savedRemedies = saved;
  updateSavedSection();
}

function updateSavedSection() {
  const section = document.getElementById('saved-remedies-section');
  const count   = document.getElementById('saved-remedies-count');
  const clearBtn = document.getElementById('clear-saved-btn');

  if (!section) return;

  if (savedRemedies.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  if (count) count.textContent = savedRemedies.length;

  if (clearBtn) {
    clearBtn.onclick = () => {
      savedRemedies = [];
      App.saveToStorage('saved_remedies', []);
      updateSavedSection();
      App.showToast('Cleared', 'All saved remedies removed', 'info');
    };
  }
}

// ── Context From Analyzer ─────────────────────────────────────────────────
function checkPreviousAnalysis() {
  const last = App.loadFromStorage?.('last_analysis');
  if (!last?.result?.concerns) return;

  const concerns = last.result.concerns.map(c => c.name);
  if (!concerns.length) return;

  // Pre-select concern cards if they match
  document.querySelectorAll('.concern-card').forEach(card => {
    if (concerns.includes(card.dataset.concern)) {
      card.click(); // Simulate click to select
    }
  });

  const banner = document.getElementById('from-analysis-banner');
  if (banner) {
    banner.classList.remove('hidden');
    const listEl = banner.querySelector('.detected-concerns-list');
    if (listEl) listEl.textContent = concerns.join(', ');
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────
function getConcernIcon(concern) {
  const icons = {
    'Acne':               '🔴',
    'Dark Spots':         '🟤',
    'Oily Skin':          '💧',
    'Dry Skin':           '🏜️',
    'Uneven Skin Tone':   '😶',
    'Dark Circles':       '🌙'
  };
  return icons[concern] || '✨';
}

// ── Mock Data ─────────────────────────────────────────────────────────────
function getMockRemedies() {
  return {
    'Acne': {
      remedies: [
        {
          name: 'Honey & Cinnamon Mask',
          ingredients: [
            { icon: '🍯', name: 'Raw Honey',       amount: '1 tablespoon' },
            { icon: '🌿', name: 'Cinnamon Powder', amount: '½ teaspoon' }
          ],
          steps: [
            'Mix raw honey with cinnamon powder until it forms a paste',
            'Apply gently to acne-affected areas',
            'Leave for 15–20 minutes',
            'Rinse with lukewarm water and pat dry'
          ],
          time: '20 mins', frequency: '2x per week', results: '2–3 weeks'
        },
        {
          name: 'Neem & Turmeric Pack',
          ingredients: [
            { icon: '🍃', name: 'Neem Powder',    amount: '1 teaspoon' },
            { icon: '🟡', name: 'Turmeric',       amount: '¼ teaspoon' },
            { icon: '💧', name: 'Rose Water',     amount: '2 tablespoons' }
          ],
          steps: [
            'Combine neem powder, turmeric and rose water',
            'Mix into smooth paste',
            'Apply on face avoiding eyes',
            'Leave 15 minutes then rinse'
          ],
          time: '15 mins', frequency: '3x per week', results: '3–4 weeks'
        },
        {
          name: 'Green Tea Toner',
          ingredients: [
            { icon: '🍵', name: 'Green Tea Bags', amount: '2 bags' },
            { icon: '💧', name: 'Distilled Water', amount: '1 cup' }
          ],
          steps: [
            'Brew green tea bags in hot water for 5 minutes',
            'Allow to cool completely',
            'Apply with cotton pad after cleansing',
            'Do not rinse — leave as toner'
          ],
          time: '5 mins', frequency: 'Daily', results: '1–2 weeks'
        }
      ],
      clothing_advice: 'Avoid bright neon colors which draw attention to skin redness. Earth tones like deep olive, burgundy, and navy create visual harmony. Avoid high-neck styles that might cause fabric friction on active breakouts.'
    },
    'Dark Spots': {
      remedies: [
        {
          name: 'Vitamin C Lemon Mask',
          ingredients: [
            { icon: '🍋', name: 'Fresh Lemon Juice', amount: '1 teaspoon' },
            { icon: '🍯', name: 'Honey',             amount: '1 tablespoon' },
            { icon: '🌿', name: 'Aloe Vera Gel',     amount: '1 tablespoon' }
          ],
          steps: [
            'Mix lemon juice, honey and aloe vera gel',
            'Apply to dark spots with a cotton swab',
            'Leave for 10 minutes (no more due to lemon acidity)',
            'Rinse thoroughly and apply SPF moisturizer'
          ],
          time: '10 mins', frequency: '2x per week', results: '4–6 weeks'
        }
      ],
      clothing_advice: 'Deep jewel tones (sapphire blue, emerald green, ruby red) create visual balance against skin with uneven pigmentation. Avoid pale pastels near the face which can emphasize contrast. Structured necklines frame the face beautifully.'
    }
  };
}

// Expose
window.toggleBookmark = toggleBookmark;
