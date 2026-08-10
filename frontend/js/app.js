/* =============================================================================
   TONEWEAR AI — APP.JS
   Main app logic: sidebar, scroll reveal, theme toggle, toast notifications
   ============================================================================= */

// ── DOM Ready ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initSidebar();
  initThemeToggle();
  initNavbarScroll();
  initToastContainer();
  setActiveNavItem();
  initMobileHamburger();
});

// ── Scroll Reveal (Intersection Observer) ─────────────────────────────────
function initScrollReveal() {
  const elements = document.querySelectorAll('.fade-up, .fade-in, .scale-in, .card-enter');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Stagger animation: 100ms per element
        const el = entry.target;
        const stagger = parseInt(el.dataset.stagger || 0);
        setTimeout(() => el.classList.add('visible'), stagger);
        observer.unobserve(el);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  // Add stagger delays to groups
  document.querySelectorAll('[data-stagger-group]').forEach(group => {
    const items = group.querySelectorAll('.fade-up, .card-enter, .fade-in');
    items.forEach((item, i) => {
      item.dataset.stagger = i * 100;
    });
  });

  elements.forEach(el => observer.observe(el));
}

// ── Sidebar (App Pages) ────────────────────────────────────────────────────
function initSidebar() {
  const sidebar      = document.getElementById('sidebar');
  const overlay      = document.getElementById('sidebar-overlay');
  const menuBtn      = document.getElementById('menu-btn');

  if (!sidebar) return;

  function openSidebar() {
    sidebar.classList.add('open');
    if (overlay) overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (menuBtn) menuBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  if (overlay) overlay.addEventListener('click', closeSidebar);

  // Close on nav item click (mobile)
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth < 1024) closeSidebar();
    });
  });

  // Keyboard: Escape closes sidebar
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
  });
}

// ── Set Active Nav Item ─────────────────────────────────────────────────────
function setActiveNavItem() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === currentPage) {
      item.classList.add('active');
    }
  });

  // Bottom nav
  document.querySelectorAll('.bottom-nav-item[data-page]').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === currentPage) {
      item.classList.add('active');
    }
  });
}

