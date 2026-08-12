"""
ToneWear AI — FastAPI Backend
Entry point: uv run uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import os

from api.skin            import router as skin_router
from api.tryon           import router as tryon_router
from api.glasses         import router as glasses_router
from api.remedies        import router as remedies_router
from api.history         import router as history_router
from api.recommendations import router as recommendations_router
from api.products        import router as products_router


# ── Startup / Shutdown ────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize RAG service + Pinecone
    print("[ToneWear AI] Backend starting up...")
    try:
        from services.rag_service import rag_service
        rag_service.init()
        # Index data only if Pinecone is available and index is empty
        if rag_service.index:
            rag_service.index_all_data()
    except Exception as e:
        print(f"[WARNING] RAG init warning: {e}")

    yield  # App runs here

    # Shutdown
    print("[ToneWear AI] Backend shutting down...")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ToneWear AI API",
    description="AI-powered personal fashion stylist — Skin AI + RAG + Virtual Try-On",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:8080",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]

# Add production domain from env
production_url = os.getenv("FRONTEND_URL", "")
if production_url:
    ALLOWED_ORIGINS.append(production_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(skin_router,            prefix="/api/skin",            tags=["Skin Analysis"])
app.include_router(tryon_router,           prefix="/api/tryon",           tags=["Virtual Try-On"])
app.include_router(glasses_router,         prefix="/api/glasses",         tags=["Glasses Try-On"])
app.include_router(remedies_router,        prefix="/api/remedies",        tags=["Skin Remedies"])
app.include_router(history_router,         prefix="/api/history",         tags=["History"])
app.include_router(recommendations_router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(products_router,        prefix="/api/products",        tags=["Products"])


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    from services.rag_service import rag_service
    return {
        "status":     "ok",
        "service":    "ToneWear AI API",
        "version":    "2.0.0",
        "rag_mode":   "pinecone" if rag_service.index else "keyword-fallback",
        "products_loaded": len(rag_service.products_db)
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message":  "Welcome to ToneWear AI API v2",
        "docs":     "/docs",
        "health":   "/health",
        "endpoints": [
            "POST /api/skin/analyze",
            "POST /api/recommendations",
            "GET  /api/products",
            "POST /api/tryon/generate",
            "POST /api/tryon/custom"
        ]
    }


from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"[VALIDATION ERROR]: {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
