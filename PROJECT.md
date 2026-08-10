# ToneWear AI — Project Context

## What is this?
AI-powered personal stylist web app for Pakistani, Indian, Middle Eastern users.
Analyzes skin tone + concerns → recommends culturally relevant outfits with virtual try-on.

## Stack
- Frontend: HTML/CSS/JS (Vanilla) — no framework
- Backend: Python + FastAPI
- Auth: Clerk (Vanilla JS SDK)
- Skin Analysis: YouCam Skin AI API
- Virtual Try-On: YouCam Apparel VTO API
- AI Recommendations: Claude API (claude-sonnet-4-6)
- Hosting: Vercel (frontend) + Railway/Render (backend)

## Pages
- index.html → Landing page (no sidebar, no auth required)
- analyzer.html → Skin analyzer (auth required, has sidebar)
- tryon.html → Virtual outfit try-on (auth required, has sidebar)
- glasses.html → Glasses try-on (auth required, has sidebar)
- remedies.html → Skin remedies (auth required, has sidebar)
- history.html → Past sessions (auth required, has sidebar)
- login.html → Clerk login (no sidebar)
- signup.html → Clerk signup (no sidebar)

## API Endpoints
- POST /api/skin/analyze → main feature
- POST /api/tryon/generate → outfit VTO
- POST /api/tryon/custom → user's own clothes VTO
- POST /api/glasses/analyze → face shape + frame recommendations
- POST /api/glasses/tryon → glasses virtual try-on
- POST /api/remedies/get → skin home remedies
- POST /api/history/save → save session
- GET /api/history/{user_id} → get history
- DELETE /api/history/{user_id}/{session_id} → delete session

## Key Design Rules
- Glassmorphism cards everywhere: rgba(255,255,255,0.70) + blur(20px)
- Primary color: #1A56DB | Secondary: #7C3AED
- Font: Inter (Google Fonts)
- All pages fully responsive (mobile-first)
- Sidebar on all pages except index/login/signup
- Mobile: bottom tab bar replaces sidebar

## Environment Variables needed
YOUCAM_API_KEY → from yce.makeupar.com/api-console
CLAUDE_API_KEY → from console.anthropic.com
CLERK_PUBLISHABLE_KEY → from dashboard.clerk.com
CLERK_SECRET_KEY → from dashboard.clerk.com

## Cultural Fashion Support
Pakistani: Shalwar Kameez, Kurta, Sherwani
Indian: Kurta, Sherwani, Lehenga recommendations
Middle Eastern: Thobe, Abaya color recommendations
Western: Shirts, Suits, Casual

## Important Notes
- YouCam API flow: upload file → get file_id → create task → poll until success → get result
- All YouCam calls go through backend (API key never exposed to frontend)
- Claude API also called from backend only
- Clerk auth on frontend, verify token on backend routes
- History saved as JSON files in backend/data/history/
- No database needed — JSON file storage for hackathon

## Folder Structure
```
tonewear-ai/
├── frontend/
│   ├── index.html
│   ├── analyzer.html
│   ├── tryon.html
│   ├── glasses.html
│   ├── remedies.html
│   ├── history.html
│   ├── login.html
│   ├── signup.html
│   ├── css/
│   │   ├── style.css       (global styles + design system)
│   │   ├── components.css  (cards, buttons, sidebar, navbar)
│   │   └── animations.css  (all animations)
│   ├── js/
│   │   ├── app.js          (main app logic + sidebar)
│   │   ├── auth.js         (clerk authentication)
│   │   ├── analyzer.js     (skin analysis flow)
│   │   ├── tryon.js        (virtual try-on flow)
│   │   ├── glasses.js      (glasses try-on flow)
│   │   ├── remedies.js     (remedies logic)
│   │   └── api.js          (all fetch calls to backend)
│   └── assets/
│       └── outfits/
├── backend/
│   ├── main.py
│   ├── routes/
│   ├── services/
│   ├── models/
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
├── PROJECT.md
└── .gitignore
```

## Running Locally
```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env  # fill in your API keys
uvicorn main:app --reload --port 8000

# Frontend
# Open frontend/index.html directly in browser, or:
cd frontend
python -m http.server 3000
# Visit http://localhost:3000
```

## Folder Structure — Updated
```
tonewear-ai/
├── frontend/
│   ├── assets/
│   │   ├── frames/           ← NEW: 8 glasses frame SVGs
│   │   │   ├── wayfarer.svg
│   │   │   ├── round.svg
│   │   │   ├── aviator.svg
│   │   │   ├── cateye.svg
│   │   │   ├── rectangle.svg
│   │   │   ├── browline.svg
│   │   │   ├── geometric.svg
│   │   │   └── oversized.svg
│   │   └── outfits/
│   ├── css/
│   │   ├── style.css
│   │   ├── components.css    ← UPDATED: .upload-zone-universal + .uz-* classes
│   │   └── animations.css
│   ├── js/
│   │   ├── app.js            ← UPDATED: App.openCamera() + refined camera modal
│   │   ├── analyzer.js       ← UPDATED: Uses new uz-preview-state IDs
│   │   ├── glasses.js        ← REBUILT: face-api.js + Snapchat live try-on
│   │   └── ...
│   ├── analyzer.html         ← UPDATED: Universal upload zone
│   ├── tryon.html            ← UPDATED: Universal upload zone
│   ├── glasses.html          ← REBUILT: 2-tab Snapchat design
│   └── ...
└── ...
```

