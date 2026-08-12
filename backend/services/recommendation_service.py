"""
ToneWear AI — Recommendation Service
Combines RAG retrieval + Groq AI ranking/explanation
"""

import os
import json
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


class RecommendationService:

    # ── Main Entry Point ──────────────────────────────────────────────────────
    async def get_recommendations(
        self,
        profile: dict,
        occasion: str = "",
        budget: Optional[int] = None,
        gender: str = "Male",
        query: str = "",
        top_n: int = 6
    ) -> dict:
        """
        Full RAG + Groq pipeline:
        1. Build query from profile + occasion + budget
        2. Vector search via RAG service
        3. Groq (llama-3.3-70b) ranks top results + generates explanations
        4. Return ranked products with match_score + match_reason
        """
        from services.rag_service import rag_service

        # ── Build search query ────────────────────────────
        search_query = rag_service.build_query(
            skin_tone=profile.get("skin_tone", ""),
            undertone=profile.get("undertone", ""),
            style_directions=profile.get("style_directions", []),
            recommended_colors=profile.get("recommended_colors", []),
            occasion=occasion,
            budget=budget,
            gender=gender,
            freeform_query=query
        )

        # ── Vector search ─────────────────────────────────
        candidates = rag_service.search_products(
            query_text=search_query,
            gender=gender,
            max_price=budget,
            top_k=20
        )

        if not candidates:
            return {
                "products": [],
                "style_tips": ["No products found matching your criteria. Try adjusting your filters."],
                "color_insight": ""
            }

        # ── Groq ranking (or mock if no key) ─────────────
        if GROQ_API_KEY:
            ranked = await self._groq_rank(
                candidates[:12],
                profile=profile,
                occasion=occasion,
                budget=budget,
                query=query
            )
        else:
            ranked = self._mock_rank(candidates[:top_n], profile, occasion)

        return {
            "products": ranked[:top_n],
            "style_tips": self._generate_style_tips(profile, occasion),
            "color_insight": self._color_insight(profile)
        }

    # ── Groq Ranking ─────────────────────────────────────────────────────────
    async def _groq_rank(
        self,
        candidates: list,
        profile: dict,
        occasion: str,
        budget: Optional[int],
        query: str
    ) -> list:
        """Use Groq (llama-3.3-70b) to rank candidates and generate explanations."""
        try:
            from groq import Groq

            client = Groq(api_key=GROQ_API_KEY)

            # Build candidate summary
            candidate_text = ""
            for i, p in enumerate(candidates):
                candidate_text += (
                    f"\n[{i+1}] ID: {p['id']}\n"
                    f"  Name: {p['name']}\n"
                    f"  Color: {p['color']} ({p.get('color_family','')})\n"
                    f"  Style: {', '.join(p.get('style', []))}\n"
                    f"  Occasion: {', '.join(p.get('occasion', []))}\n"
                    f"  Price: PKR {p['price']}\n"
                    f"  Skin Compatibility: {', '.join(p.get('skin_tone_compatibility', []))}\n"
                    f"  Undertone Compatibility: {', '.join(p.get('undertone_compatibility', []))}\n"
                )

            prompt = f"""You are ToneWear AI's fashion styling expert. A user needs outfit recommendations.

USER PROFILE:
- Skin Tone: {profile.get('skin_tone', 'Medium')}
- Undertone: {profile.get('undertone', 'Warm')}
- Recommended Colors: {', '.join(profile.get('recommended_colors', []))}
- Style Direction: {', '.join(profile.get('style_directions', []))}

USER REQUEST:
- Occasion: {occasion or 'General'}
- Budget: PKR {budget or 'Any'}
- Query: "{query or 'Looking for a nice outfit'}"

CANDIDATE PRODUCTS:
{candidate_text}

TASK: Rank the TOP 6 most suitable products for this user. For each, provide:
1. A match_score (0-100) based on skin tone compatibility, occasion fit, style match, and color harmony
2. A match_reason (1-2 sentences in English explaining WHY this suits their specific skin tone and style)

Respond ONLY with a valid JSON array, no markdown, no explanation:
[
  {{
    "product_id": "...",
    "match_score": 94,
    "match_reason": "..."
  }}
]"""

            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1500,
                temperature=0.3
            )

            text = response.choices[0].message.content.strip()

            # Extract JSON array
            if "[" in text:
                start = text.find("[")
                end   = text.rfind("]") + 1
                rankings = json.loads(text[start:end])
            else:
                rankings = json.loads(text)

            # Merge rankings back into product objects
            ranked_products = []
            for r in rankings:
                pid = r["product_id"]
                product = next((p for p in candidates if p["id"] == pid), None)
                if product:
                    product = dict(product)
                    product["match_score"]  = r["match_score"]
                    product["match_reason"] = r["match_reason"]
                    ranked_products.append(product)

            return ranked_products

        except Exception as e:
            print(f"[WARNING] Groq ranking error: {e} - using mock ranking")
            return self._mock_rank(candidates[:6], profile, occasion)

    # ── Mock Ranking (no API key) ─────────────────────────────────────────────
    def _mock_rank(self, candidates: list, profile: dict, occasion: str) -> list:
        """Score-based ranking without Claude — used in demo mode."""
        recommended_colors = [c.lower() for c in profile.get("recommended_colors", [])]
        undertone          = profile.get("undertone", "").lower()
        skin_tone          = profile.get("skin_tone", "").lower()

        scored = []
        for p in candidates:
            score = 60  # base score

            # Color family match
            cf = p.get("color_family", "").lower()
            color_lower = p.get("color", "").lower()
            for rc in recommended_colors:
                if rc in color_lower or rc in cf:
                    score += 15
                    break

            # Undertone compatibility
            if undertone in [u.lower() for u in p.get("undertone_compatibility", [])]:
                score += 10

            # Skin tone compatibility
            for st in p.get("skin_tone_compatibility", []):
                if st.lower() in skin_tone or skin_tone in st.lower():
                    score += 8
                    break

            # Occasion match
            if occasion:
                for occ in p.get("occasion", []):
                    if occasion.lower() in occ.lower() or occ.lower() in occasion.lower():
                        score += 12
                        break

            score = min(score, 99)

            # Generate explanation
            reason = self._generate_reason(p, profile, occasion)

            p = dict(p)
            p["match_score"]  = score
            p["match_reason"] = reason
            scored.append(p)

        scored.sort(key=lambda x: x["match_score"], reverse=True)
        return scored

    # ── Reason Generator ──────────────────────────────────────────────────────
    def _generate_reason(self, product: dict, profile: dict, occasion: str) -> str:
        """Generate a human-readable explanation for why a product suits the user."""
        color      = product.get("color", "")
        undertone  = profile.get("undertone", "warm")
        skin_tone  = profile.get("skin_tone", "medium")
        cat        = product.get("category", "outfit")

        reasons = {
            "Navy Blue":     f"Navy blue creates an elegant contrast with your {skin_tone} {undertone} complexion, adding depth and sophistication.",
            "Olive Green":   f"Olive green harmonizes beautifully with your {undertone} undertone, giving a natural, grounded look.",
            "Cream":         f"Cream provides a soft, warm complement to your {skin_tone} skin tone — never too harsh, always refined.",
            "Maroon":        f"Maroon's deep red tones create a rich, regal effect against your {undertone} undertone.",
            "Burgundy":      f"Burgundy's warm depth adds a confident glow that works beautifully with {undertone} undertones.",
            "Deep Green":    f"Deep green creates a luxurious contrast that enhances your {skin_tone} complexion.",
            "White":         f"White provides striking contrast against your {skin_tone} complexion, creating a clean, fresh look.",
            "Charcoal Grey": f"Charcoal grey gives a professional, authoritative presence that suits your cool undertones.",
            "Black":         f"Black creates sharp contrast that frames your features with timeless sophistication.",
            "Mustard Yellow": f"Mustard yellow's warm glow radiates beautifully against your {skin_tone} skin tone.",
            "Sky Blue":      f"Sky blue's freshness complements your {undertone} undertone with a light, approachable feel.",
            "Teal":          f"Dark teal combines depth and modernity that works wonderfully with your {undertone} complexion.",
            "Royal Blue":    f"Royal blue creates a vibrant, confident presence against your {skin_tone} skin tone.",
            "Beige":         f"Beige offers understated elegance that harmonizes with your natural {undertone} tones.",
        }

        base_reason = reasons.get(color, f"{color} works well with your {skin_tone} {undertone} complexion, creating a balanced and stylish look.")

        if occasion:
            base_reason += f" A great choice for {occasion}."

        return base_reason

    # ── Style Tips ────────────────────────────────────────────────────────────
    def _generate_style_tips(self, profile: dict, occasion: str) -> list:
        """Generate occasion-specific style tips."""
        undertone = profile.get("undertone", "warm").lower()
        tips = []

        if occasion.lower() in ["eid", "eid al-fitr", "eid al-adha"]:
            tips = [
                "For Eid, pair your kurta with matching churidar or shalwar for a cohesive look.",
                "A subtle cologne and clean footwear (khussas or loafers) complete the Eid look.",
                "Consider adding a light waistcoat for extra elegance at Eid gatherings."
            ]
        elif occasion.lower() in ["wedding", "valima", "baraat"]:
            tips = [
                "Choose a Sherwani with embroidery that reflects your personality — subtle for nikah, richer for baraat.",
                "Coordinate your footwear (jutti or formal shoes) with your outfit's embroidery color.",
                "Accessories like a pocket square or brooch add a memorable personal touch."
            ]
        elif occasion.lower() in ["interview", "office"]:
            tips = [
                "Iron your shirt well — neat presentation is 50% of the interview impression.",
                "Choose formal footwear: polished leather shoes complement a navy or charcoal suit perfectly.",
                "Keep accessories minimal for interviews — a simple watch is all you need."
            ]
        else:
            if undertone == "warm":
                tips = [
                    "Your warm undertone shines in navy, olive, cream, and burgundy.",
                    "Earthy tones and rich jewel colors are your strongest palette.",
                    "When in doubt, navy is always the safe, stylish choice for any occasion."
                ]
            else:
                tips = [
                    "Your cool undertone is complemented by blues, greys, and crisp whites.",
                    "Jewel tones like royal blue and emerald create stunning contrast.",
                    "Charcoal and navy project authority and sophistication for formal occasions."
                ]

        return tips

    # ── Color Insight ─────────────────────────────────────────────────────────
    def _color_insight(self, profile: dict) -> str:
        """One-line color insight for the user's profile."""
        undertone  = profile.get("undertone", "warm")
        skin_tone  = profile.get("skin_tone", "medium")
        rec_colors = profile.get("recommended_colors", [])

        if rec_colors:
            top_colors = ", ".join(rec_colors[:3])
            return f"Your {skin_tone} skin with {undertone} undertone looks best in {top_colors} — these shades create natural harmony and depth."
        return f"Your {skin_tone} complexion with {undertone} undertone suits rich jewel tones and deep neutrals best."


# ── Singleton ─────────────────────────────────────────────────────────────────
recommendation_service = RecommendationService()
