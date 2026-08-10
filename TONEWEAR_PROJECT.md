# ToneWear AI — Complete Project Documentation

> **One-line pitch:** ToneWear AI helps you discover what suits you, see it on yourself, and shop with confidence.

---

## 1. Product Vision

ToneWear AI is an **AI-powered personalized fashion shopping assistant** that solves a real problem in online fashion:

> *"Will this color and outfit actually look good on me — before I buy it?"*

The core experience connects five pillars:

```
Understand Me → Find What Suits Me → Show Me → Help Me Decide → Buy / Save
```

### Real Problem It Solves

| Problem | ToneWear Solution |
|---|---|
| Will this color suit my skin tone? | YouCam Skin AI → Personal Color Profile |
| Will this style look good on me? | RAG retrieval → Personalized Products |
| How will it look on my actual photo? | YouCam Apparel VTO |
| Which product should I choose? | AI ranking + "Why this?" explanation |
| I already own something similar? | Custom Clothes Try-On |

---

## 2. Core User Flow

```
Selfie Upload
      ↓
YouCam Skin AI
      ↓
Personal Style Profile
(Skin Tone · Undertone · Color Families · Style Direction)
      ↓
RAG / Vector Search
(Query: occasion + budget + skin profile)
      ↓
Personalized Products + Colors
      ↓
AI "Why this?" Explanation
      ↓
YouCam Apparel Virtual Try-On
      ↓
Try On → Compare → Save / View Product / Buy
```

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML / Vanilla CSS / Vanilla JS |
| Backend | Python + FastAPI |
| Skin AI | YouCam Skin AI API |
| Apparel VTO | YouCam Apparel VTO API |
| AI Reasoning | Anthropic Claude API (claude-sonnet-4-6) |
| Vector Search | ChromaDB (local, persistent) |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Auth | Clerk (Vanilla JS SDK) |
| Storage | JSON files (hackathon-grade) |
| Hosting | Vercel (frontend) + Railway/Render (backend) |

---

## 4. Architecture

```
FRONTEND (HTML/JS)
  index.html  shop.html  analyzer.html  tryon.html  history.html
         |
         | HTTP / JSON
         |
FASTAPI BACKEND
  /api/skin/analyze      → YouCam Skin AI
  /api/recommendations   → RAG + Claude ranking
  /api/tryon/generate    → YouCam Apparel VTO
  /api/tryon/custom      → Custom clothes VTO
  /api/products          → Catalog
  /api/history           → Session storage
         |
  ┌──────────────────────────┐
  │  YouCam  │ ChromaDB │ Claude │
  └──────────────────────────┘
```

---

## 5. Complete Folder Structure

```
tonewear-ai/
├── frontend/
│   ├── index.html              ← Landing page
│   ├── shop.html               ← NEW: Main shopping + RAG page
│   ├── analyzer.html           ← Skin analysis
│   ├── tryon.html              ← Apparel VTO
│   ├── glasses.html            ← Glasses try-on (secondary)
│   ├── history.html            ← Past sessions
│   ├── remedies.html           ← Skin remedies (secondary)
│   ├── login.html
│   ├── signup.html
│   ├── css/
│   │   ├── style.css
│   │   ├── components.css
│   │   └── animations.css
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── api.js
│   │   ├── analyzer.js
│   │   ├── shop.js             ← NEW: RAG search + product cards
│   │   ├── tryon.js
│   │   ├── glasses.js
│   │   └── remedies.js
│   └── assets/
│       ├── frames/
│       └── outfits/
├── backend/
│   ├── main.py
│   ├── schemas.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── api/
│   │   ├── skin.py
│   │   ├── tryon.py
│   │   ├── recommendations.py  ← NEW
│   │   ├── products.py         ← NEW
│   │   ├── glasses.py
│   │   ├── remedies.py
│   │   └── history.py
│   ├── services/
│   │   ├── youcam.py
│   │   ├── rag_service.py      ← NEW
│   │   ├── recommendation_service.py ← NEW
│   │   ├── claude_ai.py
│   │   └── storage.py
│   ├── data/
│   │   ├── products.json       ← NEW: 50+ demo catalog
│   │   └── style_knowledge.json ← NEW: Color theory
│   └── vectorstore/            ← NEW: ChromaDB storage
├── TONEWEAR_PROJECT.md
├── PROJECT.md
└── .gitignore
```

---

## 6. API Endpoints (Complete)

### Skin Analysis
```
POST /api/skin/analyze
Body: multipart/form-data { image: File }
Response: {
  skin_tone, undertone, fitzpatrick, concerns,
  recommended_colors, color_families,
  style_directions, avoid_colors
}
```

### Personalized Recommendations (RAG — NEW)
```
POST /api/recommendations
Body: {
  "profile": { skin_tone, undertone, recommended_colors, style_directions },
  "occasion": "Eid",
  "budget": 5000,
  "gender": "Male",
  "query": "traditional outfit"
}
Response: {
  "products": [
    { id, name, category, color, price, image_url, product_url,
      match_score, match_reason, skin_compatibility }
  ],
  "style_tips": [...],
  "color_insight": "..."
}
```

### Apparel Virtual Try-On
```
POST /api/tryon/generate
Body: multipart/form-data { person_image, product_id? OR clothing_image? }
Response: { result_url, processing_time }

POST /api/tryon/custom   ← NEW
Body: multipart/form-data { person_image, clothing_image }
Response: { result_url }
```

### Products
```
GET /api/products?category=&occasion=&gender=&min_price=&max_price=
GET /api/products/{product_id}
```

### History
```
POST /api/history/save
GET  /api/history/{user_id}
DELETE /api/history/{user_id}/{session_id}
```

