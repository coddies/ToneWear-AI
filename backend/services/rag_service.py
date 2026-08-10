"""
ToneWear AI â€” Pinecone RAG Service
Vector search using Pinecone + llama-text-embed-v2

Flow:
1. Index products + style knowledge into Pinecone on startup
2. Query Pinecone with user profile + occasion + budget
3. Return relevant products ranked by similarity
"""

import os
import json
import asyncio
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

PINECONE_API_KEY   = os.getenv("PINECONE_API_KEY", "")
PINECONE_INDEX     = os.getenv("PINECONE_INDEX", "tonewear-fashion")
PRODUCTS_FILE      = Path(__file__).parent.parent / "data" / "products.json"
KNOWLEDGE_FILE     = Path(__file__).parent.parent / "data" / "style_knowledge.json"


class RAGService:
    def __init__(self):
        self.pc          = None
        self.index       = None
        self.products_db: dict = {}   # id â†’ product (in-memory cache)
        self._initialized = False

    # â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    def init(self):
        """Initialize Pinecone client and index. Called once at startup."""
        if self._initialized:
            return

        if not PINECONE_API_KEY:
            print("âš ï¸  PINECONE_API_KEY not set â€” RAG running in keyword-fallback mode")
            self._initialized = True
            self._load_products_cache()
            return

        try:
            from pinecone import Pinecone, ServerlessSpec

            self.pc = Pinecone(api_key=PINECONE_API_KEY)

            # Create index if not exists
            if not self.pc.has_index(PINECONE_INDEX):
                print(f"ðŸ“¦ Creating Pinecone index: {PINECONE_INDEX}")
                self.pc.create_index_for_model(
                    name=PINECONE_INDEX,
                    cloud="aws",
                    region="us-east-1",
                    embed={
                        "model": "llama-text-embed-v2",
                        "field_map": {"text": "chunk_text"}
                    }
                )

            self.index = self.pc.Index(PINECONE_INDEX)
            self._load_products_cache()
            print(f"âœ… Pinecone RAG initialized â€” index: {PINECONE_INDEX}")

        except Exception as e:
            print(f"âš ï¸  Pinecone init failed: {e} â€” falling back to keyword mode")

        self._initialized = True

    # â”€â”€ Load Products into Memory Cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    def _load_products_cache(self):
        """Load products.json into memory for quick lookup by ID."""
        try:
            with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                for p in data["products"]:
                    self.products_db[p["id"]] = p
            print(f"ðŸ“š Loaded {len(self.products_db)} products into cache")
        except Exception as e:
            print(f"âš ï¸  Could not load products.json: {e}")

    # â”€â”€ Index All Data into Pinecone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    def index_all_data(self):
        """Index all products + style knowledge into Pinecone. Run once."""
        if not self.index:
            print("âš ï¸  Pinecone not available â€” skipping indexing")
            return

        records = []

        # â”€â”€ Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        try:
            with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
                products = json.load(f)["products"]

            for p in products:
                text = (
                    f"{p['name']} {p['category']} {p['culture']} {p['color']} "
                    f"style: {' '.join(p['style'])} "
                    f"occasion: {' '.join(p['occasion'])} "
                    f"skin tone: {' '.join(p['skin_tone_compatibility'])} "
                    f"undertone: {' '.join(p['undertone_compatibility'])} "
                    f"price PKR {p['price']} {p['description']}"
                )
                records.append({
                    "_id":        f"prod_{p['id']}",
                    "chunk_text": text,
                    "type":       "product",
                    "product_id": p["id"],
                    "category":   p["category"],
                    "culture":    p["culture"],
                    "gender":     p["gender"],
                    "price":      p["price"],
                    "occasion":   ",".join(p["occasion"]),
                    "undertone":  ",".join(p["undertone_compatibility"]),
                    "skin_tone":  ",".join(p["skin_tone_compatibility"]),
                })

        except Exception as e:
            print(f"âš ï¸  Products indexing error: {e}")

        # â”€â”€ Style Knowledge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        try:
            with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as f:
                knowledge = json.load(f)["color_rules"]

            for k in knowledge:
                records.append({
                    "_id":        f"know_{k['id']}",
                    "chunk_text": f"{k['title']}. {k['content']}",
                    "type":       "knowledge",
                    "category":   k["category"],
                })

        except Exception as e:
            print(f"âš ï¸  Knowledge indexing error: {e}")

        # â”€â”€ Upsert to Pinecone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if records:
            try:
                # Pinecone accepts batches
                batch_size = 50
                for i in range(0, len(records), batch_size):
                    batch = records[i:i + batch_size]
                    self.index.upsert_records(PINECONE_INDEX, batch)
                print(f"âœ… Indexed {len(records)} records to Pinecone")
            except Exception as e:
                print(f"âš ï¸  Upsert error: {e}")

    # â”€â”€ Search Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    def search_products(
        self,
        query_text: str,
        gender: str = "Male",
        max_price: Optional[int] = None,
        top_k: int = 20
    ) -> list:
        """
        Search Pinecone for relevant products.
        Returns list of product dicts, filtered by gender and price.
        """
        # â”€â”€ Pinecone Vector Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if self.index:
            try:
                results = self.index.search(
                    namespace=PINECONE_INDEX,
                    query={"inputs": {"text": query_text}, "top_k": top_k},
                    fields=["product_id", "type", "price", "gender", "occasion", "undertone", "skin_tone"]
                )

                product_ids = []
                for hit in results.get("result", {}).get("hits", []):
                    fields = hit.get("fields", {})
                    if fields.get("type") != "product":
                        continue
                    pid = fields.get("product_id")
                    if pid and pid in self.products_db:
                        product_ids.append(pid)

                products = [self.products_db[pid] for pid in product_ids if pid in self.products_db]

            except Exception as e:
                print(f"âš ï¸  Pinecone search error: {e} â€” falling back to keyword search")
                products = self._keyword_search(query_text, gender, max_price)
        else:
            products = self._keyword_search(query_text, gender, max_price)

        # â”€â”€ Filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        filtered = []
        for p in products:
            if gender and p.get("gender", "").lower() != gender.lower():
                continue
            if max_price and p.get("price", 0) > max_price:
                continue
            filtered.append(p)

        return filtered[:10]  # Return top 10 after filter

    # â”€â”€ Keyword Fallback Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    def _keyword_search(self, query: str, gender: str = "Male", max_price: Optional[int] = None) -> list:
        """Simple keyword-based search when Pinecone is unavailable."""
        query_lower = query.lower()
        keywords    = query_lower.split()
        scored      = []

        for pid, product in self.products_db.items():
            # Build searchable text
            text = (
                f"{product['name']} {product['category']} {product['culture']} "
                f"{product['color']} {' '.join(product['style'])} "
                f"{' '.join(product['occasion'])} {product['description']} "
                f"{' '.join(product.get('tags', []))}"
            ).lower()

            # Score by keyword matches
            score = sum(1 for kw in keywords if kw in text)

            # Boost by occasion match
            for occ in product.get("occasion", []):
                if occ.lower() in query_lower:
                    score += 5

            # Boost by color match
            if product.get("color_family", "").lower() in query_lower:
                score += 3

            # Filter gender + price
            if gender and product.get("gender", "").lower() != gender.lower():
                continue
            if max_price and product.get("price", 0) > max_price:
                continue

            if score > 0:
                scored.append((score, product))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [p for _, p in scored[:20]]

    # â”€â”€ Build Query Text â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    def build_query(
        self,
        skin_tone: str = "",
        undertone: str = "",
        style_directions: list = None,
        recommended_colors: list = None,
        occasion: str = "",
        budget: Optional[int] = None,
        gender: str = "Male",
        freeform_query: str = ""
    ) -> str:
        """Build a rich query string for vector search."""
        parts = []

        if occasion:
            parts.append(f"{occasion} outfit for {gender}")

        if skin_tone:
            parts.append(f"skin tone {skin_tone}")
        if undertone:
            parts.append(f"{undertone} undertone")

        if style_directions:
            parts.append(f"style: {' '.join(style_directions)}")

        if recommended_colors:
            parts.append(f"preferred colors: {' '.join(recommended_colors[:4])}")

        if budget:
            parts.append(f"budget under PKR {budget}")

        if freeform_query:
            parts.append(freeform_query)

        return ". ".join(parts)


# â”€â”€ Singleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
rag_service = RAGService()
