/**
 * ToneWear AI — Shop JS
 * Main shopping flow: selfie → profile → RAG search → results → try-on
 */

const Shop = (() => {
  // ── State ──────────────────────────────────────────────────────────────────
  let selfieFile     = null;
  let selfieDataURL  = null;
  let currentProfile = null;
  let currentProducts = [];
  let selectedOccasion = '';
  let budget           = 10000;
  let currentTryOnProduct = null;
  let compareList      = [];     // up to 2 products

  const BACKEND_URL = window.BACKEND_URL || 'http://localhost:8000';

  // Colour map for common color names → hex
  const COLOR_HEX_MAP = {
    'Navy Blue':     '#1a3a5c',
    'Olive Green':   '#6b7c45',
    'Cream':         '#fffdd0',
    'Maroon':        '#800020',
    'Burgundy':      '#722f37',
    'Deep Green':    '#1b4332',
    'Black':         '#1a1a1a',
    'White':         '#f8f8f8',
    'Charcoal Grey': '#36454f',
    'Mustard Yellow':'#e1b041',
    'Sky Blue':      '#87ceeb',
    'Dark Teal':     '#1a5276',
    'Royal Blue':    '#4169e1',
    'Beige':         '#f5f0e8',
    'Dusty Rose':    '#c7a0a0',
    'Khaki':         '#c8ad7f',
    'Steel Grey':    '#71797e',
    'Peach':         '#ffcba4',
    'Indigo Blue':   '#3d5a80',
    'Saffron Orange':'#ff9933',
    'Midnight Blue': '#191970',
    'Off White':     '#f5f0e8',
    'Light Grey':    '#d3d3d3',
    'Camel Brown':   '#c19a6b',
    'Emerald Green': '#2e8b57',
    'Chocolate Brown':'#7b4f2e',
    'Deep Maroon':   '#6b2737',
    'Mid Grey':      '#808080',
  };

  // ── Scan messages ──────────────────────────────────────────────────────────
  const SCAN_MESSAGES = [
    'Detecting skin tone...',
    'Analyzing undertone...',
    'Mapping color palette...',
    'Building your style profile...',
    'Almost done...'
  ];

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    console.log('🛍️ Shop initialized');
    updateBudget(10000);

    // Check if coming back from analyzer with profile stored
    const savedProfile = sessionStorage.getItem('tw_profile');
    if (savedProfile) {
      try {
        const p = JSON.parse(savedProfile);
        currentProfile = p;
        // Also restore selfie if stored
        const savedSelfie = sessionStorage.getItem('tw_selfie_url');
        if (savedSelfie) {
          selfieDataURL = savedSelfie;
          showSelfiePreview(savedSelfie, 'Profile restored from analyzer');
        }
        showProfileCard(p);
        showSearchSection();
      } catch (e) {}
    }
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('upload-area').classList.add('dragging');
  }

  function handleDrop(e) {
    e.preventDefault();
    document.getElementById('upload-area').classList.remove('dragging');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleSelfieUpload(file);
    }
  }

  // ── Camera ─────────────────────────────────────────────────────────────────
  function openCamera() {
    if (typeof App !== 'undefined' && App.openCamera) {
      App.openCamera((dataURL) => {
        // Convert dataURL to File
        fetch(dataURL)
          .then(r => r.blob())
          .then(blob => {
            const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
            handleSelfieUpload(file);
          });
      });
    }
  }

  // ── Selfie Upload ──────────────────────────────────────────────────────────
  async function handleSelfieUpload(file) {
    if (!file) return;
    selfieFile = file;

    // Show preview + start scan animation
    const reader = new FileReader();
    reader.onload = async (e) => {
      selfieDataURL = e.target.result;
      selfieFile    = file;

      showSelfiePreview(selfieDataURL, 'Analyzing skin tone...');
      startScanAnimation();
      setStepActive(1);

      // Analyze
      try {
        const profile = await analyzeSkin(file);
        currentProfile = profile;

        // Store in session
        sessionStorage.setItem('tw_profile', JSON.stringify(profile));
        sessionStorage.setItem('tw_selfie_url', selfieDataURL);

        stopScanAnimation();
        document.getElementById('selfie-preview-status').textContent = '✅ Skin analysis complete';
        showProfileCard(profile);
        showSearchSection();
        setStepDone(1);
        setStepDone(2);

      } catch (err) {
        console.error('Skin analysis error:', err);
        stopScanAnimation();
        // Use a mock profile in demo mode
        const mockProfile = getMockProfile();
        currentProfile = mockProfile;
        document.getElementById('selfie-preview-status').textContent = '✅ Demo profile loaded (no API key)';
        showProfileCard(mockProfile);
        showSearchSection();
        setStepDone(1);
        setStepDone(2);
      }
    };
    reader.readAsDataURL(file);
  }

  // ── Analyze Skin API ───────────────────────────────────────────────────────
  async function analyzeSkin(file) {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${BACKEND_URL}/api/skin/analyze`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error('Skin API error: ' + res.status);
    return res.json();
  }

  // ── Mock Profile (demo mode) ───────────────────────────────────────────────
  function getMockProfile() {
    return {
      skin_tone: 'Medium',
      undertone: 'warm',
      fitzpatrick: 'IV',
      skin_tone_hex: '#C8956C',
      concerns: ['Slight oiliness'],
      recommended_colors: ['Navy Blue', 'Olive Green', 'Cream', 'Deep Green', 'Burgundy'],
      color_families: ['Blues', 'Greens', 'Earthy'],
      style_directions: ['Modern', 'Elegant', 'Traditional'],
      avoid_colors: ['Neon Yellow', 'Pale Pink'],
      confidence: 92
    };
  }

  // ── Show Selfie Preview ────────────────────────────────────────────────────
  function showSelfiePreview(src, statusText) {
    document.getElementById('upload-area').style.display = 'none';
    const preview = document.getElementById('selfie-preview');
    preview.classList.add('show');
    document.getElementById('selfie-thumb').src    = src;
    document.getElementById('tryon-selfie-img').src = src;
    document.getElementById('selfie-preview-status').textContent = statusText;
  }

  // ── Reset Selfie ───────────────────────────────────────────────────────────
  function resetSelfie() {
    selfieFile    = null;
    selfieDataURL = null;
    currentProfile = null;
    sessionStorage.removeItem('tw_profile');
    sessionStorage.removeItem('tw_selfie_url');

    document.getElementById('upload-area').style.display = '';
    document.getElementById('selfie-preview').classList.remove('show');
    document.getElementById('step-profile').classList.remove('show');
    document.getElementById('step-search').classList.remove('show');
    document.getElementById('step-results').classList.remove('show');
    document.getElementById('selfie-input').value = '';

    setStepActive(1);
    [2,3,4,5].forEach(n => {
      const el = document.getElementById(`step-ind-${n}`);
      if (el) { el.classList.remove('active','done'); }
    });
  }

  // ── Profile Card ───────────────────────────────────────────────────────────
  function showProfileCard(profile) {
    const section = document.getElementById('step-profile');
    section.classList.add('show');

    // Skin circle
    const hex = profile.skin_tone_hex || getSkinHex(profile.skin_tone, profile.undertone);
    document.getElementById('profile-skin-circle').style.background = hex;

    // Name + undertone
    document.getElementById('profile-tone-name').textContent = `${profile.skin_tone} (${profile.fitzpatrick || ''})`;
    document.getElementById('profile-undertone').textContent = `Undertone: ${capitalize(profile.undertone)} · ${profile.confidence ? profile.confidence + '% confidence' : ''}`;

    // Style tags
    const tagsEl = document.getElementById('profile-style-tags');
    tagsEl.innerHTML = '';
    (profile.style_directions || []).forEach(tag => {
      const span = document.createElement('span');
      span.className = 'profile-tag';
      span.textContent = tag;
      tagsEl.appendChild(span);
    });

    // Colors
    const colorsEl = document.getElementById('profile-colors');
    colorsEl.innerHTML = '';
    (profile.recommended_colors || []).slice(0, 6).forEach(color => {
      const hex = COLOR_HEX_MAP[color] || '#888';
      const div = document.createElement('div');
      div.className = 'color-swatch';
      div.innerHTML = `<span class="swatch-dot" style="background:${hex}"></span>${color}`;
      colorsEl.appendChild(div);
    });

    // Scroll into view smoothly
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }

  // ── Show Search ────────────────────────────────────────────────────────────
  function showSearchSection() {
    const section = document.getElementById('step-search');
    section.classList.add('show');
    setStepActive(3);
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 200);
  }

  // ── Occasion Chips ─────────────────────────────────────────────────────────
  function selectOccasion(el, occasion) {
    document.querySelectorAll('#occasion-chips .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.toggle('active');
    selectedOccasion = el.classList.contains('active') ? occasion : '';
  }

  // ── Budget ─────────────────────────────────────────────────────────────────
  function updateBudget(val) {
    budget = parseInt(val);
    document.getElementById('budget-display').textContent = `PKR ${budget.toLocaleString()}`;
  }

  // ── Search Outfits ─────────────────────────────────────────────────────────
  async function searchOutfits(overrideQuery) {
    if (!currentProfile) {
      alert('Please upload your selfie first!');
      return;
    }

    const query    = overrideQuery || document.getElementById('outfit-query').value.trim();
    const gender   = document.getElementById('gender-filter').value;
    const culture  = document.getElementById('culture-filter').value;

    // Show loading state
    setSearchLoading(true);
    setStepActive(4);

    // Show results section
    const resultsSection = document.getElementById('step-results');
    resultsSection.classList.add('show');
    resultsSection.scrollIntoView({ behavior: 'smooth' });

    renderSkeletons(6);

    try {
      const payload = {
        profile: currentProfile,
        occasion: selectedOccasion,
        budget: budget,
        gender: gender,
        query: query || `${selectedOccasion || 'casual'} outfit`,
        top_n: 6
      };

      const res = await fetch(`${BACKEND_URL}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('API error ' + res.status);

      const data = await res.json();
      currentProducts = data.products || [];

      renderProducts(currentProducts, data.color_insight, data.style_tips);
      setStepDone(4);

    } catch (err) {
      console.error('Search error:', err);
      // Use mock products in demo mode
      const mocks = getMockProducts(gender, culture, selectedOccasion, budget);
      currentProducts = mocks;
      renderProducts(mocks, '', getMockTips());
      setStepDone(4);
    } finally {
      setSearchLoading(false);
    }
  }

  // ── Render Skeletons ───────────────────────────────────────────────────────
  function renderSkeletons(n) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    for (let i = 0; i < n; i++) {
      grid.innerHTML += `
        <div class="product-skeleton">
          <div class="skeleton-img"></div>
          <div class="skeleton-body">
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
        </div>`;
    }
    document.getElementById('empty-state').classList.remove('show');
    document.getElementById('style-tips-card').style.display = 'none';
    document.getElementById('color-insight-banner').style.display = 'none';
    document.getElementById('compare-btn').style.display = 'none';
  }

  // ── Render Products ────────────────────────────────────────────────────────
  function renderProducts(products, colorInsight, styleTips) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    if (!products || products.length === 0) {
      document.getElementById('empty-state').classList.add('show');
      document.getElementById('results-title').textContent = 'No Results';
      document.getElementById('results-meta').textContent = '';
      return;
    }

    // Results header
    document.getElementById('results-title').textContent = 'Personalized Picks';
    document.getElementById('results-meta').innerHTML = `
      <span>✨ ${products.length} outfits found</span>
      ${selectedOccasion ? `<span>· ${selectedOccasion}</span>` : ''}
      <span>· Budget PKR ${budget.toLocaleString()}</span>
    `;

    // Color insight
    if (colorInsight) {
      document.getElementById('color-insight-text').textContent = colorInsight;
      document.getElementById('color-insight-banner').style.display = 'flex';
    }

    // Product cards
    products.forEach((product, idx) => {
      const delay   = idx * 80;
      const isTop   = idx === 0;
      const score   = product.match_score || 75;
      const hex     = product.color_hex || COLOR_HEX_MAP[product.color] || '#888';

      const card = document.createElement('div');
      card.className = `product-card${isTop ? ' rank-1' : ''}`;
      card.style.animationDelay = `${delay}ms`;
      card.dataset.productId = product.id;

      card.innerHTML = `
        <div class="product-img-wrap">
          <img
            class="product-img"
            src="${product.image_url || 'https://images.unsplash.com/photo-1594938298603-c8148c4b4a0e?w=400'}"
            alt="${product.name}"
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1594938298603-c8148c4b4a0e?w=400'"
          >
          <div class="match-badge ${isTop ? 'gold' : ''}">
            ${isTop ? '🥇' : '✦'} ${score}% Match
          </div>
          ${isTop ? '<div class="rank-crown">👑</div>' : ''}
          <div class="color-dot-strip">
            <span style="background:${hex}"></span>
          </div>
        </div>
        <div class="product-body">
          <div class="product-name">${product.name}</div>
          <div class="product-meta-row">
            <div class="product-price">PKR ${product.price?.toLocaleString() || '–'}</div>
            <div class="product-culture-badge">${product.culture || ''}</div>
          </div>
          ${product.match_reason ? `
            <div class="product-reason">${product.match_reason}</div>
          ` : ''}
          <div class="product-actions">
            <button class="btn-tryon" onclick="Shop.openTryOn('${product.id}')">
              🪞 Try On
            </button>
            <button class="btn-save" id="save-btn-${product.id}" onclick="Shop.toggleSave('${product.id}', this)" title="Save">
              🤍
            </button>
            <a class="btn-view" href="${product.product_url || '#'}" target="_blank" title="View product">
              🔗
            </a>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    // Show compare button
    document.getElementById('compare-btn').style.display = '';

    // Style tips
    if (styleTips && styleTips.length) {
      const tipsCard = document.getElementById('style-tips-card');
      const tipsList = document.getElementById('style-tips-list');
      tipsList.innerHTML = styleTips.map(t => `<div class="style-tip">${t}</div>`).join('');
      tipsCard.style.display = 'block';
    }
  }

  // ── Open Try-On Modal ──────────────────────────────────────────────────────
  async function openTryOn(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;

    currentTryOnProduct = product;

    // Open modal
    document.getElementById('tryon-modal-backdrop').classList.add('open');
    document.body.style.overflow = 'hidden';

    // Fill product info
    document.getElementById('modal-product-name').textContent  = product.name;
    document.getElementById('modal-product-price').textContent = `PKR ${product.price?.toLocaleString()} · ${product.culture}`;
    document.getElementById('modal-product-reason').textContent = product.match_reason || product.description || '';
    document.getElementById('modal-subtitle').textContent = `${product.name} · ${product.match_score || ''}% Match`;

    // Set view product link
    document.getElementById('view-product-btn').href = product.product_url || '#';

    // Reset result
    document.getElementById('tryon-result-img').style.display   = 'none';
    document.getElementById('tryon-result-label').style.display = 'none';
    document.getElementById('tryon-loading').style.display      = 'flex';
    document.getElementById('download-tryon-btn').style.display = 'none';
    document.getElementById('add-to-compare-btn').style.display = 'none';

    setStepActive(5);

    // Call VTO API
    if (!selfieFile) {
      showMockTryOn(product);
      return;
    }

    try {
      document.getElementById('tryon-loading-text').textContent = 'Generating try-on...';
      const formData = new FormData();
      formData.append('person_image', selfieFile);
      formData.append('product_id', productId);

      const res = await fetch(`${BACKEND_URL}/api/tryon/generate`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('VTO API error');
      const data = await res.json();

      showTryOnResult(data.result_url || data.result_image_url || '');

    } catch (err) {
      console.error('Try-on error:', err);
      showMockTryOn(product);
    }
  }

  function showMockTryOn(product) {
    // Demo mode: show product image as "result"
    const img = document.getElementById('tryon-result-img');
    img.src = product.image_url || '';
    img.style.display = 'block';
    document.getElementById('tryon-loading').style.display      = 'none';
    document.getElementById('tryon-result-label').style.display = '';
    document.getElementById('download-tryon-btn').style.display = '';
    document.getElementById('add-to-compare-btn').style.display = '';
    setStepDone(5);
  }

  function showTryOnResult(url) {
    const img = document.getElementById('tryon-result-img');
    img.onload = () => {
      document.getElementById('tryon-loading').style.display      = 'none';
      img.style.display = 'block';
      document.getElementById('tryon-result-label').style.display = '';
      document.getElementById('download-tryon-btn').style.display = '';
      document.getElementById('add-to-compare-btn').style.display = '';
      setStepDone(5);
    };
    img.onerror = () => {
      if (currentTryOnProduct) showMockTryOn(currentTryOnProduct);
    };
    img.src = url;
  }

  // ── Close Try-On Modal ─────────────────────────────────────────────────────
  function closeTryOnModal() {
    document.getElementById('tryon-modal-backdrop').classList.remove('open');
    document.body.style.overflow = '';
  }

  function closeTryOn(e) {
    if (e.target === document.getElementById('tryon-modal-backdrop')) {
      closeTryOnModal();
    }
  }

  // ── Save / Toggle ──────────────────────────────────────────────────────────
  function toggleSave(productId, btn) {
    const isSaved = btn.classList.toggle('saved');
    btn.textContent = isSaved ? '❤️' : '🤍';

    if (isSaved) {
      const product = currentProducts.find(p => p.id === productId);
      if (product) saveToHistory(product);
    }
  }

  function saveFromModal() {
    if (!currentTryOnProduct) return;
    saveToHistory(currentTryOnProduct);
    const btn = document.getElementById('save-modal-btn');
    btn.textContent = '✅ Saved!';
    setTimeout(() => { btn.textContent = '💾 Save'; }, 2000);
  }

  async function saveToHistory(product) {
    try {
      const payload = {
        user_id:  'demo_user',
        type:     'saved_product',
        product:  product,
        profile:  currentProfile,
        timestamp: new Date().toISOString()
      };

      await fetch(`${BACKEND_URL}/api/history/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.log('History save skipped (demo mode)');
    }
  }

  // ── Download Try-On ────────────────────────────────────────────────────────
  function downloadTryOn() {
    const img = document.getElementById('tryon-result-img');
    if (!img.src) return;

    const a = document.createElement('a');
    a.href = img.src;
    a.download = `tonewear-tryon-${currentTryOnProduct?.id || 'result'}.jpg`;
    a.click();
  }

  // ── Compare Mode ───────────────────────────────────────────────────────────
  function addToCompare() {
    if (!currentTryOnProduct) return;
    if (compareList.length >= 2) compareList = [];

    const exists = compareList.find(p => p.id === currentTryOnProduct.id);
    if (!exists) {
      const resultSrc = document.getElementById('tryon-result-img').src;
      compareList.push({ ...currentTryOnProduct, resultSrc });
    }

    const btn = document.getElementById('add-to-compare-btn');
    btn.textContent = `✅ Added (${compareList.length}/2)`;
    setTimeout(() => { btn.textContent = '⚖️ Add to Compare'; }, 2000);

    if (compareList.length === 2) {
      closeTryOnModal();
      showCompare();
    }
  }

  function toggleCompare() {
    const section = document.getElementById('compare-section');
    const showing = section.classList.toggle('show');
    document.getElementById('compare-btn').textContent = showing ? '✖ Close Compare' : '⚖️ Compare Mode';
    if (showing && compareList.length === 0) {
      section.innerHTML += `<p style="color:var(--text-muted);font-size:14px;">Try on two outfits and click "Add to Compare" to compare them here.</p>`;
    }
  }

  function showCompare() {
    const section = document.getElementById('compare-section');
    section.classList.add('show');

    const grid = document.getElementById('compare-grid');
    grid.innerHTML = compareList.map((p, i) => `
      <div class="compare-col">
        <img src="${p.resultSrc || p.image_url}" alt="${p.name}">
        <div class="compare-col-body">
          <div class="compare-col-name">${p.name}</div>
          <div style="font-size:13px;color:var(--text-muted);">PKR ${p.price?.toLocaleString()}</div>
          <div style="font-size:13px;font-weight:700;color:var(--primary);margin-top:6px;">${p.match_score}% Match</div>
          <button class="btn btn-outline btn-sm" style="margin-top:12px;width:100%;" onclick="Shop.openTryOn('${p.id}')">
            🪞 Try Again
          </button>
        </div>
      </div>
    `).join('');

    section.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Mock Products (demo mode) ──────────────────────────────────────────────
  function getMockProducts(gender = 'Male', culture = '', occasion = '', maxPrice = 10000) {
    const mocks = [
      {
        id: 'mock-001', name: 'Classic Navy Blue Kurta',
        category: 'Kurta', culture: 'Pakistani', gender: 'Male',
        color: 'Navy Blue', color_hex: '#1a3a5c', price: 3500,
        match_score: 94, match_reason: 'Navy blue creates an elegant contrast with your warm undertone, adding depth and sophistication.',
        image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4a0e?w=400',
        product_url: 'https://www.khaadi.com'
      },
      {
        id: 'mock-002', name: 'Olive Green Straight Kurta',
        category: 'Kurta', culture: 'Pakistani', gender: 'Male',
        color: 'Olive Green', color_hex: '#6b7c45', price: 2800,
        match_score: 87, match_reason: 'Olive green harmonizes beautifully with your warm undertone, giving a natural, grounded look.',
        image_url: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400',
        product_url: 'https://www.junaidjamshed.com'
      },
      {
        id: 'mock-003', name: 'Cream Embroidered Kurta',
        category: 'Kurta', culture: 'Pakistani', gender: 'Male',
        color: 'Cream', color_hex: '#fffdd0', price: 3200,
        match_score: 82, match_reason: 'Cream provides a soft, warm complement to your medium skin tone — refined and elegant.',
        image_url: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400',
        product_url: 'https://www.sapphire.pk'
      },
      {
        id: 'mock-004', name: 'Deep Forest Green Shalwar Kameez',
        category: 'Shalwar Kameez', culture: 'Pakistani', gender: 'Male',
        color: 'Deep Green', color_hex: '#1b4332', price: 3800,
        match_score: 79, match_reason: 'Deep green creates a luxurious contrast that enhances your medium complexion beautifully.',
        image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
        product_url: 'https://www.khaadi.com'
      },
      {
        id: 'mock-005', name: 'Burgundy Cotton Kurta',
        category: 'Kurta', culture: 'Pakistani', gender: 'Male',
        color: 'Burgundy', color_hex: '#722f37', price: 2500,
        match_score: 76, match_reason: "Burgundy's warm depth adds a confident glow that works beautifully with warm undertones.",
        image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400',
        product_url: 'https://www.sapphire.pk'
      },
      {
        id: 'mock-006', name: 'Navy Jacquard Waistcoat Set',
        category: 'Waistcoat Set', culture: 'Pakistani', gender: 'Male',
        color: 'Navy Blue', color_hex: '#001f5b', price: 5500,
        match_score: 73, match_reason: 'Navy waistcoat adds structure and elegance that complements your warm medium complexion.',
        image_url: 'https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?w=400',
        product_url: 'https://www.junaidjamshed.com'
      }
    ].filter(p => p.price <= maxPrice);

    return mocks;
  }

  function getMockTips() {
    return [
      'Your warm undertone shines in navy, olive, cream, and burgundy.',
      'Jewel tones and rich earthy shades are your strongest palette.',
      'When in doubt, navy is always the safe, stylish choice for any occasion.'
    ];
  }

  // ── Scan Animation ─────────────────────────────────────────────────────────
  let scanInterval = null;
  let scanMsgIdx   = 0;

  function startScanAnimation() {
    const overlay = document.getElementById('scan-overlay');
    overlay.classList.add('show');
    scanMsgIdx = 0;

    scanInterval = setInterval(() => {
      scanMsgIdx = (scanMsgIdx + 1) % SCAN_MESSAGES.length;
      const textEl = document.getElementById('scan-text');
      if (textEl) textEl.textContent = SCAN_MESSAGES[scanMsgIdx];
    }, 1000);
  }

  function stopScanAnimation() {
    clearInterval(scanInterval);
    document.getElementById('scan-overlay').classList.remove('show');
  }

  // ── Search Loading ─────────────────────────────────────────────────────────
  function setSearchLoading(loading) {
    const btn  = document.getElementById('search-btn');
    const icon = document.getElementById('search-btn-icon');
    const text = document.getElementById('search-btn-text');

    btn.disabled = loading;
    icon.textContent = loading ? '⏳' : '✨';
    text.textContent = loading ? 'Finding...' : 'Find Outfits';
  }

  // ── Step Indicator Helpers ─────────────────────────────────────────────────
  function setStepActive(n) {
    const el = document.getElementById(`step-ind-${n}`);
    if (el) {
      el.classList.add('active');
      el.classList.remove('done');
    }
  }

  function setStepDone(n) {
    const el = document.getElementById(`step-ind-${n}`);
    if (el) {
      el.classList.remove('active');
      el.classList.add('done');
      el.querySelector('.step-dot-circle').textContent = '✓';
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function getSkinHex(tone, undertone) {
    const toneMap = {
      'Fair':     '#f8d5b7',
      'Light':    '#f3c090',
      'Medium':   '#c8956c',
      'Wheatish': '#c8875a',
      'Tan':      '#b5703b',
      'Dark':     '#7d4e2c',
      'Deep':     '#4e2912',
    };
    return toneMap[tone] || '#c8956c';
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    init,
    handleDragOver,
    handleDrop,
    openCamera,
    handleSelfieUpload,
    resetSelfie,
    selectOccasion,
    updateBudget,
    searchOutfits,
    openTryOn,
    closeTryOnModal,
    closeTryOn,
    toggleSave,
    saveFromModal,
    downloadTryOn,
    addToCompare,
    toggleCompare,
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', Shop.init);
