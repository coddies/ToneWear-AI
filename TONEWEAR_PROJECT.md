# ToneWear AI — Complete Project Documentation
> **Last Updated:** August 12, 2026

---

## 1. Product Vision

ToneWear AI is an **AI-powered personalized fashion shopping assistant** that solves a real problem in online fashion:

> *"Will this color and outfit actually look good on me — before I buy it?"*

```
Selfie Upload → Skin AI → Color Profile → RAG Search → AI Ranking → Virtual Try-On → Buy
```

---

## 2. Current Status — Kya Ho Chuka Hai

### ✅ Poora Ho Gaya

| Cheez | Details |
|---|---|
| **Premium UI/UX Redesign** | Fully complete (warm ivory theme, fixed topbar navigation, 2-column shop dashboard, responsive panels) |
| **Frontend** — 8 pages | index, shop, analyzer, tryon, glasses, remedies, login, signup |
| **Backend** — FastAPI | 6 API routes, 4 services |
| **Groq AI** (replaces Claude) | `llama-3.3-70b-versatile` — outfit ranking + explanations + remedies + glasses |
| **Pinecone** vector search | Index: `tonewear-fashion`, llama-text-embed-v2 |
| **YouCam** keys set | `YOUCAM_CLIENT_ID` + `YOUCAM_PUBLIC_KEY` in `.env` |
| **50 products** catalog | Pakistani, Indian, Middle Eastern, Western |
| **Style knowledge base** | 15 color theory + cultural fashion rules |
| **Demo mode** | Sab kuch bina API ke bhi chalega (mock data) |
| **GitHub** | https://github.com/coddies/ToneWear-AI |
| **uv** package management | Project-level `.venv`, no global pip |


---

## 3. Kya Baki Hai (Remaining)

### 🔴 Critical — Abhi Karna Hai

| # | Kaam | Kyun Zaruri |
|---|---|---|
| 1 | **YouCam API endpoints verify karo** | `youcam.py` mein URLs guessed hain — actual docs se confirm karo |
| 2 | **Vercel par frontend deploy** | Public URL milegi, YouCam register hoga |
| 3 | **Railway par backend deploy** | Live backend chahiye production ke liye |
| 4 | **YouCam URL register** | yce.makeupar.com pe apni deployed URL submit karo |

### 🟡 Important — Jald Karna Hai

| # | Kaam | Details |
|---|---|---|
| 5 | **Pinecone index populate karo** | Products data vectorize karke Pinecone mein daalo |
| 6 | **Clerk auth keys** | Login/signup actually kaam kare iske liye |
| 7 | **YouCam skin analysis response parse** | Real API se response aane ke baad `_parse_youcam_skin()` update karo |
| 8 | **Products mein real images** | `image_url` mein real product photos daalo |

### 🟢 Nice to Have

| # | Kaam |
|---|---|
| 9 | Payment integration (Stripe/local gateway) |
| 10 | User history save karna |
| 11 | Wishlist feature |
| 12 | Mobile app (React Native) |

---

## 4. API Keys Status

| Service | Key | Status |
|---|---|---|
| **Groq AI** | `gsk_woiF...` | ✅ Set in `.env` |
| **Pinecone** | `pcsk_4mwa...` | ✅ Set in `.env` |
| **YouCam** Client ID | `sk-cuL7...` | ✅ Set in `.env` |
| **YouCam** Public Key | `MIGfMA0G...` | ✅ Set in `.env` |
| **Clerk** | — | ❌ Abhi nahi |
| **YouCam** registered URL | — | ❌ Deploy ke baad |

---

## 5. Project Structure