---

## 7. Product Catalog Schema

```json
{
  "id": "pk-kurta-navy-001",
  "name": "Classic Navy Blue Kurta",
  "category": "Kurta",
  "culture": "Pakistani",
  "gender": "Male",
  "color": "Navy Blue",
  "color_family": "Blue",
  "color_hex": "#1a3a5c",
  "style": ["Modern", "Traditional", "Elegant"],
  "occasion": ["Eid", "Wedding", "Formal"],
  "season": ["All"],
  "skin_tone_compatibility": ["Medium", "Dark", "Light"],
  "undertone_compatibility": ["warm", "cool", "neutral"],
  "price": 3500,
  "currency": "PKR",
  "image_url": "...",
  "product_url": "...",
  "description": "Elegant navy blue kurta..."
}
```

---

## 8. RAG System Design

### Vector Store
- Engine: ChromaDB (local, persistent)
- Collections: `products` + `style_knowledge`
- Embeddings: sentence-transformers `all-MiniLM-L6-v2`

### Query Construction
```python
query_text = f"""
{occasion} outfit for {gender}.
Skin tone: {skin_tone}, Undertone: {undertone}.
Style: {style_directions}.
Preferred colors: {recommended_colors}.
Budget under PKR {budget}.
"""
```

### RAG Pipeline
```
1. User query → build structured query text
2. ChromaDB similarity search → top 20 candidates
3. Apply filters (budget, gender, occasion)
4. Claude API: rank top 5 + generate explanations
5. Return ranked products with match_score + match_reason
```

---

## 9. Demo Product Catalog Plan (50 Items)

### Pakistani (20 items)
| Category | Colors | Occasions | Price (PKR) |
|---|---|---|---|
| Shalwar Kameez | Navy, Olive, Cream, White, Maroon | Eid, Casual, Friday | 2000–6000 |
| Kurta | Navy, Deep Green, Burgundy, Grey | Eid, Wedding, Formal | 2500–7000 |
| Sherwani | Navy, Black, Dark Green, Maroon | Wedding, Eid | 8000–25000 |
| Waistcoat Set | Navy, Brown, Olive | Formal, Wedding | 4000–9000 |

### Indian (10 items)
| Category | Colors | Occasions | Price (PKR) |
|---|---|---|---|
| Kurta Sets | Deep Blue, Saffron, Green | Festive, Wedding | 3000–8000 |
| Nehru Jacket | Navy, Black, Maroon | Formal, Wedding | 5000–12000 |

### Middle Eastern (8 items)
| Category | Colors | Occasions |
|---|---|---|
| Thobe | White, Cream, Light Grey | Daily, Formal |
| Bisht | Gold, Black, Navy | Celebrations |

### Western (12 items)
| Category | Colors | Occasions |
|---|---|---|
| Dress Shirts | Navy, Sky Blue, White | Business, Casual |
| Slim Fit Suit | Charcoal, Navy | Interview, Wedding |
| Casual Shirts | Olive, Burgundy, Grey | Casual, Date |

---

## 10. Main Shopping Page Flow (shop.html)

```
Step 1: Upload Selfie
  → Camera or file upload
  → YouCam Skin AI auto-analyze

Step 2: Style Profile Card
  → Skin tone + undertone
  → Best colors (visual swatches)
  → Style direction tags

Step 3: Search Input
  → Freeform: "Eid ke liye kuch chahiye, budget 5000"
  → OR: Occasion picker + Budget slider + Gender toggle

Step 4: RAG Results
  → 3–6 product cards
  → Match %, reason, price, image

Step 5: Try On
  → Click "Try On" → YouCam VTO
  → Result shown in same page

Step 6: Actions
  → Compare | Save | View Product
```

---

## 11. Build Phases

| Phase | Task |
|---|---|
| 1 | Clean UI, establish main ToneWear flow |
| 2 | Verify YouCam Skin AI |
| 3 | Normalize results → style profile |
| 4 | Create 50-item demo catalog |
| 5 | ChromaDB + embeddings |
| 6 | RAG recommendation service |
| 7 | Connect recommendations to Apparel VTO |
| 8 | Custom clothing try-on |
| 9 | Save / compare / product actions |
| 10 | Polish complete demo |

---

## 12. Demo Story

1. Upload selfie
2. ToneWear analyzes: *Skin Tone: Medium Warm*
3. Colors appear: *Navy · Olive · Cream · Deep Green*
4. User: *"Eid ke liye kuch chahiye, budget 5000 hai"*
5. RAG: Navy Blue Kurta — **94% Match**, Olive Sherwani — **87% Match**
6. AI: *"Navy creates elegant contrast with your warm undertone"*
7. User clicks **Try On** → outfit shown on photo
8. Compare two options → Save / View Product URL

---

## 13. Design System

```
Primary:    #1A56DB
Secondary:  #7C3AED
Success:    #059669
Font:       Inter
Style:      Glassmorphism (rgba(255,255,255,0.70) + blur(20px))
Mobile:     Bottom tab bar
```

---

## 14. What Makes ToneWear Different

```
Personal Skin Analysis
       +
AI Style Reasoning (Claude)
       +
Real Product Retrieval (RAG / ChromaDB)
       +
Virtual Try-On (YouCam)
       =
One Complete Shopping Decision Flow
```

Not just skin AI. Not just VTO. The connection between them.

---

## 15. Environment Variables

```env
YOUCAM_API_KEY=
CLAUDE_API_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
BACKEND_URL=http://localhost:8000
CHROMA_PERSIST_DIR=./vectorstore
```

---

*Version 2.0 — Final MVP Plan | 2026-08-10*
