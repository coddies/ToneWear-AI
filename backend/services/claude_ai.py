"""
ToneWear AI — Claude AI Service
Uses Anthropic Claude to generate:
- Cultural outfit recommendations with WHY explanations
- Color palette analysis
- Skin remedy recipes
- Glasses frame reasoning
"""

import os
from typing import Optional
import anthropic
from dotenv import load_dotenv

load_dotenv()

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
CLAUDE_MODEL   = "claude-3-5-sonnet-20241022"
MAX_TOKENS     = 2048


class ClaudeService:
    """
    Anthropic Claude API Integration
    All prompts are carefully engineered for:
    - Cultural accuracy (Pakistani/Indian/Middle Eastern fashion)
    - Skin tone color theory
    - Non-generic, specific explanations
    """

    def __init__(self):
        if CLAUDE_API_KEY:
            self.client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
        else:
            self.client = None

    def _is_available(self) -> bool:
        return self.client is not None and CLAUDE_API_KEY != ""

    # ── Outfit Recommendations ────────────────────────────────────────────────
    async def recommend_outfits(
        self,
        skin_tone_name: str,
        undertone: str,
        fitzpatrick: str,
        concerns: list[str],
        occasion: str,
        style_preferences: list[str]
    ) -> dict:
        """
        Generate 4-6 outfit recommendations with WHY explanations.
        Returns structured dict matching OutfitRecommendation schema.
        """
        if not self._is_available():
            return self._mock_outfit_response(skin_tone_name, occasion, style_preferences)

        styles_str   = ", ".join(style_preferences)
        concerns_str = ", ".join(concerns) if concerns else "None detected"

        prompt = f"""You are ToneWear AI — a personal stylist specializing in Pakistani, Indian, and Middle Eastern fashion.

SKIN ANALYSIS RESULTS:
- Skin Tone: {skin_tone_name}
- Undertone: {undertone}
- Fitzpatrick Scale: Type {fitzpatrick}
- Skin Concerns: {concerns_str}
- Occasion: {occasion}
- Style Preferences: {styles_str}

TASK: Generate exactly 5 outfit recommendations. For EACH outfit:
1. Name the specific outfit (e.g. "Navy Raw Silk Shalwar Kameez")
2. Specify the category (Shalwar Kameez / Kurta / Sherwani / Thobe / Western)
3. Give a WHY explanation (2 sentences max) that specifically mentions:
   - How the color complements {undertone} undertone
   - Why it suits {skin_tone_name} skin for {occasion}
4. Mark 2 outfits as "recommended: true" (most suitable)
5. Choose a relevant emoji icon

RESPOND IN THIS EXACT JSON FORMAT (nothing else):
{{
  "outfits": [
    {{
      "icon": "👘",
      "name": "Navy Raw Silk Shalwar Kameez",
      "type": "Shalwar Kameez",
      "occasion": "{occasion}",
      "why": "Deep navy creates elegant contrast with your warm olive undertone while maintaining cultural sophistication. The cool depth balances warm pigmentation and looks regal at {occasion} gatherings.",
      "recommended": true
    }}
  ],
  "color_palette": {{
    "recommended": [
      {{"hex": "#1a3a5c", "name": "Deep Navy", "why": "Cool depth contrasts beautifully with warm undertones"}}
    ],
    "avoid": [
      {{"hex": "#ff6b6b", "name": "Bright Red", "reason": "Clashes with warm undertones"}}
    ]
  }}
}}

Be specific and educational. Avoid generic advice. Focus on the science of skin tone color theory."""

        message = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}]
        )

        import json
        try:
            text = message.content[0].text
            # Extract JSON from response
            start = text.find('{')
            end   = text.rfind('}') + 1
            return json.loads(text[start:end])
        except Exception:
            return self._mock_outfit_response(skin_tone_name, occasion, style_preferences)

    # ── Skin Remedies ─────────────────────────────────────────────────────────
    async def generate_remedies(self, concerns: list[str], skin_tone: Optional[str] = None) -> dict:
        """
        Generate home remedies for given skin concerns.
        Returns dict: {concern_name: {remedies: [...], clothing_advice: str}}
        """
        if not self._is_available():
            return self._mock_remedies(concerns)

        concerns_str = ", ".join(concerns)
        tone_ctx     = f" (skin tone: {skin_tone})" if skin_tone else ""

        prompt = f"""You are ToneWear AI's skin care specialist{tone_ctx}.

SKIN CONCERNS: {concerns_str}

TASK: For EACH concern, generate 3 natural home remedies popular in South Asian/Middle Eastern households.

For each remedy include:
- name: specific remedy name (e.g. "Multani Mitti & Rose Water Pack")
- ingredients: list with icon (emoji), name, amount
- steps: numbered list (3-5 steps)
- time: "15 minutes"
- frequency: "2x per week"
- results: "Visible in 2-3 weeks"

Also include clothing_advice: How fabric choices and colors can minimize visual impact of the concern.

RESPOND IN JSON FORMAT:
{{
  "Acne": {{
    "remedies": [
      {{
        "name": "Multani Mitti Clay Mask",
        "ingredients": [
          {{"icon": "🏺", "name": "Multani Mitti (Fuller's Earth)", "amount": "2 tablespoons"}},
          {{"icon": "🌹", "name": "Rose Water", "amount": "3 tablespoons"}}
        ],
        "steps": [
          "Mix multani mitti with rose water until smooth paste forms",
          "Apply evenly to face avoiding eye area",
          "Allow to dry completely (15-20 minutes)",
          "Rinse with cool water and pat dry"
        ],
        "time": "20 minutes",
        "frequency": "2x per week",
        "results": "Visible improvement in 2-3 weeks"
      }}
    ],
    "clothing_advice": "Wear deep jewel tones like navy or forest green to draw attention away from skin concerns. Avoid bright pinks or reds near the face."
  }}
}}

Use ingredients common in Pakistani/Indian households. Be specific about amounts."""

        message = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}]
        )

        import json
        try:
            text  = message.content[0].text
            start = text.find('{')
            end   = text.rfind('}') + 1
            return json.loads(text[start:end])
        except Exception:
            return self._mock_remedies(concerns)

    # ── Glasses Recommendations ────────────────────────────────────────────────
    async def recommend_glasses(self, face_shape: str, skin_tone: str, undertone: str) -> dict:
        """
        Generate glasses frame recommendations based on face shape + skin tone.
        """
        if not self._is_available():
            return self._mock_glasses_response(face_shape, skin_tone, undertone)

        prompt = f"""You are ToneWear AI's eyewear specialist.

ANALYSIS:
- Face Shape: {face_shape}
- Skin Tone: {skin_tone}
- Undertone: {undertone}

TASK: Recommend 6 glasses frame styles. For each:
- name: specific style
- style: category (Bold/Minimalist/Classic/Professional/Vintage)
- score: 1-5 suitability rating
- why: 2-sentence specific explanation mentioning face shape + skin tone interaction
- icon: appropriate emoji

Also recommend 4 frame colors that complement {undertone} undertone with WHY.

And provide 4 glasses + skin care tips specific to the detected skin concerns.

Respond in JSON format matching this structure:
{{
  "recommended_frames": [...],
  "frame_colors": [
    {{"hex": "#8B6914", "name": "Tortoise Shell", "why": "Warm tones match olive undertone"}}
  ],
  "care_tips": [
    {{"icon": "💧", "title": "Oily Skin Tip", "desc": "Use silicone nose pads to prevent sliding"}}
  ]
}}"""

        message = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )

        import json
        try:
            text  = message.content[0].text
            start = text.find('{')
            end   = text.rfind('}') + 1
            return json.loads(text[start:end])
        except Exception:
            return self._mock_glasses_response(face_shape, skin_tone, undertone)

    # ── Mock Data (API not configured) ────────────────────────────────────────
    def _mock_outfit_response(self, skin_tone, occasion, styles):
        return {
            "outfits": [
                {"icon": "👘", "name": "Navy Shalwar Kameez", "type": "Shalwar Kameez", "occasion": occasion, "why": f"Deep navy creates elegant contrast with your warm undertone. Culturally perfect for {occasion}.", "recommended": True},
                {"icon": "👗", "name": "Burgundy Kurta Set",  "type": "Kurta", "occasion": occasion, "why": "Rich burgundy harmonizes with warm skin tones while adding sophisticated depth.", "recommended": True},
                {"icon": "🥻", "name": "Forest Green Sherwani", "type": "Sherwani", "occasion": occasion, "why": "Earthy tones create beautiful harmony with warm olive complexion.", "recommended": False},
                {"icon": "🧕", "name": "Classic White Thobe",   "type": "Thobe",    "occasion": occasion, "why": "White creates striking contrast against warm skin tones for elegant occasions.", "recommended": False},
                {"icon": "👔", "name": "Navy Slim Suit",        "type": "Western",   "occasion": occasion, "why": "Classic navy elevates warm skin beautifully in professional settings.", "recommended": False},
            ],
            "color_palette": {
                "recommended": [
                    {"hex": "#1a3a5c", "name": "Deep Navy",     "why": "Cool depth contrasts warm undertones elegantly"},
                    {"hex": "#6b2d3a", "name": "Burgundy",       "why": "Warm red harmonizes with olive complexion"},
                    {"hex": "#2d5a27", "name": "Forest Green",   "why": "Earthy tones work with warm skin"},
                    {"hex": "#4a0e8f", "name": "Deep Purple",    "why": "Jewel tones complement warm undertones"},
                    {"hex": "#c8860a", "name": "Golden Amber",   "why": "Gold elevates warm olive skin beautifully"},
                    {"hex": "#8b4513", "name": "Saddle Brown",   "why": "Monochromatic harmony with your complexion"}
                ],
                "avoid": [
                    {"hex": "#ff6b6b", "name": "Bright Red",  "reason": "Clashes with warm undertones"},
                    {"hex": "#f0e68c", "name": "Pale Yellow", "reason": "Washes out warm olive tone"},
                    {"hex": "#e0e0e0", "name": "Light Gray",  "reason": "Creates ashy appearance"}
                ]
            }
        }

    def _mock_remedies(self, concerns):
        result = {}
        for concern in concerns:
            result[concern] = {
                "remedies": [
                    {
                        "name": f"Natural {concern} Treatment",
                        "ingredients": [
                            {"icon": "🍯", "name": "Raw Honey", "amount": "1 tablespoon"},
                            {"icon": "🌿", "name": "Aloe Vera", "amount": "1 tablespoon"}
                        ],
                        "steps": ["Mix ingredients", "Apply to affected area", "Leave 15 minutes", "Rinse with cool water"],
                        "time": "15 minutes",
                        "frequency": "2x per week",
                        "results": "2-3 weeks"
                    }
                ],
                "clothing_advice": "Choose deep jewel tones and avoid colors that create unwanted contrast near the face."
            }
        return result

    def _mock_glasses_response(self, face_shape, skin_tone, undertone):
        return {
            "recommended_frames": [
                {"icon": "🕶️", "name": "Classic Wayfarer",  "style": "Bold",         "score": 5, "why": f"Wayfarers complement {face_shape} faces. The bold frame creates beautiful contrast with {skin_tone}.", "image_url": ""},
                {"icon": "👓", "name": "Round Wire Rim",    "style": "Minimalist",    "score": 4, "why": f"Round frames soften features for {face_shape} faces while staying elegant.", "image_url": ""},
                {"icon": "🥽", "name": "Gold Aviator",      "style": "Classic",       "score": 5, "why": f"Gold frames are ideal for {undertone} undertone complexions — a timeless South Asian classic.", "image_url": ""},
                {"icon": "👓", "name": "Rectangle Frame",   "style": "Professional",  "score": 4, "why": f"Sharp rectangles add professional structure while flattering {face_shape} face shape.", "image_url": ""},
                {"icon": "😎", "name": "Cat-Eye",           "style": "Fashion",       "score": 3, "why": f"Cat-eye frames add stylish personality for {face_shape} face types.", "image_url": ""},
                {"icon": "🥽", "name": "Browline",          "style": "Vintage",       "score": 4, "why": f"Browline frames add character without overwhelming {face_shape} proportions.", "image_url": ""}
            ],
            "frame_colors": [
                {"hex": "#8B6914", "name": "Tortoise Shell", "why": f"Warm tones match {undertone} undertone"},
                {"hex": "#C8860A", "name": "Gold",            "why": "Gold elevates warm complexions beautifully"},
                {"hex": "#2C1810", "name": "Warm Brown",      "why": "Natural harmony with warm skin tones"},
                {"hex": "#4A5A3A", "name": "Olive Green",     "why": "Earthy tone harmonizes with warm undertones"}
            ],
            "care_tips": [
                {"icon": "💧", "title": "Oily Skin",        "desc": "Use silicone nose pads to prevent glasses sliding"},
                {"icon": "🌿", "title": "Sensitive Skin",   "desc": "Choose titanium or acetate frames — hypoallergenic"},
                {"icon": "🔴", "title": "Acne-Prone",       "desc": "Avoid nickel frames — can worsen breakouts near nose bridge"},
                {"icon": "✨", "title": "Maintenance",      "desc": "Clean nose pads weekly to prevent oil buildup"}
            ]
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
claude_service = ClaudeService()