```
tonewear-ai/
│
├── frontend/                    ← Static HTML/CSS/JS Website
│   ├── index.html               ← Landing page (hero, features, how-it-works)
│   ├── shop.html                ← Main AI shopping page (selfie → outfits → try-on)
│   ├── analyzer.html            ← Standalone skin tone analyzer
│   ├── tryon.html               ← Virtual try-on (recommended + custom clothes)
│   ├── glasses.html             ← Glasses virtual try-on
│   ├── remedies.html            ← AI skin remedies
│   ├── login.html / signup.html ← Clerk auth pages
│   ├── css/
│   │   ├── style.css            ← Global design system (variables, typography)
│   │   ├── components.css       ← Navbar, sidebar, cards, buttons, product cards
│   │   └── animations.css       ← Micro-animations, keyframes
│   └── js/
│       ├── api.js               ← All fetch calls to backend (single source)
│       ├── shop.js              ← Main shopping flow logic
│       ├── app.js               ← Global utils (theme, toast, auth check)
│       ├── auth.js              ← Clerk authentication
│       ├── analyzer.js          ← Skin analyzer page logic
│       ├── tryon.js             ← Virtual try-on logic
│       ├── glasses.js           ← Glasses try-on logic
│       └── remedies.js          ← Remedies page logic
│
├── backend/                     ← Python FastAPI Backend
│   ├── main.py                  ← FastAPI app entry point + lifespan (Pinecone init)
│   ├── schemas.py               ← Pydantic models (request/response)
│   ├── pyproject.toml           ← uv dependencies
│   ├── railway.toml             ← Railway deployment config
│   ├── .env                     ← API keys (NOT on GitHub)
│   ├── .env.example             ← Template for keys
│   │
│   ├── api/                     ← API Route Handlers
│   │   ├── skin.py              ← POST /api/skin/analyze
│   │   ├── recommendations.py   ← POST /api/recommendations
│   │   ├── products.py          ← GET  /api/products, /api/products/{id}
│   │   ├── tryon.py             ← POST /api/tryon/generate, /api/tryon/custom
│   │   ├── glasses.py           ← POST /api/glasses/analyze
│   │   ├── remedies.py          ← POST /api/remedies/generate
│   │   └── history.py           ← GET/POST /api/history
│   │
│   ├── services/                ← Business Logic
│   │   ├── youcam.py            ← YouCam API (skin analysis + virtual try-on)
│   │   ├── claude_ai.py         ← Groq AI service (outfit recs + remedies + glasses)
│   │   ├── rag_service.py       ← Pinecone vector search + keyword fallback
│   │   ├── recommendation_service.py ← RAG + Groq ranking pipeline
│   │   └── storage.py           ← Local history storage
│   │
│   └── data/
│       ├── products.json        ← 50 products catalog
│       └── style_knowledge.json ← 15 color theory + cultural rules
│
├── vercel.json                  ← Frontend deployment (Vercel)
├── README.md                    ← Developer setup guide
├── TONEWEAR_PROJECT.md          ← Ye file — full documentation
└── .gitignore                   ← .env + .venv excluded
```

---

## 6. Tech Stack

| Layer | Technology | Model/Version |
|---|---|---|
| Frontend | HTML + Vanilla CSS + Vanilla JS | — |
| Backend | Python FastAPI | 0.111 |
| AI Ranking | **Groq** | `llama-3.3-70b-versatile` |
| Skin Analysis | **YouCam Perfect AI** | Skin AI API |
| Virtual Try-On | **YouCam Apparel VTO** | Apparel API |
| Vector Search | **Pinecone** | `llama-text-embed-v2` |
| Package Mgmt | **uv** | Project-level .venv |
| Auth | Clerk | — |
| Frontend Deploy | Vercel | — |
| Backend Deploy | Railway | — |

---

## 7. Local Development

### Backend start karo:
```bash
cd backend
$env:PYTHONUTF8="1"   # Windows encoding fix
uv run uvicorn main:app --reload --port 8000
```
Backend: `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

### Frontend start karo:
```bash
cd frontend
python -m http.server 3000
```
Frontend: `http://localhost:3000`
Main Page: `http://localhost:3000/shop.html`

---

## 8. Deployment Steps (Jab Karna Ho)

### Step 1 — Frontend → Vercel
1. vercel.com par jao → GitHub se connect karo
2. `coddies/ToneWear-AI` repo select karo
3. Root directory: `frontend/` set karo
4. Deploy karo → URL milegi (e.g. `tonewear-ai.vercel.app`)

### Step 2 — YouCam URL Register
1. yce.makeupar.com/api-console par jao
2. Apni Vercel URL add karo
3. YouCam endpoints confirm karo

### Step 3 — Backend → Railway
1. railway.app par jao → GitHub se connect karo
2. `backend/` folder select karo
3. Environment variables add karo (`.env` se copy karo)
4. Deploy karo → Backend URL milegi

### Step 4 — URLs link karo
- Vercel mein env var add karo: `BACKEND_URL=https://your-railway-url.up.railway.app`
- Railway mein add karo: `FRONTEND_URL=https://tonewear-ai.vercel.app`

---

## 9. Main Flow — shop.html

```
1. Selfie Upload
   ↓
2. POST /api/skin/analyze
   → YouCam: skin tone, undertone, fitzpatrick, concerns
   → Groq: outfit type recommendations
   ↓
3. Personal Color Profile
   (skin_tone, undertone, recommended_colors, style_directions)
   ↓
4. User types request: "Eid ke liye kurta, budget 5000"
   ↓
5. POST /api/recommendations
   → Pinecone: vector search (query + profile)
   → Groq llama-3.3-70b: rank top 6 + match_reason
   ↓
6. 6 Personalized Products (with % match + AI explanation)
   ↓
7. Click "Try On"
   → POST /api/tryon/generate
   → YouCam VTO: returns result image URL
   ↓
8. Before/After comparison slider
   ↓
9. Save / View Product / Buy
```

---

## 10. GitHub

**Repo:** https://github.com/coddies/ToneWear-AI

```bash
# Naya code push karna ho:
& "C:\Program Files\Git\cmd\git.exe" add .
& "C:\Program Files\Git\cmd\git.exe" commit -m "your message"
& "C:\Program Files\Git\cmd\git.exe" remote set-url origin https://TOKEN@github.com/coddies/ToneWear-AI.git
& "C:\Program Files\Git\cmd\git.exe" push origin main
& "C:\Program Files\Git\cmd\git.exe" remote set-url origin https://github.com/coddies/ToneWear-AI.git
```
