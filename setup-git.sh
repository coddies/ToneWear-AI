# ToneWear AI — Git Setup Script
# Run this script once to initialize GitHub repository

# 1. Initialize git repo (if not already done)
git init

# 2. Set your GitHub email and name (change these)
# git config user.name "Your Name"
# git config user.email "your@email.com"

# 3. Stage all files
git add .

# 4. Initial commit
git commit -m "feat: ToneWear AI v2 - Pinecone RAG + Claude AI + Virtual Try-On

- Added Pinecone vector DB for personalized outfit search
- Claude AI ranking with skin tone explanations  
- shop.html - Full 5-step shopping flow
- 50-product catalog (Pakistani/Indian/Middle Eastern/Western)
- Style knowledge base (15 color/cultural rules)
- uv package manager (project-level .venv)
- Custom clothes try-on (tryon.html Tab 2)
- vercel.json + railway.toml deployment configs
- Demo mode (works without API keys)
"

# 5. Create GitHub repo and push
# Option A: GitHub CLI
# gh repo create tonewear-ai --public --push --source .

# Option B: Manual (after creating repo on github.com)
# git remote add origin https://github.com/YOUR_USERNAME/tonewear-ai.git
# git branch -M main
# git push -u origin main

echo "Git setup complete! Push to GitHub when ready."
