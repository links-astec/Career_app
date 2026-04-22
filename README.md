# G Careers — Deployment Guide

## Prerequisites
- Node.js 18+ installed
- Git installed
- Vercel account (free) at vercel.com
- Groq API key (you already have this)
- Tavily API key (free at app.tavily.com)

---

## Step 1 — API Keys

### Groq (you have this already)
- Key format: `gsk_...`
- Get from: https://console.groq.com → API Keys

### Tavily (web search)
1. Go to https://app.tavily.com
2. Sign up free (no credit card needed)
3. Dashboard → API Keys → Copy your key
4. Key format: `tvly-...`
5. Free tier: 1,000 searches/month

---

## Step 2 — Local Setup

```bash
# Clone or copy this project folder
cd gcareers

# Install dependencies
npm install

# Copy env file
cp .env.example .env.local

# Edit .env.local and fill in your keys:
# GROQ_API_KEY=gsk_your_key_here
# TAVILY_API_KEY=tvly_your_key_here

# Test locally
npm run dev
# Open http://localhost:3000
```

---

## Step 3 — Deploy to Vercel

### Option A: Via Vercel CLI (fastest)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project folder
cd gcareers
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name: gcareers (or anything)
# - Directory: ./
# - Override settings? No

# Add environment variables
vercel env add GROQ_API_KEY
# Paste: gsk_your_key_here
# Select: Production, Preview, Development

vercel env add TAVILY_API_KEY
# Paste: tvly_your_key_here
# Select: Production, Preview, Development

# Deploy to production
vercel --prod
```

### Option B: Via GitHub + Vercel Dashboard
```bash
# 1. Create a GitHub repo at github.com/new
# 2. Push your code:
git init
git add .
git commit -m "G Careers - initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gcareers.git
git push -u origin main

# 3. Go to vercel.com → New Project → Import from GitHub
# 4. Select your repo → Import
# 5. Framework: Next.js (auto-detected)
# 6. Before deploying, click "Environment Variables" and add:
#    GROQ_API_KEY = gsk_your_key_here
#    TAVILY_API_KEY = tvly_your_key_here
# 7. Click Deploy
```

---

## Step 4 — Install as PWA on Mobile

### iPhone / Safari:
1. Open your Vercel URL in Safari
2. Tap the Share button (square with arrow)
3. Scroll down → "Add to Home Screen"
4. Tap "Add"
5. App appears on home screen with G icon

### Android / Chrome:
1. Open your Vercel URL in Chrome
2. Tap the 3-dot menu
3. Tap "Add to Home screen" or "Install app"
4. Tap "Add"

---

## Project Structure

```
gcareers/
├── app/
│   ├── api/
│   │   ├── ats/route.ts          ← ATS analysis (Groq + Tavily parallel)
│   │   ├── search/route.ts       ← Web search (Tavily + Groq synthesis)
│   │   ├── interview/route.ts    ← AI interviewer (start/answer/final)
│   │   ├── study/route.ts        ← Topic explain + quiz generator
│   │   └── cv-improve/route.ts   ← CV section rewriter
│   ├── globals.css
│   ├── layout.tsx                ← PWA metadata
│   └── page.tsx                  ← Full mobile app UI
├── lib/
│   ├── groq.ts                   ← Groq API helper
│   └── tavily.ts                 ← Tavily search helper
├── public/
│   ├── manifest.json             ← PWA manifest
│   ├── sw.js                     ← Service worker (offline support)
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-icon.png
├── .env.example                  ← Copy to .env.local
├── vercel.json                   ← Vercel config (region: Paris cdg1)
└── next.config.js
```

---

## Features

| Feature | Stack |
|---------|-------|
| AI Analysis | Groq llama-3.3-70b-versatile |
| Web Search | Tavily (AI-optimized search) |
| ATS Checker | CV + JD → JSON analysis + market context |
| AI Interviewer | 6-question mock interview + per-answer scoring + final eval |
| Study Hub | Topic explainer with code examples + 5Q quiz |
| CV Improver | Section rewriter with ATS keywords |
| Job Tracker | Full CRUD pipeline |
| PWA | Offline capable, installable, safe-area aware |
| Languages | English + French (full UI + AI responses) |

---

## Groq Model Used
`llama-3.3-70b-versatile` — fastest available, excellent JSON reasoning, free tier generous.
Free tier: ~14,400 requests/day on the free plan.

## Troubleshooting

**API not working?**
- Check environment variables are set in Vercel dashboard
- Redeploy after adding env vars: `vercel --prod`
- Check Function logs in Vercel dashboard → Functions tab

**PWA not installing?**
- Must be served over HTTPS (Vercel does this automatically)
- On iOS, must use Safari (not Chrome) to install

**Groq rate limit?**
- Free tier: 30 req/min, 14,400/day
- Upgrade at console.groq.com if needed