## Recent Changes

### [2026-07-16] Glasses Feature Full Redesign
- **glasses.html**: Complete rebuild — Snapchat-style Live Try-On tab + Upload Photo tab
- **glasses.js**: Complete rewrite with face-api.js real-time face landmark detection
  - Real-time glasses canvas overlay (eye position + tilt angle calculation)
  - Flip camera support
  - Snapshot capture + download
  - AI Pick button (recommends best frame)
- **Live Camera UI**: Phone-shaped container (9:16), overlay topbar + bottombar
- **Frame Selector Strip**: Circular Snapchat-style (None | Wayfarer | Round | Aviator | Cat-Eye | Rectangle | Browline | Geometric | Oversized)
- **Upload Tab**: AI face shape analysis card + frame selector + 3 recommended frame cards + care tips

### [2026-07-16] Universal Upload Zone Standardized
- **components.css**: Added `.upload-zone-universal` + `.uz-*` CSS classes (shared across all 3 pages)
- **analyzer.html**: Replaced old inline upload zone with universal component
- **tryon.html**: Replaced old user-photo upload zone with universal component
- **glasses.html**: Uses universal upload zone in Upload Photo tab
- **app.js**: `App.openCamera()` refined — shared camera capture modal with face guide oval + shutter button

### [2026-07-16] Glasses Frame SVG Assets Created
- 8 SVG frame files in `frontend/assets/frames/`
- Each 400×150px, transparent background, ready for canvas rendering
- face-api.js: tinyFaceDetector + faceLandmark68Net for eye position detection

### [2026-07-16] Third-Party Branding & 'Powered by' Mentions Removed
- Removed all "Powered by YouCam / face-api.js / Claude AI" badges and references from user-facing screens across `index.html`, `analyzer.html`, `glasses.html`, and `remedies.html` to maintain a clean white-label appearance.

### [2026-07-16] glasses.html + glasses.js — Complete v2 Rebuild (7-Section Flow)

#### New User Flow
Upload Photo → Auto-Analyze (2.5s) → AI Results → Recommendations → Frame Strip → Try-On → Compare

#### Section 1 — Upload Zone
- Large glassmorphism upload card with drag & drop + camera support
- Auto-analyze triggers immediately after upload (no button)
- Face scan animation: 4 corner brackets + blue scan line + cycling status messages
- Photo preview replaces upload card after selection

#### Section 2 — AI Analysis Results Card
- 2-column glass card (left: face + skin, right: Style DNA)
- Face Shape badge with confidence %, Skin Tone swatch + name + confidence
- Measurements row: Face Width | Jawline | Bridge
- Recommended Frame Size (52-18-145 format)
- **Style DNA™** — curated personality tags: [Professional] [Modern] [Minimal] [Warm Tone]
- Best For / Avoid frame lists in colored boxes

#### Section 3 — Top 3 AI Recommendations
- 3 cards (rank #1 gold-bordered, others silver)
- Large frame image display area
- 4 animated progress bars: Overall Match / Color Match / Face Match / Style Fit
- WHY explanation paragraph (styled with left blue border)
- [👓 Try This Frame] + [😂 AI Roast] action buttons

#### Section 4 — AI Roast Card
- Slide-down animation, per-frame roast content
- 2-column: ❌ Current Look Problems | ✅ Why Recommended Is Better
- Dismissable with ✕ button

#### Section 5 — Circular Frame Strips (Snapchat-style)
- Row 1: AI Recommended (gold-glow border on recommended circles)
- Row 2: All Frames (9 total)
- 64px circles (52px mobile), frame SVG thumbnail inside
- Selected state: blue border + scale up + blue glow
- Click any circle → triggers try-on

#### Section 6 — Try-On Result
- Canvas overlay renders selected frame SVG on top of user's photo
- Frame label overlay (bottom-left)
- 4 action buttons: ⚖️ Compare Mode | 💾 Download HD | 📤 Share | 🔗 Friend Vote
- Friend Vote: generates shareable link with random code

#### Section 7 — Compare Mode
- Side-by-side 2-column grid
- Each column: photo + frame name + score chips + vote button
- Vote count animates on click
- "Which looks better?" question

#### Key JS Functions (glasses.js)
| Function | Purpose |
|---|---|
| `handleGlassesUpload(file)` | Validates + starts auto-analyze |
| `startAutoAnalysis()` | Scan animation → 2.5s → show results |
| `showAnalysisResults()` | Populates Section 2, renders Section 3 + 5 |
| `renderRecommendationCards()` | Builds 3 cards with score bars |
| `animateScoreBars()` | CSS width transition for progress bars |
| `showRoastCard(idx)` | Shows AI roast for that frame |
| `renderFrameStrips()` | Both circular strips |
| `selectFrame(key)` | Updates strips + triggers try-on |
| `drawGlassesOverlay(key)` | Canvas SVG draw on user photo |
| `toggleCompareMode()` | Shows/hides Section 7 |
| `castVote(colIdx)` | Animates vote count |
| `generateFriendVote()` | Shows fake shareable link |
| `downloadHD()` | Composite canvas + base img download |



