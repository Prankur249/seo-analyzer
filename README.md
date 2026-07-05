# SEO Analyzer (Woorank-style Website Audit Tool)

A custom-built backend + frontend that crawls a given website and produces a structured
SEO report — technical SEO, on-page SEO, content quality, performance, and social metadata —
along with a weighted 0–100 SEO score.

Built entirely with **custom crawling logic and open-source libraries**. No Woorank API,
no paid SEO API, and no third-party SEO scoring service is used anywhere.

---

## ✨ Features

| Category | Checks |
|---|---|
| **On-Page SEO** | Title tag, meta description, H1–H6 structure, image ALT coverage, internal/external link counts, URL length |
| **Technical SEO** | HTTPS, `robots.txt`, `sitemap.xml`, canonical tag, `noindex` detection, redirect tracking, structured data (JSON-LD) |
| **Performance** | Load time, page size (KB), estimated request count, optional Lighthouse/Core Web Vitals |
| **Content Quality** | Word count, Flesch Reading Ease readability score, keyword density (top 10 terms), heading usage |
| **Social/Trust Metadata** | Open Graph tags, Twitter Card tags |
| **Scoring** | Technical / On-Page / Content / Performance scores + weighted Overall score (0–100) |

---

## 🧱 Tech Stack

- **Backend:** Node.js + Express
- **Crawler:** Axios (HTTP requests with redirect following, timing, status handling)
- **HTML Parsing:** Cheerio (server-side jQuery-like DOM parsing)
- **Performance (optional):** Puppeteer + Lighthouse (falls back gracefully if unavailable)
- **Job Queue:** In-memory async job store (swappable for Redis/BullMQ at scale)
- **Frontend:** Plain HTML/CSS/JS single page (no framework needed, works anywhere)
- **Deployment target:** Render / Railway / VPS (Node 18+)

No paid APIs, no Woorank integration, no external SEO scoring service — every score is
computed by logic in `/lib`.

---

## 📁 Project Structure

```
seo-analyzer/
├── server.js                  # Express app entrypoint
├── routes/
│   └── analyze.js             # POST /api/analyze, GET /api/results/:id
├── lib/
│   ├── crawler.js             # Fetches page HTML, robots.txt, sitemap.xml
│   ├── onPageAnalyzer.js      # Cheerio-based on-page SEO extraction
│   ├── technicalAnalyzer.js   # HTTPS / robots / sitemap / indexability checks
│   ├── contentAnalyzer.js     # Readability + keyword density
│   ├── performanceAnalyzer.js # Load time / size + optional Lighthouse
│   ├── scorer.js              # Scoring engine (see SCORING_EXPLANATION.md)
│   ├── pipeline.js            # Orchestrates the full analysis pipeline
│   └── jobStore.js            # In-memory async job tracking
├── public/
│   └── index.html             # Frontend UI (vanilla JS)
├── package.json
└── docs/
    ├── API_DOCS.md
    ├── SCORING_EXPLANATION.md
    └── ARCHITECTURE.md
```

---

## 🚀 Running Locally

```bash
git clone <your-repo-url>
cd seo-analyzer
npm install
npm start
```

Server runs at `http://localhost:5000`. Open that URL in a browser to use the UI, or call
the API directly (see `docs/API_DOCS.md`).

> Puppeteer/Lighthouse are listed as **optional** dependencies. If they fail to install on
> a constrained host (common on free tiers), the app automatically falls back to basic
> performance metrics (load time + page size) — nothing breaks.

---

## 🔌 API Quick Reference

```
POST /api/analyze        { "url": "https://example.com" }   -> { jobId, status }
GET  /api/results/:id                                       -> full report / status
```

Full request/response examples: `docs/API_DOCS.md`.

---

## 🧮 Scoring

Overall score = weighted average of 4 category scores:

- On-Page SEO — 30%
- Technical SEO — 25%
- Content Quality — 25%
- Performance — 20%

Full rubric and reasoning: `docs/SCORING_EXPLANATION.md`.

---

## 🏗️ Architecture

Async job pattern: `POST /api/analyze` immediately returns a `jobId` and processes the
crawl + analysis in the background, so the API never blocks on slow websites. The client
polls `GET /api/results/:id` until `status` becomes `completed` or `failed`.

Full explanation: `docs/ARCHITECTURE.md`.

---

## 🌍 Deployment

Recommended: **Render** or **Railway** (Node 18+, no Dockerfile required).

1. Push this repo to GitHub.
2. Create a new Web Service on Render/Railway, connect the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. No environment variables are required for basic operation.

If you want real Lighthouse/Core Web Vitals data, use a host that allows headless Chromium
(Render/Railway both work, but may need extra buildpack config for Puppeteer's Chromium
download — see comments in `lib/performanceAnalyzer.js`). Without it, the app still works
using the fallback performance metrics.

---

## ⚠️ Limitations / Honest Notes

- Single-page crawl only (analyzes the URL given, not the whole site) — sufficient for a
  Woorank-style single-page audit; can be extended to multi-page crawling.
- In-memory job store means jobs are lost on server restart — fine for an assignment/demo,
  should be swapped for Redis in a production system.
- Lighthouse integration is best-effort/optional due to hosting constraints around headless
  Chrome; fallback metrics are used automatically when unavailable.