// ── Navbar Scroll (Landing Page) ──────────────────────────────────────────
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ── Mobile Hamburger (Landing Page) ────────────────────────────────────────
function initMobileHamburger() {
  const hamburger  = document.getElementById('hamburger');
  const mobileNav  = document.getElementById('mobile-nav');
  if (!hamburger || !mobileNav) return;

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close on link click
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ── Theme Toggle ────────────────────────────────────────────────────────────
function initThemeToggle() {
  const toggleBtn  = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('tonewear-theme') || 'light';

  // Apply saved theme
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next    = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('tonewear-theme', next);
      updateThemeIcon(next);
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── Toast Container ─────────────────────────────────────────────────────────
function initToastContainer() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

/**
 * Show a toast notification
 * @param {string} title
 * @param {string} [message]
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [duration=3000]
 */
function showToast(title, message = '', type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate-slide-right`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
    <button class="toast-close" onclick="dismissToast(this.parentElement)">✕</button>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  // Auto dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;
}

function dismissToast(toast) {
  if (!toast || toast._dismissed) return;
  toast._dismissed = true;
  clearTimeout(toast._timer);
  toast.classList.add('dismissing');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  setTimeout(() => toast.remove(), 400);
}

// ── Typewriter Animation ───────────────────────────────────────────────────
/**
 * @param {string} elementId
 * @param {string} text
 * @param {number} [speed=80] ms per character
 * @param {function} [onComplete]
 */
function typewriter(elementId, text, speed = 80, onComplete) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = '';
  el.classList.add('typewriter-cursor');

  let i = 0;
  const interval = setInterval(() => {
    if (i < text.length) {
      el.textContent += text[i++];
    } else {
      clearInterval(interval);
      el.classList.remove('typewriter-cursor');
      if (onComplete) onComplete();
    }
  }, speed);
}

// ── Image Preview ──────────────────────────────────────────────────────────
function setupImagePreview(inputId, previewId) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('File too large', 'Maximum file size is 10MB', 'error');
      input.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Invalid file', 'Please upload JPG, PNG or WEBP', 'error');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });
}

// ── Drag & Drop Upload ─────────────────────────────────────────────────────
function initDragDrop(zoneId, inputId, onFileSelected) {
  const zone  = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone) return;

  ['dragenter', 'dragover'].forEach(e => {
    zone.addEventListener(e, ev => {
      ev.preventDefault();
      zone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(e => {
    zone.addEventListener(e, () => zone.classList.remove('drag-over'));
  });

  zone.addEventListener('drop', ev => {
    ev.preventDefault();
    const file = ev.dataTransfer.files[0];
    if (file && input) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
    }
    if (onFileSelected && file) onFileSelected(file);
  });
}

// ── Progress Bar Helper ────────────────────────────────────────────────────
function animateProgress(barId, targetPercent, duration = 5000) {
  const bar = document.getElementById(barId);
  if (!bar) return;

  let current = 0;
  const step  = targetPercent / (duration / 50);

  const timer = setInterval(() => {
    current = Math.min(current + step, targetPercent);
    bar.style.width = `${current}%`;
    if (current >= targetPercent) clearInterval(timer);
  }, 50);

  return timer;
}

// ── Smooth Scroll to Section ───────────────────────────────────────────────
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Save to LocalStorage ────────────────────────────────────────────────────
function saveToStorage(key, data) {
  try {
    localStorage.setItem(`tonewear_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(`tonewear_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Before/After Slider ────────────────────────────────────────────────────
function initBeforeAfterSlider(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const before  = container.querySelector('.slider-before');
  const handle  = container.querySelector('.slider-handle');
  let isDragging = false;

  function setPosition(x) {
    const rect   = container.getBoundingClientRect();
    const pct    = Math.min(Math.max((x - rect.left) / rect.width, 0.05), 0.95);
    const pctPx  = `${pct * 100}%`;
    if (before)  before.style.clipPath = `inset(0 ${100 - pct * 100}% 0 0)`;
    if (handle)  handle.style.left = pctPx;
  }

  container.addEventListener('mousedown', e => { isDragging = true; setPosition(e.clientX); });
  document.addEventListener('mousemove',  e => { if (isDragging) setPosition(e.clientX); });
  document.addEventListener('mouseup',    () => { isDragging = false; });

  container.addEventListener('touchstart', e => { isDragging = true; setPosition(e.touches[0].clientX); }, { passive: true });
  document.addEventListener('touchmove',  e => { if (isDragging) setPosition(e.touches[0].clientX); }, { passive: true });
  document.addEventListener('touchend',   () => { isDragging = false; });
}

// ── Webcam Photo Capture Modal ─────────────────────────────────────────────
function openCamera(onCapture) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Not supported', 'Camera access is not supported on this browser/device', 'error');
    return;
  }

  // Create or retrieve modal
  let modalOverlay = document.getElementById('camera-capture-modal');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'camera-capture-modal';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
      <div class="modal" style="max-width: 480px; padding: 24px;">
        <div class="modal-header" style="padding: 0 0 16px 0;">
          <h3 class="font-bold">📸 Take a Selfie</h3>
          <button class="modal-close-btn" id="close-camera-modal-btn" style="font-size: 20px; cursor: pointer; color: var(--text-muted); background:none; border:none;">✕</button>
        </div>
        <div class="modal-body" style="padding: 0;">
          <div style="position: relative; border-radius: 12px; overflow: hidden; background: #000; aspect-ratio: 4/3;">
            <video id="camera-video-preview" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
            <div id="camera-loading-indicator" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); color: #fff; flex-direction: column; gap: 12px;">
              <div class="spinner-ring" style="width: 40px; height: 40px;"></div>
              <span class="text-sm">Starting camera...</span>
            </div>
          </div>
          <button class="btn btn-primary btn-full mt-4" id="capture-snapshot-btn" disabled style="gap: 8px;">
            📷 Capture Photo
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modalOverlay);
  }

  const video = modalOverlay.querySelector('#camera-video-preview');
  const captureBtn = modalOverlay.querySelector('#capture-snapshot-btn');
  const closeBtn = modalOverlay.querySelector('#close-camera-modal-btn');
  const loadingIndicator = modalOverlay.querySelector('#camera-loading-indicator');
  let activeStream = null;

  // Show modal
  modalOverlay.classList.remove('hidden');
  modalOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Helper to stop stream
  function stopStream() {
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
      activeStream = null;
    }
    video.srcObject = null;
  }

  // Helper to close modal
  function closeModal() {
    stopStream();
    modalOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Close handlers
  closeBtn.onclick = closeModal;
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) closeModal();
  };

  // Start webcam stream
  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  })
  .then(stream => {
    activeStream = stream;
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      loadingIndicator.style.display = 'none';
      captureBtn.disabled = false;
    };
  })
  .catch(err => {
    console.error('Camera access error:', err);
    closeModal();
    showToast('Camera Error', 'Could not access webcam. Please check permissions.', 'error');
  });

  // Capture handler
  captureBtn.onclick = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    
    // Draw mirrored image if scaleX is negative (standard selfie look)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg', lastModified: Date.now() });
        closeModal();
        if (onCapture) onCapture(file);
      }
    }, 'image/jpeg', 0.90);
  };
}

// Expose globally
window.App = {
  showToast,
  dismissToast,
  typewriter,
  setupImagePreview,
  initDragDrop,
  animateProgress,
  scrollToSection,
  saveToStorage,
  loadFromStorage,
  initBeforeAfterSlider,
  initScrollReveal,
  openCamera
};

