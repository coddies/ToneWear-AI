# ToneWear AI 🪞✨

> **AI-Powered Personalized Fashion Shopping Assistant**
>
> Discover what suits you, see it on yourself, and shop with confidence.

---

## What is ToneWear AI?

ToneWear AI combines:
- 🔬 **YouCam Skin AI** — Analyze your skin tone & undertone
- 🧠 **RAG + Pinecone** — Find outfits that actually suit your complexion
- 🤖 **Claude AI** — Explain *why* a color works for YOUR specific skin
- 🪞 **YouCam Apparel VTO** — See the outfit on your own photo before buying

**Demo Story:**
1. Upload selfie → skin tone detected
2. Ask "Eid ke liye kurta chahiye, budget 5000" 
3. RAG retrieves matching outfits → Claude ranks and explains
4. Click Try On → see yourself in the outfit
5. Compare → Save → View Product → Buy

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML / Vanilla CSS / Vanilla JS |
| Backend | Python + FastAPI |
| Skin AI | YouCam Skin AI API |
| Apparel VTO | YouCam Apparel VTO API |
| AI Reasoning | Anthropic Claude (claude-sonnet-4-5) |
| Vector Search | Pinecone (llama-text-embed-v2) |
| Auth | Clerk |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## Project Structure

```
tonewear-ai/
├── frontend/
│   ├── index.html       ← Landing page
│   ├── shop.html        ← Main shopping flow (selfie → profile → RAG → try-on)
│   ├── analyzer.html    ← Skin analyzer
│   ├── tryon.html       ← Apparel virtual try-on
│   ├── glasses.html     ← Glasses try-on
│   ├── history.html     ← Saved sessions
│   ├── remedies.html    ← Skin remedies
│   ├── css/             ← Design system
│   └── js/
│       ├── shop.js      ← Main shopping logic
│       ├── api.js       ← Backend API calls
│       └── ...
├── backend/
│   ├── main.py          ← FastAPI entry point
│   ├── pyproject.toml   ← uv dependency management
│   ├── api/
│   │   ├── recommendations.py  ← POST /api/recommendations
│   │   ├── products.py         ← GET /api/products
│   │   ├── skin.py             ← POST /api/skin/analyze
│   │   └── tryon.py            ← POST /api/tryon/*
│   ├── services/
│   │   ├── rag_service.py           ← Pinecone vector search
│   │   ├── recommendation_service.py ← Claude ranking
│   │   └── youcam.py               ← YouCam API
│   └── data/
│       ├── products.json        ← 50-item demo catalog
│       └── style_knowledge.json ← Color theory knowledge base
├── vercel.json      ← Frontend deployment config
└── TONEWEAR_PROJECT.md
```

---

## Local Development

### Prerequisites
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) — `pip install uv`
- Node.js (optional, for local HTTP server)

### Backend Setup

```bash
cd backend

# Copy environment variables
cp .env.example .env
# Edit .env and add your API keys

# Install dependencies with uv (creates .venv automatically)
uv sync

# Start development server
uv run uvicorn main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`

### Frontend Setup

```bash
# Option 1: Python simple server
cd frontend
python -m http.server 3000

# Option 2: VS Code Live Server (recommended)
# Right-click index.html → Open with Live Server

# Option 3: Node.js
npx serve frontend -p 3000
```

Frontend runs at: `http://localhost:3000`

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# YouCam Perfect AI (Skin Analysis + Virtual Try-On)
YOUCAM_API_KEY=your_key_here

# Anthropic Claude (AI reasoning + explanations)  
CLAUDE_API_KEY=your_key_here

# Pinecone (Vector database for RAG)
PINECONE_API_KEY=your_key_here
PINECONE_INDEX=tonewear-fashion

# Clerk (Authentication)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# After deployment — set your Vercel URL
FRONTEND_URL=https://your-app.vercel.app
```

> **Note:** All features work in demo mode even without API keys. Mock data is used as fallback.

---

## Deployment

### Frontend → Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Or connect GitHub repo to Vercel for auto-deploy
```

After deploying, you'll get a URL like `https://tonewear-ai.vercel.app`

**Use this URL to register for YouCam API** at https://yce.makeupar.com/api-console

### Backend → Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
cd backend
railway up
```

**After getting backend URL:**
1. Add it to Vercel environment variables as `VITE_BACKEND_URL` (or edit `frontend/js/api.js`)
2. Add frontend URL to `FRONTEND_URL` in Railway env vars

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/skin/analyze` | Analyze skin tone from selfie |
| POST | `/api/recommendations` | RAG + Claude outfit recommendations |
| GET | `/api/products` | Product catalog with filters |
| POST | `/api/tryon/generate` | Virtual try-on with product |
| POST | `/api/tryon/custom` | Try-on with your own clothes |
| GET | `/api/health` | Health check |

---

## Demo Flow

1. Open `shop.html`
2. Upload a selfie photo
3. Wait for skin analysis (demo mode: instant mock profile)
4. Type your request: *"Eid ke liye kuch chahiye budget 5000"*
5. Click **Find Outfits** → 6 personalized products appear
6. Click **Try On** on any product
7. See the virtual try-on result
8. Save / Compare / View Product

---

## Cultural Fashion Support

| Region | Categories |
|---|---|
| 🇵🇰 Pakistani | Shalwar Kameez, Kurta, Sherwani, Waistcoat Set |
| 🇮🇳 Indian | Kurta, Nehru Jacket, Bandhgala Suit |
| 🌙 Middle Eastern | Thobe, Bisht |
| 🌍 Western | Dress Shirts, Suits, Casual |

---

## License

MIT — Built for the YouCam AI Hackathon 2026.
