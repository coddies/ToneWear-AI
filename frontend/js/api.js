/* =============================================================================
   TONEWEAR AI — API.JS
   All fetch calls to backend. Frontend NEVER calls YouCam or Claude directly.
   ============================================================================= */

// Backend URL — change this to your Railway/Render URL after deployment
const API_BASE = window.BACKEND_URL || 'http://localhost:8000';
window.BACKEND_URL = window.BACKEND_URL || API_BASE;

// ── Utility ────────────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  try {
    const token = await getClerkToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const response = await fetch(`${API_BASE}${url}`, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`API Error [${url}]:`, err.message);
    throw err;
  }
}

async function getClerkToken() {
  try {
    if (window.Clerk && window.Clerk.session) {
      return await window.Clerk.session.getToken();
    }
    return null;
  } catch { return null; }
}

// ── Skin Analysis ───────────────────────────────────────────────────────────
/**
 * Analyze skin from selfie image
 * @param {File} imageFile - The uploaded selfie file
 * @param {string} occasion - e.g. "Eid", "Wedding", "Casual"
 * @param {string[]} stylePreference - e.g. ["Pakistani/Indian", "Western"]
 * @returns {Promise<SkinAnalysisResponse>}
 */
async function analyzeSkin(imageFile, occasion, stylePreference) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('occasion', occasion);
  formData.append('style_preference', JSON.stringify(stylePreference));

  return apiFetch('/api/skin/analyze', {
    method: 'POST',
    body: formData
    // DO NOT set Content-Type — browser sets it with boundary automatically
  });
}

/**
 * Poll skin analysis task status
 * @param {string} taskId
 * @returns {Promise<{status: string, result?: object}>}
 */
async function getSkinStatus(taskId) {
  return apiFetch(`/api/skin/status/${taskId}`);
}

// ── Virtual Try-On ──────────────────────────────────────────────────────────
/**
 * Generate try-on with recommended outfit
 * @param {File} userImage
 * @param {string} outfitImageUrl - URL to outfit image
 * @returns {Promise<{result_url: string}>}
 */
async function generateTryOn(userImage, outfitImageUrl) {
  const formData = new FormData();
  formData.append('user_image', userImage);
  formData.append('outfit_image_url', outfitImageUrl);

  return apiFetch('/api/tryon/generate', {
    method: 'POST',
    body: formData
  });
}

/**
 * Generate try-on with user's own clothing
 * @param {File} userImage
 * @param {File} clothingImage
 * @returns {Promise<{result_url: string}>}
 */
async function customTryOn(userImage, clothingImage) {
  const formData = new FormData();
  formData.append('user_image', userImage);
  formData.append('clothing_image', clothingImage);

  return apiFetch('/api/tryon/custom', {
    method: 'POST',
    body: formData
  });
}

// ── Glasses ─────────────────────────────────────────────────────────────────
/**
 * Analyze face shape + skin tone for glasses recommendations
 * @param {File} faceImage
 * @returns {Promise<GlassesAnalysisResponse>}
 */
async function analyzeGlasses(faceImage) {
  const formData = new FormData();
  formData.append('face_image', faceImage);

  return apiFetch('/api/glasses/analyze', {
    method: 'POST',
    body: formData
  });
}

/**
 * Virtual try-on with glasses frame
 * @param {File} faceImage
 * @param {string} frameImageUrl
 * @returns {Promise<{result_url: string}>}
 */
async function tryOnGlasses(faceImage, frameImageUrl) {
  const formData = new FormData();
  formData.append('face_image', faceImage);
  formData.append('frame_image_url', frameImageUrl);

  return apiFetch('/api/glasses/tryon', {
    method: 'POST',
    body: formData
  });
}

// ── Remedies ────────────────────────────────────────────────────────────────
/**
 * Get skin remedies for selected concerns
 * @param {string[]} concerns - e.g. ["Acne", "Dark Spots"]
 * @returns {Promise<RemedyResponse>}
 */
async function getRemedies(concerns) {
  return apiFetch('/api/remedies/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concerns })
  });
}

// ── History ─────────────────────────────────────────────────────────────────
/**
 * Save an analysis session to history
 * @param {object} analysisData
 * @returns {Promise<{session_id: string}>}
 */
async function saveHistory(analysisData) {
  return apiFetch('/api/history/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysisData)
  });
}

/**
 * Get user's history
 * @param {string} userId
 * @returns {Promise<HistoryEntry[]>}
 */
async function getHistory(userId) {
  return apiFetch(`/api/history/${userId}`);
}

/**
 * Delete a history session
 * @param {string} userId
 * @param {string} sessionId
 * @returns {Promise<{success: boolean}>}
 */
async function deleteHistory(userId, sessionId) {
  return apiFetch(`/api/history/${userId}/${sessionId}`, {
    method: 'DELETE'
  });
}

// ── Recommendations (RAG) ───────────────────────────────────────────────────
/**
 * Get personalized outfit recommendations via RAG + Claude
 * @param {object} profile - Skin profile from analyzer
 * @param {string} occasion - e.g. "Eid", "Wedding"
 * @param {number} budget   - Max price in PKR
 * @param {string} gender   - "Male" | "Female"
 * @param {string} query    - Freeform text query
 * @returns {Promise<{products, style_tips, color_insight}>}
 */
async function getRecommendations(profile, occasion, budget, gender, query) {
  return apiFetch('/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, occasion, budget, gender, query, top_n: 6 })
  });
}

// ── Products Catalog ────────────────────────────────────────────────────────
/**
 * Get products from catalog with optional filters
 * @param {object} filters - { category, occasion, gender, max_price, culture }
 * @returns {Promise<{products: Product[]}>}
 */
async function getProducts(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
  return apiFetch(`/api/products?${params.toString()}`);
}

/**
 * Get a single product by ID
 * @param {string} productId
 * @returns {Promise<Product>}
 */
async function getProduct(productId) {
  return apiFetch(`/api/products/${productId}`);
}

// ── Health Check ────────────────────────────────────────────────────────────
async function checkHealth() {
  return apiFetch('/health');
}

// Export all API functions for use in other scripts
window.ToneWearAPI = {
  analyzeSkin,
  getSkinStatus,
  generateTryOn,
  customTryOn,
  analyzeGlasses,
  tryOnGlasses,
  getRemedies,
  saveHistory,
  getHistory,
  deleteHistory,
  getRecommendations,
  getProducts,
  getProduct,
  checkHealth
};
