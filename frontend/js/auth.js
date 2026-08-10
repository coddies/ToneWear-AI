/* =============================================================================
   TONEWEAR AI — AUTH.JS
   Clerk authentication — protect app pages, manage user state
   ============================================================================= */

// ── Clerk Config ────────────────────────────────────────────────────────────
// Replace with your actual Clerk publishable key from dashboard.clerk.com
const CLERK_PUBLISHABLE_KEY = 'pk_test_YOUR_CLERK_KEY_HERE';
// Replace with your Clerk Frontend API URL (found in Clerk Dashboard → API Keys)
const CLERK_FRONTEND_API   = 'YOUR_FRONTEND_API.clerk.accounts.dev';

// Pages that do NOT require authentication
const PUBLIC_PAGES = ['index.html', 'login.html', 'signup.html', ''];

// ── Initialize Clerk ─────────────────────────────────────────────────────────
function initClerk(onLoad) {
  const script = document.createElement('script');
  script.setAttribute('data-clerk-publishable-key', CLERK_PUBLISHABLE_KEY);
  script.src = `https://${CLERK_FRONTEND_API}/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
  script.crossOrigin = 'anonymous';

  script.addEventListener('load', async () => {
    try {
      await window.Clerk.load();
      if (onLoad) onLoad(window.Clerk);
    } catch (err) {
      console.error('Clerk load failed:', err);
    }
  });

  script.addEventListener('error', () => {
    console.warn('Clerk script failed to load — running in demo mode');
    if (onLoad) onLoad(null);
  });

  document.head.appendChild(script);
}

// ── Auth Guard (app pages) ──────────────────────────────────────────────────
function initAuthGuard() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isPublic    = PUBLIC_PAGES.includes(currentPage);

  initClerk(async (clerk) => {
    if (!clerk) {
      // Demo mode — allow access but disable save/history features
      renderDemoUser();
      return;
    }

    if (!clerk.user && !isPublic) {
      // Not signed in on a protected page → redirect to login
      window.location.href = 'login.html';
      return;
    }

    if (clerk.user) {
      renderUser(clerk.user);
      prefillUserData(clerk.user);
    }
  });
}

// ── Render User in Sidebar ─────────────────────────────────────────────────
function renderUser(user) {
  const nameEl   = document.getElementById('sidebar-user-name');
  const emailEl  = document.getElementById('sidebar-user-email');
  const avatarEl = document.getElementById('sidebar-avatar');

  if (nameEl)  nameEl.textContent  = user.fullName || user.firstName || 'User';
  if (emailEl) emailEl.textContent = user.primaryEmailAddress?.emailAddress || '';
  if (avatarEl) {
    const initials = getInitials(user.fullName || user.firstName || 'U');
    if (user.imageUrl) {
      avatarEl.innerHTML = `<img src="${user.imageUrl}" alt="${initials}" class="avatar avatar-sm">`;
    } else {
      avatarEl.textContent = initials;
    }
  }
}

function renderDemoUser() {
  const nameEl   = document.getElementById('sidebar-user-name');
  const emailEl  = document.getElementById('sidebar-user-email');
  const avatarEl = document.getElementById('sidebar-avatar');

  if (nameEl)  nameEl.textContent  = 'Demo User';
  if (emailEl) emailEl.textContent = 'demo@tonewear.ai';
  if (avatarEl) avatarEl.textContent = 'DU';
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// ── Logout ──────────────────────────────────────────────────────────────────
function initLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      if (window.Clerk && window.Clerk.user) {
        await window.Clerk.signOut();
      }
      window.location.href = 'index.html';
    } catch {
      window.location.href = 'index.html';
    }
  });
}

// ── Mount Clerk Sign-In Component ────────────────────────────────────────────
function mountSignIn(elementId) {
  initClerk(async (clerk) => {
    if (!clerk) {
      showClerkFallback(elementId);
      return;
    }

    if (clerk.user) {
      window.location.href = 'analyzer.html';
      return;
    }

    clerk.mountSignIn(document.getElementById(elementId), {
      afterSignInUrl: 'analyzer.html',
      redirectUrl: 'analyzer.html'
    });
  });
}

// ── Mount Clerk Sign-Up Component ────────────────────────────────────────────
function mountSignUp(elementId) {
  initClerk(async (clerk) => {
    if (!clerk) {
      showClerkFallback(elementId);
      return;
    }

    if (clerk.user) {
      window.location.href = 'analyzer.html';
      return;
    }

    clerk.mountSignUp(document.getElementById(elementId), {
      afterSignUpUrl: 'analyzer.html',
      redirectUrl: 'analyzer.html'
    });
  });
}

// ── Fallback for dev without Clerk ─────────────────────────────────────────
function showClerkFallback(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.innerHTML = `
    <div style="text-align:center; padding: 24px;">
      <div style="font-size: 40px; margin-bottom: 12px;">🔑</div>
      <h3 style="margin-bottom: 8px;">Clerk Not Configured</h3>
      <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">
        Set up Clerk by adding your publishable key in auth.js
      </p>
      <a href="analyzer.html" class="btn btn-primary" style="text-decoration:none;">
        Continue in Demo Mode
      </a>
    </div>
  `;
}

// ── Prefill User Data (stored analysis) ──────────────────────────────────────
function prefillUserData(user) {
  // Load user's last analysis from localStorage for quick access
  const lastAnalysis = loadFromStorage ? loadFromStorage('last_analysis') : null;
  if (lastAnalysis) {
    window.ToneWear = window.ToneWear || {};
    window.ToneWear.lastAnalysis = lastAnalysis;
  }
}

// ── Get Current User ID ────────────────────────────────────────────────────
function getCurrentUserId() {
  if (window.Clerk && window.Clerk.user) {
    return window.Clerk.user.id;
  }
  return 'demo_user';
}

// ── Auto-init on DOM ready ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || '';

  // Mount auth components on auth pages
  if (currentPage === 'login.html') {
    mountSignIn('sign-in');
    return;
  }

  if (currentPage === 'signup.html') {
    mountSignUp('sign-up');
    return;
  }

  // Guard app pages
  if (!PUBLIC_PAGES.includes(currentPage)) {
    initAuthGuard();
    initLogout();
  }
});

// Expose
window.Auth = {
  getCurrentUserId,
  initAuthGuard,
  mountSignIn,
  mountSignUp
};
